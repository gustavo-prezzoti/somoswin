import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import WhatsApp from './pages/WhatsApp';
// FIX: Corrected component import to default export from 'Campaigns.tsx'.
import CampaignsPage from './pages/Campaigns';
import SocialMedia from './pages/SocialMedia';
import Calendar from './pages/Calendar';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Agents from './pages/Agents';
import Support from './pages/Support';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import Payment from './pages/Payment';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/payment" 
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/social-media" element={<SocialMedia />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/support" element={<Support />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;