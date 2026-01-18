import { useState, useEffect } from 'react';
import {
  getNews,
  editNewsItem,
  deleteNewsItem,
  approveNewsItem,
  rejectNewsItem,
  regenerateText,
  regenerateImage,
  generateContent,
} from '../api/client';

function NewsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('drafted');
  const [editModal, setEditModal] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [alert, setAlert] = useState(null);
  const [nextOffset, setNextOffset] = useState(null);
  const [totalLoaded, setTotalLoaded] = useState(0);

  const PAGE_SIZE = 20;

  useEffect(() => {
    loadItems();
  }, [statusFilter]);

  const loadItems = async (append = false, offset = null) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setItems([]);
      setNextOffset(null);
    }
    
    try {
      const response = await getNews({ 
        status: statusFilter, 
        limit: PAGE_SIZE,
        offset: offset 
      });
      const newItems = response.data.items || [];
      
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      
      setNextOffset(response.data.next_offset);
      setTotalLoaded(prev => append ? prev + newItems.length : newItems.length);
    } catch (error) {
      console.error('Failed to load items:', error);
      showAlert('error', 'Failed to load news items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (nextOffset && !loadingMore) {
      loadItems(true, nextOffset);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const setItemLoading = (id, action, loading) => {
    setActionLoading(prev => ({ ...prev, [`${id}-${action}`]: loading }));
  };

  const handleApprove = async (item) => {
    setItemLoading(item.id, 'approve', true);
    try {
      await approveNewsItem(item.id);
      showAlert('success', 'Item approved and published to Facebook!');
      loadItems();
    } catch (error) {
      showAlert('error', error.response?.data?.detail || 'Failed to approve item');
    } finally {
      setItemLoading(item.id, 'approve', false);
    }
  };

  const handleReject = async (item) => {
    if (!confirm('Are you sure you want to reject this item?')) return;
    
    setItemLoading(item.id, 'reject', true);
    try {
      await rejectNewsItem(item.id);
      showAlert('success', 'Item rejected');
      loadItems();
    } catch (error) {
      showAlert('error', 'Failed to reject item');
    } finally {
      setItemLoading(item.id, 'reject', false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm('Are you sure you want to permanently delete this item?')) return;
    
    setItemLoading(item.id, 'delete', true);
    try {
      await deleteNewsItem(item.id);
      showAlert('success', 'Item deleted');
      loadItems();
    } catch (error) {
      showAlert('error', 'Failed to delete item');
    } finally {
      setItemLoading(item.id, 'delete', false);
    }
  };

  const handleRegenerateText = async (item) => {
    setItemLoading(item.id, 'regen-text', true);
    try {
      await regenerateText(item.id);
      showAlert('success', 'Text regenerated successfully!');
      loadItems();
    } catch (error) {
      showAlert('error', 'Failed to regenerate text');
    } finally {
      setItemLoading(item.id, 'regen-text', false);
    }
  };

  const handleRegenerateImage = async (item) => {
    setItemLoading(item.id, 'regen-image', true);
    try {
      await regenerateImage(item.id);
      showAlert('success', 'Image regenerated successfully!');
      loadItems();
    } catch (error) {
      showAlert('error', 'Failed to regenerate image');
    } finally {
      setItemLoading(item.id, 'regen-image', false);
    }
  };

  const handleGenerateContent = async (item) => {
    setItemLoading(item.id, 'generate', true);
    try {
      await generateContent(item.id);
      showAlert('success', 'Content generated! Item moved to Drafted.');
      loadItems();
    } catch (error) {
      showAlert('error', error.response?.data?.detail || 'Failed to generate content');
    } finally {
      setItemLoading(item.id, 'generate', false);
    }
  };

  const handleSaveEdit = async (itemId, updates) => {
    try {
      await editNewsItem(itemId, updates);
      showAlert('success', 'Item updated successfully!');
      setEditModal(null);
      loadItems();
    } catch (error) {
      showAlert('error', 'Failed to save changes');
    }
  };

  const getViralityClass = (score) => {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  return (
    <div className="news-manager">
      <div className="page-header">
        <h2>📝 News Manager</h2>
        <p>Review, edit, and manage news items</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : '❌'} {alert.message}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="new">New (Unprocessed)</option>
            <option value="drafted">Drafted (Pending Review)</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            <option value="errored">Errored (Failed to Publish)</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => loadItems()}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No items found</h3>
          <p>No news items with status "{statusFilter}"</p>
        </div>
      ) : (
        <>
          <div className="pagination-info">
            Showing {items.length} items
          </div>
          <div className="news-list">
            {items.map((item) => (
              <div key={item.id} className="news-item">
              <div className="news-item-header">
                <div>
                  <div className="news-item-title">{item.payload.original_title}</div>
                  <a href={item.payload.url} target="_blank" rel="noopener noreferrer" className="news-item-url">
                    {item.payload.url}
                  </a>
                </div>
                <span className={`badge badge-${item.payload.status}`}>
                  {item.payload.status}
                </span>
              </div>

              <div className={`news-item-content ${item.payload.image_url ? 'has-image' : 'no-image'}`}>
                <div className="news-item-text">
                  {item.payload.fb_post_text || 'No post text generated yet'}
                </div>
                {item.payload.image_url && (
                  <img
                    src={item.payload.image_url}
                    alt="Generated"
                    className="news-item-image"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
              </div>

              <div className="news-item-meta">
                <span className={`virality-score ${getViralityClass(item.payload.virality_score)}`}>
                  ⭐ {item.payload.virality_score || 0}
                </span>
                {item.payload.status === 'errored' && item.payload.error_message && (
                  <span style={{ color: '#dc3545', fontWeight: 600, fontSize: '13px' }}>
                    ⚠️ Error: {item.payload.error_message}
                  </span>
                )}
                {item.payload.generation_cost_usd !== undefined && item.payload.generation_cost_usd !== null && (
                  <span style={{ color: 'var(--accent-orange)', fontWeight: 600, fontSize: '13px' }}>
                    💰 Cost: ${(item.payload.generation_cost_usd || 0).toFixed(4)}
                  </span>
                )}
                <span>Created: {new Date(item.payload.created_at).toLocaleString()}</span>
                {item.payload.published_at && (
                  <span>Published: {new Date(item.payload.published_at).toLocaleString()}</span>
                )}
                {item.payload.facebook_post_url && (
                  <a href={item.payload.facebook_post_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>
                    View on Facebook →
                  </a>
                )}
              </div>

              <div className="news-item-actions" style={{ marginTop: '16px' }}>
                {/* Generate Content button for NEW items */}
                {item.payload.status === 'new' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleGenerateContent(item)}
                    disabled={actionLoading[`${item.id}-generate`]}
                    style={{ minWidth: '160px' }}
                  >
                    {actionLoading[`${item.id}-generate`] ? '⏳ Generating...' : '✨ Generate Content'}
                  </button>
                )}
                
                {/* Approve/Reject for drafted items, Retry for errored items */}
                {item.payload.status === 'drafted' && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => handleApprove(item)}
                      disabled={actionLoading[`${item.id}-approve`]}
                    >
                      {actionLoading[`${item.id}-approve`] ? '...' : '✅ Approve & Publish'}
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={() => handleReject(item)}
                      disabled={actionLoading[`${item.id}-reject`]}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}
                
                {/* Retry publish for errored items */}
                {item.payload.status === 'errored' && (
                  <button
                    className="btn btn-success"
                    onClick={() => handleApprove(item)}
                    disabled={actionLoading[`${item.id}-approve`]}
                  >
                    {actionLoading[`${item.id}-approve`] ? '...' : '🔄 Retry Publish'}
                  </button>
                )}
                
                {/* Edit button for new, drafted, and errored */}
                {(item.payload.status === 'new' || item.payload.status === 'drafted' || item.payload.status === 'errored') && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditModal(item)}
                  >
                    ✏️ Edit
                  </button>
                )}
                
                {/* Regen buttons for drafted and errored items (they already have content) */}
                {(item.payload.status === 'drafted' || item.payload.status === 'errored') && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRegenerateText(item)}
                      disabled={actionLoading[`${item.id}-regen-text`]}
                    >
                      {actionLoading[`${item.id}-regen-text`] ? '...' : '🔄 Regen Text'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRegenerateImage(item)}
                      disabled={actionLoading[`${item.id}-regen-image`]}
                    >
                      {actionLoading[`${item.id}-regen-image`] ? '...' : '🎨 Regen Image'}
                    </button>
                  </>
                )}
                
                {/* Delete always available */}
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(item)}
                  disabled={actionLoading[`${item.id}-delete`]}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
          </div>
          
          {/* Load More Button */}
          {nextOffset && (
            <div className="pagination-controls">
              <button 
                className="btn btn-primary btn-load-more"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    Loading...
                  </>
                ) : (
                  '📄 Load More'
                )}
              </button>
            </div>
          )}
          
          {!nextOffset && items.length > 0 && (
            <div className="pagination-end">
              ✓ All {items.length} items loaded
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editModal && (
        <EditModal
          item={editModal}
          onSave={handleSaveEdit}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [fbPostText, setFbPostText] = useState(item.payload.fb_post_text || '');
  const [imagePrompt, setImagePrompt] = useState(item.payload.image_prompt || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(item.id, {
      fb_post_text: fbPostText,
      image_prompt: imagePrompt,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Edit News Item</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Original Title</label>
            <input
              type="text"
              className="form-control"
              value={item.payload.original_title}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Facebook Post Text (Bangla)</label>
            <textarea
              className="form-control"
              value={fbPostText}
              onChange={(e) => setFbPostText(e.target.value)}
              rows={8}
              placeholder="Enter the Facebook post text..."
            />
          </div>

          <div className="form-group">
            <label>Image Prompt</label>
            <textarea
              className="form-control"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              rows={3}
              placeholder="DALL-E image generation prompt..."
            />
          </div>

          {item.payload.image_url && (
            <div className="form-group">
              <label>Current Image</label>
              <img
                src={item.payload.image_url}
                alt="Current"
                style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}
              />
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewsManager;
