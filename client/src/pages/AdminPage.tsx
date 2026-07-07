import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, removeAuthToken } from '../lib/api';
import toast from 'react-hot-toast';
import { UserPlus, LogOut, Users } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

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
      await apiFetch('/admin/customers', {
        method: 'POST',
        data: form,
      });
      toast.success('Customer added! Login credentials have been sent via email and SMS.');
      setForm({ name: '', email: '', phone: '+94', address: '' });
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add customer');
    } finally {
      setLoading(false);
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
                    {['Name', 'Email', 'Phone', 'Date Added'].map(h => (
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
