import { useEffect, useState } from 'react';
import { getOverview } from '../lib/api';
import { Zap, Send, MessageSquare, Mail, Flame, RefreshCw, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try { const { data: d } = await getOverview(); setData(d); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
        <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Loading dashboard...</p>
      </div>
    </div>
  );

  const stats = [
    { icon: Zap, label: 'Active Campaigns', value: data?.active_campaigns || 0, color: '#3b82f6', bg: '#eff6ff' },
    { icon: Send, label: 'Sent Today', value: data?.sent_today || 0, color: '#8b5cf6', bg: '#f5f3ff' },
    { icon: MessageSquare, label: 'Total Replies', value: data?.total_replies || 0, sub: `${data?.avg_reply_rate || 0}% rate`, color: '#10b981', bg: '#ecfdf5' },
    { icon: Flame, label: 'Accounts Warmed', value: data?.warmed_accounts || 0, sub: `${data?.total_accounts || 0} total`, color: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Your outreach operations at a glance</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className={`card-stat animate-fade-in stagger-${i+1}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} strokeWidth={2} />
              </div>
              {s.sub && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{s.sub}</span>}
            </div>
            <p style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{s.value}</p>
            <p className="section-label" style={{ marginTop: 6 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Recent Campaigns */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Campaigns</h2>
            <a href="/campaigns" style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowUpRight size={12} />
            </a>
          </div>
          {data?.recent_campaigns?.length ? (
            <div>
              {data.recent_campaigns.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: i < data.recent_campaigns.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.background = '#fafbfd'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>{c.total_leads || 0} leads · {c.sent_count} sent</p>
                  </div>
                  <span className={`badge badge-${c.status}`}>{c.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 48 }}>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>No campaigns yet</p>
            </div>
          )}
        </div>

        {/* Operations Pulse */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Operations Pulse</h2>
          </div>
          {data?.account_health?.length ? (
            <div style={{ padding: '8px 0' }}>
              {data.account_health.map((a) => {
                const hColor = a.health_score > 80 ? '#10b981' : a.health_score > 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: hColor, flexShrink: 0, boxShadow: `0 0 8px ${hColor}40` }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8' }}>{a.sent_today}/{a.daily_send_limit} · {a.health_score}% health</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 48 }}>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>No accounts connected</p>
            </div>
          )}
        </div>
      </div>

      {/* Total Emails Banner */}
      <div className="gradient-navy" style={{ borderRadius: 20, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(11,31,75,0.2)' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Total Emails Sent (All Time)</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{data?.total_sent || 0}</p>
        </div>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <TrendingUp size={24} color="#60a5fa" />
        </div>
      </div>
    </div>
  );
}
