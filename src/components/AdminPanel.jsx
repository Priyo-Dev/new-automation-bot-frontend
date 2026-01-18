import { useState, useEffect } from 'react';
import { listAdmins, createAdmin, updateAdmin, deleteAdmin, getCurrentAdmin } from '../api/client';

function AdminPanel() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadAdmins();
    loadCurrentAdmin();
  }, []);

  const loadCurrentAdmin = async () => {
    try {
      const response = await getCurrentAdmin();
      setCurrentAdmin(response.data.admin);
    } catch (error) {
      console.error('Failed to load current admin:', error);
    }
  };

  const loadAdmins = async () => {
    try {
      const response = await listAdmins();
      setAdmins(response.data.admins || []);
    } catch (error) {
      showAlertMessage('error', error.response?.data?.detail || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const showAlertMessage = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleDelete = async (username) => {
    if (!confirm(`Are you sure you want to deactivate admin "${username}"?`)) return;

    try {
      await deleteAdmin(username);
      showAlertMessage('success', `Admin ${username} deactivated`);
      loadAdmins();
    } catch (error) {
      showAlertMessage('error', error.response?.data?.detail || 'Failed to delete admin');
    }
  };

  const handleCreateAdmin = async (username, password, role) => {
    try {
      await createAdmin(username, password, role);
      showAlertMessage('success', `Admin ${username} created successfully`);
      setShowCreateModal(false);
      loadAdmins();
    } catch (error) {
      showAlertMessage('error', error.response?.data?.detail || 'Failed to create admin');
    }
  };

  const handleUpdateAdmin = async (username, updates) => {
    try {
      await updateAdmin(username, updates);
      showAlertMessage('success', `Admin ${username} updated successfully`);
      setEditingAdmin(null);
      loadAdmins();
    } catch (error) {
      showAlertMessage('error', error.response?.data?.detail || 'Failed to update admin');
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
    <div className="admin-panel">
      <div className="page-header">
        <h2>👑 Admin Panel</h2>
        <p>Manage admin users and access</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : '❌'} {alert.message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">👥 Admin Users</div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create Admin
          </button>
        </div>

        {admins.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>No admins found</h3>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.username}>
                    <td style={{ fontWeight: 600 }}>
                      {admin.username}
                      {admin.role === 'super_admin' && ' 👑'}
                    </td>
                    <td>
                      <span className={`badge ${admin.role === 'super_admin' ? 'badge-published' : 'badge-drafted'}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${admin.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '-'}</td>
                    <td>{admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => setEditingAdmin(admin)}
                        >
                          ✏️ Edit
                        </button>
                        {admin.is_active && admin.role !== 'super_admin' && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleDelete(admin.username)}
                          >
                            🗑️ Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Info */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">🔒 Security Information</div>
        </div>
        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          <ul>
            <li><strong>Password Requirements:</strong> Minimum 8 characters</li>
            <li><strong>Session Duration:</strong> 24 hours</li>
            <li><strong>Roles:</strong>
              <ul>
                <li><strong>admin:</strong> Can manage news, run pipelines, view logs</li>
                <li><strong>super_admin:</strong> Full access including admin management</li>
              </ul>
            </li>
            <li><strong>Important:</strong> Change the default password after first login!</li>
          </ul>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateAdmin}
        />
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          currentAdmin={currentAdmin}
          onClose={() => setEditingAdmin(null)}
          onUpdate={handleUpdateAdmin}
        />
      )}
    </div>
  );
}

function CreateAdminModal({ onClose, onCreate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    await onCreate(username, password, role);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Create New Admin</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

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
              placeholder="Enter password (min 8 chars)"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAdminModal({ admin, currentAdmin, onClose, onUpdate }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(admin.role);
  const [isActive, setIsActive] = useState(admin.is_active);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const isEditingSelf = currentAdmin && admin.username === currentAdmin.username;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password if provided
    if (password) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    const updates = {};
    if (password) {
      updates.password = password;
    }
    if (role !== admin.role) {
      updates.role = role;
    }
    if (isActive !== admin.is_active) {
      updates.is_active = isActive;
    }

    if (Object.keys(updates).length === 0) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    await onUpdate(admin.username, updates);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Edit Admin: {admin.username}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

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
              value={admin.username}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Username cannot be changed
            </small>
          </div>

          <div className="form-group">
            <label>New Password (leave blank to keep current)</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min 8 chars)"
            />
          </div>

          {password && (
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          )}

          <div className="form-group">
            <label>Role</label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isEditingSelf}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {isEditingSelf && (
              <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Cannot change your own role
              </small>
            )}
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isEditingSelf && !isActive}
              />
              Active
            </label>
            {isEditingSelf && (
              <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Cannot deactivate yourself
              </small>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminPanel;
