import { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../api/client';

function ConfigPanel() {
  const [config, setConfig] = useState(null);
  const [estimates, setEstimates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editedConfig, setEditedConfig] = useState({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await getConfig();
      setConfig(response.data.config);
      setEstimates(response.data.estimates);
      setEditedConfig(response.data.config);
    } catch (error) {
      console.error('Failed to load config:', error);
      showAlert('error', 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleChange = (key, value) => {
    setEditedConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes = {};
      Object.keys(editedConfig).forEach(key => {
        if (editedConfig[key] !== config[key]) {
          changes[key] = editedConfig[key];
        }
      });

      if (Object.keys(changes).length === 0) {
        showAlert('info', 'No changes to save');
        setSaving(false);
        return;
      }

      await updateConfig(changes);
      showAlert('success', 'Configuration saved! Changes take effect on next scheduler run.');
      loadConfig();
    } catch (error) {
      showAlert('error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedConfig(config);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <div className="page-header">
        <h2>🔧 Configuration</h2>
        <p>Manage scheduler settings and processing limits</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : 'ℹ️'} {alert.message}
        </div>
      )}

      {/* Estimates Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">📊 Current Estimates</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-blue)' }}>
              {estimates?.scout_runs_per_day || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Scout runs/day</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-orange)' }}>
              {estimates?.content_gen_runs_per_day || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Content runs/day</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-purple)' }}>
              {estimates?.items_processed_per_day || 0}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Items/day</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-green)' }}>
              ${estimates?.estimated_daily_cost_usd?.toFixed(2) || '0.00'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Est. daily cost</div>
          </div>
        </div>
      </div>

      {/* Scheduler Settings */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">⏱️ Scheduler Settings</div>
        </div>
        <div className="config-grid">
          <div className="config-item">
            <label>Scout Interval (hours)</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="24"
              value={editedConfig.scout_interval_hours || 6}
              onChange={(e) => handleChange('scout_interval_hours', parseInt(e.target.value))}
            />
            <div className="description">How often to scan for new news (1-24 hours)</div>
          </div>

          <div className="config-item">
            <label>Content Generation Interval (hours)</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="24"
              value={editedConfig.content_gen_interval_hours || 2}
              onChange={(e) => handleChange('content_gen_interval_hours', parseInt(e.target.value))}
            />
            <div className="description">How often to generate posts for new items</div>
          </div>

          <div className="config-item">
            <label>Auto-Publish Interval (hours)</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="24"
              value={editedConfig.auto_publish_interval_hours || 3}
              onChange={(e) => handleChange('auto_publish_interval_hours', parseInt(e.target.value))}
            />
            <div className="description">How often to auto-publish high-score items</div>
          </div>
        </div>
      </div>

      {/* Processing Limits */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">📦 Processing Limits</div>
        </div>
        <div className="config-grid">
          <div className="config-item">
            <label>Items per Source (Scout)</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="50"
              value={editedConfig.scout_items_per_source || 8}
              onChange={(e) => handleChange('scout_items_per_source', parseInt(e.target.value))}
            />
            <div className="description">News items to fetch per source during scout</div>
          </div>

          <div className="config-item">
            <label>Content Generation Batch Size</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="20"
              value={editedConfig.content_gen_batch_size || 3}
              onChange={(e) => handleChange('content_gen_batch_size', parseInt(e.target.value))}
            />
            <div className="description">Items to process per content generation run</div>
          </div>

          <div className="config-item">
            <label>Auto-Publish Minimum Score</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="10"
              value={editedConfig.auto_publish_min_score || 5}
              onChange={(e) => handleChange('auto_publish_min_score', parseInt(e.target.value))}
            />
            <div className="description">Minimum virality score to auto-publish (1-10)</div>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">🎛️ Feature Toggles</div>
        </div>
        <div className="config-grid">
          <div className="config-item">
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                checked={editedConfig.auto_publish_enabled !== false}
                onChange={(e) => handleChange('auto_publish_enabled', e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Auto-Publish Enabled
            </label>
            <div className="description">Automatically publish high-scoring items to Facebook</div>
          </div>

          <div className="config-item">
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                checked={editedConfig.scheduler_enabled !== false}
                onChange={(e) => handleChange('scheduler_enabled', e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Scheduler Enabled
            </label>
            <div className="description">Enable automatic scheduled pipeline runs</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={handleReset}>
          Reset Changes
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Configuration'}
        </button>
      </div>

      {/* Info Box */}
      <div className="alert alert-info" style={{ marginTop: '24px' }}>
        <strong>Note:</strong> Configuration changes are saved to the database and take effect on the next scheduled run. 
        For immediate effect, restart the backend server.
      </div>
    </div>
  );
}

export default ConfigPanel;
