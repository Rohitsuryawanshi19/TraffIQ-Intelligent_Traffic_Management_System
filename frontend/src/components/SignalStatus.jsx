import React, { useState, useEffect } from 'react';
import { Radio, Timer, FileCheck, WifiOff } from 'lucide-react';
import { wsClient } from '../services/websocket';

export default function SignalStatus({ signalData }) {
  const [localSignal, setLocalSignal] = useState(() => ({
    current_lane: signalData?.current_lane || 'lane_1',
    state: signalData?.state || 'GREEN',
    green_time: signalData?.green_time || 30,
    remaining_time: signalData?.remaining_time ?? 30,
  }));
  const [lastUpdate, setLastUpdate] = useState(() => Date.now());
  const [isStale, setIsStale] = useState(false);

  // Resync whenever signalData prop changes
  useEffect(() => {
    if (signalData) {
      setLocalSignal({
        current_lane: signalData.current_lane || 'lane_1',
        state: signalData.state || 'GREEN',
        green_time: signalData.green_time || 30,
        remaining_time: signalData.remaining_time ?? 30,
      });
      setLastUpdate(Date.now());
      setIsStale(false);
    }
  }, [signalData]);

  // Connect to real-time WebSocket telemetry stream
  useEffect(() => {
    wsClient.connect();
    const unsubscribe = wsClient.onSignalStatus((data) => {
      if (data) {
        setLocalSignal({
          current_lane: data.current_lane || 'lane_1',
          state: data.state || 'GREEN',
          green_time: data.green_time || 30,
          remaining_time: data.remaining_time ?? 30,
        });
        setLastUpdate(Date.now());
        setIsStale(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Local 1-second interval ticker for continuous smooth countdown and stale detection (>5s)
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalSignal((prev) => {
        const nextRem = Math.max(0, prev.remaining_time - 1);
        let nextState = prev.state;
        if (nextRem === 0 && prev.state === 'GREEN') {
          nextState = 'YELLOW';
        }
        return {
          ...prev,
          remaining_time: nextRem,
          state: nextState
        };
      });

      if (Date.now() - lastUpdate > 5000) {
        setIsStale(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdate]);

  const laneLabels = {
    lane_1: 'L1 (NW)',
    lane_2: 'L2 (NE)',
    lane_3: 'L3 (SW)',
    lane_4: 'L4 (SE)',
  };

  const getLightState = (laneId) => {
    const activeLane = localSignal.current_lane || 'lane_1';
    if (laneId === activeLane) {
      return localSignal.state || 'GREEN';
    }
    return 'RED';
  };

  return (
    <div className="card" style={{ borderTop: '4px solid var(--gov-accent-gold)', position: 'relative' }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Radio size={16} color="#1d4ed8" /> Signal Timing Control Units (STCU 1-4)
        </div>
        {isStale && (
          <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: '#f59e0b20', border: '1px solid #f59e0b40', padding: '0.15rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
            <WifiOff size={12} /> Reconnecting...
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0' }}>
        
        {/* 4 Traffic Signals */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['lane_1', 'lane_2', 'lane_3', 'lane_4'].map(laneId => {
            const state = getLightState(laneId);
            return (
              <div key={laneId} className="signal-box" style={{ padding: '0.75rem', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--gov-text-muted)' }}>{laneLabels[laneId]}</span>
                <div className="traffic-light" style={{ padding: '0.5rem', gap: '0.4rem' }}>
                  <div className={`light red ${state === 'RED' ? 'active' : ''}`} style={{ width: '32px', height: '32px' }}></div>
                  <div className={`light yellow ${state === 'YELLOW' ? 'active' : ''}`} style={{ width: '32px', height: '32px' }}></div>
                  <div className={`light green ${state === 'GREEN' ? 'active' : ''}`} style={{ width: '32px', height: '32px' }}></div>
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: state === 'GREEN' ? '#16a34a' : state === 'YELLOW' ? '#d97706' : '#dc2626' }}>
                  {state}
                </span>
              </div>
            );
          })}
        </div>

        {/* Global Timer / Priority */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '180px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gov-text-muted)', marginBottom: '0.4rem', fontWeight: '700', textTransform: 'uppercase' }}>
              <Timer size={14} /> Active Phase Timer
            </div>
            <div className="countdown-display">{localSignal.remaining_time}s</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', marginTop: '0.4rem' }}>
              Calculated Green: <b>{localSignal.green_time}s</b>
            </div>
          </div>

          <div style={{ padding: '0.8rem', background: 'var(--gov-card-bg)', borderRadius: '0.375rem', border: '1px solid var(--gov-card-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--gov-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Priority Granted To</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--gov-text-dark)', marginTop: '0.25rem' }}>
              {laneLabels[localSignal.current_lane]}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
              <FileCheck size={14} /> Density Algorithm
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
