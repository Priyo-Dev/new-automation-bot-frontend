import { useState, useEffect, useRef } from 'react';
import {
  runScan,
  runGeneration,
  runFullPipeline,
  runAutoPublish,
  getJobs,
  getJobStatus,
} from '../api/client';

function PipelineControls() {
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState({});
  const [alert, setAlert] = useState(null);
  const [autoPublishScore, setAutoPublishScore] = useState(5);
  const intervalRef = useRef(null);
  
  // Pagination state
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jobNameFilter, setJobNameFilter] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const loadJobs = async (resetOffset = false) => {
    setLoadingJobs(true);
    try {
      const params = {
        limit,
        ...(resetOffset ? {} : { offset }),
        ...(jobTypeFilter ? { job_type: jobTypeFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(jobNameFilter ? { job_name: jobNameFilter } : {}),
      };
      
      const response = await getJobs(params);
      const newJobs = response.data.jobs || {};
      const responseTotal = response.data.total || 0;
      const responseHasMore = response.data.has_more || false;
      
      // Always replace jobs (not merge) - pagination loads one page at a time
      setJobs(newJobs);
      
      setTotal(responseTotal);
      setHasMore(responseHasMore);
      setOffset(response.data.next_offset || null);
      
      // Adjust polling interval: faster when jobs are running, slower when idle
      const hasRunningJobs = Object.values(newJobs).some(job => job.status === 'running');
      const pollInterval = hasRunningJobs ? 3000 : 15000; // 3s if running, 15s if idle
      
      // Restart interval with new timing if needed
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => loadJobs(false), pollInterval);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadJobs(true);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [jobTypeFilter, statusFilter, jobNameFilter, limit]); // Reload when filters change

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleRunScan = async () => {
    setLoading(prev => ({ ...prev, scan: true }));
    try {
      const response = await runScan(false);
      showAlert('success', `Scout started! Job ID: ${response.data.job_id}`);
      loadJobs();
    } catch (error) {
      showAlert('error', error.response?.data?.detail || 'Failed to start scout');
    } finally {
      setLoading(prev => ({ ...prev, scan: false }));
    }
  };

  const handleRunGeneration = async () => {
    setLoading(prev => ({ ...prev, generation: true }));
    try {
      const response = await runGeneration(false);
      showAlert('success', `Content generation started! Job ID: ${response.data.job_id}`);
      loadJobs();
    } catch (error) {
      showAlert('error', error.response?.data?.detail || 'Failed to start generation');
    } finally {
      setLoading(prev => ({ ...prev, generation: false }));
    }
  };

  const handleRunFullPipeline = async () => {
    setLoading(prev => ({ ...prev, full: true }));
    try {
      const response = await runFullPipeline(false);
      showAlert('success', `Full pipeline started! Job ID: ${response.data.job_id}`);
      loadJobs();
    } catch (error) {
      showAlert('error', error.response?.data?.detail || 'Failed to start pipeline');
    } finally {
      setLoading(prev => ({ ...prev, full: false }));
    }
  };

  const handleAutoPublish = async () => {
    setLoading(prev => ({ ...prev, publish: true }));
    try {
      const response = await runAutoPublish(autoPublishScore);
      if (response.data.items_processed > 0) {
        showAlert('success', response.data.message);
      } else {
        showAlert('info', response.data.message || 'No items to publish');
      }
    } catch (error) {
      showAlert('error', error.response?.data?.detail || 'Failed to auto-publish');
    } finally {
      setLoading(prev => ({ ...prev, publish: false }));
    }
  };

  const getJobStatusColor = (status) => {
    switch (status) {
      case 'running': return 'var(--accent-blue)';
      case 'completed': return 'var(--accent-green)';
      case 'failed': return 'var(--accent-red)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="pipeline-controls">
      <div className="page-header">
        <h2>⚙️ Pipeline Controls</h2>
        <p>Manually trigger pipeline operations and monitor running jobs</p>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : 'ℹ️'} {alert.message}
        </div>
      )}

      {/* Action Cards - 2x2 Grid */}
      <div className="pipeline-grid">
        {/* Scout */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">🔍 News Scout</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', minHeight: '48px' }}>
            Scan news sources for new tech stories. Fetches headlines and checks for duplicates.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleRunScan}
            disabled={loading.scan}
            style={{ width: '100%' }}
          >
            {loading.scan ? '⏳ Starting...' : '🔍 Run Scout'}
          </button>
        </div>

        {/* Content Generation */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">✍️ Content Generation</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', minHeight: '48px' }}>
            Generate Bangla Facebook posts and images for new items using AI agents.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleRunGeneration}
            disabled={loading.generation}
            style={{ width: '100%' }}
          >
            {loading.generation ? '⏳ Starting...' : '✍️ Generate Content'}
          </button>
        </div>

        {/* Full Pipeline */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">🚀 Full Pipeline</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', minHeight: '48px' }}>
            Run the complete pipeline: Scout → Content Generation → Editor Review.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleRunFullPipeline}
            disabled={loading.full}
            style={{ width: '100%' }}
          >
            {loading.full ? '⏳ Starting...' : '🚀 Run Full Pipeline'}
          </button>
        </div>

        {/* Auto Publish */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">📤 Auto Publish</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Publish the highest-scoring drafted item to Facebook.
          </p>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px' }}>Minimum Virality Score</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="10"
              value={autoPublishScore}
              onChange={(e) => setAutoPublishScore(parseInt(e.target.value) || 5)}
            />
          </div>
          <button
            className="btn btn-success"
            onClick={handleAutoPublish}
            disabled={loading.publish}
            style={{ width: '100%' }}
          >
            {loading.publish ? '⏳ Publishing...' : '📤 Auto Publish'}
          </button>
        </div>
      </div>

      {/* Running Jobs */}
      <div className="card" style={{ marginTop: '30px' }}>
        <div className="card-header">
          <div className="card-title">📋 Background Jobs</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={() => loadJobs(true)} disabled={loadingJobs}>
              🔄 Refresh
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Name:</label>
            <select
              className="form-control"
              value={jobNameFilter}
              onChange={(e) => {
                setJobNameFilter(e.target.value);
                setOffset(null);
              }}
              style={{ width: '180px', padding: '6px 10px', fontSize: '13px' }}
            >
              <option value="">All Jobs</option>
              <option value="scout">🔍 Scout</option>
              <option value="news_scan">🔍 News Scan</option>
              <option value="content_generation">✍️ Content Generation</option>
              <option value="auto_publish">📤 Auto Publish</option>
              <option value="full_pipeline">🚀 Full Pipeline</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Type:</label>
            <select
              className="form-control"
              value={jobTypeFilter}
              onChange={(e) => {
                setJobTypeFilter(e.target.value);
                setOffset(null);
              }}
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
            >
              <option value="">All Types</option>
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Status:</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(null);
              }}
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
            >
              <option value="">All Status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Per Page:</label>
            <select
              className="form-control"
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setOffset(null);
              }}
              style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          
          {total > 0 && (
            <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing {Object.keys(jobs).length} of {total} jobs
            </div>
          )}
        </div>

        {Object.keys(jobs).length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div className="empty-state-icon">✅</div>
            <h3>No active jobs</h3>
            <p>Background jobs will appear here when running</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Completed</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(jobs).map(([jobId, job]) => (
                  <tr key={jobId}>
                    <td style={{ fontFamily: 'monospace' }}>{jobId}</td>
                    <td>{job.name}</td>
                    <td>
                      <span style={{ 
                        color: getJobStatusColor(job.status),
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontSize: '12px'
                      }}>
                        {job.status === 'running' && '⏳ '}
                        {job.status === 'completed' && '✅ '}
                        {job.status === 'failed' && '❌ '}
                        {job.status}
                      </span>
                    </td>
                    <td>{new Date(job.started_at).toLocaleTimeString()}</td>
                    <td>{job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : '-'}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.error ? (
                        <span style={{ color: 'var(--accent-red)' }}>{job.error}</span>
                      ) : job.result ? (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {JSON.stringify(job.result).slice(0, 100)}...
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {Object.keys(jobs).length > 0 && (
          <div style={{ 
            padding: '16px', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {loadingJobs ? 'Loading...' : `Showing ${Object.keys(jobs).length} of ${total} jobs`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setOffset(null);
                  loadJobs(true);
                }}
                disabled={!offset || loadingJobs}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                ⬅️ Previous
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => loadJobs(false)}
                disabled={!hasMore || loadingJobs}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Next ➡️
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Flow Diagram */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div className="card-title">📊 Pipeline Flow</div>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'center',
          padding: '30px 0',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontWeight: 600 }}>Scout</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fetch News</div>
          </div>
          <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✍️</div>
            <div style={{ fontWeight: 600 }}>Writer</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bangla Post</div>
          </div>
          <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
            <div style={{ fontWeight: 600 }}>Visualizer</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generate Image</div>
          </div>
          <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
            <div style={{ fontWeight: 600 }}>Editor</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Score & Review</div>
          </div>
          <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
            <div style={{ fontWeight: 600 }}>Human</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Approve/Reject</div>
          </div>
          <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
            <div style={{ fontWeight: 600 }}>Publish</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Facebook</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PipelineControls;
