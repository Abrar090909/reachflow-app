import { useEffect, useState, useRef } from 'react';
import { getLeads, getCampaigns, importLeads, previewCSV, deleteLead } from '../lib/api';
import LeadTable from '../components/LeadTable';
import { Upload, Download, X, Users } from 'lucide-react';

const STATUS_TABS = ['all', 'pending', 'sent', 'opened', 'replied', 'bounced'];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importCampaign, setImportCampaign] = useState('');
  const fileRef = useRef();

  const fetchData = async () => {
    try {
      const [lr, cr] = await Promise.all([getLeads({ campaign_id: selectedCampaign || undefined, status: statusFilter }), getCampaigns()]);
      setLeads(lr.data); setCampaigns(cr.data);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchData(); }, [selectedCampaign, statusFilter]);

  const handleCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setCsvFile(file);
    const fd = new FormData(); fd.append('file', file);
    try { const { data } = await previewCSV(fd); setCsvPreview(data); } catch {}
  };

  const handleImport = async () => {
    if (!csvFile || !importCampaign) return;
    const fd = new FormData(); fd.append('file', csvFile); fd.append('campaign_id', importCampaign);
    try { const { data } = await importLeads(fd); setImportResult(data); fetchData(); } catch {}
  };

  const handleDelete = async (id) => { await deleteLead(id); fetchData(); };

  const exportCSV = () => {
    const header = 'First Name,Last Name,Email,Company,Status,Sent At\n';
    const rows = leads.map(l => `${l.first_name||''},${l.last_name||''},${l.email},${l.company||''},${l.status},${l.sent_at||''}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'leads_export.csv'; a.click();
  };

  const tabStyle = (s) => ({
    padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.05em', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
    background: s === statusFilter ? 'white' : 'transparent',
    color: s === statusFilter ? '#0f172a' : '#94a3b8',
    boxShadow: s === statusFilter ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Leads</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{leads.length} leads loaded</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCSV} className="btn-secondary"><Download size={16} /> Export</button>
          <button onClick={() => setShowImport(true)} className="btn-primary"><Upload size={16} /> Import CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)} className="input" style={{ width: 'auto', minWidth: 180, padding: '10px 14px', fontSize: 13 }}>
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 3 }}>
          {STATUS_TABS.map(s => <button key={s} onClick={() => setStatusFilter(s)} style={tabStyle(s)}>{s}</button>)}
        </div>
      </div>

      <LeadTable leads={leads} onDelete={handleDelete} />

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => { setShowImport(false); setCsvFile(null); setCsvPreview(null); setImportResult(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Import Leads</h2>
              <button onClick={() => setShowImport(false)} style={{ width: 36, height: 36, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>
            {importResult ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginBottom: 8 }}>Import Complete!</p>
                <p style={{ fontSize: 13, color: '#475569' }}>{importResult.imported} imported · {importResult.skipped} skipped · {importResult.duplicates} duplicates</p>
                <button onClick={() => { setShowImport(false); setImportResult(null); setCsvFile(null); setCsvPreview(null); }} className="btn-primary" style={{ marginTop: 20 }}>Done</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <select value={importCampaign} onChange={e => setImportCampaign(e.target.value)} className="input" style={{ fontSize: 13 }}>
                  <option value="">Select Campaign</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="file" ref={fileRef} accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '24px', border: '2px dashed #e2e8f0', borderRadius: 16, background: 'white', cursor: 'pointer', textAlign: 'center' }}>
                  <Upload size={20} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{csvFile ? csvFile.name : 'Drop CSV here'}</p>
                </button>
                {csvPreview && <p style={{ fontSize: 11, color: '#94a3b8' }}>{csvPreview.totalRows} rows · {csvPreview.columns.join(', ')}</p>}
                <button onClick={handleImport} disabled={!csvFile || !importCampaign} className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: (!csvFile || !importCampaign) ? 0.4 : 1 }}>Import Leads</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
