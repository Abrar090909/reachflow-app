import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Mail, Users, Flame, Send, Inbox, BarChart3, LogOut, Zap } from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Mail, label: 'Accounts' },
  { to: '/warmup', icon: Flame, label: 'Warmup' },
  { to: '/campaigns', icon: Zap, label: 'Campaigns' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/inbox', icon: Inbox, label: 'Inbox' },
  { to: '/sent', icon: Send, label: 'Sent' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar fixed left-0 top-0 h-screen w-[260px] flex flex-col z-50">
      {/* Logo */}
      <div style={{ padding: '24px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="sidebar-logo" style={{ width: 42, height: 42, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
              ReachFlow
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 3 }}>
              Outreach Engine
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: '0 20px 8px', height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
        <p className="section-label" style={{ padding: '8px 16px 12px', color: 'rgba(255,255,255,0.2)' }}>
          Menu
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '16px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ 
          margin: '0 0 12px', 
          padding: '14px 16px', 
          borderRadius: 16, 
          background: 'rgba(37,99,235,0.08)', 
          border: '1px solid rgba(37,99,235,0.12)'
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>Pro Tip</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
            Add 2+ email accounts to enable warmup mode.
          </p>
        </div>
        <button
          onClick={() => { localStorage.removeItem('rf_token'); navigate('/login'); }}
          className="sidebar-nav-item"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
          onMouseOver={e => e.currentTarget.style.color = '#f87171'}
          onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        >
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
