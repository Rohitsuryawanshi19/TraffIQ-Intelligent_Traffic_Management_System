import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';

export default function TrafficChart({ historyData = [] }) {
  const dataList = Array.isArray(historyData) ? historyData : [];
  const formattedData = [...dataList].reverse().map((item) => ({
    time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
    total: item.total_vehicles || 0,
    lane1: item.lane_1 || 0,
    lane2: item.lane_2 || 0,
    lane3: item.lane_3 || 0,
    lane4: item.lane_4 || 0,
  }));

  const renderMiniChart = (dataKey, color, title) => (
    <div style={{ flex: '1 1 45%', minWidth: '300px', background: 'var(--gov-card-bg)', border: '1px solid var(--gov-card-border)', borderRadius: '0.375rem', padding: '1rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: color, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ height: 160, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gov-card-border)" opacity={0.4} />
            <XAxis dataKey="time" stroke="var(--gov-text-muted)" fontSize={9} fontWeight={600} tick={{fill: 'var(--gov-text-muted)'}} />
            <YAxis stroke="var(--gov-text-muted)" fontSize={9} fontWeight={600} tick={{fill: 'var(--gov-text-muted)'}} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--gov-card-bg)', borderColor: 'var(--gov-card-border)', borderRadius: '4px', color: 'var(--gov-text-dark)', fontSize: '11px' }} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color-${dataKey})`} name={title} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Chart 1: Total Volume Area Chart */}
      <div className="card" style={{ borderTop: '4px solid #1e293b' }}>
        <div className="card-title">
          <Activity size={16} color="#3b82f6" /> JUNCTION TRAFFIC TELEMETRY LOG (TOTAL VOLUME)
        </div>
        <div style={{ width: '100%', height: 260, marginTop: '1rem' }}>
          {formattedData.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--gov-text-muted)' }}>
              Awaiting telemetry...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gov-card-border)" opacity={0.5} />
                <XAxis dataKey="time" stroke="var(--gov-text-muted)" fontSize={11} fontWeight={600} />
                <YAxis stroke="var(--gov-text-muted)" fontSize={11} fontWeight={600} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--gov-card-bg)', borderColor: 'var(--gov-card-border)', borderRadius: '4px', color: 'var(--gov-text-dark)', fontSize: '12px' }} />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" name="Total Volume" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Per-Lane Grid (De-congested Professional View) */}
      <div className="card" style={{ borderTop: '4px solid #16a34a' }}>
        <div className="card-title" style={{ marginBottom: '1rem' }}>
          <TrendingUp size={16} color="#16a34a" /> PER-LANE FLOW (ISOLATED TELEMETRY)
        </div>
        
        {formattedData.length === 0 ? (
          <div style={{ display: 'flex', height: '160px', alignItems: 'center', justifyContent: 'center', color: 'var(--gov-text-muted)' }}>
            Awaiting telemetry...
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {renderMiniChart('lane1', '#3b82f6', 'Lane 1 (North-West)')}
            {renderMiniChart('lane2', '#10b981', 'Lane 2 (North-East)')}
            {renderMiniChart('lane3', '#f59e0b', 'Lane 3 (South-West)')}
            {renderMiniChart('lane4', '#ef4444', 'Lane 4 (South-East)')}
          </div>
        )}
      </div>

    </div>
  );
}
