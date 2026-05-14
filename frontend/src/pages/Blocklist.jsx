import { useEffect, useState } from 'react';
import { getBlocklist, addBlocklist, deleteBlocklist } from '../lib/api';
import { Shield, Plus, Trash2, X } from 'lucide-react';

export default function Blocklist() {
  const [entries, setEntries]   = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ email: '', domain: '', reason: '' });
  const [loading, setLoading]   = useState(false);

  const fetchData = async () => {
    try { const { data } = await getBlocklist(); setEntries(data); } catch {}
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.email && !form.domain) return;
    setLoading(true);
    try {
      await addBlocklist(form);
      setForm({ email: '', domain: '', reason: '' });
      setShowAdd(false);
      fetchData();
    } catch {}
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    await deleteBlocklist(id);
    fetchData();
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={26} color="#ef4444" /> Blocklist
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>Emails and domains that will never receive outreach</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Entry
        </button>
      </div>

      <div className="table-container">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Email', 'Domain', 'Reason', 'Added', ''].map(h => (
                <th key={h} className="table-header" style={{ textAlign: 'left', background: '#f8fafc' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <Shield size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.2 }} />
                  No blocklist entries yet
                </td>
              </tr>
            ) : entries.map(e => (
              <tr key={e.id} className="table-row">
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#0f172a' }}>{e.email || '—'}</td>
                <td style={{ padding: '12px 20px', fontSize: 13, color: '#0f172a' }}>{e.domain || '—'}</td>
                <td style={{ padding: '12px 20px', fontSize: 12, color: '#64748b' }}>{e.reason || '—'}</td>
                <td style={{ padding: '12px 20px', fontSize: 11, color: '#94a3b8' }}>{new Date(e.added_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(e.id)} className="btn-danger" style={{ padding: '6px 12px', fontSize: 11 }}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Add to Blocklist</h2>
              <button onClick={() => setShowAdd(false)} style={{ width: 34, height: 34, border: '1px solid #e2e8f0', borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>Email (optional)</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" placeholder="john@competitor.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>Domain (optional)</label>
                <input type="text" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} className="input" placeholder="competitor.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>Reason</label>
                <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input" placeholder="Existing client, competitor..." />
              </div>
              <button onClick={handleAdd} disabled={loading || (!form.email && !form.domain)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: loading || (!form.email && !form.domain) ? 0.4 : 1 }}>
                <Shield size={15} /> {loading ? 'Adding...' : 'Add to Blocklist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
