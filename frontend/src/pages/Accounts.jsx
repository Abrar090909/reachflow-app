import { useEffect, useState } from 'react';
import { getAccounts, toggleWarmup, deleteAccount, testAccount, getGmailAuthUrl, addZohoAccount } from '../lib/api';
import AccountCard from '../components/AccountCard';
import { Plus, X, Mail, Shield, Zap, Eye, EyeOff } from 'lucide-react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [showZoho, setShowZoho] = useState(false);
  const [zohoForm, setZohoForm] = useState({ email: '', smtp_user: 'a6e1d0001@smtp-brevo.com', smtp_pass: '', smtp_host: 'smtp-relay.brevo.com', smtp_port: 587 });
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);

  const fetchAccounts = async () => {
    try { const { data } = await getAccounts(); setAccounts(data); } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchAccounts(); }, []);

  const showMsg = (text, type = 'info') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const handleGmail = async () => {
    try {
      const { data } = await getGmailAuthUrl();
      const popup = window.open(data.url, 'gmail-auth', 'width=500,height=700');
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'gmail-auth-success') { showMsg(`✓ Connected: ${e.data.email}`, 'success'); fetchAccounts(); }
      });
    } catch { showMsg('Failed to get auth URL. Check Google credentials.', 'error'); }
  };

  const handleZoho = async (e) => {
    e.preventDefault();
    try {
      await addZohoAccount(zohoForm);
      setShowZoho(false);
      setZohoForm({ email: '', smtp_user: 'a6e1d0001@smtp-brevo.com', smtp_pass: '', smtp_host: 'smtp-relay.brevo.com', smtp_port: 587 });
      fetchAccounts();
      showMsg('✓ Zoho account added!', 'success');
    } catch (err) { showMsg(err.response?.data?.error || 'Failed to add account', 'error'); }
  };

  const handleToggleWarmup = async (id) => { await toggleWarmup(id); fetchAccounts(); };
  const handleDelete = async (id) => { if (confirm('Delete this account?')) { await deleteAccount(id); fetchAccounts(); } };
  const handleTest = async (id) => {
    showMsg('Sending test email...', 'info');
    try { await testAccount(id); showMsg('✓ Test email sent!', 'success'); }
    catch (err) { showMsg('✗ Test failed: ' + (err.response?.data?.error || err.message), 'error'); }
  };

  return (
    <>
      <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Email Accounts</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Manage your sending infrastructure</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleGmail} className="btn-secondary">
            <Mail size={16} color="#4285f4" /> Add Gmail
          </button>
          <button onClick={() => setShowZoho(true)} className="btn-primary">
            <Plus size={16} /> Add Mail
          </button>
        </div>
      </div>

      {/* Toast Message */}
      {msg.text && (
        <div className="animate-fade" style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 16,
          background: msg.type === 'success' ? '#ecfdf5' : msg.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: msg.type === 'success' ? '#065f46' : msg.type === 'error' ? '#991b1b' : '#1e40af',
          border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : msg.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {msg.text}
          <button onClick={() => setMsg({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={16} /></button>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="accounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {accounts.map((a, i) => (
          <div key={a.id} className={`animate-fade-in stagger-${Math.min(i+1, 4)}`}>
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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6, fontFamily: 'var(--font-display)' }}>No accounts connected</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>
            Connect a Gmail or custom email account to start sending outreach campaigns and warming up your sender reputation.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleGmail} className="btn-secondary">
              <Mail size={16} color="#4285f4" /> Connect Gmail
            </button>
            <button onClick={() => setShowZoho(true)} className="btn-primary">
              <Plus size={16} /> Connect Mail
            </button>
          </div>
        </div>
      )}
    </div>
      
      {/* Zoho Modal (Moved outside animate-fade-in for fixed positioning) */}
      {showZoho && (
        <div className="modal-overlay" onClick={() => setShowZoho(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Add Custom SMTP Account</h2>
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Connect any email provider (Zoho, Brevo, Outlook)</p>
              </div>
              <button onClick={() => setShowZoho(false)} style={{ width: 36, height: 36, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleZoho} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Sender Email</label>
                <input type="email" required value={zohoForm.email} onChange={(e) => setZohoForm({ ...zohoForm, email: e.target.value })}
                  className="input" placeholder="contact@domain.com" />
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>The email address your leads will see.</p>
              </div>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>App Password / SMTP Key</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} required value={zohoForm.smtp_pass} onChange={(e) => setZohoForm({ ...zohoForm, smtp_pass: e.target.value })}
                    className="input" placeholder="••••••••••••" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 0', marginTop: 8, fontSize: 14 }}>
                Connect Account
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
