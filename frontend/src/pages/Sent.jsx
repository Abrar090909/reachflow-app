import { useEffect, useState } from 'react';
import { getSentEmails } from '../lib/api';
import { Send, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function Sent() {
  const [data, setData] = useState({ emails: [], total: 0, page: 1, pages: 0 });
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    try { const { data: d } = await getSentEmails(page); setData(d); } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchData(); }, [page]);

  const typeStyle = {
    initial: { bg: '#eff6ff', color: '#1d4ed8' },
    follow_up_1: { bg: '#f5f3ff', color: '#7c3aed' },
    follow_up_2: { bg: '#eef2ff', color: '#4338ca' },
    test: { bg: '#f1f5f9', color: '#64748b' },
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Sent Emails</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{data.total} emails sent</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px' }}><RefreshCw size={16} /></button>
      </div>

      <div className="table-container">
        {data.emails.length ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['To', 'Subject', 'Campaign', 'From', 'Type', 'Sent At'].map(h => (
                      <th key={h} className="table-header" style={{ textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.emails.map((e) => {
                    const ts = typeStyle[e.email_type] || typeStyle.test;
                    return (
                      <tr key={e.id} className="table-row">
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a', fontSize: 12 }}>{e.to_email || '—'}</td>
                        <td style={{ padding: '14px 20px', color: '#475569', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</td>
                        <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>{e.campaign_name || '—'}</td>
                        <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>{e.from_email || '—'}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: ts.bg, color: ts.color }}>
                            {e.email_type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>{new Date(e.sent_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>Page {data.page} of {data.pages}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: page <= 1 ? 0.3 : 1 }}>
                  <ChevronLeft size={16} color="#64748b" />
                </button>
                <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page >= data.pages} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: page >= data.pages ? 0.3 : 1 }}>
                  <ChevronRight size={16} color="#64748b" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Send size={28} color="#3b82f6" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No emails sent yet</p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Emails will appear here once campaigns start sending</p>
          </div>
        )}
      </div>
    </div>
  );
}
