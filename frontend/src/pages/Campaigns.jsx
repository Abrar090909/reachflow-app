import { useEffect, useState } from 'react';
import { getCampaigns, launchCampaign, pauseCampaign } from '../lib/api';
import CampaignCard from '../components/CampaignCard';
import { Plus, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const navigate = useNavigate();
  const fetchCampaigns = async () => {
    try { const { data } = await getCampaigns(); setCampaigns(data); } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchCampaigns(); }, []);
  const handleLaunch = async (id) => { await launchCampaign(id); fetchCampaigns(); };
  const handlePause = async (id) => { await pauseCampaign(id); fetchCampaigns(); };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Campaigns</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Create and manage outreach campaigns</p>
        </div>
        <button onClick={() => navigate('/campaigns/new')} className="btn-primary"><Plus size={16} /> New Campaign</button>
      </div>
      <div className="accounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {campaigns.map((c, i) => (
          <div key={c.id} className={`animate-fade-in stagger-${Math.min(i+1, 4)}`}>
            <CampaignCard campaign={c} onLaunch={handleLaunch} onPause={handlePause} />
          </div>
        ))}
      </div>
      {!campaigns.length && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon"><Zap size={28} color="#3b82f6" /></div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6, fontFamily: 'var(--font-display)' }}>No campaigns yet</h3>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 320, lineHeight: 1.6, marginBottom: 20 }}>Create your first outreach campaign with personalized emails and automated follow-ups.</p>
          <button onClick={() => navigate('/campaigns/new')} className="btn-primary"><Plus size={16} /> Create Campaign</button>
        </div>
      )}
    </div>
  );
}
