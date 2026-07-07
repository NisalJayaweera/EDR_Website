import React, { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface LayoutUser {
  user: { name?: string; username?: string; role: string; userId?: string };
}

export function HomeLayout() {
  // User object is passed down from ProtectedRoute via Outlet context
  const { user } = useOutletContext<LayoutUser>();
  // Track sidebar width for responsive content offset
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={user} />

      {/* Main content — offset by sidebar width; sidebar is fixed so we use margin-left */}
      <main
        style={{
          flex: 1,
          marginLeft: '230px',   // matches expanded sidebar width
          minHeight: '100vh',
          transition: 'margin-left 0.25s ease',
          background: 'var(--bg-color, #02010c)',
          // The sidebar collapse toggle can't easily communicate width to here
          // without lifting state. A simple CSS trick: we listen to a CSS var instead.
          // For now, the sidebar collapse is cosmetic — the content area keeps 230px margin.
          // A future enhancement can lift state from Sidebar via a callback.
        }}
      >
        {/* Pass user context through to child pages */}
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
