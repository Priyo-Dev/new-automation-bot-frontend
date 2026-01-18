import { useState } from 'react';
import { createManualPost } from '../api/client';

function ManualPost() {
  const [postText, setPostText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [result, setResult] = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 8000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!postText.trim()) {
      showAlert('error', 'Please enter post text');
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await createManualPost(
        postText,
        imageUrl || null,
        link || null
      );
      
      setResult(response.data);
      showAlert('success', 'Post published to Facebook successfully!');
      
      // Clear form
      setPostText('');
      setImageUrl('');
      setLink('');
      
    } catch (error) {
      showAlert('error', error.response?.data?.detail || 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    // Open a preview modal or section
  };

  return (
    <div className="manual-post">
      <div className="page-header">
        <h2>✍️ Manual Post</h2>
        <p>Create and publish a custom Facebook post</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : '❌'} {alert.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        {/* Post Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📝 Create Post</div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Post Text (Bangla/English)</label>
              <textarea
                className="form-control"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={10}
                placeholder="Enter your Facebook post text here...

🔥 আকর্ষণীয় শিরোনাম

সংবাদের বিস্তারিত বিবরণ এখানে লিখুন। 

#হ্যাশট্যাগ #টেক #বাংলাদেশ"
                required
              />
              <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                {postText.length} characters
              </div>
            </div>

            <div className="form-group">
              <label>Image URL (optional)</label>
              <input
                type="url"
                className="form-control"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Direct URL to an image to attach to the post
              </div>
            </div>

            <div className="form-group">
              <label>Link URL (optional)</label>
              <input
                type="url"
                className="form-control"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/article"
              />
              <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Link to attach (creates a link preview on Facebook)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !postText.trim()}
                style={{ flex: 1 }}
              >
                {loading ? '⏳ Publishing...' : '📤 Publish to Facebook'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview & Tips */}
        <div>
          {/* Preview */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <div className="card-title">👁️ Preview</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: 'var(--radius-sm)', 
              padding: '16px',
              color: '#1c1e21',
              minHeight: '200px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  P
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Priyo Tech</div>
                  <div style={{ fontSize: '12px', color: '#65676b' }}>Just now · 🌐</div>
                </div>
              </div>
              
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                fontSize: '15px', 
                lineHeight: '1.5',
                marginBottom: '12px'
              }}>
                {postText || 'Your post text will appear here...'}
              </div>

              {imageUrl && (
                <img 
                  src={imageUrl} 
                  alt="Preview" 
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    marginTop: '8px'
                  }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}

              {link && !imageUrl && (
                <div style={{ 
                  border: '1px solid #dadde1',
                  borderRadius: '8px',
                  padding: '12px',
                  background: '#f0f2f5',
                  marginTop: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: '#65676b', textTransform: 'uppercase' }}>
                    {new URL(link).hostname}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                    {link}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">💡 Tips</div>
            </div>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.8' }}>
              <li>Use emojis to grab attention 🔥</li>
              <li>Write in Bangla for your audience</li>
              <li>Keep posts under 300 characters for best engagement</li>
              <li>Include 2-3 relevant hashtags</li>
              <li>Add an image for 2x more engagement</li>
              <li>Best times: 9-11 AM, 7-9 PM</li>
            </ul>
          </div>

          {/* Recent Result */}
          {result && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <div className="card-title">✅ Published!</div>
              </div>
              <div style={{ fontSize: '14px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Post ID:</strong> {result.facebook_post_id}
                </div>
                {result.facebook_url && (
                  <a 
                    href={result.facebook_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ marginTop: '8px' }}
                  >
                    View on Facebook →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManualPost;
