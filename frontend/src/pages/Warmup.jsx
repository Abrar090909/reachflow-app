import { useEffect, useState } from 'react';
import { getWarmupOverview } from '../lib/api';
import { Flame, RefreshCw, Clock, Mail, Zap } from 'lucide-react';

export default function Warmup() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try { const { data: d } = await getWarmupOverview(); setData(d); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Warmup</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Build sender reputation automatically</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
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
          <p style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{data?.activity?.length || 0}</p>
          <p className="section-label" style={{ marginTop: 6 }}>Recent Warmup Emails</p>
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

      {/* Activity Log */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Warmup Activity</h2>
        </div>
        {data?.activity?.length ? (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {data.activity.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 24px', borderBottom: i < data.activity.length - 1 ? '1px solid #f8fafc' : 'none'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{a.from_email}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>{a.subject}</p>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{new Date(a.sent_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No warmup activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
