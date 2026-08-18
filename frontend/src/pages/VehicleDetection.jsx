import React, { useState, useEffect } from 'react';
import { getVehicleHistory, getVehicleStats, getVehicleTaxonomy, getSystemMode } from '../services/api';
import { Video, Car, Camera, Filter, Crosshair, Layers, ShieldAlert, Cpu, RefreshCw } from 'lucide-react';

export default function VehicleDetection() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_type: {}, by_lane: {}, by_direction: {}, per_hour: 0 });
  const [taxonomy, setTaxonomy] = useState([]);
  const [systemMode, setSystemModeState] = useState({ data_mode: 'recorded_video', active_sources: {} });

  // Filters state
  const [filterSource, setFilterSource] = useState('All');
  const [filterIntersection, setFilterIntersection] = useState('junction_1');
  const [filterCamera, setFilterCamera] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterLane, setFilterLane] = useState('All');
  const [filterDirection, setFilterDirection] = useState('All');

  useEffect(() => {
    const fetchMeta = async () => {
      const tax = await getVehicleTaxonomy();
      const mode = await getSystemMode();
      setTaxonomy(tax || []);
      setSystemModeState(mode || { data_mode: 'recorded_video', active_sources: {} });
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const hist = await getVehicleHistory({
        intersection: filterIntersection,
        limit: 50,
        vehicleType: filterType,
        lane: filterLane,
        camera: filterCamera,
        direction: filterDirection,
        source: filterSource
      });
      const st = await getVehicleStats(filterIntersection);
      setHistory(hist || []);
      if (st) setStats(st);
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [filterIntersection, filterSource, filterCamera, filterType, filterLane, filterDirection]);

  // Derive active model supported classes
  const supportedTaxonomy = taxonomy.filter(t => t.supports_coco || t.supports_bmd45);

  const kpis = [
    { label: 'Total Vehicles', val: stats.total, color: '#3b82f6' },
    { label: 'Cars', val: stats.by_type['car'] || 0, color: '#10b981' },
    { label: 'Motorcycles', val: stats.by_type['motorcycle'] || 0, color: '#f59e0b' },
    { label: 'Auto Rickshaws', val: stats.by_type['auto_rickshaw'] || 0, color: '#06b6d4' },
    { label: 'SUVs', val: stats.by_type['suv'] || 0, color: '#8b5cf6' },
    { label: 'Buses', val: stats.by_type['bus'] || 0, color: '#ef4444' },
    { label: 'Trucks', val: stats.by_type['truck'] || 0, color: '#64748b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#00e5ff' }}>
            <Video size={24} color="#000e26" />
          </div>
          <div>
            <h1>AI Vehicle Detection & Classification</h1>
            <p>Real-time YOLOv8 bounding box tracking, ByteTrack telemetry, and line-crossing counts</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', border: '1px solid #00e5ff', color: '#00e5ff', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Cpu size={14} /> MODE: {systemMode.data_mode?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Real-Time Video Stream Player */}
      <div className="card" style={{ padding: '1rem', background: '#090f1e', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', fontSize: '0.85rem', color: '#00e5ff' }}>
            <Camera size={18} /> LIVE DETECTOR FEED — {filterIntersection.toUpperCase()} (CAM_01)
          </div>
          <span style={{ background: '#10b98120', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
            YOLOv8 + ByteTrack ACTIVE
          </span>
        </div>

        <div style={{ width: '100%', maxHeight: '440px', background: '#000', borderRadius: '6px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src="http://127.0.0.1:8000/api/stream/video" 
            alt="AI Live Stream"
            style={{ width: '100%', height: 'auto', maxHeight: '440px', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card" style={{ padding: '0.85rem', borderTop: `3px solid ${kpi.color}` }}>
            <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.68rem', fontWeight: '800', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="card" style={{ padding: '1rem', background: '#0f172a' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#00e5ff" /> FILTER CROSSING OBSERVATIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          
          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--gov-text-muted)', fontWeight: '700' }}>Intersection</label>
            <select className="gov-btn" style={{ width: '100%', marginTop: '0.2rem', padding: '0.3rem' }} value={filterIntersection} onChange={e => setFilterIntersection(e.target.value)}>
              <option value="junction_1">Junction 1</option>
              <option value="junction_2">Junction 2</option>
              <option value="junction_3">Junction 3</option>
              <option value="junction_4">Junction 4</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--gov-text-muted)', fontWeight: '700' }}>Camera</label>
            <select className="gov-btn" style={{ width: '100%', marginTop: '0.2rem', padding: '0.3rem' }} value={filterCamera} onChange={e => setFilterCamera(e.target.value)}>
              <option value="All">All Cameras</option>
              <option value="CAM_01">CAM_01</option>
              <option value="CAM_02">CAM_02</option>
              <option value="CAM_03">CAM_03</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--gov-text-muted)', fontWeight: '700' }}>Vehicle Type</label>
            <select className="gov-btn" style={{ width: '100%', marginTop: '0.2rem', padding: '0.3rem' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="All">All Types</option>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="auto_rickshaw">Auto Rickshaw</option>
              <option value="suv">Jeep/SUV</option>
              <option value="bus">Bus</option>
              <option value="truck">Truck</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--gov-text-muted)', fontWeight: '700' }}>Lane</label>
            <select className="gov-btn" style={{ width: '100%', marginTop: '0.2rem', padding: '0.3rem' }} value={filterLane} onChange={e => setFilterLane(e.target.value)}>
              <option value="All">All Lanes</option>
              <option value="lane_1">Lane 1</option>
              <option value="lane_2">Lane 2</option>
              <option value="lane_3">Lane 3</option>
              <option value="lane_4">Lane 4</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--gov-text-muted)', fontWeight: '700' }}>Direction</label>
            <select className="gov-btn" style={{ width: '100%', marginTop: '0.2rem', padding: '0.3rem' }} value={filterDirection} onChange={e => setFilterDirection(e.target.value)}>
              <option value="All">All Directions</option>
              <option value="North->South">North-&gt;South</option>
              <option value="East->West">East-&gt;West</option>
              <option value="West->East">West-&gt;East</option>
              <option value="South->North">South-&gt;North</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--gov-text-muted)', fontWeight: '700' }}>Data Source</label>
            <select className="gov-btn" style={{ width: '100%', marginTop: '0.2rem', padding: '0.3rem' }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
              <option value="All">All Sources</option>
              <option value="RECORDED_VIDEO">RECORDED_VIDEO</option>
              <option value="LIVE_CAMERA">LIVE_CAMERA</option>
              <option value="BMD45_DATASET">BMD45_DATASET</option>
            </select>
          </div>

        </div>
      </div>

      {/* Detection History Log Table */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Vehicle Crossing Log ({history.length} events)</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--gov-text-muted)' }}>Updated automatically from FastAPI</span>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
          {history.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--gov-text-muted)', fontSize: '0.85rem' }}>
              <Crosshair size={32} style={{ opacity: 0.3, margin: '0 auto 1rem auto' }} />
              No vehicle detections recorded matching active filters.
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--gov-card-bg)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--gov-card-border)', color: 'var(--gov-text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Track ID</th>
                  <th style={{ padding: '0.5rem' }}>Type</th>
                  <th style={{ padding: '0.5rem' }}>Camera</th>
                  <th style={{ padding: '0.5rem' }}>Lane</th>
                  <th style={{ padding: '0.5rem' }}>Direction</th>
                  <th style={{ padding: '0.5rem' }}>Confidence</th>
                  <th style={{ padding: '0.5rem' }}>Source</th>
                  <th style={{ padding: '0.5rem' }}>Crossing Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(203, 213, 225, 0.1)' }}>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#00e5ff', fontWeight: '700' }}>#{item.track_id}</td>
                    <td style={{ padding: '0.5rem', fontWeight: '700', color: 'var(--gov-text-dark)', textTransform: 'uppercase' }}>{item.vehicle_type}</td>
                    <td style={{ padding: '0.5rem', color: '#cbd5e1' }}>{item.camera || 'CAM_01'}</td>
                    <td style={{ padding: '0.5rem' }}>{item.lane?.replace('_', ' ').toUpperCase()}</td>
                    <td style={{ padding: '0.5rem', color: '#94a3b8' }}>{item.direction}</td>
                    <td style={{ padding: '0.5rem', color: '#10b981', fontWeight: '600' }}>{(item.confidence * 100).toFixed(1)}%</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
                        {item.source || 'RECORDED_VIDEO'}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', color: 'var(--gov-text-muted)' }}>{new Date(item.entry_time).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  );
}
