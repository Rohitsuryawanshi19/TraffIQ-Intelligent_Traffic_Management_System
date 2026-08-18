import React from 'react';
import { Car, AlertTriangle } from 'lucide-react';

export default function LaneCard({ laneName, laneLabel, vehicleCount, isActive, trafficLevel = "LOW" }) {
  const getBadgeClass = (level) => {
    const lvl = (level || 'LOW').toUpperCase();
    switch (lvl) {
      case 'VERY_HEAVY': return 'badge-very_heavy';
      case 'HEAVY': return 'badge-heavy';
      case 'NORMAL': return 'badge-normal';
      default: return 'badge-low';
    }
  };

  const fillPercent = Math.min(100, (vehicleCount / 40) * 100);

  return (
    <div className={`card lane-card ${isActive ? 'lane-active-border' : ''}`} style={{ borderLeft: isActive ? '5px solid #16a34a' : '1px solid #cbd5e1' }}>
      <div className="card-title">
        <Car size={16} color={isActive ? '#16a34a' : '#475569'} />
        {laneLabel}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.85rem' }}>
        <div>
          <div className="stat-value">{vehicleCount}</div>
          <div className="stat-subtext">Verified Vehicle Count</div>
        </div>
        <div>
          <span className={`badge ${getBadgeClass(trafficLevel)}`}>
            {trafficLevel}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div 
          style={{
            height: '100%',
            width: `${fillPercent}%`,
            background: isActive 
              ? '#16a34a' 
              : fillPercent > 70 
              ? '#dc2626' 
              : '#1d4ed8',
            borderRadius: '3px',
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      {isActive && (
        <div style={{ marginTop: '0.85rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', color: '#15803d', fontSize: '0.775rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          ● OFFICIAL GREEN SIGNAL ACTIVE
        </div>
      )}
    </div>
  );
}
