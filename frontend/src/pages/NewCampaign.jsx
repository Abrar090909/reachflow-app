import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign, importLeads, previewCSV } from '../lib/api';
import { ArrowLeft, ArrowRight, Upload, Eye, Zap, Shuffle, TestTube } from 'lucide-react';

const STEPS = ['Basics', 'Email Content', 'A/B Test', 'Follow-ups', 'Settings', 'Review'];
const VARIABLES = ['{{first_name}}', '{{last_name}}', '{{company}}', '{{website}}', '{{custom_1}}', '{{custom_2}}'];
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];

const DEFAULT_FORM = {
  name: '', from_name: '', subject: '', body: '',
  subject_b: '', body_b: '', ab_split_percent: 50, enable_ab: false,
  follow_up_1_subject: '', follow_up_1_body: '', follow_up_1_delay_days: 3,  enable_fu1: false,
  follow_up_2_subject: '', follow_up_2_body: '', follow_up_2_delay_days: 5,  enable_fu2: false,
  follow_up_3_subject: '', follow_up_3_body: '', follow_up_3_delay_days: 7,  enable_fu3: false,
  follow_up_4_subject: '', follow_up_4_body: '', follow_up_4_delay_days: 10, enable_fu4: false,
  follow_up_5_subject: '', follow_up_5_body: '', follow_up_5_delay_days: 14, enable_fu5: false,
  daily_limit: 50,
  send_start_hour: 8, send_end_hour: 18,
  send_timezone: 'America/New_York',
  send_days: 'mon,tue,wed,thu,fri',
};

