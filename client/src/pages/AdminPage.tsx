import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, removeAuthToken } from '../lib/api';
import toast from 'react-hot-toast';
import { UserPlus, LogOut, Users, Lock, Cpu } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

function ResetConfirmModal({ customerName, onConfirm, onCancel, loading }: { customerName: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="glass-panel" style={{ padding: '32px', maxWidth: '420px', width: '90%', textAlign: 'center' }}>
        <Lock size={40} color="var(--accent-ice)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Reset Customer Password?</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px' }}>
          This will generate a new temporary password for:
        </p>
        <p style={{
          color: 'var(--accent-ice)', fontSize: '0.9rem', fontWeight: 600,
          background: 'rgba(63,198,240,0.08)', borderRadius: '8px', padding: '8px 14px',
          border: '1px solid rgba(63,198,240,0.2)', marginBottom: '24px',
          wordBreak: 'break-all',
        }}>
          {customerName}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '24px' }}>
          The new password will be sent to them via email and SMS.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'rgba(63,198,240,0.15)', border: '1px solid rgba(63,198,240,0.5)',
              color: 'var(--accent-ice)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProvisionDeviceModal({
  customer,
  onCancel,
}: {
  customer: Customer;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('Cold Box A1');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/admin/devices', {
        method: 'POST',
        data: { user_id: customer.id, device_label: label },
      });
      setApiKey(res.api_key);
      toast.success('Device provisioned successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to provision device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="glass-panel" style={{ padding: '32px', maxWidth: '460px', width: '90%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
          <Cpu size={28} color="var(--accent-ice)" style={{ filter: 'drop-shadow(0 0 8px rgba(63,198,240,0.4))' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, letterSpacing: '1px' }}>Provision Device</h2>
        </div>

        {!apiKey ? (
          <form onSubmit={handleProvision} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, textAlign: 'center', lineHeight: '1.5' }}>
              Link a new cold-chain tracking device for <strong style={{ color: 'var(--accent-ice)' }}>{customer.name}</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>DEVICE LABEL</label>
              <input
                type="text"
                className="input-field"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Cold Box A1"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, padding: '10px' }}
              >
                {loading ? 'Provisioning...' : 'Provision'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)',
              borderRadius: '8px', padding: '12px', color: 'var(--status-safe)',
              fontSize: '0.85rem', textAlign: 'center', fontWeight: 500
            }}>
              Device linked successfully!
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
              Here is the device API Key. <strong style={{ color: 'var(--status-critical)' }}>Save it now</strong> — it will never be displayed again.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>DEVICE API KEY</label>
              <input
                type="text"
                readOnly
                className="input-field"
                value={apiKey}
                onClick={e => (e.target as any).select()}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.5px', background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}
              />
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                toast.success('API Key copied!');
              }}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              }}
            >
              Copy API Key
            </button>
            <button
              onClick={onCancel}
              className="btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<Customer | null>(null);
  const [provisionTarget, setProvisionTarget] = useState<Customer | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '+94',
    address: '',
  });

  const fetchCustomers = async () => {
    try {
      const data = await apiFetch('/admin/customers');
      setCustomers(data);
    } catch (err: any) {
      toast.error('Failed to load customers');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/admin/customers', {
        method: 'POST',
        data: form,
      });
      if (res.temporaryPassword) {
        toast.success(`Customer added! Password is: ${res.temporaryPassword}`, { duration: 10000 });
      } else {
        toast.success('Customer added! Login credentials have been sent via email and SMS.');
      }
      setForm({ name: '', email: '', phone: '+94', address: '' });
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async () => {
    if (!confirmTarget) return;
    setResetLoading(true);
    try {
      const res = await apiFetch(`/admin/customers/${confirmTarget.id}/reset-password`, {
        method: 'POST',
      });
      if (res.temporaryPassword) {
        toast.success(`Password reset successful for ${confirmTarget.name}! New password is: ${res.temporaryPassword}`, { duration: 10000 });
      } else {
        toast.success(`Password reset successful for ${confirmTarget.name}! New credentials sent.`);
      }
      setConfirmTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '24px',
      backgroundImage: 'radial-gradient(circle at top left, rgba(63,198,240,0.12), transparent 40%)',
    }}>
      {/* Modal */}
      {confirmTarget && (
        <ResetConfirmModal
          customerName={confirmTarget.name}
          onConfirm={handleResetConfirm}
          onCancel={() => setConfirmTarget(null)}
          loading={resetLoading}
        />
      )}
      {provisionTarget && (
        <ProvisionDeviceModal
          customer={provisionTarget}
          onCancel={() => setProvisionTarget(null)}
        />
      )}
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '32px', maxWidth: '900px', margin: '0 auto 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src="/favicon.svg" alt="Neutronics" style={{ width: '38px', height: '38px' }} />
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '2px', margin: 0 }}>NEUTRONICS</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent-ice)', margin: 0, letterSpacing: '1px' }}>ADMIN PORTAL</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 18px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', cursor: 'pointer', fontSize: '0.9rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(63,198,240,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Add Customer Form */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <UserPlus size={20} color="var(--accent-ice)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Add New Customer</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>FULL NAME</label>
              <input
                type="text"
                name="name"
                className="input-field"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. John Silva"
                required
              />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>EMAIL ADDRESS</label>
              <input
                type="email"
                name="email"
                className="input-field"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>PHONE NUMBER (WITH COUNTRY CODE)</label>
              <input
                type="tel"
                name="phone"
                className="input-field"
                value={form.phone}
                onChange={handleChange}
                placeholder="+94 77 123 4567"
                required
              />
            </div>

            {/* Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>ADDRESS</label>
              <textarea
                name="address"
                className="input-field"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Main St, Colombo"
                rows={3}
                style={{ resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            {/* Submit */}
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn-primary" disabled={loading}
                style={{ maxWidth: '240px' }}
              >
                {loading ? 'Adding Customer...' : (
                  <>
                    <UserPlus size={16} />
                    Add Customer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Customers Table */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Users size={20} color="var(--accent-ice)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Existing Customers</h2>
            <span style={{
              marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--accent-ice)',
              background: 'rgba(63,198,240,0.1)', border: '1px solid rgba(63,198,240,0.3)',
              borderRadius: '20px', padding: '2px 10px',
            }}>
              {customers.length} total
            </span>
          </div>

          {loadingList ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Loading customers...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>
              No customers yet. Add one above!
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['Name', 'Email', 'Phone', 'Date Added', 'Actions'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 14px',
                        color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem',
                        letterSpacing: '0.5px', fontWeight: 500,
                      }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, idx) => (
                    <tr key={c.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(63,198,240,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{c.email}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{c.phone}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setProvisionTarget(c)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'rgba(63,198,240,0.1)', border: '1px solid rgba(63,198,240,0.3)',
                              color: 'var(--accent-ice)', cursor: 'pointer', fontSize: '0.8rem',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(63,198,240,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(63,198,240,0.1)')}
                          >
                            <Cpu size={12} /> Link Device
                          </button>
                          <button
                            onClick={() => setConfirmTarget(c)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                              color: '#fff', cursor: 'pointer', fontSize: '0.8rem',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                          >
                            <Lock size={12} /> Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
