import { Flame, Send, Trash2, Heart } from 'lucide-react';

export default function AccountCard({ account, onToggleWarmup, onDelete, onTest }) {
  const healthColor = account.health_score > 80 ? '#10b981' : account.health_score > 50 ? '#f59e0b' : '#ef4444';
  const healthBg = account.health_score > 80 ? '#ecfdf5' : account.health_score > 50 ? '#fffbeb' : '#fef2f2';
  const provider = account.provider === 'gmail' ? { label: 'Gmail', color: '#4285f4', bg: '#eff6ff' } : { label: 'Zoho', color: '#10b981', bg: '#ecfdf5' };
  const sendPercent = Math.min(100, (account.sent_today / account.daily_send_limit) * 100);

  return (
    <div className="card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.email}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: provider.bg, color: provider.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {provider.label}
            </span>
            {account.is_active ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#dcfce7', color: '#15803d' }}>Active</span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#fef2f2', color: '#dc2626' }}>Inactive</span>
            )}
          </div>
        </div>
        <div style={{ 
          padding: '6px 14px', borderRadius: 14, background: healthBg, 
          display: 'flex', alignItems: 'center', gap: 6 
        }}>
          <Heart size={12} color={healthColor} fill={healthColor} />
          <span style={{ fontSize: 13, fontWeight: 800, color: healthColor }}>{account.health_score}%</span>
        </div>
      </div>

      {/* Send Progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Sent today</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{account.sent_today} / {account.daily_send_limit}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ 
            width: `${sendPercent}%`, 
            background: sendPercent > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #3b82f6, #2563eb)' 
          }} />
        </div>
      </div>

      {/* Warmup */}
      <div style={{ 
        padding: '14px 16px', borderRadius: 14, 
        background: account.warmup_enabled ? 'rgba(251,146,60,0.06)' : '#f8fafc',
        border: account.warmup_enabled ? '1px solid rgba(251,146,60,0.12)' : '1px solid #f1f5f9',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame size={16} color={account.warmup_enabled ? '#f97316' : '#cbd5e1'} fill={account.warmup_enabled ? '#f97316' : 'none'} />
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: account.warmup_enabled ? '#c2410c' : '#64748b' }}>Warmup</span>
              {account.warmup_enabled && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fb923c', marginLeft: 8 }}>Stage {account.warmup_stage}/10</span>
              )}
            </div>
          </div>
          <button
            onClick={() => onToggleWarmup(account.id)}
            className={`toggle-switch ${account.warmup_enabled ? 'active' : ''}`}
          />
        </div>
        {account.warmup_enabled && (
          <div className="progress-bar" style={{ marginTop: 10, height: 3 }}>
            <div className="progress-bar-fill" style={{ 
              width: `${(account.warmup_stage / 10) * 100}%`, 
              background: 'linear-gradient(90deg, #fb923c, #f97316, #ea580c)' 
            }} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onTest(account.id)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 12 }}>
          <Send size={13} /> Test Send
        </button>
        <button onClick={() => onDelete(account.id)} style={{ 
          width: 40, height: 40, borderRadius: 12, border: '1px solid #f1f5f9', background: 'white', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
          color: '#cbd5e1'
        }}
          onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
