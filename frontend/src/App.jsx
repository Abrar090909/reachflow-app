import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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

function ProtectedRoute() {
  const token = localStorage.getItem('rf_token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F3EE' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: '28px 36px', maxWidth: 1400 }}>
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
