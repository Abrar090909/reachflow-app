import { useEffect, useState } from 'react';
import { getWarmupOverview, runWarmupNow, getWarmupLogs } from '../lib/api';
import { Flame, RefreshCw, Clock, Mail, Play, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function Warmup() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchData = async () => {
    try {
      const [overview, logsRes] = await Promise.all([
        getWarmupOverview(),
        getWarmupLogs()
      ]);
      setData(overview.data);
      setLogs(logsRes.data.logs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRunNow = async () => {
    if (running) return;
    setRunning(true);
    try {
      await runWarmupNow();
      setTimeout(() => fetchData(), 3000); // refresh after 3s to let sends complete
      alert('Warmup cycle triggered! Refresh in a few minutes to see results.');
    } catch (err) {
      alert('Warmup error: ' + (err.response?.data?.error || err.message));
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Warmup</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Build sender reputation automatically</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={handleRunNow} 
            disabled={running}
            className="btn-primary" 
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {running ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
            {running ? 'Running...' : 'Run Warmup Now'}
          </button>
          <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="stats-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card-stat" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Flame size={20} color="#d97706" />
          </div>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{data?.total_warming || 0}</p>
          <p className="section-label" style={{ marginTop: 6 }}>Accounts Warming</p>
        </div>
        <div className="card-stat">
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Mail size={20} color="#3b82f6" />
          </div>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{logs.length}</p>
          <p className="section-label" style={{ marginTop: 6 }}>Warmup Emails (last 50)</p>
        </div>
        <div className="card-stat">
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Clock size={20} color="#22c55e" />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>Every hour</p>
          <p className="section-label" style={{ marginTop: 6 }}>Schedule</p>
        </div>
      </div>

      {/* Warmup Accounts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Warmup Accounts</h2>
        </div>
        {data?.accounts?.length ? (
          <div>
            {data.accounts.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: i < data.accounts.length - 1 ? '1px solid #f8fafc' : 'none',
                transition: 'background 0.15s'
              }}
                onMouseOver={e => e.currentTarget.style.background = '#fafbfd'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: a.is_active ? '#10b981' : '#ef4444',
                    boxShadow: a.is_active ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(239,68,68,0.4)',
                    flexShrink: 0
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>{a.provider} · Health: {a.health_score}%</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>Stage {a.warmup_stage}/10</p>
                    <div className="progress-bar" style={{ width: 80, marginTop: 4 }}>
                      <div className="progress-bar-fill" style={{ width: `${(a.warmup_stage / 10) * 100}%`, background: 'linear-gradient(90deg, #fb923c, #ea580c)' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{a.sent_today}/{a.daily_send_limit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
              <Flame size={28} color="#d97706" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No accounts in warmup</p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Enable warmup from the Accounts page</p>
          </div>
        )}
      </div>

      {/* Warmup Log Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Warmup Log</h2>
        </div>
        {logs.length ? (
          <div className="table-scroll-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>From</th>
                  <th style={{ padding: '12px 4px', textAlign: 'center', width: 30 }}></th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>To</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>Subject</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>Reply</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.1s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#fafbfd'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#334155' }}>
                      {log.from_email?.split('@')[0]}@
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <ArrowRight size={12} color="#94a3b8" />
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: '#334155' }}>
                      {log.to_email?.split('@')[0]}@
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.subject}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      {log.reply_sent ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600, fontSize: 11 }}>
                          <CheckCircle size={13} /> Yes
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11 }}>
                          <XCircle size={13} /> Pending
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No warmup logs yet. Click "Run Warmup Now" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}
