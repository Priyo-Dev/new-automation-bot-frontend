import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import NewsManager from './components/NewsManager';
import PipelineControls from './components/PipelineControls';
import ConfigPanel from './components/ConfigPanel';
import ActivityLogs from './components/ActivityLogs';
import ManualPost from './components/ManualPost';
import ApiKeyModal from './components/ApiKeyModal';
import { getHealth } from './api/client';
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('api_key') || '');

  useEffect(() => {
    checkConnection();
  }, [apiKey]);

  const checkConnection = async () => {
    try {
      await getHealth();
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setShowApiKeyModal(true);
      }
    }
  };

  const handleApiKeySave = (key) => {
    localStorage.setItem('api_key', key);
    setApiKey(key);
    setShowApiKeyModal(false);
    checkConnection();
  };

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
          </div>
          
          <div className="sidebar-footer">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <button className="api-key-btn" onClick={() => setShowApiKeyModal(true)}>
              🔑 API Key
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
          </Routes>
        </main>
        
        {showApiKeyModal && (
          <ApiKeyModal
            currentKey={apiKey}
            onSave={handleApiKeySave}
            onClose={() => setShowApiKeyModal(false)}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
