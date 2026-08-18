import React from 'react';
import { BarChart3, TrendingUp, ShieldAlert, Award } from 'lucide-react';

export default function AnalyticsCards({ analytics }) {
  const { total_observations, avg_vehicles, max_vehicles, peak_lane } = analytics || {
    total_observations: 0,
    avg_vehicles: 0,
    max_vehicles: 0,
    peak_lane: 'lane_1',
  };

  return (
    <div className="grid-4">
      <div className="card" style={{ borderTop: '3px solid #1d4ed8' }}>
        <div className="card-title">
          <BarChart3 size={16} color="#1d4ed8" /> Total Telemetry Logs
        </div>
        <div className="stat-value">{total_observations}</div>
        <div className="stat-subtext">Verified Data Records</div>
      </div>

      <div className="card" style={{ borderTop: '3px solid #16a34a' }}>
        <div className="card-title">
          <TrendingUp size={16} color="#16a34a" /> Mean Junction Flow
        </div>
        <div className="stat-value">{avg_vehicles}</div>
        <div className="stat-subtext">Vehicles per Interval</div>
      </div>

      <div className="card" style={{ borderTop: '3px solid #d97706' }}>
        <div className="card-title">
          <ShieldAlert size={16} color="#d97706" /> Peak Load Volume
        </div>
        <div className="stat-value">{max_vehicles}</div>
        <div className="stat-subtext">Max Capacity Peak</div>
      </div>

      <div className="card" style={{ borderTop: '3px solid #7c3aed' }}>
        <div className="card-title">
          <Award size={16} color="#7c3aed" /> Congested Corridor
        </div>
        <div className="stat-value" style={{ textTransform: 'capitalize' }}>
          {(peak_lane || 'lane_1').replace('_', ' ')}
        </div>
        <div className="stat-subtext">Highest Density Sector</div>
      </div>
    </div>
  );
}