const DAY_OPTIONS = [
  { key: 'mon', label: 'M' }, { key: 'tue', label: 'T' }, { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' }, { key: 'fri', label: 'F' }, { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

export default function NewCampaign() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const insertVar = (field, v) => update(field, (form[field] || '') + v);

  const toggleDay = (day) => {
    const days = form.send_days.split(',').filter(Boolean);
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    update('send_days', next.join(','));
  };

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
      // Clean disabled follow-ups
      for (let n = 1; n <= 5; n++) {
        if (!payload[`enable_fu${n}`]) {
          payload[`follow_up_${n}_subject`] = null;
          payload[`follow_up_${n}_body`] = null;
        }
        delete payload[`enable_fu${n}`];
      }
      // Clean disabled A/B
      if (!payload.enable_ab) { payload.subject_b = null; payload.body_b = null; }
      delete payload.enable_ab;

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
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12,
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s',
    background: i === step ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : i < step ? '#dcfce7' : '#f1f5f9',
    color: i === step ? 'white' : i < step ? '#15803d' : '#94a3b8',
    boxShadow: i === step ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
  });

  const labelStyle = { display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' };
  const varBtnStyle = { fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer' };
  const spintaxHint = <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>💡 Spintax: <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>{'{Hello|Hi|Hey}'}</code> — picks one randomly per send</p>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
      <button onClick={() => navigate('/campaigns')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to Campaigns
      </button>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>New Campaign</h1>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={stepStyle(i)}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>

      {error && <div style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 16, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13, fontWeight: 600 }}>{error}</div>}

      <div className="card" style={{ padding: 28 }}>

        {/* ── Step 0: Basics ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Campaign Name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input" placeholder="Q2 SaaS Founders Outreach" />
            </div>
            <div>
              <label style={labelStyle}>Upload Leads (CSV)</label>
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

        {/* ── Step 1: Email Content ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>From Name</label>
              <input type="text" value={form.from_name} onChange={e => update('from_name', e.target.value)} className="input" placeholder="John Smith" />
            </div>
            <div>
              <label style={labelStyle}>Subject Line</label>
              <input type="text" value={form.subject} onChange={e => update('subject', e.target.value)} className="input" placeholder="Quick question about {{company}}" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {VARIABLES.map(v => <button key={v} onClick={() => insertVar('subject', v)} style={varBtnStyle}>{v}</button>)}
              </div>
              {spintaxHint}
            </div>
            <div>
              <label style={labelStyle}>Email Body (plain text)</label>
              <textarea value={form.body} onChange={e => update('body', e.target.value)} rows={10} className="input" style={{ fontFamily: 'monospace', resize: 'vertical' }}
                placeholder={'Hi {{first_name}},\n\nI noticed {{company}} and wanted to reach out...\n\nBest,\nJohn'} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {VARIABLES.map(v => <button key={v} onClick={() => insertVar('body', v)} style={varBtnStyle}>{v}</button>)}
              </div>
              {spintaxHint}
            </div>
            {form.body && (
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> Preview</label>
                <div style={{ padding: 20, borderRadius: 14, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}><strong>Subject:</strong> {form.subject.replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{company\}\}/g, 'Acme Inc')}</p>
                  <pre style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
                    {form.body.replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{last_name\}\}/g, 'Doe').replace(/\{\{company\}\}/g, 'Acme Inc').replace(/\{\{website\}\}/g, 'acme.com')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: A/B Test ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 16, background: form.enable_ab ? '#eff6ff' : '#f8fafc', border: `1px solid ${form.enable_ab ? '#bfdbfe' : '#f1f5f9'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TestTube size={18} color={form.enable_ab ? '#2563eb' : '#94a3b8'} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>A/B Split Test</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>Test two subject/body variants</p>
                </div>
              </div>
              <button onClick={() => update('enable_ab', !form.enable_ab)} className={`toggle-switch ${form.enable_ab ? 'active' : ''}`} />
            </div>

            {form.enable_ab && (
              <>
                <div style={{ padding: 4, background: '#f1f5f9', borderRadius: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', padding: '0 8px' }}>Split:</span>
                  <input type="range" min={10} max={90} step={5} value={form.ab_split_percent}
                    onChange={e => update('ab_split_percent', parseInt(e.target.value))}
                    style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', padding: '0 8px', minWidth: 80 }}>A:{form.ab_split_percent}% / B:{100 - form.ab_split_percent}%</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ padding: 16, borderRadius: 14, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#0369a1', marginBottom: 12 }}>VARIANT A (original)</p>
                    <p style={{ fontSize: 12, color: '#475569' }}>Subject: {form.subject || '—'}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, whiteSpace: 'pre-wrap' }}>{(form.body || '').slice(0, 80)}{form.body?.length > 80 ? '…' : ''}</p>
                  </div>
                  <div style={{ padding: 16, borderRadius: 14, background: '#fdf4ff', border: '1px solid #e9d5ff' }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#7c3aed', marginBottom: 12 }}>VARIANT B</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input type="text" value={form.subject_b} onChange={e => update('subject_b', e.target.value)} className="input" style={{ fontSize: 12, padding: '8px 12px' }} placeholder="Alternate subject line" />
                      <textarea value={form.body_b} onChange={e => update('body_b', e.target.value)} rows={4} className="input" style={{ fontFamily: 'monospace', resize: 'vertical', fontSize: 12, padding: '8px 12px' }} placeholder="Alternate email body..." />
                    </div>
                  </div>
                </div>
              </>
            )}

            {!form.enable_ab && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <TestTube size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: 14, fontWeight: 600 }}>Enable A/B testing above to split your leads between two email variants</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Follow-ups (1–5) ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3, 4, 5].map(n => {
              const enabled = form[`enable_fu${n}`];
              const prevEnabled = n === 1 ? true : form[`enable_fu${n - 1}`];
              return (
                <div key={n} style={{ padding: 18, borderRadius: 16, border: `1px solid ${enabled ? '#bfdbfe' : '#f1f5f9'}`, background: enabled ? '#fafcff' : 'white', opacity: !prevEnabled && n > 1 ? 0.4 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? 14 : 0 }}>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Follow-up {n}</h3>
                      {n > 1 && !prevEnabled && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Enable follow-up {n - 1} first</p>}
                    </div>
                    <button onClick={() => prevEnabled && update(`enable_fu${n}`, !enabled)} className={`toggle-switch ${enabled ? 'active' : ''}`} style={{ opacity: !prevEnabled && n > 1 ? 0.4 : 1 }} />
                  </div>
                  {enabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Subject</label>
                          <input type="text" value={form[`follow_up_${n}_subject`]} onChange={e => update(`follow_up_${n}_subject`, e.target.value)} className="input" placeholder="Re: Quick question" />
                        </div>
                        <div style={{ width: 110 }}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Delay (days)</label>
                          <input type="number" value={form[`follow_up_${n}_delay_days`]} onChange={e => update(`follow_up_${n}_delay_days`, parseInt(e.target.value))} className="input" min={1} />
                        </div>
                      </div>
                      <textarea value={form[`follow_up_${n}_body`]} onChange={e => update(`follow_up_${n}_body`, e.target.value)} rows={4} className="input" style={{ fontFamily: 'monospace', resize: 'vertical' }} placeholder={`Hi {{first_name}}, just following up on my last email...`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Step 4: Settings ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Daily Send Limit</label>
              <input type="number" value={form.daily_limit} onChange={e => update('daily_limit', parseInt(e.target.value))} className="input" min={1} max={500} />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Maximum emails per day for this campaign</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Send From (hour)</label>
                <input type="number" value={form.send_start_hour} onChange={e => update('send_start_hour', parseInt(e.target.value))} className="input" min={0} max={23} />
              </div>
              <div>
                <label style={labelStyle}>Send Until (hour)</label>
                <input type="number" value={form.send_end_hour} onChange={e => update('send_end_hour', parseInt(e.target.value))} className="input" min={1} max={24} />
              </div>
              <div>
                <label style={labelStyle}>Timezone</label>
                <select value={form.send_timezone} onChange={e => update('send_timezone', e.target.value)} className="input" style={{ fontSize: 12 }}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Send Days</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {DAY_OPTIONS.map(({ key, label }) => {
                  const active = form.send_days.split(',').includes(key);
                  return (
                    <button key={key} onClick={() => toggleDay(key)} style={{
                      width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
                      background: active ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f1f5f9',
                      color: active ? 'white' : '#94a3b8',
                      boxShadow: active ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                    }}>{label}</button>
                  );
                })}
              </div>
            </div>

            {csvPreview && (
              <div style={{ padding: 20, borderRadius: 16, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>📊 Estimated completion: <strong>{Math.ceil(csvPreview.totalRows / form.daily_limit)} days</strong></p>
                <p style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>{csvPreview.totalRows} leads at {form.daily_limit}/day</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Review ── */}
        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>Review Campaign</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Name',        value: form.name },
                { label: 'From',        value: form.from_name },
                { label: 'Subject',     value: form.subject, full: true },
                { label: 'Daily Limit', value: `${form.daily_limit}/day` },
                { label: 'Leads',       value: csvPreview?.totalRows || 0 },
                { label: 'Send Hours',  value: `${form.send_start_hour}:00–${form.send_end_hour}:00 ${form.send_timezone}` },
                { label: 'A/B Test',    value: form.enable_ab ? `${form.ab_split_percent}% / ${100 - form.ab_split_percent}%` : 'Disabled' },
                ...[1,2,3,4,5].map(n => ({ label: `Follow-up ${n}`, value: form[`enable_fu${n}`] ? `After ${form[`follow_up_${n}_delay_days`]} days` : 'Disabled' })),
              ].map((item, i) => (
                <div key={i} style={{ gridColumn: item.full ? 'span 2' : 'auto', padding: 14, borderRadius: 14, background: '#f8fafc' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 4 }}>{item.label}</p>
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
        {step < STEPS.length - 1 ? (
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
