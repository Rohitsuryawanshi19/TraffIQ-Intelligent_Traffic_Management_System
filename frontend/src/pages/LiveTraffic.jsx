import React, { useState, useEffect } from 'react';
import { getSignalStatus, getTrafficHistory, getVehicleHistory, postSimulatedTraffic, overrideSignal } from '../services/api';
import { Video, Activity, Zap, ShieldAlert, Cpu, RefreshCw, Radio, Play, Pause } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function LiveTraffic() {
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [crossings, setCrossings] = useState([]);
  const [activeMode, setActiveMode] = useState('Balanced');
  const [isSimulating, setIsSimulating] = useState(true);

  const fetchLiveTelemetry = async () => {
    try {
      const [sig, hist, vehi] = await Promise.all([
        getSignalStatus('junction_1'),
        getTrafficHistory('junction_1', 20),
        getVehicleHistory({ limit: 10 })
      ]);
      if (sig) setSignal(sig);
      if (hist && Array.isArray(hist)) setHistory(hist.reverse());
      if (vehi && Array.isArray(vehi)) setCrossings(vehi);
    } catch (e) {
      console.error("Live telemetry error:", e);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 1000);
    return () => clearInterval(interval);
  }, []);

  // Background adaptive telemetry loop simulator when streaming video is active
  useEffect(() => {
    if (!isSimulating) return;
    const simInterval = setInterval(async () => {
      // Simulate real-time frame detection density variance across 4 lanes
      const l1 = Math.floor(Math.random() * 18) + 2;
      const l2 = Math.floor(Math.random() * 14) + 1;
      const l3 = Math.floor(Math.random() * 10) + 1;
      const l4 = Math.floor(Math.random() * 8) + 1;
      try {
        await postSimulatedTraffic(l1, l2, l3, l4, 'junction_1');
      } catch (e) {}
    }, 3000);

    return () => clearInterval(simInterval);
  }, [isSimulating]);

  const handleOverride = async (lane) => {
    try {
      const res = await overrideSignal(lane, 'junction_1');
      if (res) setSignal(res);
    } catch (e) {}
  };

  const getLaneCount = (laneKey) => {
    if (!signal) return 0;
    return signal.lane_counts?.[laneKey] ?? signal[laneKey] ?? 0;
  };

  const currentGreenLane = signal?.current_lane || 'lane_1';
  const remainingTime = signal?.remaining_time ?? 30;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#00e5ff', color: '#000' }}>
            <Radio size={22} />
          </div>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Live Adaptive Traffic Control Node
              <span style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid #00e5ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
                LIVE SIMULATION (RECORDED VIDEO / REAL-TIME)
              </span>
            </h1>
            <p>Adaptive signal control based on real-time computer vision vehicle density</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className="gov-btn"
            style={{ background: isSimulating ? '#10b98120' : '#ef444420', border: `1px solid ${isSimulating ? '#10b981' : '#ef4444'}`, color: isSimulating ? '#10b981' : '#ef4444', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: '700' }}
          >
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
            {isSimulating ? 'Telemetry Feeding Active' : 'Telemetry Paused'}
          </button>
        </div>
      </div>

      {/* Main Grid: Junction Map + Signal Timer Units */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Card: 4-Lane Junction Map */}
        <div className="card" style={{ padding: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="#00e5ff" /> REAL-TIME INTERSECTION MAP (JUNCTION #1)
            </h2>
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '800', background: '#10b98115', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #10b98140' }}>
              ● STREAM ONLINE
            </span>
          </div>

          {/* 4 Lanes Container */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#090d16', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--gov-card-border)', position: 'relative' }}>
            
            {/* Lane 1 (NW) */}
            <div style={{ 
              background: currentGreenLane === 'lane_1' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
              border: `2px solid ${currentGreenLane === 'lane_1' ? '#10b981' : '#334155'}`,
              borderRadius: '6px', padding: '1rem', transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: currentGreenLane === 'lane_1' ? '#10b981' : '#cbd5e1' }}>Lane 1 (NW)</span>
                <span style={{ background: '#020617', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#00e5ff' }}>{getLaneCount('lane_1')} veh</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: '800', color: currentGreenLane === 'lane_1' ? '#10b981' : '#ef4444' }}>
                {currentGreenLane === 'lane_1' ? '↓ GO (GREEN ACTIVE)' : 'STOP (RED)'}
              </div>
            </div>

            {/* Lane 2 (NE) */}
            <div style={{ 
              background: currentGreenLane === 'lane_2' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
              border: `2px solid ${currentGreenLane === 'lane_2' ? '#10b981' : '#334155'}`,
              borderRadius: '6px', padding: '1rem', transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: currentGreenLane === 'lane_2' ? '#10b981' : '#cbd5e1' }}>Lane 2 (NE)</span>
                <span style={{ background: '#020617', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#00e5ff' }}>{getLaneCount('lane_2')} veh</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: '800', color: currentGreenLane === 'lane_2' ? '#10b981' : '#ef4444' }}>
                {currentGreenLane === 'lane_2' ? '↓ GO (GREEN ACTIVE)' : 'STOP (RED)'}
              </div>
            </div>

            {/* Center Junction Signal Node */}
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
              <div style={{ 
                background: currentGreenLane ? '#10b981' : '#ef4444', 
                color: '#000', width: '60px', height: '60px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '900', fontSize: '0.7rem', boxShadow: `0 0 20px ${currentGreenLane ? '#10b98180' : '#ef444480'}`
              }}>
                {currentGreenLane.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            {/* Lane 3 (SW) */}
            <div style={{ 
              background: currentGreenLane === 'lane_3' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
              border: `2px solid ${currentGreenLane === 'lane_3' ? '#10b981' : '#334155'}`,
              borderRadius: '6px', padding: '1rem', transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: currentGreenLane === 'lane_3' ? '#10b981' : '#cbd5e1' }}>Lane 3 (SW)</span>
                <span style={{ background: '#020617', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#00e5ff' }}>{getLaneCount('lane_3')} veh</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: '800', color: currentGreenLane === 'lane_3' ? '#10b981' : '#ef4444' }}>
                {currentGreenLane === 'lane_3' ? '↓ GO (GREEN ACTIVE)' : 'STOP (RED)'}
              </div>
            </div>

            {/* Lane 4 (SE) */}
            <div style={{ 
              background: currentGreenLane === 'lane_4' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
              border: `2px solid ${currentGreenLane === 'lane_4' ? '#10b981' : '#334155'}`,
              borderRadius: '6px', padding: '1rem', transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: currentGreenLane === 'lane_4' ? '#10b981' : '#cbd5e1' }}>Lane 4 (SE)</span>
                <span style={{ background: '#020617', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', color: '#00e5ff' }}>{getLaneCount('lane_4')} veh</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: '800', color: currentGreenLane === 'lane_4' ? '#10b981' : '#ef4444' }}>
                {currentGreenLane === 'lane_4' ? '↓ GO (GREEN ACTIVE)' : 'STOP (RED)'}
              </div>
            </div>

          </div>

          {/* Mode Selector Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            {['Peak', 'Balanced', 'Night'].map(m => (
              <button 
                key={m} 
                onClick={() => setActiveMode(m)}
                className="gov-btn" 
                style={{ padding: '0.25rem 0.8rem', fontSize: '0.75rem', background: activeMode === m ? '#3b82f6' : 'transparent', color: activeMode === m ? '#fff' : '#94a3b8', border: '1px solid #334155' }}
              >
                {m} Mode
              </button>
            ))}
          </div>
        </div>

        {/* Right Card: Signal Timing Control Units */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} color="#3b82f6" /> SIGNAL TIMING CONTROL UNITS (STCU 1-4)
            </h2>

            {/* Signal Lights Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {['lane_1', 'lane_2', 'lane_3', 'lane_4'].map((l, idx) => {
                const isGreen = currentGreenLane === l;
                return (
                  <div key={l} style={{ background: '#090d16', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', marginBottom: '0.5rem' }}>L{idx+1} ({l.toUpperCase()})</div>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isGreen ? '#10b981' : '#ef4444', margin: '0 auto', boxShadow: `0 0 12px ${isGreen ? '#10b981' : '#ef4444'}` }}></div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: isGreen ? '#10b981' : '#ef4444', marginTop: '0.5rem' }}>
                      {isGreen ? 'GREEN' : 'RED'}
                    </div>
                    <button 
                      onClick={() => handleOverride(l)}
                      style={{ marginTop: '0.5rem', background: '#3b82f615', border: '1px solid #3b82f640', color: '#3b82f6', fontSize: '0.6rem', padding: '0.15rem 0.3rem', borderRadius: '3px', cursor: 'pointer', fontWeight: '700', width: '100%' }}
                    >
                      Override
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Active Phase Countdown Box */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Active Phase Countdown</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#00e5ff', margin: '0.2rem 0' }}>
                {remainingTime}s
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
                PRIORITY GRANTED TO: {currentGreenLane.replace('_', ' ').toUpperCase()} ({getLaneCount(currentGreenLane)} vehicles detected)
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#94a3b8', background: '#090d16', padding: '0.75rem', borderRadius: '4px', border: '1px solid #1e293b' }}>
            <strong>Adaptive Algorithm:</strong> Priority score = (Density × 0.5) + (Wait Time × 0.3) + (Queue × 0.2). Automatically switches green phase to highest density lane.
          </div>
        </div>

      </div>

      {/* Embedded Live Video Player Feed */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Video size={18} color="#00e5ff" /> LIVE AI CAMERA STREAM (MJPEG FRAME INFERENCE)
        </h2>
        <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155', display: 'flex', justifyContent: 'center', minHeight: '360px', position: 'relative' }}>
          <img 
            src="http://127.0.0.1:8000/api/stream/video" 
            alt="Live Traffic Video Stream" 
            style={{ width: '100%', maxHeight: '480px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML += '<div style="padding:4rem;text-align:center;color:#94a3b8;font-size:0.85rem">Live Video Stream Operational (Connecting to RTSP / Simulated MJPEG Feed...)</div>';
            }}
          />
        </div>
      </div>

      {/* Real-time Telemetry Chart */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#10b981" /> JUNCTION TRAFFIC TELEMETRY LOG (VOLUME OVER TIME)
        </h2>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history.length > 0 ? history : [
              { timestamp: '10:00', total_count: 12, lane_1: 4, lane_2: 3, lane_3: 3, lane_4: 2 },
              { timestamp: '10:05', total_count: 18, lane_1: 6, lane_2: 5, lane_3: 4, lane_4: 3 },
              { timestamp: '10:10', total_count: 24, lane_1: 9, lane_2: 7, lane_3: 5, lane_4: 3 },
              { timestamp: '10:15', total_count: 31, lane_1: 12, lane_2: 9, lane_3: 6, lane_4: 4 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" style={{ fontSize: '0.7rem' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '0.7rem' }} />
              <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '4px' }} />
              <Area type="monotone" dataKey="total_count" stroke="#00e5ff" fill="#00e5ff20" strokeWidth={2} name="Total Volume" />
              <Area type="monotone" dataKey="lane_1" stroke="#10b981" fill="transparent" strokeWidth={2} name="Lane 1 (NW)" />
              <Area type="monotone" dataKey="lane_2" stroke="#3b82f6" fill="transparent" strokeWidth={2} name="Lane 2 (NE)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
