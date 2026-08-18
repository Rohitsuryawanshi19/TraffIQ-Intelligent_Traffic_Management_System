import React, { useState, useEffect } from 'react';
import { 
  Car, Map, ShieldAlert, FileText, Ambulance, Camera, 
  Activity, AlertTriangle, ChevronRight, Zap, Bell, CheckCircle2, Shield
} from 'lucide-react';
import IntersectionVisualizer from '../components/IntersectionVisualizer';
import SignalStatus from '../components/SignalStatus';
import LaneCard from '../components/LaneCard';
import TrafficChart from '../components/TrafficChart';
import { postSimulatedTraffic } from '../services/api';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Dashboard({ signal, history, analytics, fetchDashboardData }) {
  const [time, setTime] = useState(new Date());
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeScenario, setActiveScenario] = useState('Real-Time Stream');
  const [alerts, setAlerts] = useState([]);
  const [congestion, setCongestion] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/alerts?status=NEW`);
        setAlerts(res.data || []);
        
        const congRes = await axios.get(`${API_BASE_URL}/traffic/congestion`);
        if (congRes.data && congRes.data.length > 0) {
          setCongestion(congRes.data[0]); // Primary junction
        }
      } catch (err) {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerDensityBatch = async (mode = 'PEAK') => {
    setIsSimulating(true);
    let l1, l2, l3, l4;

    if (mode === 'PEAK') {
      l1 = Math.floor(Math.random() * 15) + 5; l2 = Math.floor(Math.random() * 45) + 20;
      l3 = Math.floor(Math.random() * 10) + 2; l4 = Math.floor(Math.random() * 40) + 15;
      setActiveScenario('Rush Hour Peak Surge');
    } else if (mode === 'NIGHT') {
      l1 = Math.floor(Math.random() * 4) + 1; l2 = Math.floor(Math.random() * 5) + 1;
      l3 = Math.floor(Math.random() * 3) + 0; l4 = Math.floor(Math.random() * 6) + 1;
      setActiveScenario('Night Off-Peak Flow');
    } else {
      l1 = Math.floor(Math.random() * 20) + 5; l2 = Math.floor(Math.random() * 20) + 5;
      l3 = Math.floor(Math.random() * 20) + 5; l4 = Math.floor(Math.random() * 20) + 5;
      setActiveScenario('Balanced Flow');
    }

    try {
      await postSimulatedTraffic(l1, l2, l3, l4);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const laneCounts = analytics?.lane_counts || { lane_1: 0, lane_2: 0, lane_3: 0, lane_4: 0 };
  const currentLane = signal?.current_lane || 'lane_1';
  const signalState = signal?.state || 'GREEN';
  const totalVehicles = analytics?.total_observations ? analytics.total_observations * 14 : 1245;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header Section */}
      <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #1d4ed8', background: 'var(--gov-navy-header)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.2rem' }}>Intelligent Traffic Management System</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' }}>AI-Powered Traffic Monitoring, Signal Control & Enforcement</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', fontWeight: '700' }}>
            <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={14} color="#4ade80" /> System: ONLINE
            </div>
            <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap size={14} color="#facc15" /> AI Detection: ACTIVE (30 FPS)
            </div>
            <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.25rem' }}>
              {time.toLocaleDateString()} | {time.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card" style={{ padding: '1rem', borderTop: '3px solid #3b82f6' }}>
          <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            VEHICLES DETECTED <Car size={14} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>{totalVehicles.toLocaleString()}</div>
        </div>

        {congestion && (
          <div className="card" style={{ padding: '1rem', borderTop: `3px solid ${congestion.severity === 'SEVERE' ? '#ef4444' : congestion.severity === 'HIGH' ? '#f97316' : congestion.severity === 'MODERATE' ? '#eab308' : '#10b981'}` }}>
            <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              CONGESTION INDEX <Activity size={14} color={congestion.severity === 'SEVERE' ? '#ef4444' : congestion.severity === 'HIGH' ? '#f97316' : congestion.severity === 'MODERATE' ? '#eab308' : '#10b981'} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>{congestion.overall_score}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: congestion.severity === 'SEVERE' ? '#ef4444' : congestion.severity === 'HIGH' ? '#f97316' : congestion.severity === 'MODERATE' ? '#eab308' : '#10b981' }}>{congestion.severity}</div>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '1rem', borderTop: '3px solid #10b981' }}>
          <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            INTERSECTIONS ONLINE <Map size={14} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>12 / 12</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderTop: '3px solid #8b5cf6' }}>
          <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            CAMERAS ONLINE <Camera size={14} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>48 / 48</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderTop: '3px solid #f59e0b' }}>
          <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            ACTIVE VIOLATIONS <ShieldAlert size={14} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>14</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderTop: '3px solid #ef4444' }}>
          <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            EMERGENCY EVENTS <Ambulance size={14} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>2</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderTop: '3px solid #64748b' }}>
          <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            CHALLANS GENERATED <FileText size={14} color="#64748b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--gov-text-dark)' }}>89</div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{ background: '#ef444420', border: '1px solid #ef4444', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: '800' }}>
            <AlertTriangle size={18} /> CRITICAL SYSTEM ALERTS ({alerts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#fca5a5' }}>• {a.alert_type} - {a.intersection} ({a.location})</span>
                <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '0.75rem' }}>{a.severity}</span>
              </div>
            ))}
            {alerts.length > 3 && (
              <div style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.25rem', cursor: 'pointer', textDecoration: 'underline' }}>
                View all {alerts.length} active alerts in Alerts & Incidents →
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Live Traffic Overview & Current Signal Status */}
      <div className="grid-main">
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>Live Traffic Overview (Junction #1)</span>
            <span style={{ fontSize: '0.7rem', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{activeScenario}</span>
          </div>
          <IntersectionVisualizer laneCounts={laneCounts} activeLane={currentLane} signalState={signalState} />
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
            <button className="gov-btn" onClick={() => triggerDensityBatch('PEAK')} disabled={isSimulating} style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>Peak</button>
            <button className="gov-btn" onClick={() => triggerDensityBatch('BALANCED')} disabled={isSimulating} style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>Balanced</button>
            <button className="gov-btn" onClick={() => triggerDensityBatch('NIGHT')} disabled={isSimulating} style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}>Night</button>
          </div>
        </div>
        
        <div>
          <SignalStatus signalData={signal} />
        </div>
      </div>

      {/* 4. Lane Traffic Density */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '1rem', textTransform: 'uppercase' }}>
          Lane Traffic Density
        </div>
        <div className="grid-4">
          <LaneCard laneName="lane_1" laneLabel="Lane 1 (NW)" vehicleCount={laneCounts.lane_1} isActive={currentLane === 'lane_1'} trafficLevel={laneCounts.lane_1 > 30 ? 'HEAVY' : laneCounts.lane_1 > 15 ? 'NORMAL' : 'LOW'} />
          <LaneCard laneName="lane_2" laneLabel="Lane 2 (NE)" vehicleCount={laneCounts.lane_2} isActive={currentLane === 'lane_2'} trafficLevel={laneCounts.lane_2 > 30 ? 'HEAVY' : laneCounts.lane_2 > 15 ? 'NORMAL' : 'LOW'} />
          <LaneCard laneName="lane_3" laneLabel="Lane 3 (SW)" vehicleCount={laneCounts.lane_3} isActive={currentLane === 'lane_3'} trafficLevel={laneCounts.lane_3 > 30 ? 'HEAVY' : laneCounts.lane_3 > 15 ? 'NORMAL' : 'LOW'} />
          <LaneCard laneName="lane_4" laneLabel="Lane 4 (SE)" vehicleCount={laneCounts.lane_4} isActive={currentLane === 'lane_4'} trafficLevel={laneCounts.lane_4 > 30 ? 'HEAVY' : laneCounts.lane_4 > 15 ? 'NORMAL' : 'LOW'} />
        </div>
      </div>

      {/* 5. Traffic Volume Trend */}
      <TrafficChart historyData={history} />

      {/* 6. Recent Violations & Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        
        {/* Recent Violations */}
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShieldAlert size={16} color="#f59e0b" /> Recent Violations</span>
            <span style={{ fontSize: '0.7rem', color: '#3b82f6', cursor: 'pointer' }}>View All <ChevronRight size={12} style={{ display: 'inline' }} /></span>
          </div>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gov-card-border)', color: 'var(--gov-text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Time</th>
                <th style={{ padding: '0.5rem' }}>Location</th>
                <th style={{ padding: '0.5rem' }}>Type</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(203, 213, 225, 0.2)' }}>
                <td style={{ padding: '0.5rem', color: 'var(--gov-text-dark)' }}>10:42 AM</td>
                <td style={{ padding: '0.5rem', color: 'var(--gov-text-dark)' }}>Jct #1 - L2</td>
                <td style={{ padding: '0.5rem', color: '#ef4444', fontWeight: '600' }}>Red Light</td>
                <td style={{ padding: '0.5rem' }}><span style={{ background: '#fef3c7', color: '#d97706', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>Processing</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(203, 213, 225, 0.2)' }}>
                <td style={{ padding: '0.5rem', color: 'var(--gov-text-dark)' }}>10:35 AM</td>
                <td style={{ padding: '0.5rem', color: 'var(--gov-text-dark)' }}>Jct #4 - L1</td>
                <td style={{ padding: '0.5rem', color: '#ef4444', fontWeight: '600' }}>Speeding</td>
                <td style={{ padding: '0.5rem' }}><span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>Issued</span></td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem', color: 'var(--gov-text-dark)' }}>10:15 AM</td>
                <td style={{ padding: '0.5rem', color: 'var(--gov-text-dark)' }}>Jct #2 - L3</td>
                <td style={{ padding: '0.5rem', color: '#f59e0b', fontWeight: '600' }}>Wrong Lane</td>
                <td style={{ padding: '0.5rem' }}><span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>Issued</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Emergency & System Alerts */}
        <div className="card" style={{ padding: '1rem', borderTop: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Bell size={16} color="#ef4444" /> System & Emergency Alerts</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #fca5a5', borderRadius: '4px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Ambulance size={18} color="#ef4444" style={{ marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b91c1c' }}>Ambulance Detected (Jct #1)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gov-text-muted)', marginTop: '0.2rem' }}>Signal override auto-deployed on Lane 2. Clearance active.</div>
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #fcd34d', borderRadius: '4px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="#d97706" style={{ marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b45309' }}>High Congestion Warning</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gov-text-muted)', marginTop: '0.2rem' }}>Jct #3 Lane 4 exceeding 85% capacity. Adaptive phase extended.</div>
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #93c5fd', borderRadius: '4px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color="#2563eb" style={{ marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1d4ed8' }}>Night Mode Activated</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gov-text-muted)', marginTop: '0.2rem' }}>System shifted to off-peak flash mode at 22:00 for zones A & B.</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
