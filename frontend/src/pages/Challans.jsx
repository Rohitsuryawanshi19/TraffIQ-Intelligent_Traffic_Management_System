import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, IndianRupee, Eye, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Challans() {
  const [challans, setChallans] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  
  useEffect(() => {
    const fetchChallans = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/challans`);
        setChallans(response.data || []);
      } catch (err) {
        console.error("Error fetching challans:", err);
      }
    };
    fetchChallans();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'ISSUED': return '#3b82f6';
      case 'PENDING': return '#f59e0b';
      case 'PAID': return '#10b981';
      case 'DISPUTED': return '#ef4444';
      case 'CANCELLED': return '#94a3b8';
      default: return '#94a3b8';
    }
  };

  const totalChallans = challans.length;
  const pendingChallans = challans.filter(c => c.status === 'PENDING' || c.status === 'ISSUED').length;
  const paidChallans = challans.filter(c => c.status === 'PAID').length;
  const disputedChallans = challans.filter(c => c.status === 'DISPUTED').length;
  const totalFineAmount = challans.reduce((sum, c) => sum + c.fine_amount, 0);
  const collectedAmount = challans.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.fine_amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#3b82f6' }}><FileText size={24} color="#fff" /></div>
          <div>
            <h1>Fines & Challans</h1>
            <p>Manage traffic violation citations and payment status</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Total Challans</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{totalChallans}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Pending</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{pendingChallans}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Paid</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{paidChallans}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Disputed</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{disputedChallans}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Total Fine Amount</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>₹{totalFineAmount.toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Collected</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>₹{collectedAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Modal Overlay for Challan Details */}
      {selectedChallan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', background: '#fff', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Gov Emblem" style={{ height: '60px' }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>Traffic Police Department</h2>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>E-Challan / Traffic Violation Citation</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>Challan No.</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'monospace' }}>{selectedChallan.challan_id}</div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.9rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Vehicle Number</div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem', padding: '0.5rem', border: '1px solid #ccc', display: 'inline-block', borderRadius: '4px', marginTop: '0.2rem' }}>{selectedChallan.vehicle_number}</div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Vehicle Type</div>
                <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{selectedChallan.vehicle_type}</div>
              </div>
              
              <div style={{ gridColumn: 'span 2', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <div style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Violation Details</div>
                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#dc2626' }}>{selectedChallan.violation_type}</div>
                <div style={{ marginTop: '0.25rem' }}>Location: {selectedChallan.location}</div>
                <div>Date & Time: {new Date(selectedChallan.timestamp).toLocaleString()}</div>
                <div>Ref Violation ID: <span style={{ fontFamily: 'monospace' }}>{selectedChallan.violation_id}</span></div>
              </div>

              <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>Fine Amount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center' }}>
                  <IndianRupee size={24} /> {selectedChallan.fine_amount.toLocaleString()}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              <button onClick={() => setSelectedChallan(null)} style={{ padding: '0.5rem 1.5rem', cursor: 'pointer', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px' }}>Close</button>
              <button style={{ padding: '0.5rem 1.5rem', cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px' }}>Print Challan</button>
              {selectedChallan.status !== 'PAID' && (
                <button style={{ padding: '0.5rem 1.5rem', cursor: 'pointer', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px' }}>Mark as Paid (Demo)</button>
              )}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#999', textAlign: 'center', marginTop: '1.5rem' }}>
              *This is a computer generated prototype challan and does not require a signature.
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gov-card-border)', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
              <Filter size={14} color="var(--gov-text-muted)" />
              <select className="gov-btn" style={{ padding: '0.2rem 0', background: 'transparent', border: 'none' }}>
                <option>All Statuses</option>
                <option>ISSUED</option>
                <option>PENDING</option>
                <option>PAID</option>
                <option>DISPUTED</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--gov-card-border)', padding: '0.4rem 0.75rem', borderRadius: '4px' }}>
             <Search size={14} color="var(--gov-text-muted)" />
             <input type="text" placeholder="Search Challan No or Vehicle..." style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.8rem' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'rgba(203, 213, 225, 0.05)' }}>
              <tr style={{ borderBottom: '1px solid var(--gov-card-border)', color: 'var(--gov-text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>Challan ID</th>
                <th style={{ padding: '0.75rem' }}>Vehicle</th>
                <th style={{ padding: '0.75rem' }}>Violation</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem' }}>Amount</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gov-text-muted)' }}>
                    No challans generated yet.
                  </td>
                </tr>
              ) : (
                challans.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(203, 213, 225, 0.1)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '600' }}>{c.challan_id}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--gov-text-dark)' }}>{c.vehicle_number}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gov-text-muted)', textTransform: 'capitalize' }}>{c.vehicle_type}</div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ color: '#ef4444', fontWeight: '600' }}>{c.violation_type}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gov-text-muted)' }}>{c.location}</div>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--gov-text-muted)' }}>
                      <div>{new Date(c.timestamp).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.7rem' }}>{new Date(c.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '800' }}>
                      ₹{c.fine_amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ 
                        background: `${getStatusColor(c.status)}20`, 
                        color: getStatusColor(c.status), 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.7rem', 
                        fontWeight: '800'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => setSelectedChallan(c)} className="gov-btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#3b82f6', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
