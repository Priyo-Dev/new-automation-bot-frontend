import { useState, useEffect } from 'react';
import { getStats, getHealth, getLogs, getNews } from '../api/client';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const CACHE_KEY = 'dashboard_cache_v1';
    const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

    const readCache = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (typeof parsed.ts !== 'number') return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const applyCache = (cached) => {
      if (!cached?.data) return;
      const { stats, health, recentLogs, costData } = cached.data;
      setStats(stats ?? null);
      setHealth(health ?? null);
      setRecentLogs(Array.isArray(recentLogs) ? recentLogs : []);
      setCostData(Array.isArray(costData) ? costData : []);
      setLoading(false);
    };

    const cached = readCache();
    const now = Date.now();
    const isFresh = cached && now - cached.ts < CACHE_TTL_MS;

    if (cached) {
      // Fast render cached data for better UX (even if stale)
      applyCache(cached);
    }

    // Only fetch when cache is missing/expired (or if stale cache should refresh in background).
    if (!isFresh) {
      loadData({ force: true, cacheKey: CACHE_KEY, cacheTtlMs: CACHE_TTL_MS });
    }

    // Optional: if user stays on the dashboard, refresh at most every 15 minutes.
    const interval = setInterval(() => {
      loadData({ force: true, cacheKey: CACHE_KEY, cacheTtlMs: CACHE_TTL_MS });
    }, CACHE_TTL_MS);

    return () => clearInterval(interval);
  }, []);

  const loadData = async ({ force = false, cacheKey, cacheTtlMs } = {}) => {
    try {
      if (force) setRefreshing(true);

      const [statsRes, healthRes, logsRes] = await Promise.all([
        getStats(),
        getHealth(),
        getLogs({ limit: 10 }),
      ]);
      
      // Get cost data separately - fetch from multiple statuses
      let costItems = [];
      try {
        const [drafted, published, approved] = await Promise.all([
          getNews({ status: 'drafted', limit: 50 }),
          getNews({ status: 'published', limit: 50 }),
          getNews({ status: 'approved', limit: 50 }),
        ]);
        costItems = [
          ...(drafted.data.items || []),
          ...(published.data.items || []),
          ...(approved.data.items || []),
        ];
      } catch (error) {
        console.error('Failed to load cost data:', error);
      }
      setStats(statsRes.data);
      setHealth(healthRes.data);
      setRecentLogs(logsRes.data.logs || []);
      
      // Process cost data for graph - get items with costs, sorted by date
      const itemsWithCost = costItems
        .filter(item => item.payload.generation_cost_usd && item.payload.generation_cost_usd > 0)
        .sort((a, b) => {
          const dateA = new Date(a.payload.created_at || a.payload.published_at || 0);
          const dateB = new Date(b.payload.created_at || b.payload.published_at || 0);
          return dateA - dateB; // Oldest first for graph
        })
        .slice(-30) // Last 30 items
        .map((item, index) => ({
          postNumber: index + 1,
          cost: item.payload.generation_cost_usd || 0,
          date: item.payload.created_at || item.payload.published_at,
        }));
      setCostData(itemsWithCost);

      // Persist cache (only after successful refresh)
      if (cacheKey) {
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              ts: Date.now(),
              ttlMs: cacheTtlMs,
              data: {
                stats: statsRes.data,
                health: healthRes.data,
                recentLogs: logsRes.data.logs || [],
                costData: itemsWithCost,
              },
            })
          );
        } catch {
          // Ignore cache write errors (private mode/quota)
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const costMax = costData.length ? Math.max(...costData.map((d) => d.cost || 0), 0) : 0;
  const costMaxSafe = Math.max(costMax, 0.01);
  const chartPadY = 6; // padding inside SVG coordinate system to prevent clipping
  const chartPadX = 3;
  const baselineY = 100 - chartPadY;
  const chartPoints = costData.map((d, i) => {
    const n = costData.length;
    const x = n <= 1 ? 50 : chartPadX + (i / (n - 1)) * (100 - chartPadX * 2);
    const clampedCost = Math.max(0, d.cost || 0);
    const y = chartPadY + (1 - clampedCost / costMaxSafe) * (100 - chartPadY * 2);
    return { x, y, cost: clampedCost, date: d.date };
  });
  const polylinePoints = chartPoints
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  const areaPath =
    chartPoints.length >= 2
      ? `M ${chartPoints[0].x.toFixed(2)} ${baselineY.toFixed(2)} ` +
        `L ${chartPoints[0].x.toFixed(2)} ${chartPoints[0].y.toFixed(2)} ` +
        chartPoints
          .slice(1)
          .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(' ') +
        ` L ${chartPoints[chartPoints.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} Z`
      : '';

  const statusRows = [
    {
      key: 'new',
      label: 'New',
      value: stats?.new_items || 0,
      markerColor: '#6c757d',
      gradient: 'linear-gradient(90deg, #6c757d, #5a6268)',
    },
    {
      key: 'drafted',
      label: 'Drafted',
      value: stats?.drafted_items || 0,
      markerColor: 'var(--accent-orange)',
      gradient: 'linear-gradient(90deg, var(--accent-orange), #f39c12)',
    },
    {
      key: 'approved',
      label: 'Approved',
      value: stats?.approved_items || 0,
      markerColor: 'var(--accent-blue)',
      gradient: 'linear-gradient(90deg, var(--accent-blue), #3498db)',
    },
    {
      key: 'published',
      label: 'Published',
      value: stats?.published_items || 0,
      markerColor: 'var(--accent-green)',
      gradient: 'linear-gradient(90deg, var(--accent-green), #2ecc71)',
    },
    {
      key: 'errored',
      label: 'Errored',
      value: stats?.errored_items || 0,
      markerColor: 'var(--accent-red)',
      gradient: 'linear-gradient(90deg, var(--accent-red), #e74c3c)',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: stats?.rejected_items || 0,
      markerColor: '#dc3545',
      gradient: 'linear-gradient(90deg, #dc3545, #c82333)',
    },
  ];
  const statusMax = Math.max(...statusRows.map((r) => r.value), 1);

  const viralityRows = [
    {
      key: 'high',
      label: 'High (7-10)',
      value: stats?.high_virality || 0,
      markerColor: 'var(--accent-green)',
      gradient: 'linear-gradient(90deg, var(--accent-green), #2ecc71)',
    },
    {
      key: 'medium',
      label: 'Med (4-6)',
      value: stats?.medium_virality || 0,
      markerColor: 'var(--accent-orange)',
      gradient: 'linear-gradient(90deg, var(--accent-orange), #f39c12)',
    },
    {
      key: 'low',
      label: 'Low (1-3)',
      value: stats?.low_virality || 0,
      markerColor: 'var(--accent-red)',
      gradient: 'linear-gradient(90deg, var(--accent-red), #e74c3c)',
    },
  ];
  const viralityMax = Math.max(...viralityRows.map((r) => r.value), 1);

  const renderDistributionRow = (row, max, isLast) => {
    const pct = max > 0 ? (row.value / max) * 100 : 0;
    return (
      <div
        key={row.key}
        style={{
          display: 'grid',
          gridTemplateColumns: '170px 1fr 56px',
          gap: '14px',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span
            style={{
              width: '6px',
              height: '18px',
              borderRadius: '999px',
              background: row.markerColor,
              flex: '0 0 auto',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.label}
          </span>
        </div>

        <div
          style={{
            height: '32px',
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
          }}
          title={`${row.label}: ${row.value}${stats?.total_items ? ` (${((row.value / stats.total_items) * 100).toFixed(1)}%)` : ''}`}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: row.gradient,
              transition: 'width 0.5s',
              minWidth: row.value > 0 ? '10px' : '0',
            }}
          />
        </div>

        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
          {row.value}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h2>📊 Dashboard</h2>
            <p>Real-time overview of your news automation pipeline</p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => loadData({ force: true, cacheKey: 'dashboard_cache_v1', cacheTtlMs: 15 * 60 * 1000 })}
            disabled={refreshing}
            title="Refresh dashboard data"
            style={{ whiteSpace: 'nowrap' }}
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
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
        
        <div className="stat-card purple">
          <div className="stat-icon">💰</div>
          <div className="stat-value">${stats?.avg_cost_per_item?.toFixed(4) || '0.0000'}</div>
          <div className="stat-label">Avg Cost/Post</div>
        </div>
        
        <div className="stat-card purple">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats?.success_rate?.toFixed(1) || '0.0'}%</div>
          <div className="stat-label">Success Rate</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span>⚠️ Errored</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{stats?.errored_items || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span>❌ Rejected</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{stats?.rejected_items || 0}</span>
            </div>
          </div>
        </div>
        
      </div>


      {/* Third Row - Cost Trend Graph (Full Width) */}
      <div style={{ marginTop: '20px' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">📈 Cost Per Post Trend</div>
          </div>
          <div style={{ padding: '20px' }}>
            {costData.length > 0 ? (
              <div>
                {/* Graph Container */}
                <div style={{ 
                  height: '300px', 
                  position: 'relative',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '20px',
                  background: 'var(--bg-primary)'
                }}>
                  {/* Y-axis labels */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '0', 
                    top: '0', 
                    bottom: '30px', 
                    width: '50px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                  }}>
                    <span>${Math.max(...costData.map(d => d.cost), 0).toFixed(2)}</span>
                    <span>${(Math.max(...costData.map(d => d.cost), 0) / 2).toFixed(2)}</span>
                    <span>$0.00</span>
                  </div>
                  
                  {/* Graph area */}
                  <div style={{ 
                    marginLeft: '55px',
                    height: '100%',
                    position: 'relative',
                    borderLeft: '2px solid var(--border-color)',
                    borderBottom: '2px solid var(--border-color)'
                  }}>
                    {/* Grid lines */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: `
                        repeating-linear-gradient(to bottom, transparent, transparent 49px, var(--border-color) 49px, var(--border-color) 50px),
                        repeating-linear-gradient(to right, transparent, transparent ${costData.length > 1 ? 100 / Math.min(costData.length, 10) : 0}%, var(--border-color) ${costData.length > 1 ? 100 / Math.min(costData.length, 10) : 0}%, var(--border-color) ${costData.length > 1 ? 100 / Math.min(costData.length, 10) + 0.5 : 0}%)
                      `,
                      opacity: 0.2
                    }}></div>
                    
                    {/* Line graph */}
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: '30px',
                        width: '100%',
                        height: '100%',
                        overflow: 'visible',
                        pointerEvents: 'none',
                      }}
                    >
                      <defs>
                        <linearGradient id="costLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.95" />
                        </linearGradient>
                        <linearGradient id="costAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.02" />
                        </linearGradient>
                        <filter id="costShadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="rgba(0,0,0,0.25)" />
                        </filter>
                      </defs>

                      {/* Area under the curve */}
                      {areaPath && (
                        <path d={areaPath} fill="url(#costAreaGradient)" stroke="none" />
                      )}

                      {/* Line */}
                      {costData.length > 1 && (
                        <polyline
                          points={polylinePoints}
                          fill="none"
                          stroke="url(#costLineGradient)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#costShadow)"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </svg>

                    {/* Crisp markers (HTML) to avoid SVG aspect-ratio stretching turning circles into ovals */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: '30px',
                        pointerEvents: 'none',
                      }}
                    >
                      {chartPoints.map((p, i) => {
                        const isLast = i === chartPoints.length - 1;
                        return (
                          <div
                            key={i}
                            title={`Post ${i + 1}: $${p.cost.toFixed(4)}${
                              p.date ? ` (${new Date(p.date).toLocaleString()})` : ''
                            }`}
                            style={{
                              position: 'absolute',
                              left: `${p.x}%`,
                              top: `${p.y}%`,
                              transform: 'translate(-50%, -50%)',
                              width: isLast ? '12px' : '10px',
                              height: isLast ? '12px' : '10px',
                              borderRadius: '50%',
                              background: isLast ? 'var(--accent-purple)' : 'var(--accent-blue)',
                              border: '2px solid rgba(255, 255, 255, 0.92)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                              pointerEvents: 'auto',
                            }}
                          />
                        );
                      })}
                    </div>
                    
                    {/* X-axis labels */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-30px',
                      left: '0',
                      right: '0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      fontWeight: 500
                    }}>
                      <span>Post 1</span>
                      {costData.length > 1 && <span>Post {Math.floor(costData.length / 2)}</span>}
                      {costData.length > 1 && <span>Post {costData.length}</span>}
                    </div>
                  </div>
                </div>
                
                {/* Summary */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  padding: '16px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>Posts Shown</div>
                    <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--accent-blue)' }}>{costData.length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>Avg Cost</div>
                    <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--accent-orange)' }}>
                      ${(costData.reduce((sum, d) => sum + d.cost, 0) / costData.length).toFixed(4)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>Total Shown</div>
                    <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--accent-green)' }}>
                      ${costData.reduce((sum, d) => sum + d.cost, 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state-icon">📈</div>
                <h3>No cost data yet</h3>
                <p>Cost trend will appear here once posts are generated</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fourth Row - 2 columns: Status Distribution and Virality Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Status Distribution Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">📊 Status Distribution</div>
          </div>
          <div style={{ padding: '20px' }}>
            {stats?.total_items > 0 ? (
              <>
                {/* Bars */}
                <div style={{ marginBottom: '20px' }}>
                  {statusRows.map((row, idx) => renderDistributionRow(row, statusMax, idx === statusRows.length - 1))}
                </div>
                
                {/* Summary */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Total Items:</span>
                    <span style={{ fontWeight: 600 }}>{stats.total_items}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Processed:</span>
                    <span style={{ fontWeight: 600 }}>{stats.drafted_items + stats.approved_items + stats.published_items + stats.rejected_items + stats.errored_items}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending:</span>
                    <span style={{ fontWeight: 600 }}>{stats.new_items + stats.drafted_items}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state-icon">📊</div>
                <h3>No data yet</h3>
                <p>Status distribution will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Virality Distribution */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div className="card-title">📈 Virality Distribution</div>
          </div>
          <div style={{ padding: '20px' }}>
            {stats?.total_items > 0 ? (
              <>
                {/* Bars */}
                <div style={{ marginBottom: '20px' }}>
                  {viralityRows.map((row, idx) => renderDistributionRow(row, viralityMax, idx === viralityRows.length - 1))}
                </div>
                
                {/* Summary */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px', 
                  background: 'var(--bg-secondary)', borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Avg. Score:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{stats?.avg_virality_score?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>High Quality:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                      {stats?.total_items ? ((stats.high_virality / stats.total_items) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state-icon">📈</div>
                <h3>No data yet</h3>
                <p>Virality distribution will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fifth Row - Recent Activity */}
      <div style={{ marginTop: '20px' }}>
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
      </div>
    </div>
  );
}

export default Dashboard;
