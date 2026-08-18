import React, { useState } from 'react';
import { Settings, Sliders, Shield, AlertTriangle, Save, CheckCircle, Flame } from 'lucide-react';

export default function AdminPanel({ onOverride }) {
  const [lowThreshold, setLowThreshold] = useState(20);
  const [normalThreshold, setNormalThreshold] = useState(50);
  const [heavyThreshold, setHeavyThreshold] = useState(100);
  const [overrideLane, setOverrideLane] = useState('lane_1');
  const [savedNotice, setSavedNotice] = useState(false);
  const [overrideNotice, setOverrideNotice] = useState(false);

  const handleSaveConfig = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleExecuteOverride = async () => {
    if (onOverride) {
      await onOverride(overrideLane);
      setOverrideNotice(true);
      setTimeout(() => setOverrideNotice(false), 3000);
    }
  };

  return (
    <div className="card" style={{ borderTop: '4px solid var(--gov-accent-gold)', marginTop: '1.5rem' }}>
      <div className="card-title">
        <Settings size={18} color="#d97706" /> System Administration & Algorithm Calibration Panel
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        
        {/* Box 1: Lane Boundary Logic explanation */}
        <div style={{ padding: '1.25rem', background: 'var(--gov-card-bg)', borderRadius: '0.375rem', border: '1px solid var(--gov-card-border)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sliders size={16} color="#1d4ed8" /> How Per-Lane Vehicle Count Works
          </h3>
          <ul style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', lineHeight: '1.6', paddingLeft: '1.1rem' }}>
            <li><b>Step 1: YOLO Detection</b> — YOLOv8 locates bounding box <code>[x1, y1, x2, y2]</code>.</li>
            <li><b>Step 2: Center Calculation</b> — Center point <code>cx = (x1+x2)/2</code>, <code>cy = (y1+y2)/2</code>.</li>
            <li><b>Step 3: Quadrant Assignment</b>:
              <ul style={{ paddingLeft: '1rem', marginTop: '0.2rem' }}>
                <li>Top-Left (cx &lt; w/2, cy &lt; h/2) &rarr; <b>Lane 1</b></li>
                <li>Top-Right (cx &ge; w/2, cy &lt; h/2) &rarr; <b>Lane 2</b></li>
                <li>Bottom-Left (cx &lt; w/2, cy &ge; h/2) &rarr; <b>Lane 3</b></li>
                <li>Bottom-Right (cx &ge; w/2, cy &ge; h/2) &rarr; <b>Lane 4</b></li>
              </ul>
            </li>
            <li><b>Step 4: 5s Interval POST</b> &rarr; Telemetry posted to <code>/api/traffic/analyze</code>.</li>
          </ul>
        </div>

        {/* Box 2: Configurable Thresholds */}
        <div style={{ padding: '1.25rem', background: 'var(--gov-card-bg)', borderRadius: '0.375rem', border: '1px solid var(--gov-card-border)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '0.75rem' }}>
            Adaptive Level Thresholds
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
            <div>
              <label style={{ fontWeight: '700', color: 'var(--gov-text-muted)' }}>LOW Traffic Max Count (≤)</label>
              <input type="number" value={lowThreshold} onChange={(e) => setLowThreshold(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid var(--gov-card-border)', background: 'transparent', color: 'var(--gov-text-dark)', marginTop: '0.2rem' }} />
            </div>
            <div>
              <label style={{ fontWeight: '700', color: 'var(--gov-text-muted)' }}>NORMAL Traffic Max Count (≤)</label>
              <input type="number" value={normalThreshold} onChange={(e) => setNormalThreshold(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid var(--gov-card-border)', background: 'transparent', color: 'var(--gov-text-dark)', marginTop: '0.2rem' }} />
            </div>
            <div>
              <label style={{ fontWeight: '700', color: 'var(--gov-text-muted)' }}>HEAVY Traffic Max Count (≤)</label>
              <input type="number" value={heavyThreshold} onChange={(e) => setHeavyThreshold(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid var(--gov-card-border)', background: 'transparent', color: 'var(--gov-text-dark)', marginTop: '0.2rem' }} />
            </div>
            <button className="gov-btn" onClick={handleSaveConfig} style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
              <Save size={14} /> {savedNotice ? 'Thresholds Saved!' : 'Save Calibration'}
            </button>
          </div>
        </div>

        {/* Box 3: Emergency Override - Enhanced Section */}
        <div style={{ padding: '1.5rem', background: '#450a0a', borderRadius: '0.5rem', border: '2px solid #ef4444', color: '#fef2f2', boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fca5a5', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
            <Flame size={20} color="#ef4444" /> Emergency Operation Center
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#fecaca', marginBottom: '1rem', lineHeight: '1.5' }}>
            <strong>WARNING:</strong> Force immediate GREEN signal phase for emergency vehicle passage (Ambulance/Fire/VVIP). This overrides the AI density algorithm.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <select value={overrideLane} onChange={(e) => setOverrideLane(e.target.value)} style={{ padding: '0.6rem', borderRadius: '0.25rem', border: '1px solid #b91c1c', background: '#7f1d1d', color: '#fff', fontWeight: '800', outline: 'none' }}>
              <option value="lane_1">FORCE LANE 1 (NW) GREEN</option>
              <option value="lane_2">FORCE LANE 2 (NE) GREEN</option>
              <option value="lane_3">FORCE LANE 3 (SW) GREEN</option>
              <option value="lane_4">FORCE LANE 4 (SE) GREEN</option>
            </select>
            <button 
              className="gov-btn" 
              onClick={handleExecuteOverride} 
              style={{ background: '#ef4444', borderColor: '#b91c1c', color: '#ffffff', justifyContent: 'center', padding: '0.8rem', fontWeight: '900', textTransform: 'uppercase', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
            >
              <Shield size={16} /> {overrideNotice ? 'OVERRIDE DEPLOYED!' : 'Execute Emergency Override'}
            </button>
            {overrideNotice && (
              <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', justifyContent: 'center' }}>
                <CheckCircle size={16} /> SIGNAL FORCED GREEN (60s)
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
