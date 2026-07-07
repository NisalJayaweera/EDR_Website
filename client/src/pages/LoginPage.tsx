import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setAuthToken } from '../lib/api';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundImage: 'radial-gradient(circle at top right, rgba(63, 198, 240, 0.15), transparent 40%)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/favicon.svg" alt="Neutronics Logo" style={{ width: '64px', height: '64px', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px', letterSpacing: '2px' }}>NEUTRONICS</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Cold Chain Intelligence</p>
        </div>

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
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
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

      </div>
    </div>
  );
}
