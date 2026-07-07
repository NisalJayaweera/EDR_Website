import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, MapPin, FileText, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { removeAuthToken } from '../lib/api';

interface SidebarProps {
  user?: { name?: string; username?: string; role: string };
}

const NAV_ITEMS = [
  { to: '/home',     label: 'Home',     icon: Home     },
  { to: '/tracking', label: 'Tracking', icon: MapPin   },
  { to: '/files',    label: 'CSV Files', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    removeAuthToken();
    navigate('/login');
  };

  return (
    <aside style={{
      width: collapsed ? '64px' : '230px',
      minHeight: '100vh',
      background: 'rgba(2,1,14,0.95)',
      borderRight: '1px solid rgba(63,198,240,0.15)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 200,
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
    }}>
      {/* Logo area */}
      <div style={{
        padding: collapsed ? '20px 16px' : '20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        overflow: 'hidden',
        minHeight: '72px',
      }}>
        <img
          src="/favicon.svg"
          alt="Neutronics"
          style={{ width: '32px', height: '32px', flexShrink: 0 }}
        />
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', letterSpacing: '2px', whiteSpace: 'nowrap' }}>NEUTRONICS</p>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--accent-ice)', letterSpacing: '1px', opacity: 0.8 }}>COLD CHAIN</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: collapsed ? '12px' : '11px 14px',
              borderRadius: '10px',
              textDecoration: 'none',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              background: isActive ? 'rgba(63,198,240,0.12)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(63,198,240,0.3)' : 'transparent'}`,
              transition: 'all 0.2s',
              justifyContent: collapsed ? 'center' : 'flex-start',
              overflow: 'hidden',
              position: 'relative',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              if (!el.style.background.includes('0.12')) {
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.color = 'rgba(255,255,255,0.8)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              if (!el.style.background.includes('0.12')) {
                el.style.background = 'transparent';
                el.style.color = 'rgba(255,255,255,0.5)';
              }
            }}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  color={isActive ? 'var(--accent-ice)' : undefined}
                  style={{ flexShrink: 0 }}
                />
                {!collapsed && (
                  <span style={{
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                )}
                {/* Active bar indicator */}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    height: '60%',
                    width: '3px',
                    background: 'var(--accent-ice)',
                    borderRadius: '0 3px 3px 0',
                  }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section: user + logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* User info */}
        {!collapsed && user && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '6px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || user.username}
            </p>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(63,198,240,0.7)', letterSpacing: '0.5px' }}>USER</p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '12px',
            padding: collapsed ? '12px' : '11px 14px',
            borderRadius: '10px',
            background: 'transparent',
            border: '1px solid transparent',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.background = 'rgba(220,38,38,0.1)';
            el.style.borderColor = 'rgba(220,38,38,0.3)';
            el.style.color = 'var(--status-critical)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.background = 'transparent';
            el.style.borderColor = 'transparent';
            el.style.color = 'rgba(255,255,255,0.4)';
          }}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: '50%',
          right: '-12px',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(3,2,19,0.95)',
          border: '1px solid rgba(63,198,240,0.3)',
          color: 'var(--accent-ice)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'all 0.2s',
          zIndex: 10,
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
