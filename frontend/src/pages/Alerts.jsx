import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, AlertOctagon, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('ALL');

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/alerts`);
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (alertId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/alerts/${alertId}/status`, { status: newStatus });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyle = (sev) => {
    switch(sev) {
      case 'CRITICAL': return { bg: '#991b1b', color: '#fca5a5', icon: <AlertOctagon size={16} /> };
      case 'HIGH': return { bg: '#ea580c', color: '#fdba74', icon: <AlertTriangle size={16} /> };
      case 'MEDIUM': return { bg: '#ca8a04', color: '#fef08a', icon: <AlertTriangle size={16} /> };
      case 'LOW': return { bg: '#475569', color: '#e2e8f0', icon: <ShieldAlert size={16} /> };
      default: return { bg: '#475569', color: '#e2e8f0', icon: <ShieldAlert size={16} /> };
    }
  };

  const filteredAlerts = filter === 'ALL' ? alerts : alerts.filter(a => a.status === filter);

  const newCount = alerts.filter(a => a.status === 'NEW').length;
  const activeCount = alerts.filter(a => a.status === 'ACKNOWLEDGED' || a.status === 'IN_PROGRESS').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#ef4444' }}><AlertTriangle size={24} color="#fff" /></div>
          <div>
            <h1>Alerts & Incidents</h1>
            <p>System-wide issue tracking and anomaly detection</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '200px', padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Unresolved New Alerts</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: newCount > 0 ? '#ef4444' : '#fff' }}>{newCount}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '200px', padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Active / Acknowledged</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: activeCount > 0 ? '#f59e0b' : '#fff' }}>{activeCount}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Incident Log</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: filter === f ? '#3b82f6' : 'transparent', border: `1px solid ${filter === f ? '#3b82f6' : '#475569'}`, color: filter === f ? '#fff' : '#cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'rgba(203, 213, 225, 0.05)' }}>
              <tr style={{ borderBottom: '1px solid var(--gov-card-border)', color: 'var(--gov-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Alert ID</th>
                <th style={{ padding: '0.75rem' }}>Severity</th>
                <th style={{ padding: '0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem' }}>Location</th>
                <th style={{ padding: '0.75rem' }}>Time</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gov-text-muted)' }}>No alerts found for this filter.</td>
                </tr>
              ) : (
                filteredAlerts.map(alert => {
                  const sevStyle = getSeverityStyle(alert.severity);
                  return (
                    <tr key={alert.id} style={{ borderBottom: '1px solid rgba(203, 213, 225, 0.1)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '600' }}>{alert.alert_id}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: sevStyle.bg, color: sevStyle.color, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
                          {sevStyle.icon} {alert.severity}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: '600' }}>{alert.alert_type}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gov-text-muted)', marginTop: '0.1rem' }}>{alert.description}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: '500' }}>{alert.intersection}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gov-text-muted)' }}>{alert.location}</div>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--gov-text-muted)' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: alert.status === 'NEW' ? '#ef4444' : (alert.status === 'RESOLVED' ? '#10b981' : '#f59e0b'), fontWeight: '600', fontSize: '0.75rem' }}>
                          {alert.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {alert.status === 'NEW' && (
                          <button onClick={() => handleStatusChange(alert.alert_id, 'ACKNOWLEDGED')} className="gov-btn" style={{ padding: '0.25rem 0.5rem', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fcd34d', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} /> Ack
                          </button>
                        )}
                        {(alert.status === 'NEW' || alert.status === 'ACKNOWLEDGED' || alert.status === 'IN_PROGRESS') && (
                          <button onClick={() => handleStatusChange(alert.alert_id, 'RESOLVED')} className="gov-btn" style={{ marginTop: alert.status === 'NEW' ? '0.25rem' : '0', padding: '0.25rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#6ee7b7', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={12} /> Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
