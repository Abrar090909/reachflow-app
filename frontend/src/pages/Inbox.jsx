import { useEffect, useState } from 'react';
import { getInbox, markRead } from '../lib/api';
import { Inbox as InboxIcon, Mail, MailOpen, RefreshCw } from 'lucide-react';

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchData = async () => {
    try { const { data } = await getInbox(); setMessages(data); } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSelect = async (msg) => {
    setSelected(msg);
    if (!msg.is_read) { await markRead(msg.id); fetchData(); }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Inbox</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{unreadCount} unread replies</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px' }}><RefreshCw size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 180px)' }}>
        {/* Message List */}
        <div className="card" style={{ width: 320, flexShrink: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <p className="section-label">Replies ({messages.length})</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {messages.length ? messages.map((msg) => (
              <button key={msg.id} onClick={() => handleSelect(msg)} style={{
                width: '100%', textAlign: 'left', padding: '14px 20px', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid #f8fafc', transition: 'background 0.15s',
                background: selected?.id === msg.id ? '#eff6ff' : !msg.is_read ? '#fafcff' : 'white',
                borderLeft: selected?.id === msg.id ? '3px solid #3b82f6' : '3px solid transparent',
              }}
                onMouseOver={e => { if (selected?.id !== msg.id) e.currentTarget.style.background = '#fafbfd'; }}
                onMouseOut={e => { if (selected?.id !== msg.id) e.currentTarget.style.background = !msg.is_read ? '#fafcff' : 'white'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {!msg.is_read ? <Mail size={12} color="#3b82f6" /> : <MailOpen size={12} color="#cbd5e1" />}
                  <p style={{ fontSize: 12, fontWeight: !msg.is_read ? 700 : 500, color: !msg.is_read ? '#0f172a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.from_name || msg.from_email}
                  </p>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 20 }}>{msg.subject}</p>
                <p style={{ fontSize: 10, color: '#cbd5e1', paddingLeft: 20, marginTop: 2 }}>{new Date(msg.received_at).toLocaleString()}</p>
              </button>
            )) : (
              <div className="empty-state" style={{ padding: '48px 20px' }}>
                <InboxIcon size={32} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 13, color: '#94a3b8' }}>No replies yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{selected.subject}</h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                      From: <span style={{ fontWeight: 600, color: '#334155' }}>{selected.from_name || selected.from_email}</span>
                      {selected.from_name && <span style={{ color: '#94a3b8' }}> &lt;{selected.from_email}&gt;</span>}
                    </p>
                    {selected.campaign_name && <p style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>Campaign: {selected.campaign_name}</p>}
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{new Date(selected.received_at).toLocaleString()}</p>
                </div>
              </div>
              <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
                <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: selected.body || '<p style="color:#94a3b8;font-style:italic">No content</p>' }} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <MailOpen size={48} color="#e2e8f0" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
