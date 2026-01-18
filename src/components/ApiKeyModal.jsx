import { useState } from 'react';

function ApiKeyModal({ currentKey, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(currentKey || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(apiKey);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3>🔑 API Key Configuration</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Enter your API key to authenticate with the backend server.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              className="form-control"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_..."
              autoFocus
            />
            <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
              This is stored locally in your browser
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save API Key
            </button>
          </div>
        </form>

        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: 'var(--bg-secondary)', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          color: 'var(--text-muted)'
        }}>
          <strong>Note:</strong> The API key is the value of <code>API_KEY</code> in your backend's <code>.env</code> file.
        </div>
      </div>
    </div>
  );
}

export default ApiKeyModal;
