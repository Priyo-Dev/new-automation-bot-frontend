import { useState, useEffect } from 'react';
import { getStats, getHealth, getLogs } from '../api/client';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, healthRes, logsRes] = await Promise.all([
        getStats(),
        getHealth(),
        getLogs({ limit: 10 }),
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
      setRecentLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2>📊 Dashboard</h2>
        <p>Real-time overview of your news automation pipeline</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📰</div>
          <div className="stat-value">{stats?.total_items || 0}</div>
          <div className="stat-label">Total News Items</div>
        </div>
        
        <div className="stat-card orange">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{stats?.drafted_items || 0}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats?.published_items || 0}</div>
          <div className="stat-label">Published</div>
        </div>
        
        <div className="stat-card purple">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats?.high_virality || 0}</div>
          <div className="stat-label">High Virality (7+)</div>
        </div>
        
        <div className="stat-card blue">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats?.items_last_24h || 0}</div>
          <div className="stat-label">Last 24 Hours</div>
        </div>
        
        <div className="stat-card green">
          <div className="stat-icon">📤</div>
          <div className="stat-value">{stats?.published_last_24h || 0}</div>
          <div className="stat-label">Published Today</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ System Status</div>
          </div>
          <div className="status-items">
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>API Status</span>
              <span className={`badge ${health?.status === 'healthy' ? 'badge-approved' : 'badge-rejected'}`}>
                {health?.status || 'Unknown'}
              </span>
            </div>
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>Qdrant Database</span>
              <span className={`badge ${health?.qdrant_connected ? 'badge-approved' : 'badge-rejected'}`}>
                {health?.qdrant_connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>Version</span>
              <span style={{ color: 'var(--text-secondary)' }}>{health?.version || 'Unknown'}</span>
            </div>
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>Avg. Virality Score</span>
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{stats?.avg_virality_score?.toFixed(1) || '0'}</span>
            </div>
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span>Est. Daily Cost</span>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>${stats?.estimated_daily_cost?.toFixed(2) || '0'}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔄 Pipeline Status</div>
          </div>
          <div className="pipeline-items">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>🔍 Scout Interval</span>
              <span>Every {stats?.scout_interval_hours || 6} hours</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>✍️ Content Gen Interval</span>
              <span>Every {stats?.content_gen_interval_hours || 2} hours</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>📤 Auto-Publish Interval</span>
              <span>Every {stats?.auto_publish_interval_hours || 3} hours</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span>⭐ Min Publish Score</span>
              <span className="virality-score high">{stats?.auto_publish_min_score || 5}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">📋 Recent Activity</div>
        </div>
        {recentLogs.length > 0 ? (
          <div className="logs-list">
            {recentLogs.map((log, index) => (
              <div key={index} className={`log-entry ${log.level}`}>
                <div className="log-entry-header">
                  <span className="log-entry-type">{log.type}</span>
                  <span className="log-entry-time">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="log-entry-message">{log.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No recent activity</h3>
            <p>Pipeline events will appear here</p>
          </div>
        )}
      </div>

      {/* Virality Distribution */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">📈 Virality Distribution</div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ width: '100px' }}>High (7-10)</span>
              <div style={{ flex: 1, height: '24px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.total_items ? (stats.high_virality / stats.total_items) * 100 : 0}%`,
                  height: '100%',
                  background: 'var(--accent-green)',
                  transition: 'width 0.5s'
                }}></div>
              </div>
              <span style={{ width: '40px', textAlign: 'right' }}>{stats?.high_virality || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ width: '100px' }}>Medium (4-6)</span>
              <div style={{ flex: 1, height: '24px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.total_items ? (stats.medium_virality / stats.total_items) * 100 : 0}%`,
                  height: '100%',
                  background: 'var(--accent-orange)',
                  transition: 'width 0.5s'
                }}></div>
              </div>
              <span style={{ width: '40px', textAlign: 'right' }}>{stats?.medium_virality || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '100px' }}>Low (1-3)</span>
              <div style={{ flex: 1, height: '24px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.total_items ? (stats.low_virality / stats.total_items) * 100 : 0}%`,
                  height: '100%',
                  background: 'var(--accent-red)',
                  transition: 'width 0.5s'
                }}></div>
              </div>
              <span style={{ width: '40px', textAlign: 'right' }}>{stats?.low_virality || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
