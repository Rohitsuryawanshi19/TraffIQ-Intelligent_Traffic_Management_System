import React, { useState, useEffect } from 'react';
import { Ambulance, Activity, AlertTriangle, Shield, CheckCircle, Navigation } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Emergency() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/emergency/events`);
      setEvents(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const simulateEmergency = async (vehicleType) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/emergency/detect`, {
        vehicle_type: vehicleType,
        vehicle_id: `EMG-${Math.floor(Math.random() * 9000) + 1000}`,
        current_intersection: 'junction_1',
        current_lane: 'lane_2',
        direction: 'Northbound',
        next_intersections: 'junction_2, junction_3',
        priority_status: 'ACTIVE'
      });
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const activeEvents = events.filter(e => !e.end_time);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#dc2626' }}><Ambulance size={24} color="#fff" /></div>
          <div>
            <h1>Emergency Management</h1>
            <p>Priority signal preemption for emergency responders</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', background: 'rgba(220, 38, 38, 0.05)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} /> Preemption System Active
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--gov-text-muted)' }}>
              The system is monitoring for emergency vehicles to safely transition signal phases, maintaining minimum green and clearance times.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={loading} onClick={() => simulateEmergency('Ambulance')} className="gov-btn" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Ambulance size={16} /> Simulate Ambulance
            </button>
            <button disabled={loading} onClick={() => simulateEmergency('Fire Truck')} className="gov-btn" style={{ background: '#f97316', color: '#fff', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Shield size={16} /> Simulate Fire Truck
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="#ef4444" /> Live Tracking
          </h2>
          
          {activeEvents.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gov-text-muted)', background: 'rgba(203, 213, 225, 0.05)', borderRadius: '4px' }}>
              No active emergency vehicles detected.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {activeEvents.map(event => (
                <div key={event.id} style={{ border: '1px solid #334155', borderRadius: '4px', padding: '1rem', background: '#0f172a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ background: event.vehicle_type === 'Ambulance' ? '#ef4444' : '#f97316', padding: '1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {event.vehicle_type === 'Ambulance' ? <Ambulance size={32} color="#fff" /> : <Shield size={32} color="#fff" />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ margin: 0 }}>{event.vehicle_type} <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>({event.vehicle_id})</span></h3>
                          <span style={{ background: '#ef444420', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>{event.priority_status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                          <div>
                            <div style={{ color: 'var(--gov-text-muted)', marginBottom: '0.2rem' }}>Current Location</div>
                            <div style={{ fontWeight: '600' }}>{event.current_intersection} • {event.current_lane.replace('_', ' ').toUpperCase()}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--gov-text-muted)', marginBottom: '0.2rem' }}>Direction</div>
                            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Navigation size={12} /> {event.direction}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gov-text-muted)' }}>Detected At</div>
                      <div style={{ fontWeight: '600' }}>{new Date(event.start_time).toLocaleTimeString()}</div>
                      <div style={{ marginTop: '0.5rem', color: '#10b981', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={12} /> Safe Transition Executed
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gov-text-muted)', marginBottom: '0.5rem' }}>Route Trajectory</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ background: '#3b82f6', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{event.current_intersection}</span>
                      <span style={{ color: '#475569' }}>→</span>
                      {event.next_intersections.split(',').map((int, i) => (
                        <React.Fragment key={i}>
                          <span style={{ border: '1px solid #334155', color: '#cbd5e1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{int.trim()}</span>
                          {i < event.next_intersections.split(',').length - 1 && <span style={{ color: '#475569' }}>→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem' }}>Event History</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'rgba(203, 213, 225, 0.05)' }}>
                <tr style={{ borderBottom: '1px solid var(--gov-card-border)', color: 'var(--gov-text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Event ID</th>
                  <th style={{ padding: '0.75rem' }}>Vehicle</th>
                  <th style={{ padding: '0.75rem' }}>Intersection</th>
                  <th style={{ padding: '0.75rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gov-text-muted)' }}>
                      No historical events found.
                    </td>
                  </tr>
                ) : (
                  events.map(event => (
                    <tr key={event.id} style={{ borderBottom: '1px solid rgba(203, 213, 225, 0.1)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{event.event_id}</td>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>{event.vehicle_type}</td>
                      <td style={{ padding: '0.75rem' }}>{event.current_intersection}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--gov-text-muted)' }}>{new Date(event.start_time).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: event.priority_status === 'ACTIVE' ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                          {event.priority_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
