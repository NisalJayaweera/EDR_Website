import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomeLayout } from './components/HomeLayout';

import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';
import TrackingPage from './pages/TrackingPage';
import CsvManagerPage from './pages/CsvManagerPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{ style: { background: '#030213', color: '#fff', border: '1px solid #3FC6F0' } }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin — minimal layout, no sidebar */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* User pages — wrapped in HomeLayout which provides the sidebar */}
        <Route element={<ProtectedRoute />}>
          <Route element={<HomeLayout />}>
            <Route path="/home"     element={<HomePage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/files"    element={<CsvManagerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* legacy redirect in case any old links use /csv */}
            <Route path="/csv"      element={<Navigate to="/files" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
