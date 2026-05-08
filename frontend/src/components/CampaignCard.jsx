import { Zap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CampaignCard({ campaign, onLaunch, onPause }) {
  const navigate = useNavigate();
  const replyRate = campaign.sent_count > 0 ? ((campaign.reply_count / campaign.sent_count) * 100).toFixed(1) : '0.0';

  return (
    <div className="card" style={{ padding: 24, cursor: 'pointer' }} onClick={() => navigate(`/campaigns`)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.name}</h3>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Created {new Date(campaign.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`badge badge-${campaign.status}`}>{campaign.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Sent', value: campaign.sent_count, color: '#0f172a' },
          { label: 'Leads', value: campaign.total_leads || 0, color: '#0f172a' },
          { label: 'Reply', value: `${replyRate}%`, color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '10px 0', background: '#f8fafc', borderRadius: 12 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
            <p className="section-label" style={{ marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
        {campaign.status === 'draft' && (
          <button onClick={() => onLaunch(campaign.id)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 12 }}>
            <Zap size={14} /> Launch
          </button>
        )}
        {campaign.status === 'active' && (
          <button onClick={() => onPause(campaign.id)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 12, background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}>
            Pause
          </button>
        )}
        {campaign.status === 'paused' && (
          <button onClick={() => onLaunch(campaign.id)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 12, background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
            Resume
          </button>
        )}
      </div>
    </div>
  );
}
