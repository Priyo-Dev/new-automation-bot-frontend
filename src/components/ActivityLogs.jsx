import { useState, useEffect } from 'react';
import { getLogs, getLogsSummary, clearLogs } from '../api/client';

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    limit: 100,
    activity_type: '',
    level: '',
  });
  const [alert, setAlert] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadData, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, filters]);

  const loadData = async () => {
    try {
      const [logsRes, summaryRes] = await Promise.all([
        getLogs(filters),
        getLogsSummary(),
      ]);
      setLogs(logsRes.data.logs || []);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    
    try {
      await clearLogs();
      showAlert('success', 'Logs cleared');
      loadData();
    } catch (error) {
      showAlert('error', 'Failed to clear logs');
    }
  };

  const getLogIcon = (type) => {
    if (type.includes('scout')) return '🔍';
    if (type.includes('content')) return '✍️';
    if (type.includes('publish')) return '📤';
    if (type.includes('config')) return '🔧';
    if (type.includes('system')) return '⚡';
    if (type.includes('approved')) return '✅';
    if (type.includes('rejected')) return '❌';
    return '📋';
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'var(--accent-red)';
      case 'warning': return 'var(--accent-orange)';
      default: return 'var(--accent-blue)';
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
    <div className="activity-logs">
      <div className="page-header">
        <h2>📋 Activity Logs</h2>
        <p>Monitor scheduler and pipeline events</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : '❌'} {alert.message}
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card blue" style={{ padding: '16px' }}>
            <div className="stat-value" style={{ fontSize: '24px' }}>{summary.total_entries}</div>
            <div className="stat-label">Total Logs</div>
          </div>
          <div className="stat-card green" style={{ padding: '16px' }}>
            <div className="stat-value" style={{ fontSize: '24px' }}>{summary.by_level?.info || 0}</div>
            <div className="stat-label">Info</div>
          </div>
          <div className="stat-card orange" style={{ padding: '16px' }}>
            <div className="stat-value" style={{ fontSize: '24px' }}>{summary.by_level?.warning || 0}</div>
            <div className="stat-label">Warnings</div>
          </div>
          <div className="stat-card red" style={{ padding: '16px' }}>
            <div className="stat-value" style={{ fontSize: '24px' }}>{summary.by_level?.error || 0}</div>
            <div className="stat-label">Errors</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="filter-group">
            <label>Activity Type</label>
            <select
              value={filters.activity_type}
              onChange={(e) => setFilters(prev => ({ ...prev, activity_type: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="scout_start">Scout Start</option>
              <option value="scout_complete">Scout Complete</option>
              <option value="scout_error">Scout Error</option>
              <option value="content_gen_start">Content Gen Start</option>
              <option value="content_gen_complete">Content Gen Complete</option>
              <option value="auto_publish_start">Auto-Publish Start</option>
              <option value="auto_publish_complete">Auto-Publish Complete</option>
              <option value="manual_publish">Manual Publish</option>
              <option value="item_approved">Item Approved</option>
              <option value="item_rejected">Item Rejected</option>
              <option value="config_updated">Config Updated</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Level</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button className="btn btn-secondary" onClick={loadData}>
              🔄 Refresh
            </button>
            <button className="btn btn-danger" onClick={handleClearLogs}>
              🗑️ Clear Logs
            </button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="card">
        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No logs found</h3>
            <p>Activity logs will appear here as the pipeline runs</p>
          </div>
        ) : (
          <div className="logs-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.level}`}>
                <div className="log-entry-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{getLogIcon(log.type)}</span>
                    <span className="log-entry-type" style={{ color: getLevelColor(log.level) }}>
                      {log.type.replace(/_/g, ' ')}
                    </span>
                  </span>
                  <span className="log-entry-time">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="log-entry-message">{log.message}</div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    padding: '8px', 
                    background: 'var(--bg-primary)', 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: 'var(--text-muted)'
                  }}>
                    {JSON.stringify(log.details, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {summary?.last_activity && (
        <div style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
          Last activity: {new Date(summary.last_activity).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default ActivityLogs;
