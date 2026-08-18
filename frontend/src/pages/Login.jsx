import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gov-bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/traffiq_logo.png" 
            alt="TRAFFIQ Logo" 
            style={{ height: '70px', maxWidth: '100%', objectFit: 'contain', marginBottom: '0.75rem' }} 
          />
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gov-text-muted)', fontWeight: '600' }}>
            Intelligent Traffic Management System — Secure Control Portal
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gov-text-muted)' }}>
            Sign In
          </h2>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: '#fca5a5' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--gov-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="Enter username"
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '6px',
                  border: '1px solid #334155', background: '#0f172a', color: '#fff',
                  fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--gov-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  style={{
                    width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '6px',
                    border: '1px solid #334155', background: '#0f172a', color: '#fff',
                    fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
                  }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '6px', border: 'none',
                background: loading ? '#334155' : '#2563eb', color: '#fff',
                fontWeight: '700', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s', marginTop: '0.5rem'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Demo Credentials (Prototype)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              <div><span style={{ color: '#60a5fa' }}>admin</span> / admin123 — Full Access</div>
              <div><span style={{ color: '#10b981' }}>officer</span> / officer123 — Traffic Officer</div>
              <div><span style={{ color: '#8b5cf6' }}>operator</span> / operator123 — Control Room</div>
              <div><span style={{ color: '#f59e0b' }}>analyst</span> / analyst123 — Analytics</div>
              <div><span style={{ color: '#64748b' }}>viewer</span> / viewer123 — Read Only</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
