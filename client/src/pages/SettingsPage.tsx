import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showCurrent, setShowCurrent]           = useState(false);
  const [showNew, setShowNew]                   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [fieldError, setFieldError]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');

    if (newPassword.length < 8) {
      setFieldError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/users/me/password', {
        method: 'POST',
        data: { currentPassword, newPassword },
      });
      toast.success('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({
    label, value, show, onShow, onChange, id,
  }: {
    label: string; value: string; show: boolean;
    onShow: () => void; onChange: (v: string) => void; id: string;
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label htmlFor={id} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="input-field"
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          style={{ paddingRight: '44px' }}
        />
        <button type="button" onClick={onShow} style={{
          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', padding: 0,
        }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      padding: '32px 24px',
      backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(63,198,240,0.08), transparent 40%)',
    }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--accent-ice)', letterSpacing: '1px', marginBottom: '6px' }}>ACCOUNT</p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Settings</h1>
        </div>

        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Lock size={18} color="var(--accent-ice)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Change Password</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <PasswordField
              id="current-password"
              label="Current Password"
              value={currentPassword}
              show={showCurrent}
              onShow={() => setShowCurrent(s => !s)}
              onChange={setCurrentPassword}
            />
            <PasswordField
              id="new-password"
              label="New Password (min. 8 characters)"
              value={newPassword}
              show={showNew}
              onShow={() => setShowNew(s => !s)}
              onChange={setNewPassword}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              show={showConfirm}
              onShow={() => setShowConfirm(s => !s)}
              onChange={setConfirmPassword}
            />

            {fieldError && (
              <p style={{
                fontSize: '0.85rem', color: 'var(--status-critical)',
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '8px', padding: '10px 14px', margin: 0,
              }}>
                {fieldError}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
              {loading ? 'Updating...' : (<><Lock size={15} /> Update Password</>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
