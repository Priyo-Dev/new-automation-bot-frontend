import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import NewsManager from './components/NewsManager';
import PipelineControls from './components/PipelineControls';
import ConfigPanel from './components/ConfigPanel';
import ActivityLogs from './components/ActivityLogs';
import ManualPost from './components/ManualPost';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/LoginPage';
import { adminLogout } from './api/client';
import './App.css';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || '');
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Check if we have admin info stored (token is in HttpOnly cookie)
    const savedAdmin = localStorage.getItem('admin_info');
    if (savedAdmin) {
      try {
        const admin = JSON.parse(savedAdmin);
        setAdmin(admin);
        setAdminToken('authenticated'); // Set flag to indicate we have admin info
      } catch {}
    }
  }, []);

  // Listen for auth expiration events from API client
  useEffect(() => {
    const handleAuthExpired = () => {
      setAdminToken('');
      setAdmin(null);
    };
    
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = (token, adminInfo) => {
    // Token is now stored in HttpOnly cookie by the backend
    // Only store admin info in localStorage (not sensitive)
    localStorage.setItem('admin_info', JSON.stringify(adminInfo));
    setAdminToken('authenticated'); // Just a flag, actual token in cookie
    setAdmin(adminInfo);
  };

  const handleLogout = async () => {
    // Call logout endpoint to clear cookie
    try {
      await adminLogout();
    } catch (e) {
      // Continue even if logout call fails
    }
    localStorage.removeItem('admin_info');
    setAdminToken('');
    setAdmin(null);
  };

  // If not logged in, show login page
  // Check both adminToken flag and admin info
  if (!adminToken && !admin) {
    return (
      <div data-theme={theme} style={{ width: '100%', minHeight: '100vh' }}>
        <LoginPage onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <span className="logo-icon">📰</span>
            <h1>TechPulse</h1>
            <span className="subtitle">AutoBot</span>
          </div>
          
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">📊</span>
              Dashboard
            </NavLink>
            <NavLink to="/news" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">📝</span>
              News Manager
            </NavLink>
            <NavLink to="/pipeline" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">⚙️</span>
              Pipeline
            </NavLink>
            <NavLink to="/config" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">🔧</span>
              Config
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">📋</span>
              Logs
            </NavLink>
            <NavLink to="/post" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon">✍️</span>
              Manual Post
            </NavLink>
            {admin?.role === 'super_admin' && (
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <span className="nav-icon">👑</span>
                Admin Panel
              </NavLink>
            )}
          </div>
          
          <div className="sidebar-footer">
            <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              👤 {admin?.username} ({admin?.role})
            </div>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            <button className="api-key-btn" onClick={handleLogout} style={{ color: 'var(--accent-red)' }}>
              🚪 Logout
            </button>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/news" element={<NewsManager />} />
            <Route path="/pipeline" element={<PipelineControls />} />
            <Route path="/config" element={<ConfigPanel />} />
            <Route path="/logs" element={<ActivityLogs />} />
            <Route path="/post" element={<ManualPost />} />
            <Route path="/admin" element={
              admin?.role === 'super_admin' 
                ? <AdminPanel /> 
                : <Navigate to="/" replace />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
