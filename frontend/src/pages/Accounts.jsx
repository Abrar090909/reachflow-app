import { useEffect, useState } from 'react';
import { getAccounts, toggleWarmup, deleteAccount, testAccount, getGmailAuthUrl } from '../lib/api';
import AccountCard from '../components/AccountCard';
import { Mail, X, Info } from 'lucide-react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [connecting, setConnecting] = useState(false);

  const fetchAccounts = async () => {
    try { const { data } = await getAccounts(); setAccounts(data); } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchAccounts(); }, []);

  const showMsg = (text, type = 'info') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };

  const handleGmail = async () => {
    setConnecting(true);
    try {
      const { data } = await getGmailAuthUrl();
      const popup = window.open(data.url, 'gmail-auth', 'width=520,height=700,left=200,top=100');

      // Listen for OAuth success message from popup
      const handler = (e) => {
        if (e.data?.type === 'gmail-auth-success') {
          showMsg(`✓ Connected: ${e.data.email}`, 'success');
          fetchAccounts();
          window.removeEventListener('message', handler);
        }
      };
      window.addEventListener('message', handler);

      // Cleanup if popup closed without completing
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          window.removeEventListener('message', handler);
          setConnecting(false);
          fetchAccounts();
        }
      }, 1000);
    } catch {
      showMsg('Failed to get auth URL. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env', 'error');
    }
    setConnecting(false);
  };

  const handleToggleWarmup = async (id) => { await toggleWarmup(id); fetchAccounts(); };
  const handleDelete = async (id) => { if (confirm('Delete this account?')) { await deleteAccount(id); fetchAccounts(); } };
  const handleTest = async (id) => {
    showMsg('Sending test email...', 'info');
    try { await testAccount(id); showMsg('✓ Test email sent! Check your inbox.', 'success'); }
    catch (err) { showMsg('✗ Test failed: ' + (err.response?.data?.error || err.message), 'error'); }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Email Accounts</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Gmail accounts for sending campaigns</p>
        </div>
        <button onClick={handleGmail} disabled={connecting} className="btn-primary" style={{ opacity: connecting ? 0.7 : 1 }}>
          <Mail size={16} color="white" />
          {connecting ? 'Opening...' : 'Connect Gmail'}
        </button>
      </div>

      {/* Toast */}
      {msg.text && (
        <div className="animate-fade" style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 16, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: msg.type === 'success' ? '#ecfdf5' : msg.type === 'error' ? '#fef2f2' : '#eff6ff',
          color:      msg.type === 'success' ? '#065f46' : msg.type === 'error' ? '#991b1b' : '#1e40af',
          border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : msg.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
        }}>
          {msg.text}
          <button onClick={() => setMsg({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Info banner */}
      <div style={{ padding: '14px 18px', borderRadius: 16, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
          <strong>Gmail OAuth only.</strong> Each account sends up to 40 emails/day safely. Connect 7 accounts for 280/day total.
          Enable warmup on each account and let it run <strong>7 days minimum</strong> before launching campaigns.
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="accounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {accounts.map((a, i) => (
          <div key={a.id} className={`animate-fade-in stagger-${Math.min(i + 1, 4)}`}>
            <AccountCard account={a} onToggleWarmup={handleToggleWarmup} onDelete={handleDelete} onTest={handleTest} />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!accounts.length && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">
            <Mail size={28} color="#3b82f6" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>No Gmail accounts connected</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 340, lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>
            Connect your Gmail accounts via OAuth to start sending outreach campaigns.
            No passwords stored — Google handles authentication securely.
          </p>
          <button onClick={handleGmail} className="btn-primary">
            <Mail size={16} /> Connect Gmail Account
          </button>
        </div>
      )}
    </div>
  );
}
