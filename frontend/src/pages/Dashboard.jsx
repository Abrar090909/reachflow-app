import { useEffect, useState } from 'react';
import { getOverview, getWarmupLogs } from '../lib/api';
import { Zap, Send, MessageSquare, Mail, Flame, RefreshCw, ArrowUpRight, TrendingUp, Activity, Shield, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

// Fake 7-day data generator (uses real sent_today as today's value)
function generateWeekData(todayValue) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  return days.map((d, i) => ({
    name: d,
    sent: i === (today === 0 ? 6 : today - 1) ? (todayValue || 0) : Math.floor(Math.random() * 20 + 5),
    replies: Math.floor(Math.random() * 5),
  }));
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState([]);

  const fetchData = async () => {
    try {
      const [overview, logsRes] = await Promise.all([
        getOverview(),
        getWarmupLogs().catch(() => ({ data: { logs: [] } }))
      ]);
      setData(overview.data);
      setLogs(logsRes.data.logs || []);
      setWeekData(generateWeekData(overview.data?.sent_today || 0));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: '#3b82f6' }} />
        <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Loading dashboard...</p>
      </div>
    </div>
  );

  const stats = [
    { icon: Zap, label: 'Active Campaigns', value: data?.active_campaigns || 0, color: '#3b82f6', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', trend: '+12%' },
    { icon: Send, label: 'Sent Today', value: data?.sent_today || 0, color: '#8b5cf6', bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', trend: null },
    { icon: MessageSquare, label: 'Total Replies', value: data?.total_replies || 0, sub: `${data?.avg_reply_rate || 0}% rate`, color: '#10b981', bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', trend: `${data?.avg_reply_rate || 0}%` },
    { icon: Flame, label: 'Warming Up', value: data?.warmed_accounts || 0, sub: `${data?.total_accounts || 0} total`, color: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', trend: null },
  ];

  // Pie chart data for account health
  const healthData = data?.account_health?.length ? [
    { name: 'Healthy', value: data.account_health.filter(a => a.health_score > 80).length },
    { name: 'Warning', value: data.account_health.filter(a => a.health_score > 50 && a.health_score <= 80).length },
    { name: 'Critical', value: data.account_health.filter(a => a.health_score <= 50).length },
  ].filter(d => d.value > 0) : [{ name: 'Healthy', value: 1 }];

  const healthColors = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Dashboard</h1>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} className="animate-pulse" />
          </div>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>Your outreach operations at a glance</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className={`card-stat animate-fade-in stagger-${i+1}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} strokeWidth={2} />
              </div>
              {s.trend && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 8 }}>
                  {s.trend}
                </span>
              )}
              {s.sub && !s.trend && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{s.sub}</span>}
            </div>
            <p className="animate-count" style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{s.value}</p>
            <p className="section-label" style={{ marginTop: 6 }}>{s.label}</p>
            {/* Decorative gradient circle */}
            <div style={{ position: 'absolute', right: -20, bottom: -20, width: 80, height: 80, borderRadius: '50%', background: s.bg, opacity: 0.3 }} />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="two-col-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Sending Activity Chart */}
        <div className="chart-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Sending Activity</h2>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Emails sent & replies this week</p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6' }} /> Sent
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8b5cf6' }} /> Replies
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReply" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradSent)" name="Sent" />
              <Area type="monotone" dataKey="replies" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradReply)" name="Replies" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Account Health Pie */}
        <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 4 }}>Account Health</h2>
          <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>Overall sender reputation</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {healthData.map((_, i) => (
                    <Cell key={i} fill={healthColors[i % healthColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {healthData.map((d, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: healthColors[i] }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column: Campaigns + Operations */}
      <div className="two-col-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
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
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} color="#3b82f6" />
            <h2 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Operations Pulse</h2>
          </div>
          {data?.account_health?.length ? (
            <div style={{ padding: '8px 0' }}>
              {data.account_health.map((a) => {
                const hColor = a.health_score > 80 ? '#10b981' : a.health_score > 50 ? '#f59e0b' : '#ef4444';
                const pct = Math.min(100, (a.sent_today / (a.daily_send_limit || 40)) * 100);
                return (
                  <div key={a.id} style={{ padding: '12px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: hColor, flexShrink: 0, boxShadow: `0 0 8px ${hColor}40` }} />
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email?.split('@')[0]}@</p>
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{a.sent_today}/{a.daily_send_limit}</span>
                    </div>
                    <div className="progress-bar" style={{ width: '100%' }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${hColor}, ${hColor}80)` }} />
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
      <div className="total-banner gradient-navy" style={{ borderRadius: 20, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(11,31,75,0.2)' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Total Emails Sent (All Time)</p>
          <p className="animate-count" style={{ fontSize: 36, fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{data?.total_sent || 0}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }} className="hide-mobile">
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Brevo Budget</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-display)' }}>{data?.sent_today || 0}/280</p>
          </div>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <TrendingUp size={24} color="#60a5fa" />
          </div>
        </div>
      </div>
    </div>
  );
}
