import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Video, AlertTriangle, ShieldAlert, Ambulance, 
  MapPin, RefreshCw, Cpu, Layers, Radio, Play, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Custom Map Pins for Leaflet
const createCustomMarker = (state, name) => {
  const color = state === 'GREEN' ? '#10b981' : state === 'YELLOW' ? '#f59e0b' : '#ef4444';
  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      background: ${color}22;
      border: 2px solid ${color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px ${color};
    ">
      <div style="width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

export default function ControlRoom() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedJunction, setSelectedJunction] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/control-room/summary`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Control room fetch error:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [28.58, 77.20],
        zoom: 11,
        zoomControl: false
      });

      // Dark Mode Tile Layer (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers dynamically when data changes
  useEffect(() => {
    if (mapInstanceRef.current && markersGroupRef.current && data?.intersections && data.intersections.length > 0) {
      markersGroupRef.current.clearLayers();

      const bounds = L.latLngBounds();

      data.intersections.forEach((node) => {
        const latLng = [node.lat, node.lng];
        bounds.extend(latLng);

        const marker = L.marker(latLng, {
          icon: createCustomMarker(node.state, node.name)
        });

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; color: #0f172a; min-width: 190px;">
            <div style="font-weight: 800; font-size: 13px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 4px; color: #0f172a;">
              ${node.name}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #2563eb;">📍 ${node.city || 'City'}</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">${node.full_address || node.location || ''}</div>
            <div style="font-size: 12px; font-weight: 700; margin-top: 6px; color: ${node.state === 'GREEN' ? '#059669' : node.state === 'YELLOW' ? '#d97706' : '#dc2626'}">
              Signal Phase: ${node.current_lane.toUpperCase()} (${node.state}) - ${node.remaining_time}s
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Status: ${node.status} | Lanes: ${node.lanes}</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => setSelectedJunction(node));
        markersGroupRef.current.addLayer(marker);
      });

      if (bounds.isValid() && !mapInstanceRef.current.hasUserPanned) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [data]);

  const metrics = data?.metrics || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: '#f8fafc' }}>
      {/* Header Bar */}
      <div style={{
        background: '#090d16', padding: '1rem 1.5rem', borderRadius: '8px',
        border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444',
            width: '40px', height: '40px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Radio size={22} color="#ef4444" className="pulse-red" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.05em', color: '#fff' }}>
              INTELLIGENT TRAFFIC CONTROL CENTRE
            </h1>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              LIVE COMMAND SYSTEM — REAL-TIME MONITORING MODE
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#0f172a', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #334155', fontSize: '0.8rem', color: '#94a3b8' }}>
            System Latency: <strong style={{ color: '#10b981' }}>24ms</strong>
          </div>
          <button
            onClick={fetchSummary}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
              background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px',
              fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Refresh Stream
          </button>
        </div>
      </div>

      {/* Live Operational Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Vehicles Detected', value: metrics.vehicles_detected || 0, icon: Activity, color: '#3b82f6' },
          { label: 'Active Violations', value: metrics.active_violations || 0, icon: ShieldAlert, color: '#f59e0b' },
          { label: 'Active Incidents', value: metrics.active_incidents || 0, icon: AlertTriangle, color: '#ef4444' },
          { label: 'Emergency Priority', value: metrics.emergency_events || 0, icon: Ambulance, color: '#ec4899' },
          { label: 'Cameras Online', value: metrics.cameras_online || '0/0', icon: Video, color: '#10b981' },
          { label: 'Junctions Active', value: metrics.intersections_online || '0/0', icon: MapPin, color: '#8b5cf6' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} style={{
              background: '#090d16', padding: '1rem', borderRadius: '8px',
              border: '1px solid #1e293b', borderLeft: `4px solid ${m.color}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span>
                <Icon size={16} color={m.color} />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginTop: '0.4rem' }}>
                {m.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Central Grid layout: Map + Feeds */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Left Column: Live OpenStreetMap City View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{
              padding: '0.75rem 1.25rem', background: '#0f172a', borderBottom: '1px solid #1e293b',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="#3b82f6" /> GIS LIVE JUNCTION MAP (DEMO COORDINATES)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700' }}>
                ⚠️ Marked Demo Geographic Coordinates
              </div>
            </div>

            {/* Map Container */}
            <div ref={mapRef} style={{ height: '420px', width: '100%', background: '#0b0f19', position: 'relative' }}>
              {loading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(9,13,22,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  Loading GIS GIS Map Stream...
                </div>
              )}
            </div>
          </div>

          {/* Camera Feeds Matrix */}
          <div style={{ background: '#090d16', padding: '1.25rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={16} color="#0ea5e9" /> ACTIVE TRAFFIC CAMERA FEEDS
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {data?.cameras?.slice(0, 3).map((cam) => (
                <div key={cam.camera_id} style={{ background: '#0f172a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #334155' }}>
                  <div style={{
                    height: '130px', background: '#020617', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', position: 'relative', flexDirection: 'column', gap: '0.5rem'
                  }}>
                    <Play size={28} color="#64748b" style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>LIVE OPTICAL STREAM</span>

                    <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.7)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', color: '#10b981', fontWeight: '800' }}>
                      REC ●
                    </div>
                    <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', color: '#94a3b8' }}>
                      {cam.fps} FPS | {cam.resolution}
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: '700', color: '#fff' }}>{cam.camera_id}</span>
                    <span style={{ color: '#94a3b8' }}>{cam.direction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Operations Triage Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Signal Control Monitor */}
          <div style={{ background: '#090d16', padding: '1.25rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={16} color="#3b82f6" /> ADAPTIVE SIGNAL MONITOR
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data?.intersections?.map((node) => (
                <div key={node.intersection_id} style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#fff' }}>{node.name}</span>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800',
                      background: node.state === 'GREEN' ? 'rgba(16,185,129,0.15)' : node.state === 'YELLOW' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: node.state === 'GREEN' ? '#10b981' : node.state === 'YELLOW' ? '#f59e0b' : '#ef4444'
                    }}>
                      {node.current_lane.toUpperCase()} ({node.state})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Remaining Green: <strong style={{ color: '#fff' }}>{node.remaining_time}s</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Incident & System Alerts Feed */}
          <div style={{ background: '#090d16', padding: '1.25rem', borderRadius: '8px', border: '1px solid #1e293b', flex: 1 }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} color="#ef4444" /> SYSTEM ALERTS & INCIDENTS
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
              {data?.recent_alerts?.map((alt) => (
                <div key={alt.alert_id} style={{ background: '#0f172a', padding: '0.6rem 0.75rem', borderRadius: '6px', borderLeft: `3px solid ${alt.severity === 'CRITICAL' ? '#ef4444' : alt.severity === 'HIGH' ? '#f97316' : '#eab308'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                    <span style={{ color: '#fff' }}>{alt.type}</span>
                    <span style={{ color: alt.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>{alt.severity}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{alt.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Enforcement Feed */}
          <div style={{ background: '#090d16', padding: '1.25rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={16} color="#f59e0b" /> LIVE VIOLATIONS TRIAGE
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data?.recent_violations?.slice(0, 3).map((v) => (
                <div key={v.violation_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#0f172a', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff' }}>{v.violation_type}</div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{v.vehicle_number} ({v.vehicle_type})</div>
                  </div>
                  <span style={{ color: '#f59e0b', fontWeight: '700', fontSize: '0.7rem' }}>{v.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
