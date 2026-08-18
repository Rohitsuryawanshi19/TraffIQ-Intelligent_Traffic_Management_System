import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';

export default function IntersectionVisualizer({ laneCounts, activeLane, signalState }) {
  const isGreen = signalState === 'GREEN';

  return (
    <div className="card visualizer-card">
      <div className="card-title">
        <ShieldAlert size={18} color="#06b6d4" /> Real-time Intersection Map (4-Lane Junction)
      </div>

      <div className="intersection-container">
        {/* Top-Left Quadrant - Lane 1 */}
        <div className={`junction-lane lane-nw ${activeLane === 'lane_1' ? 'lane-active' : ''}`}>
          <div className="lane-header">
            <span className="lane-tag">Lane 1 (NW)</span>
            <span className="count-pill">{laneCounts?.lane_1 || 0} veh</span>
          </div>
          {activeLane === 'lane_1' && isGreen && (
            <div className="active-arrow-box glow-green">
              <ArrowDown size={24} color="#10b981" />
              <span>GO</span>
            </div>
          )}
        </div>

        {/* Top-Right Quadrant - Lane 2 */}
        <div className={`junction-lane lane-ne ${activeLane === 'lane_2' ? 'lane-active' : ''}`}>
          <div className="lane-header">
            <span className="lane-tag">Lane 2 (NE)</span>
            <span className="count-pill">{laneCounts?.lane_2 || 0} veh</span>
          </div>
          {activeLane === 'lane_2' && isGreen && (
            <div className="active-arrow-box glow-green">
              <ArrowLeft size={24} color="#10b981" />
              <span>GO</span>
            </div>
          )}
        </div>

        {/* Center Intersection Hub */}
        <div className="junction-hub">
          <div className="hub-core">
            <div className={`hub-signal ${signalState?.toLowerCase()}`}></div>
            <span className="hub-text">{activeLane ? activeLane.replace('_', ' ').toUpperCase() : 'INIT'}</span>
          </div>
        </div>

        {/* Bottom-Left Quadrant - Lane 3 */}
        <div className={`junction-lane lane-sw ${activeLane === 'lane_3' ? 'lane-active' : ''}`}>
          <div className="lane-header">
            <span className="lane-tag">Lane 3 (SW)</span>
            <span className="count-pill">{laneCounts?.lane_3 || 0} veh</span>
          </div>
          {activeLane === 'lane_3' && isGreen && (
            <div className="active-arrow-box glow-green">
              <ArrowRight size={24} color="#10b981" />
              <span>GO</span>
            </div>
          )}
        </div>

        {/* Bottom-Right Quadrant - Lane 4 */}
        <div className={`junction-lane lane-se ${activeLane === 'lane_4' ? 'lane-active' : ''}`}>
          <div className="lane-header">
            <span className="lane-tag">Lane 4 (SE)</span>
            <span className="count-pill">{laneCounts?.lane_4 || 0} veh</span>
          </div>
          {activeLane === 'lane_4' && isGreen && (
            <div className="active-arrow-box glow-green">
              <ArrowUp size={24} color="#10b981" />
              <span>GO</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
