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
        
        <div className="stat-card orange">
          <div className="stat-icon">💰</div>
          <div className="stat-value">${stats?.total_cost_usd?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Total Cost</div>
        </div>
        
        <div className="stat-card green">
          <div className="stat-icon">💵</div>
          <div className="stat-value">${stats?.daily_cost_usd?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Cost Today</div>
        </div>
      </div>

      {/* Main Grid - 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* System Status */}
        <div className="card" style={{ marginBottom: 0 }}>
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
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>Est. Daily Cost</span>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>${stats?.estimated_daily_cost?.toFixed(2) || '0'}</span>
            </div>
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>Total Cost</span>
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>${stats?.total_cost_usd?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="status-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span>Cost Today</span>
              <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>${stats?.daily_cost_usd?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="card" style={{ marginBottom: 0 }}>
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

        {/* Content Breakdown */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">📊 Content Breakdown</div>
          </div>
          <div className="pipeline-items">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>📥 New (Unprocessed)</span>
              <span style={{ fontWeight: 600 }}>{stats?.new_items || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>📝 Drafted</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{stats?.drafted_items || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>✅ Approved</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{stats?.approved_items || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>📤 Published</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{stats?.published_items || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span>❌ Rejected</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{stats?.rejected_items || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Recent Activity */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">📋 Recent Activity</div>
          </div>
          {recentLogs.length > 0 ? (
            <div className="logs-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">📈 Virality Distribution</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ width: '80px', fontSize: '13px' }}>High (7-10)</span>
              <div style={{ flex: 1, height: '28px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.total_items ? (stats.high_virality / stats.total_items) * 100 : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-green), #2ecc71)',
                  transition: 'width 0.5s',
                  minWidth: stats?.high_virality > 0 ? '20px' : '0'
                }}></div>
              </div>
              <span style={{ width: '35px', textAlign: 'right', fontWeight: 600 }}>{stats?.high_virality || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ width: '80px', fontSize: '13px' }}>Med (4-6)</span>
              <div style={{ flex: 1, height: '28px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.total_items ? (stats.medium_virality / stats.total_items) * 100 : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-orange), #f39c12)',
                  transition: 'width 0.5s',
                  minWidth: stats?.medium_virality > 0 ? '20px' : '0'
                }}></div>
              </div>
              <span style={{ width: '35px', textAlign: 'right', fontWeight: 600 }}>{stats?.medium_virality || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '80px', fontSize: '13px' }}>Low (1-3)</span>
              <div style={{ flex: 1, height: '28px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.total_items ? (stats.low_virality / stats.total_items) * 100 : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-red), #e74c3c)',
                  transition: 'width 0.5s',
                  minWidth: stats?.low_virality > 0 ? '20px' : '0'
                }}></div>
              </div>
              <span style={{ width: '35px', textAlign: 'right', fontWeight: 600 }}>{stats?.low_virality || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
