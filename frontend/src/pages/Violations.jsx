import React, { useState, useEffect } from 'react';
import { getViolations } from '../services/api';
import { AlertOctagon, Filter, Search, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [filters, setFilters] = useState({
    violation_type: 'All',
    vehicle_type: 'All',
    status: 'All',
    intersection: 'All',
  });

  useEffect(() => {
    const fetchViolations = async () => {
      const data = await getViolations(filters);
      setViolations(data || []);
    };
    fetchViolations();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'DETECTED': return '#f59e0b';
      case 'UNDER REVIEW': return '#3b82f6';
      case 'APPROVED': return '#10b981';
      case 'REJECTED': return '#ef4444';
      case 'CHALLAN GENERATED': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge"><AlertOctagon size={24} /></div>
          <div>
            <h1>Traffic Violations & Enforcement</h1>
            <p>Review, verify, and enforce detected traffic violations</p>
          </div>
        </div>
      </div>

      {/* Modal Overlay for Evidence */}
      {selectedViolation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--gov-card-border)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Violation Evidence Review</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)' }}>ID: {selectedViolation.violation_id}</div>
              </div>
              <button onClick={() => setSelectedViolation(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
              {/* Details Column */}
              <div style={{ fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Violation Type</div>
                  <div style={{ fontWeight: '800', color: '#ef4444' }}>{selectedViolation.violation_type}</div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Vehicle</div>
                  <div style={{ fontWeight: '800' }}>{selectedViolation.vehicle_number || 'UNKNOWN (NO ALPR)'} ({selectedViolation.vehicle_type})</div>
                  <div style={{ fontSize: '0.7rem' }}>Track ID: {selectedViolation.vehicle_id}</div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Location & Time</div>
                  <div style={{ fontWeight: '800' }}>{selectedViolation.intersection} / {selectedViolation.camera} / {selectedViolation.lane}</div>
                  <div>{new Date(selectedViolation.timestamp).toLocaleString()}</div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Telemetry</div>
                  <div>Signal State: <strong style={{ color: selectedViolation.signal_state === 'RED' ? '#ef4444' : '#f59e0b' }}>{selectedViolation.signal_state || 'UNKNOWN'}</strong></div>
                  <div>Est. Speed: <strong>{selectedViolation.estimated_speed ? `${selectedViolation.estimated_speed.toFixed(1)} km/h` : 'N/A'}</strong></div>
                  <div>AI Confidence: <strong>{(selectedViolation.confidence * 100).toFixed(1)}%</strong></div>
                </div>
                
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="gov-btn" style={{ background: '#3b82f6', color: '#fff', border: 'none' }}>Mark as Under Review</button>
                  <button className="gov-btn" style={{ background: '#10b981', color: '#fff', border: 'none' }}>Approve Violation</button>
                  <button className="gov-btn" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>Reject / False Positive</button>
                  <button className="gov-btn" style={{ background: '#8b5cf6', color: '#fff', border: 'none', marginTop: '1rem' }}>Generate Challan</button>
                  <div style={{ fontSize: '0.6rem', color: 'var(--gov-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
                    *This evidence is a system prototype and not legally certified.
                  </div>
                </div>
              </div>

              {/* Evidence Gallery Column */}
              <div>
                <div style={{ color: 'var(--gov-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Evidence Gallery (Simulated)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#020617', border: '1px solid var(--gov-card-border)', borderRadius: '4px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gov-text-muted)', fontSize: '0.75rem', flexDirection: 'column' }}>
                    <FileText size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                    Before Image
                    <span style={{ fontSize: '0.6rem' }}>{selectedViolation.evidence_before_img || 'No File'}</span>
                  </div>
                  <div style={{ background: '#020617', border: '2px solid #ef4444', borderRadius: '4px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '0.75rem', flexDirection: 'column', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '5px', left: '5px', background: '#ef4444', color: '#000', fontSize: '0.6rem', padding: '0.1rem 0.3rem', fontWeight: '800' }}>VIOLATION POINT</div>
                    <FileText size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                    Violation Image
                    <span style={{ fontSize: '0.6rem' }}>{selectedViolation.evidence_viol_img || 'No File'}</span>
                  </div>
                  <div style={{ background: '#020617', border: '1px solid var(--gov-card-border)', borderRadius: '4px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gov-text-muted)', fontSize: '0.75rem', flexDirection: 'column' }}>
                    <FileText size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                    After Image
                    <span style={{ fontSize: '0.6rem' }}>{selectedViolation.evidence_after_img || 'No File'}</span>
                  </div>
                  <div style={{ background: '#020617', border: '1px solid var(--gov-card-border)', borderRadius: '4px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gov-text-muted)', fontSize: '0.75rem', flexDirection: 'column' }}>
                    <FileText size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                    Short Video Clip
                    <span style={{ fontSize: '0.6rem' }}>{selectedViolation.evidence_video || 'Not Available'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gov-card-border)', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
              <Filter size={14} color="var(--gov-text-muted)" />
              <select name="violation_type" className="gov-btn" style={{ padding: '0.2rem 0', background: 'transparent', border: 'none' }} onChange={handleFilterChange} value={filters.violation_type}>
                <option value="All">All Violations</option>
                <option value="Red Light Violation">Red Light Violation</option>
                <option value="Stop Line Violation">Stop Line Violation</option>
                <option value="Speed Violation">Speed Violation</option>
                <option value="Wrong Way Driving">Wrong Way Driving</option>
                <option value="Illegal U-Turn">Illegal U-Turn</option>
                <option value="No Helmet">No Helmet</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gov-card-border)', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
              <select name="status" className="gov-btn" style={{ padding: '0.2rem 0', background: 'transparent', border: 'none' }} onChange={handleFilterChange} value={filters.status}>
                <option value="All">All Statuses</option>
                <option value="DETECTED">Detected</option>
                <option value="UNDER REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CHALLAN GENERATED">Challan Generated</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gov-card-border)', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
              <select name="vehicle_type" className="gov-btn" style={{ padding: '0.2rem 0', background: 'transparent', border: 'none' }} onChange={handleFilterChange} value={filters.vehicle_type}>
                <option value="All">All Vehicles</option>
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="truck">Truck</option>
                <option value="bus">Bus</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gov-card-border)', padding: '0.4rem 0.75rem', borderRadius: '4px' }}>
             <Search size={14} color="var(--gov-text-muted)" />
             <input type="text" placeholder="Search Vehicle No or ID..." style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.8rem' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'rgba(203, 213, 225, 0.05)' }}>
              <tr style={{ borderBottom: '1px solid var(--gov-card-border)', color: 'var(--gov-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Violation ID</th>
                <th style={{ padding: '0.75rem' }}>Vehicle Info</th>
                <th style={{ padding: '0.75rem' }}>Violation Type</th>
                <th style={{ padding: '0.75rem' }}>Location</th>
                <th style={{ padding: '0.75rem' }}>Time</th>
                <th style={{ padding: '0.75rem' }}>Confidence</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {violations.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gov-text-muted)' }}>
                    No violations found matching the criteria.
                  </td>
                </tr>
              ) : (
                violations.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(203, 213, 225, 0.1)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{v.violation_id}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: '700', color: v.vehicle_number ? 'var(--gov-text-dark)' : '#94a3b8', fontSize: v.vehicle_number ? '0.85rem' : '0.75rem' }}>
                        {v.vehicle_number || 'Not available (ANPR Not Configured)'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>{v.vehicle_type} • Track #{v.vehicle_id}</div>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#ef4444' }}>{v.violation_type}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div>{v.intersection}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gov-text-muted)' }}>{v.camera} • {v.lane.replace('_', ' ').toUpperCase()}</div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--gov-text-muted)' }}>
                      <div>{new Date(v.timestamp).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.7rem' }}>{new Date(v.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: '600' }}>{(v.confidence * 100).toFixed(1)}%</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ 
                        background: `${getStatusColor(v.status)}20`, 
                        color: getStatusColor(v.status), 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        fontWeight: '800',
                        whiteSpace: 'nowrap'
                      }}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => setSelectedViolation(v)} className="gov-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#3b82f6', color: '#fff', border: 'none' }}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', color: 'var(--gov-text-muted)', fontSize: '0.8rem' }}>
          <div>Showing {violations.length} records</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="gov-btn" disabled>Previous</button>
            <button className="gov-btn" disabled>Next</button>
          </div>
        </div>

      </div>
    </div>
  );
}
