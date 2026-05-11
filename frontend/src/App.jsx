import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Warmup from './pages/Warmup';
import Campaigns from './pages/Campaigns';
import NewCampaign from './pages/NewCampaign';
import Leads from './pages/Leads';
import Inbox from './pages/Inbox';
import Sent from './pages/Sent';
import { Menu, Zap } from 'lucide-react';

function ProtectedRoute() {
  const token = localStorage.getItem('rf_token');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  if (!token) return <Navigate to="/login" replace />;
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F3EE' }}>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,99,235,0.35)' }}>
            <Zap size={16} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ color: 'white', fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>ReachFlow</span>
        </div>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <main className="main-content" style={{ flex: 1, marginLeft: 260, padding: '28px 36px', maxWidth: 1400 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/warmup" element={<Warmup />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/new" element={<NewCampaign />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/sent" element={<Sent />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
