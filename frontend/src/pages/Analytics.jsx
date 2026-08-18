import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter, TrendingUp, Shield, Map, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [congestion, setCongestion] = useState(null);
  const [intersections, setIntersections] = useState([]);
  const [selectedIntersection, setSelectedIntersection] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIntersections = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/intersections`);
        setIntersections(res.data || []);
      } catch (err) {
        console.error("Error fetching intersections:", err);
      }
    };
    fetchIntersections();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedIntersection && selectedIntersection !== 'All') params.intersection = selectedIntersection;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await axios.get(`${API_BASE_URL}/analytics/reports`, { params });
      setData(res.data);
      
      const congRes = await axios.get(`${API_BASE_URL}/traffic/congestion`);
      if (congRes.data && congRes.data.length > 0) {
        setCongestion(congRes.data[0]);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedIntersection, dateFrom, dateTo]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const renderEmptyState = (label) => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: '#0f172a50', borderRadius: '8px', padding: '2rem', textAlign: 'center', border: '1px dashed #334155' }}>
      <AlertCircle size={32} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f1f5f9' }}>No {label} recorded yet</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', maxWidth: '300px' }}>
        No traffic data recorded yet for this intersection/period — run a video stream or wait for live camera data
      </div>
    </div>
  );

  if (loading && !data) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading analytics dashboard...</div>;
  }

  const hasVehicleDistribution = data?.traffic?.vehicle_distribution && data.traffic.vehicle_distribution.length > 0;
  const hasLaneUtilization = data?.traffic?.lane_utilization && data.traffic.lane_utilization.length > 0;
  const hasViolations = data?.enforcement?.violations_by_type && data.enforcement.violations_by_type.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#3b82f6' }}><TrendingUp size={24} color="#fff" /></div>
          <div>
            <h1>Analytics & Intelligence Reports</h1>
            <p>Real-time vehicle counts, lane utilization, and enforcement analytics</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedIntersection} 
            onChange={e => setSelectedIntersection(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            <option value="All">All Intersections</option>
            {intersections.map(i => (
              <option key={i.intersection_id} value={i.intersection_id}>{i.name} ({i.city || 'City'})</option>
            ))}
          </select>

          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '0.45rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', fontSize: '0.8rem' }}
          />

          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)}
            style={{ padding: '0.45rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px', fontSize: '0.8rem' }}
          />

          <button className="gov-btn" onClick={fetchData} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
            <Filter size={16} /> Apply Filters
          </button>
        </div>
      </div>

      {/* TRAFFIC ANALYTICS */}
      <h2 style={{ margin: '1rem 0 0 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
        <TrendingUp size={20} /> Traffic Analytics
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Total Vehicles</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{(data?.traffic?.total_vehicles || 0).toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Avg Veh / Hour</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{(data?.traffic?.avg_vehicles_hour || 0).toLocaleString()}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Peak Hour</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem' }}>{data?.traffic?.peak_hour || 'N/A'}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Congestion Index</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: congestion && congestion.severity === 'SEVERE' ? '#ef4444' : congestion && congestion.severity === 'HIGH' ? '#f97316' : '#10b981' }}>
            {congestion ? `${congestion.overall_score} (${congestion.severity})` : 'Normal'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>Vehicle Type Distribution</h3>
          <div style={{ height: '300px' }}>
            {hasVehicleDistribution ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.traffic.vehicle_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                    {data.traffic.vehicle_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : renderEmptyState("vehicle distribution data")}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>Lane Utilization (%)</h3>
          <div style={{ height: '300px' }}>
            {hasLaneUtilization ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.traffic.lane_utilization}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" unit="%" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : renderEmptyState("lane utilization data")}
          </div>
        </div>
      </div>

      {/* ENFORCEMENT ANALYTICS */}
      <h2 style={{ margin: '1rem 0 0 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
        <Shield size={20} /> Enforcement Analytics
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Challans Generated</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{data?.enforcement?.challans_generated || 0}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Paid Challans</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{data?.enforcement?.paid_challans || 0}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Pending Challans</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{data?.enforcement?.pending_challans || 0}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Total Fine Amount</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>₹{(data?.enforcement?.total_fine_amount || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>Violations by Type</h3>
        <div style={{ height: '300px' }}>
          {hasViolations ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.enforcement.violations_by_type} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={150} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : renderEmptyState("violations data")}
        </div>
      </div>
    </div>
  );
}
