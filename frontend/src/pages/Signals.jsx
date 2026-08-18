import React, { useState, useEffect } from 'react';
import { 
  Settings2, Activity, Clock, Sliders, AlertTriangle, ShieldCheck, RefreshCw, Zap
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Signals() {
  const [signal, setSignal] = useState(null);
  const [intersections, setIntersections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrideLane, setOverrideLane] = useState('lane_1');
  const [overrideTime, setOverrideTime] = useState(60);
  const [confirmModal, setConfirmModal] = useState(false);
  const [message, setMessage] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const fetchSignalData = async () => {
    try {
      const sRes = await axios.get(`${API_BASE_URL}/signal/status`);
      setSignal(sRes.data);
      const iRes = await axios.get(`${API_BASE_URL}/intersections`);
      setIntersections(iRes.data);
      setLoading(false);
      setFetchError(null);
    } catch (e) {
      console.error(e);
      setFetchError("Unable to refresh live signal telemetry. Connection dropped or data is stale.");
    }
  };

  useEffect(() => {
    fetchSignalData();
    const interval = setInterval(fetchSignalData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleManualOverride = async () => {
    try {
      await axios.post(`${API_BASE_URL}/signal/override?target_lane=${overrideLane}&green_time=${overrideTime}`);
      setConfirmModal(false);
      setMessage(`Signal override applied to ${overrideLane.toUpperCase()} for ${overrideTime}s`);
      setFetchError(null);
      fetchSignalData();
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage('Failed to execute signal override');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast */}
      {message && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 200,
          background: '#10b981', color: '#fff', padding: '0.75rem 1.25rem',
          borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {message}
        </div>
      )}

      {/* Fetch Error Alert Banner */}
      {fetchError && (
        <div style={{
          background: '#ef444420', border: '1px solid #ef4444', color: '#fca5a5',
          padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600'
        }}>
          <AlertTriangle size={16} /> {fetchError}
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#2563eb' }}><Settings2 size={24} color="#fff" /></div>
          <div>
            <h1>Signal Management</h1>
            <p>Adaptive Traffic Signal Controller & Safety Sequence Monitor</p>
          </div>
        </div>
        <button onClick={fetchSignalData} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Refresh State
        </button>
      </div>

      {/* Grid Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Active Phase Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#10b981" /> Current Active Signal Phase
            </h2>
            <span style={{
              padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800',
              background: signal?.state === 'GREEN' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: signal?.state === 'GREEN' ? '#10b981' : '#ef4444'
            }}>
              {signal?.state || 'GREEN'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Served Lane</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase' }}>
                {signal?.current_lane || 'lane_1'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Green Time</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>{signal?.green_time || 30}s</div>
              </div>
              <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Remaining Time</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>{signal?.remaining_time || 0}s</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Controller Decision Log */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="#3b82f6" /> Adaptive Algorithm Score Breakdown
          </h2>
          <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155', height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: '700', marginBottom: '0.4rem' }}>LAST DECISION REASON</div>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.4', fontFamily: 'monospace' }}>
              {signal?.last_reason || "Density(0.0) + Wait(0.0) - Penalty(0)"}
            </div>
          </div>
        </div>
      </div>

      {/* Safety Clearance Sequence Box */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="#10b981" /> Safety Transition Sequence Parameters
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { title: 'Minimum Green Time', val: '15 seconds', desc: 'Prevents premature signal toggling' },
            { title: 'Maximum Green Time', val: '90 seconds', desc: 'Caps lane hold time during high density' },
            { title: 'Yellow Clearance', val: '3 seconds', desc: 'Safe junction entry warning interval' },
            { title: 'All-Red Clearance', val: '2 seconds', desc: 'Complete intersection emptying window' }
          ].map(s => (
            <div key={s.title} style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f1f5f9' }}>{s.title}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#60a5fa', margin: '0.2rem 0' }}>{s.val}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Signal Override Panel */}
      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
          <Zap size={18} /> Operational Manual Signal Override
        </h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Target Lane</label>
            <select value={overrideLane} onChange={e => setOverrideLane(e.target.value)} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}>
              <option value="lane_1">LANE 1 (Northbound)</option>
              <option value="lane_2">LANE 2 (Southbound)</option>
              <option value="lane_3">LANE 3 (Eastbound)</option>
              <option value="lane_4">LANE 4 (Westbound)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Hold Duration (Seconds)</label>
            <input type="number" min="15" max="120" value={overrideTime} onChange={e => setOverrideTime(parseInt(e.target.value))} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', width: '100px' }} />
          </div>
          <button onClick={() => setConfirmModal(true)} style={{ marginTop: '1.25rem', padding: '0.55rem 1.25rem', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '4px', fontWeight: '800', cursor: 'pointer' }}>
            Execute Manual Override
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', border: '1px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Confirm Signal Override</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Overriding signal automatically initiates yellow warning and all-red clearance sequence before granting green to <strong>{overrideLane.toUpperCase()}</strong> for {overrideTime}s. Proceed?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleManualOverride} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '4px', fontWeight: '800', cursor: 'pointer' }}>Confirm Override</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
