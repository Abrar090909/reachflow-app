import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login({ username, password });
      localStorage.setItem('rf_token', data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      background: 'linear-gradient(135deg, #0d2352 0%, #0a1940 40%, #060f2e 100%)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative orbs */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.08), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, height: 800, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

      <div className="animate-fade-in" style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="pulse-glow" style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 22,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
            marginBottom: 20
          }}>
            <Zap size={28} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>ReachFlow</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 8 }}>Sign in to your outreach dashboard</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28, padding: 36,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)'
        }}>
          {error && (
            <div className="animate-fade" style={{
              marginBottom: 20, padding: '14px 18px', borderRadius: 14,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)',
              color: '#fca5a5', fontSize: 13, fontWeight: 500
            }}>{error}</div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label className="section-label" style={{ display: 'block', marginBottom: 10, color: 'rgba(255,255,255,0.3)' }}>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="input input-dark" placeholder="admin" required />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label className="section-label" style={{ display: 'block', marginBottom: 10, color: 'rgba(255,255,255,0.3)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="input input-dark" style={{ paddingRight: 48 }} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                transition: 'color 0.2s'
              }}
                onMouseOver={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px 0',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white', border: 'none', borderRadius: 16,
            fontSize: 14, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
            boxShadow: '0 4px 16px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            {loading ? 'Signing in...' : <><span>Sign In</span> <ArrowRight size={16} /></>}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>
          Self-hosted outreach platform
        </p>
      </div>
    </div>
  );
}
