export default function LeadTable({ leads, onUpdateStatus, onDelete }) {
  const statusColors = {
    pending: { bg: '#f1f5f9', color: '#64748b' },
    sent: { bg: '#dbeafe', color: '#1d4ed8' },
    opened: { bg: '#ede9fe', color: '#6d28d9' },
    replied: { bg: '#dcfce7', color: '#15803d' },
    bounced: { bg: '#fef2f2', color: '#dc2626' },
    unsubscribed: { bg: '#f1f5f9', color: '#94a3b8' },
  };

  if (!leads?.length) {
    return (
      <div className="empty-state" style={{ marginTop: 20 }}>
        <div className="empty-state-icon">
          <svg width="24" height="24" fill="none" stroke="#3b82f6" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>No leads found</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Import a CSV to get started</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            {['Name', 'Email', 'Company', 'Status', 'Sent At', ''].map(h => (
              <th key={h} className="table-header" style={{ textAlign: h === '' ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const sc = statusColors[lead.status] || statusColors.pending;
            return (
              <tr key={lead.id} className="table-row">
                <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>{lead.first_name} {lead.last_name}</td>
                <td style={{ padding: '14px 20px', color: '#475569' }}>{lead.email}</td>
                <td style={{ padding: '14px 20px', color: '#94a3b8' }}>{lead.company || '—'}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 100, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: sc.bg, color: sc.color }}>
                    {lead.status}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', color: '#94a3b8', fontSize: 12 }}>{lead.sent_at ? new Date(lead.sent_at).toLocaleString() : '—'}</td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <button onClick={() => onDelete(lead.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14, transition: 'color 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
                  >✕</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
