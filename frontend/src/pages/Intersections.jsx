import React, { useState, useEffect } from 'react';
import { Map, MapPin, Layers, Video, Navigation2, Target, AlertTriangle, Activity } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Intersections() {
  const [intersections, setIntersections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  const [congestionMap, setCongestionMap] = useState({});

  const fetchIntersections = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/intersections`);
      setIntersections(res.data || []);
      
      const congRes = await axios.get(`${API_BASE_URL}/traffic/congestion`);
      const cMap = {};
      congRes.data.forEach(c => { cMap[c.intersection] = c; });
      setCongestionMap(cMap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIntersections();
    const interval = setInterval(fetchIntersections, 5000);
    return () => clearInterval(interval);
  }, []);

  const getTrafficColor = (level) => {
    switch(level) {
      case 'HEAVY': return '#ef4444';
      case 'MODERATE': return '#f59e0b';
      case 'LIGHT': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#8b5cf6' }}><Map size={24} color="#fff" /></div>
          <div>
            <h1>Intersections</h1>
            <p>Node management and regional traffic flow</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {intersections.map(node => (
          <div key={node.id} className="card" onClick={() => setSelectedNode(node)} style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent', ':hover': { border: '1px solid #8b5cf6' } }}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={18} color="#8b5cf6" /> {node.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', fontFamily: 'monospace' }}>{node.intersection_id} • {node.location}</div>
                </div>
                <span style={{ background: node.status === 'ACTIVE' ? '#10b98120' : '#ef444420', color: node.status === 'ACTIVE' ? '#10b981' : '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
                  {node.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Layers size={14}/> Lanes</div>
                  <div style={{ fontWeight: '600' }}>{node.lanes} Active</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Video size={14}/> Cameras</div>
                  <div style={{ fontWeight: '600' }}>{node.cameras} Linked</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Target size={14}/> Congestion Score</div>
                  <div style={{ fontWeight: '600', color: congestionMap[node.intersection_id] ? (congestionMap[node.intersection_id].severity === 'SEVERE' ? '#ef4444' : congestionMap[node.intersection_id].severity === 'HIGH' ? '#f97316' : congestionMap[node.intersection_id].severity === 'MODERATE' ? '#eab308' : '#10b981') : '#94a3b8' }}>
                    {congestionMap[node.intersection_id] ? `${congestionMap[node.intersection_id].overall_score} (${congestionMap[node.intersection_id].severity})` : 'Calculating...'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={14}/> Signal Phase</div>
                  <div style={{ fontWeight: '600', color: node.current_phase.includes('GREEN') ? '#10b981' : node.current_phase.includes('YELLOW') ? '#f59e0b' : '#ef4444' }}>{node.current_phase}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Navigation2 size={14}/> Traffic Load</div>
                  <div style={{ fontWeight: '600', color: getTrafficColor(node.current_traffic) }}>{node.current_traffic}</div>
                </div>
              </div>
              
              {node.last_reason && node.last_reason !== 'N/A' && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid #3b82f6', borderRadius: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <div style={{ color: '#60a5fa', fontWeight: '700', marginBottom: '0.25rem' }}>AI Decision Log:</div>
                  {node.last_reason}
                </div>
              )}
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '0.8rem', color: '#a78bfa', textAlign: 'center', fontWeight: '600' }}>
              View Node Details →
            </div>
          </div>
        ))}
      </div>

      {selectedNode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', padding: '0', background: '#0f172a', border: '1px solid #334155' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: '#8b5cf6', padding: '0.5rem', borderRadius: '8px' }}>
                  <MapPin size={24} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedNode.name}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)' }}>{selectedNode.intersection_id} • {selectedNode.location}</div>
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} className="gov-btn" style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1' }}>Close</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Phase</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.5rem' }}>{selectedNode.current_phase}</div>
                </div>
                <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Traffic Volume</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: getTrafficColor(selectedNode.current_traffic), marginTop: '0.5rem' }}>{selectedNode.current_traffic}</div>
                </div>
                <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Hardware Config</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', marginTop: '0.5rem' }}>{selectedNode.lanes} Lanes / {selectedNode.cameras} Cams</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18}/> Adaptive Controller</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Mode</span>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>DYNAMIC AI</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Min Green Time</span>
                      <span style={{ fontWeight: '600' }}>15s</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Max Green Time</span>
                      <span style={{ fontWeight: '600' }}>60s</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Cycle Length</span>
                      <span style={{ fontWeight: '600' }}>120s Target</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18}/> Safety & Compliance</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>RLVD Active</span>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>YES</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Stop Line Monitors</span>
                      <span style={{ fontWeight: '600' }}>4/4 Online</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                      <span style={{ color: '#94a3b8' }}>Recent Violations</span>
                      <span style={{ fontWeight: '600' }}>Check /violations</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Emergency Preemption</span>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>READY</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px dashed #3b82f6', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', color: '#93c5fd' }}>
                Intersection topology and detailed phase visualization diagram would render here.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
