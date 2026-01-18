import { useState } from 'react';
import { adminLogin } from '../api/client';

function LoginPage({ onLogin, theme, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminLogin(username, password);
      if (response.data.success) {
        onLogin(response.data.token, response.data.admin);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme === 'dark' 
        ? 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%)',
      padding: '20px',
      width: '100%',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📰</div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700',
            background: 'linear-gradient(135deg, #1d9bf0, #7856ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
          }}>
            TechPulse AutoBot
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Control Panel</p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>🔐 Admin Login</h2>
          
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {loading ? '⏳ Logging in...' : '🚀 Login'}
            </button>
          </form>

          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: 'var(--bg-secondary)', 
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}>
            <strong>Security Notice:</strong><br />
            Please contact your system administrator for login credentials.
          </div>
        </div>

        {/* Theme Toggle */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            style={{ display: 'inline-flex', width: 'auto', padding: '10px 20px' }}
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
