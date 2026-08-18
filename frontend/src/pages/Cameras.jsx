import React, { useState, useEffect } from 'react';
import { Camera, AlertCircle, Video, Activity, Upload, Play, CheckCircle, WifiOff, Settings, Film } from 'lucide-react';
import axios from 'axios';
import SignalStatus from '../components/SignalStatus';
import { wsClient } from '../services/websocket';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [streamStatus, setStreamStatus] = useState({ is_running: false, lane_counts: { lane_1: 0, lane_2: 0, lane_3: 0, lane_4: 0 } });
  const [signalData, setSignalData] = useState(null);

  const fetchCameras = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/cameras`);
      setCameras(res.data || []);
      const sRes = await axios.get(`${API_BASE_URL}/stream/status`);
      if (sRes.data) setStreamStatus(sRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 3000);
    return () => clearInterval(interval);
  }, []);

  // Listen to WebSocket signal updates
  useEffect(() => {
    wsClient.connect();
    const unsubscribe = wsClient.onSignalStatus((data) => {
      if (data) setSignalData(data);
    });
    return () => unsubscribe();
  }, []);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadStatus('Uploading video feed to server...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_BASE_URL}/stream/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
        }
      });
      setUploadStatus(`Stream Started: ${res.data.file_name}`);
      setUploadError(null);
      setUploading(false);
      fetchCameras();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || err.message || 'Failed to upload video stream.';
      setUploadError(errMsg);
      setUploadStatus(null);
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'ONLINE': return <span style={{ background: '#10b98120', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>ONLINE</span>;
      case 'OFFLINE': return <span style={{ background: '#ef444420', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>OFFLINE</span>;
      case 'DEGRADED': return <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>DEGRADED</span>;
      case 'MAINTENANCE': return <span style={{ background: '#3b82f620', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>MAINTENANCE</span>;
      default: return null;
    }
  };

  const totalCameras = cameras.length;
  const onlineCameras = cameras.filter(c => c.status === 'ONLINE').length;
  const offlineCameras = cameras.filter(c => c.status === 'OFFLINE').length;
  const degradedCameras = cameras.filter(c => c.status === 'DEGRADED').length;

  const laneCounts = streamStatus.lane_counts || { lane_1: 0, lane_2: 0, lane_3: 0, lane_4: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#3b82f6' }}><Camera size={24} color="#fff" /></div>
          <div>
            <h1>Camera Monitoring & Video Detection</h1>
            <p>Real-Time YOLO Vehicle Detection, Drag & Drop Video Stream & Adaptive STCU Integration</p>
          </div>
        </div>
      </div>

      {/* DRAG AND DROP VIDEO UPLOADER & LIVE ADAPTIVE FEED */}
      <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid #3b82f6' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Film size={20} color="#3b82f6" /> Live Video Stream Uploader & Adaptive Controller Testbed
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Uploader Box */}
          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '8px', border: '1px dashed #334155', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
              Upload Custom Traffic Video (.mp4) for Real-Time YOLO Detection & Adaptive Signal Test
            </div>
            
            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="file" 
                accept="video/mp4,video/avi,video/mov,video/mkv"
                onChange={e => setSelectedFile(e.target.files[0])}
                style={{ padding: '0.5rem', background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}
              />

              <button 
                type="submit" 
                disabled={!selectedFile || uploading}
                style={{
                  padding: '0.75rem', background: uploading ? '#475569' : '#2563eb', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: '700', cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <Play size={16} /> {uploading ? 'Processing Stream...' : 'Start Live Detection Stream'}
              </button>
            </form>

            {uploading && (
              <div style={{ background: '#1e293b', borderRadius: '4px', height: '8px', width: '100%', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, background: '#2563eb', height: '100%', transition: 'width 0.2s ease' }} />
              </div>
            )}

            {uploadStatus && (
              <div style={{ fontSize: '0.75rem', color: '#60a5fa', background: '#1e3a8a30', padding: '0.5rem', borderRadius: '4px', fontWeight: '600' }}>
                {uploadStatus}
              </div>
            )}

            {uploadError && (
              <div style={{ fontSize: '0.75rem', color: '#fca5a5', background: '#ef444420', border: '1px solid #ef4444', padding: '0.5rem', borderRadius: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={14} color="#ef4444" /> {uploadError}
              </div>
            )}

            {streamStatus.error_state && (
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', background: '#f59e0b20', border: '1px solid #f59e0b', padding: '0.5rem', borderRadius: '4px', fontWeight: '600' }}>
                Stream Status Warning: {streamStatus.error_message}
              </div>
            )}
          </div>

          {/* Live Weighted Lane Counts Overlay Display */}
          <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Live Per-Lane Weighted Density Telemetry
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lane 1 (NW)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>{intVal(laneCounts.lane_1)}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lane 2 (NE)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>{intVal(laneCounts.lane_2)}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lane 3 (SW)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>{intVal(laneCounts.lane_3)}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lane 4 (SE)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>{intVal(laneCounts.lane_4)}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
              Weighted Density: Bus/Truck=2.5x, Car=1.0x, Bike=0.5x, Rickshaw=0.8x
            </div>
          </div>
        </div>
      </div>

      {/* LIVE VIDEO FEED & STCU ADAPTIVE WIDGET */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Live MJPEG Feed */}
        <div className="card" style={{ padding: '1rem', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.8rem', color: '#00d4ff', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={16} /> LIVE YOLO DETECTION & VIDEO STREAM
          </div>
          <img 
            src={`${API_BASE_URL}/stream/video`}
            alt="Live Traffic Video Stream"
            style={{ width: '100%', height: 'auto', maxHeight: '360px', objectFit: 'contain', display: 'block', borderRadius: '4px' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Embedded Live STCU Widget */}
        <SignalStatus signalData={signalData} />
      </div>

      {/* Network Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Total Cameras</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{totalCameras}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Online</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{onlineCameras}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Degraded</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{degradedCameras}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>Offline</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{offlineCameras}</div>
        </div>
      </div>
    </div>
  );
}

function intVal(val) {
  return Math.round(Number(val) || 0);
}
