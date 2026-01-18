import { useState, useEffect } from 'react';
import { getConfig, updateConfig } from '../api/client';

function ConfigPanel() {
  const [config, setConfig] = useState(null);
  const [estimates, setEstimates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editedConfig, setEditedConfig] = useState({});
  // Store hours and minutes separately for each interval
  const [intervalInputs, setIntervalInputs] = useState({
    scout: { hours: 6, minutes: 0 },
    content_gen: { hours: 2, minutes: 0 },
    auto_publish: { hours: 3, minutes: 0 },
  });

  useEffect(() => {
    loadConfig();
  }, []);

  // Convert fractional hours to hours and minutes
  const hoursToHrMin = (fractionalHours) => {
    const hours = Math.floor(fractionalHours);
    const minutes = Math.round((fractionalHours - hours) * 60);
    return { hours, minutes };
  };

  // Convert hours and minutes to fractional hours
  const hrMinToHours = (hours, minutes) => {
    return hours + (minutes / 60);
  };

  const loadConfig = async () => {
    try {
      const response = await getConfig();
      const loadedConfig = response.data.config;
      setConfig(loadedConfig);
      setEstimates(response.data.estimates);
      setEditedConfig(loadedConfig);
      
      // Convert fractional hours to hours+minutes for display
      setIntervalInputs({
        scout: hoursToHrMin(loadedConfig.scout_interval_hours || 6),
        content_gen: hoursToHrMin(loadedConfig.content_gen_interval_hours || 2),
        auto_publish: hoursToHrMin(loadedConfig.auto_publish_interval_hours || 3),
      });
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

  const handleNumberChange = (key, value, min, max, defaultValue) => {
    // Allow typing - parse the value
    const numVal = value === '' ? null : parseInt(value, 10);
    
    // If it's a valid number within range, update immediately
    if (numVal !== null && !isNaN(numVal) && numVal >= min && numVal <= max) {
      handleChange(key, numVal);
    } else if (value === '') {
      // Allow clearing the field temporarily, but keep the default in state
      // The input will show the default value
      handleChange(key, defaultValue);
    }
    // If invalid (like typing letters), don't update state but allow typing to continue
    // The input's value prop will keep showing what user typed until they enter valid number
  };

  const handleIntervalChange = (intervalKey, field, value) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = field === 'minutes' ? Math.max(0, Math.min(59, numValue)) : Math.max(0, numValue);
    
    // Calculate the new interval values
    const current = intervalInputs[intervalKey];
    const updated = {
      ...current,
      [field]: clampedValue,
    };
    
    // Update the interval inputs state
    setIntervalInputs(prev => ({
      ...prev,
      [intervalKey]: updated,
    }));
    
    // Calculate fractional hours and update editedConfig
    const fractionalHours = hrMinToHours(updated.hours, updated.minutes);
    
    const configKeyMap = {
      scout: 'scout_interval_hours',
      content_gen: 'content_gen_interval_hours',
      auto_publish: 'auto_publish_interval_hours',
    };
    
    handleChange(configKeyMap[intervalKey], fractionalHours);
  };

  const parseNumberInput = (value) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : '';
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
    // Reset interval inputs to match config
    if (config) {
      setIntervalInputs({
        scout: hoursToHrMin(config.scout_interval_hours || 6),
        content_gen: hoursToHrMin(config.content_gen_interval_hours || 2),
        auto_publish: hoursToHrMin(config.auto_publish_interval_hours || 3),
      });
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
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
            <label>Scout Interval</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="24"
                  value={intervalInputs.scout.hours}
                  onChange={(e) => handleIntervalChange('scout', 'hours', e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Hours</div>
              </div>
              <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>:</div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="59"
                  value={intervalInputs.scout.minutes}
                  onChange={(e) => handleIntervalChange('scout', 'minutes', e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Minutes</div>
              </div>
            </div>
            <div className="description">How often to scan for new news</div>
          </div>

          <div className="config-item">
            <label>Content Generation Interval</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="24"
                  value={intervalInputs.content_gen.hours}
                  onChange={(e) => handleIntervalChange('content_gen', 'hours', e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Hours</div>
              </div>
              <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>:</div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="59"
                  value={intervalInputs.content_gen.minutes}
                  onChange={(e) => handleIntervalChange('content_gen', 'minutes', e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Minutes</div>
              </div>
            </div>
            <div className="description">How often to generate posts for new items</div>
          </div>

          <div className="config-item">
            <label>Auto-Publish Interval</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="24"
                  value={intervalInputs.auto_publish.hours}
                  onChange={(e) => handleIntervalChange('auto_publish', 'hours', e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Hours</div>
              </div>
              <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>:</div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="59"
                  value={intervalInputs.auto_publish.minutes}
                  onChange={(e) => handleIntervalChange('auto_publish', 'minutes', e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Minutes</div>
              </div>
            </div>
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
              onChange={(e) => handleNumberChange('scout_items_per_source', e.target.value, 1, 50, 8)}
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
              value={editedConfig.content_gen_batch_size || 1}
              onChange={(e) => handleNumberChange('content_gen_batch_size', e.target.value, 1, 20, 1)}
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
              onChange={(e) => handleNumberChange('auto_publish_min_score', e.target.value, 1, 10, 5)}
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
        <strong>Note:</strong> Configuration changes are saved to the database and applied immediately (scheduler reload).
      </div>
    </div>
  );
}

export default ConfigPanel;
