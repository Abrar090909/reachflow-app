import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign, importLeads, previewCSV } from '../lib/api';
import { ArrowLeft, ArrowRight, Upload, Eye, Zap } from 'lucide-react';

const STEPS = ['Basics', 'Email Content', 'Follow-ups', 'Settings', 'Review'];
const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{company}}', '{{website}}', '{{custom_1}}', '{{custom_2}}'];

export default function NewCampaign() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', from_name: '', subject: '', body: '',
    follow_up_1_subject: '', follow_up_1_body: '', follow_up_1_delay_days: 3, enable_fu1: false,
    follow_up_2_subject: '', follow_up_2_body: '', follow_up_2_delay_days: 5, enable_fu2: false,
    daily_limit: 50,
  });
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();

  const update = (key, val) => setForm({ ...form, [key]: val });
  const insertVar = (field, v) => update(field, form[field] + v);

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    const fd = new FormData(); fd.append('file', file);
    try { const { data } = await previewCSV(fd); setCsvPreview(data); } catch { setError('Failed to preview CSV'); }
  };

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.enable_fu1) { payload.follow_up_1_subject = null; payload.follow_up_1_body = null; }
      if (!payload.enable_fu2) { payload.follow_up_2_subject = null; payload.follow_up_2_body = null; }
      delete payload.enable_fu1; delete payload.enable_fu2;
      const { data } = await createCampaign(payload);
      if (csvFile) {
        const fd = new FormData(); fd.append('file', csvFile); fd.append('campaign_id', data.id);
        await importLeads(fd);
      }
      navigate('/campaigns');
    } catch (err) { setError(err.response?.data?.error || 'Failed to create campaign'); }
    finally { setLoading(false); }
  };

  const stepStyle = (i) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 14,
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
    border: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s',
    background: i === step ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : i < step ? '#dcfce7' : '#f1f5f9',
    color: i === step ? 'white' : i < step ? '#15803d' : '#94a3b8',
    boxShadow: i === step ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      <button onClick={() => navigate('/campaigns')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Campaigns
      </button>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 24 }}>New Campaign</h1>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={stepStyle(i)}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {error && <div className="animate-fade" style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 16, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13, fontWeight: 600 }}>{error}</div>}

      <div className="card" style={{ padding: 28 }}>
        {/* Step 0: Basics */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Campaign Name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input" placeholder="Q2 SaaS Founders Outreach" />
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Upload Leads (CSV)</label>
              <input type="file" ref={fileRef} accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '32px 24px', border: '2px dashed #e2e8f0', borderRadius: 16, background: 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#f0f7ff'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
              >
                <Upload size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{csvFile ? csvFile.name : 'Click to upload CSV'}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Required: email · Optional: first_name, last_name, company</p>
              </button>
            </div>
            {csvPreview && (
              <div style={{ padding: 16, borderRadius: 14, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>{csvPreview.totalRows} rows · {csvPreview.columns.join(', ')}</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                    <thead><tr>{csvPreview.columns.map(c => <th key={c} style={{ textAlign: 'left', padding: '6px 8px', color: '#94a3b8', fontWeight: 700 }}>{c}</th>)}</tr></thead>
                    <tbody>{csvPreview.preview.map((row, i) => <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>{csvPreview.columns.map(c => <td key={c} style={{ padding: '6px 8px', color: '#475569' }}>{row[c]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Email Content */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>From Name</label>
              <input type="text" value={form.from_name} onChange={e => update('from_name', e.target.value)} className="input" placeholder="John Smith" />
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Subject Line</label>
              <input type="text" value={form.subject} onChange={e => update('subject', e.target.value)} className="input" placeholder="Quick question about {{company}}" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {VARIABLES.map(v => <button key={v} onClick={() => insertVar('subject', v)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer' }}>{v}</button>)}
              </div>
            </div>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Email Body (HTML)</label>
              <textarea value={form.body} onChange={e => update('body', e.target.value)} rows={10} className="input" style={{ fontFamily: 'monospace', resize: 'vertical' }}
                placeholder={'<p>Hi {{first_name}},</p>\n<p>I noticed {{company}} and wanted to reach out...</p>'} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {VARIABLES.map(v => <button key={v} onClick={() => insertVar('body', v)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer' }}>{v}</button>)}
              </div>
            </div>
            {form.body && (
              <div>
                <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}><Eye size={12} /> Preview</label>
                <div style={{ padding: 20, borderRadius: 14, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}><strong>Subject:</strong> {form.subject.replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{company\}\}/g, 'Acme Inc')}</p>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: form.body.replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{last_name\}\}/g, 'Doe').replace(/\{\{company\}\}/g, 'Acme Inc').replace(/\{\{website\}\}/g, 'acme.com') }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Follow-ups */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[1, 2].map(n => {
              const enabled = form[`enable_fu${n}`];
              return (
                <div key={n} style={{ padding: 20, borderRadius: 16, border: `1px solid ${enabled ? '#bfdbfe' : '#f1f5f9'}`, background: enabled ? '#fafcff' : 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? 16 : 0 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Follow-up {n}</h3>
                    <button onClick={() => update(`enable_fu${n}`, !enabled)} className={`toggle-switch ${enabled ? 'active' : ''}`} />
                  </div>
                  {enabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Subject</label>
                          <input type="text" value={form[`follow_up_${n}_subject`]} onChange={e => update(`follow_up_${n}_subject`, e.target.value)} className="input" placeholder="Re: Quick question" />
                        </div>
                        <div style={{ width: 100 }}>
                          <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Delay (days)</label>
                          <input type="number" value={form[`follow_up_${n}_delay_days`]} onChange={e => update(`follow_up_${n}_delay_days`, parseInt(e.target.value))} className="input" min={1} />
                        </div>
                      </div>
                      <textarea value={form[`follow_up_${n}_body`]} onChange={e => update(`follow_up_${n}_body`, e.target.value)} rows={4} className="input" style={{ fontFamily: 'monospace', resize: 'vertical' }} placeholder={`<p>Hi {{first_name}}, just following up...</p>`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 8 }}>Daily Send Limit</label>
              <input type="number" value={form.daily_limit} onChange={e => update('daily_limit', parseInt(e.target.value))} className="input" min={1} max={500} />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Maximum emails sent per day for this campaign</p>
            </div>
            {csvPreview && (
              <div style={{ padding: 20, borderRadius: 16, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>📊 Estimated completion: <strong>{Math.ceil(csvPreview.totalRows / form.daily_limit)} days</strong></p>
                <p style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>{csvPreview.totalRows} leads at {form.daily_limit}/day</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 20 }}>Review Campaign</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Name', value: form.name },
                { label: 'From', value: form.from_name },
                { label: 'Subject', value: form.subject, full: true },
                { label: 'Daily Limit', value: `${form.daily_limit}/day` },
                { label: 'Leads', value: csvPreview?.totalRows || 0 },
                { label: 'Follow-up 1', value: form.enable_fu1 ? `After ${form.follow_up_1_delay_days} days` : 'Disabled' },
                { label: 'Follow-up 2', value: form.enable_fu2 ? `After ${form.follow_up_2_delay_days} days` : 'Disabled' },
              ].map((item, i) => (
                <div key={i} style={{ gridColumn: item.full ? 'span 2' : 'auto', padding: 16, borderRadius: 14, background: '#f8fafc' }}>
                  <p className="section-label" style={{ marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-secondary" style={{ opacity: step === 0 ? 0.3 : 1 }}>
          <ArrowLeft size={16} /> Back
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} className="btn-primary"><span>Next</span> <ArrowRight size={16} /></button>
        ) : (
          <button onClick={handleCreate} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
            <Zap size={16} /> {loading ? 'Creating...' : 'Create Campaign'}
          </button>
        )}
      </div>
    </div>
  );
}
