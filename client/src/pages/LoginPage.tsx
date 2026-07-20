import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setAuthToken } from '../lib/api';
import toast from 'react-hot-toast';
import { LogIn, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        data: { identifier, password },
      });

      setAuthToken(data.token);
      toast.success('Login successful!');

      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        if (data.mustChangePassword) {
          toast('Please update your password', { icon: '🔒' });
          navigate('/settings');
        } else {
          navigate('/home');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);

    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        data: { identifier: forgotIdentifier },
      });
      toast.success(data.message || 'Recovery credentials sent!');
      setForgotIdentifier('');
      setIsForgot(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to request password reset');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundImage: 'radial-gradient(circle at top right, rgba(63, 198, 240, 0.15), transparent 40%)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/favicon.svg" alt="Neutronics Logo" style={{ width: '64px', height: '64px', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px', letterSpacing: '2px' }}>NEUTRONICS</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Cold Chain Intelligence</p>
        </div>

        {!isForgot ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>USERNAME</label>
              <input 
                type="text" 
                className="input-field" 
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required 
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>PASSWORD / PASSKEY</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="input-field" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                  placeholder="••••••••"
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-10px' }}>
              <button
                type="button"
                onClick={() => setIsForgot(true)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--accent-ice)', cursor: 'pointer',
                  fontSize: '0.8rem', padding: 0, textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? 'AUTHENTICATING...' : (
                <>
                  <span>ACCESS PORTAL</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-ice)', margin: '0 0 8px' }}>PASSWORD RECOVERY</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                Enter your username or email and we will send a temporary password via email and SMS.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>USERNAME OR EMAIL</label>
              <input 
                type="text" 
                className="input-field" 
                value={forgotIdentifier}
                onChange={e => setForgotIdentifier(e.target.value)}
                required 
                placeholder="e.g. john.doe or john@example.com"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={forgotLoading} style={{ marginTop: '10px' }}>
              {forgotLoading ? 'SENDING...' : (
                <>
                  <span>RESET PASSWORD</span>
                  <KeyRound size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsForgot(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                fontSize: '0.85rem', padding: '8px 0', marginTop: '4px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
