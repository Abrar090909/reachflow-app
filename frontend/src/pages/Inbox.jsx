import { useEffect, useState } from 'react';
import { getInbox, markRead, markInbox, replyInbox } from '../lib/api';
import { Inbox as InboxIcon, Mail, MailOpen, RefreshCw, ThumbsUp, ThumbsDown, Send, X } from 'lucide-react';

const SENTIMENT_STYLE = {
  positive: { background: '#dcfce7', border: '1px solid #86efac', color: '#15803d' },
  negative: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' },
  neutral:  { background: 'white',   border: '1px solid transparent', color: '#475569' },
};

const SENTIMENT_BADGE = {
  positive: { label: '✅ Interested',     bg: '#dcfce7', color: '#15803d' },
  negative: { label: '🚫 Not Interested', bg: '#fee2e2', color: '#991b1b' },
  neutral:  { label: '📩 Reply',          bg: '#f1f5f9', color: '#475569' },
};

export default function Inbox() {
  const [messages, setMessages]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [replying, setReplying]   = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending]     = useState(false);
  const [filter, setFilter]       = useState('all'); // all | positive | negative | neutral

  const fetchData = async () => {
    try { const { data } = await getInbox(); setMessages(data); } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSelect = async (msg) => {
    setSelected(msg);
    setReplying(false);
    setReplyBody('');
    if (!msg.is_read) { await markRead(msg.id); fetchData(); }
  };

  const handleMark = async (status) => {
    if (!selected) return;
    await markInbox(selected.id, status);
    setSelected({ ...selected, lead_status: status });
    fetchData();
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selected) return;
    setSending(true);
    try {
      await replyInbox(selected.id, replyBody);
      setReplying(false);
      setReplyBody('');
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const filtered = filter === 'all' ? messages : messages.filter(m => m.sentiment === filter);
  const unreadCount = messages.filter(m => !m.is_read).length;

  const tabStyle = (s) => ({
    padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
    textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.15s',
    background: s === filter ? 'white' : 'transparent',
    color: s === filter ? '#0f172a' : '#94a3b8',
    boxShadow: s === filter ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Inbox</h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>{unreadCount} unread · {messages.length} total replies</p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 14px' }}><RefreshCw size={16} /></button>
      </div>

      {/* Sentiment filter tabs */}
      <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2, marginBottom: 16, width: 'fit-content' }}>
        {['all', 'positive', 'negative', 'neutral'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={tabStyle(s)}>{s === 'all' ? 'All' : SENTIMENT_BADGE[s]?.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 210px)' }}>
        {/* Message List */}
        <div className="card" style={{ width: 320, flexShrink: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Replies ({filtered.length})</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length ? filtered.map((msg) => {
              const sentimentStyle = SENTIMENT_STYLE[msg.sentiment] || SENTIMENT_STYLE.neutral;
              const isActive = selected?.id === msg.id;
              return (
                <button key={msg.id} onClick={() => handleSelect(msg)} style={{
                  width: '100%', textAlign: 'left', padding: '14px 18px', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid #f8fafc', transition: 'background 0.15s',
                  background: isActive ? '#eff6ff' : !msg.is_read ? '#fafcff' : 'white',
                  borderLeft: `3px solid ${isActive ? '#3b82f6' : msg.sentiment === 'positive' ? '#22c55e' : msg.sentiment === 'negative' ? '#ef4444' : 'transparent'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {!msg.is_read ? <Mail size={12} color="#3b82f6" /> : <MailOpen size={12} color="#cbd5e1" />}
                    <p style={{ fontSize: 12, fontWeight: !msg.is_read ? 700 : 500, color: !msg.is_read ? '#0f172a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {msg.from_name || msg.from_email}
                    </p>
                    {msg.sentiment !== 'neutral' && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: msg.sentiment === 'positive' ? '#dcfce7' : '#fee2e2', color: msg.sentiment === 'positive' ? '#15803d' : '#991b1b', flexShrink: 0 }}>
                        {msg.sentiment === 'positive' ? '👍' : '👎'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 20 }}>{msg.subject}</p>
                  <p style={{ fontSize: 10, color: '#cbd5e1', paddingLeft: 20, marginTop: 2 }}>{new Date(msg.received_at).toLocaleString()}</p>
                </button>
              );
            }) : (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <InboxIcon size={32} color="#cbd5e1" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: '#94a3b8' }}>No replies yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: selected.sentiment === 'positive' ? '#f0fdf4' : selected.sentiment === 'negative' ? '#fff5f5' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{selected.subject}</h2>
                    <p style={{ fontSize: 13, color: '#64748b' }}>
                      From: <span style={{ fontWeight: 600, color: '#334155' }}>{selected.from_name || selected.from_email}</span>
                      {selected.from_name && <span style={{ color: '#94a3b8' }}> &lt;{selected.from_email}&gt;</span>}
                    </p>
                    {selected.campaign_name && <p style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, marginTop: 3 }}>Campaign: {selected.campaign_name}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(selected.received_at).toLocaleString()}</p>
                    {/* Fix #19: Sentiment badge */}
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, ...SENTIMENT_STYLE[selected.sentiment || 'neutral'] }}>
                      {SENTIMENT_BADGE[selected.sentiment || 'neutral']?.label}
                    </span>
                  </div>
                </div>

                {/* Fix #19: Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => handleMark('interested')} className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px', color: '#15803d', borderColor: '#86efac', background: '#f0fdf4' }}>
                    <ThumbsUp size={14} /> Interested
                  </button>
                  <button onClick={() => handleMark('not_interested')} className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px', color: '#991b1b', borderColor: '#fca5a5', background: '#fff5f5' }}>
                    <ThumbsDown size={14} /> Not Interested
                  </button>
                  <button onClick={() => setReplying(r => !r)} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px', marginLeft: 'auto' }}>
                    <Send size={14} /> {replying ? 'Cancel' : 'Reply'}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
                <pre style={{ fontSize: 14, color: '#334155', lineHeight: 1.7, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selected.body || <em style={{ color: '#94a3b8' }}>No content</em>}
                </pre>
              </div>

              {/* Fix #19: Reply compose */}
              {replying && (
                <div style={{ padding: '16px 24px', borderTop: '2px solid #e2e8f0', background: '#fafcff' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 8 }}>
                    Reply to {selected.from_name || selected.from_email}
                  </p>
                  <textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    rows={4}
                    className="input"
                    style={{ fontFamily: 'inherit', resize: 'vertical', marginBottom: 10 }}
                    placeholder="Type your reply..."
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setReplying(false); setReplyBody(''); }} className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px' }}>
                      <X size={14} /> Cancel
                    </button>
                    <button onClick={handleReply} disabled={sending || !replyBody.trim()} className="btn-primary" style={{ fontSize: 12, padding: '8px 16px', opacity: sending || !replyBody.trim() ? 0.5 : 1 }}>
                      <Send size={14} /> {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}
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
