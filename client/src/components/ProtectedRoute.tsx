import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { apiFetch, getAuthToken } from '../lib/api';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireAdmin = false }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch('/auth/me');
        setUser(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[var(--bg-color)] text-[var(--text-color)]">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return <Outlet context={{ user }} />;
};
