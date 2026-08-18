import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertCircle, Clock, Map, Target } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function TrafficPrediction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intersection, setIntersection] = useState('junction_1');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/traffic/predict?intersection=${intersection}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [intersection]);

  if (loading && !data) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Running prediction models...</div>;
  }

  if (data?.error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{data.error}</div>;
  }

  const getCongestionColor = (c) => {
    switch(c) {
      case 'SEVERE': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MODERATE': return '#eab308';
      case 'LOW': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#0ea5e9' }}><TrendingUp size={24} color="#fff" /></div>
          <div>
            <h1>Traffic Prediction</h1>
            <p>Academic volume forecasting using Simple Moving Average (SMA)</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Map size={16} color="#94a3b8" />
          <select 
            value={intersection} 
            onChange={(e) => setIntersection(e.target.value)}
            style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '0.5rem', borderRadius: '4px' }}
          >
            <option value="junction_1">Junction 1</option>
            <option value="junction_2">Junction 2</option>
            <option value="junction_3">Junction 3</option>
          </select>
        </div>
      </div>

      <div style={{ background: 'rgba(234, 88, 12, 0.1)', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertCircle size={20} color="#ea580c" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#fdba74' }}>
          <strong>Prototype Disclaimer:</strong> This prediction service is isolated from the live detection worker. It utilizes a simplistic historical moving average and stochastic projection suitable for a college project baseline. Do not interpret these metrics as production-grade AI forecasting.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderTop: '3px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={14} /> Current Traffic
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem' }}>{data.current} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>veh</span></div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderTop: '3px solid #0ea5e9' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={14} /> +15 Minutes
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem' }}>{data.pred_15m} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>veh</span></div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderTop: '3px solid #0284c7' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={14} /> +30 Minutes
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem' }}>{data.pred_30m} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>veh</span></div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderTop: '3px solid #0369a1' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={14} /> +60 Minutes
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.5rem' }}>{data.pred_60m} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '400' }}>veh</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem' }}>Actual vs Predicted Trajectory (Historical Fit)</h2>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chart_data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }} />
                <Legend />
                <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Predicted" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Predicted Congestion</h3>
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: `1px solid ${getCongestionColor(data.predicted_congestion)}` }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Next 15m Outlook</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: getCongestionColor(data.predicted_congestion) }}>
                {data.predicted_congestion}
              </div>
            </div>
          </div>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Model Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Model Type</span>
                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>SMA-5</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Mean Absolute Error</span>
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#ef4444' }}>{data.mae}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Est. Accuracy</span>
                <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#10b981' }}>{data.accuracy}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
