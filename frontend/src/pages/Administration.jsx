import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, Shield, BookOpen, MapPin, Video, Activity, Cpu, Sliders, 
  Plus, Edit2, CheckCircle, XCircle, AlertTriangle, Save, RefreshCw, ToggleLeft, ToggleRight, Lock, Trash2
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const ROLE_COLORS = { 
  ADMIN: '#ef4444', 
  TRAFFIC_OFFICER: '#10b981', 
  CONTROL_ROOM_OPERATOR: '#8b5cf6', 
  ANALYST: '#f59e0b', 
  VIEWER: '#64748b' 
};

// Roles & permissions matrix data
const PERMISSION_MATRIX = [
  { resource: 'Users & System Config', ADMIN: 'Full', TRAFFIC_OFFICER: 'None', CONTROL_ROOM_OPERATOR: 'None', ANALYST: 'None', VIEWER: 'None' },
  { resource: 'Traffic Rule Master', ADMIN: 'Full', TRAFFIC_OFFICER: 'None', CONTROL_ROOM_OPERATOR: 'None', ANALYST: 'None', VIEWER: 'None' },
  { resource: 'Violations & Evidence', ADMIN: 'Full', TRAFFIC_OFFICER: 'Approve/Reject', CONTROL_ROOM_OPERATOR: 'Read', ANALYST: 'None', VIEWER: 'None' },
  { resource: 'Challan Generation', ADMIN: 'Full', TRAFFIC_OFFICER: 'Issue/Update', CONTROL_ROOM_OPERATOR: 'None', ANALYST: 'None', VIEWER: 'None' },
  { resource: 'Live Traffic & Signals', ADMIN: 'Full', TRAFFIC_OFFICER: 'Read', CONTROL_ROOM_OPERATOR: 'Override/Manage', ANALYST: 'Read', VIEWER: 'Read' },
  { resource: 'Camera Monitoring', ADMIN: 'Full', TRAFFIC_OFFICER: 'Read', CONTROL_ROOM_OPERATOR: 'Manage', ANALYST: 'None', VIEWER: 'Read' },
  { resource: 'Emergency Management', ADMIN: 'Full', TRAFFIC_OFFICER: 'Read', CONTROL_ROOM_OPERATOR: 'Manage', ANALYST: 'None', VIEWER: 'None' },
  { resource: 'Analytics & Reports', ADMIN: 'Full', TRAFFIC_OFFICER: 'Read', CONTROL_ROOM_OPERATOR: 'Read', ANALYST: 'Full Export', VIEWER: 'Read' },
  { resource: 'Audit Logs', ADMIN: 'Read Only', TRAFFIC_OFFICER: 'None', CONTROL_ROOM_OPERATOR: 'None', ANALYST: 'None', VIEWER: 'None' },
];

export default function Administration() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  // Data states
  const [users, setUsers] = useState([]);
  const [rules, setRules] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [intersections, setIntersections] = useState([]);
  const [signalConfig, setSignalConfig] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);
  
  // Modals & UI states
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'VIEWER' });
  
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);
  
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentCamera, setCurrentCamera] = useState({ camera_id: '', intersection: 'junction_1', direction: 'Northbound', resolution: '1080p', status: 'ONLINE' });
  
  const [showIntersectionModal, setShowIntersectionModal] = useState(false);
  const [currentIntersection, setCurrentIntersection] = useState({
    intersection_id: '', name: '', location: '', city: 'Bhopal', full_address: '', latitude: 23.2333, longitude: 77.4346, lanes: 4, status: 'ACTIVE'
  });
  
  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', action: null });

  // Notifications
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetchers
  const fetchUsers = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/users`); setUsers(res.data); } catch(e){}
  };

  const fetchRules = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/rules`); setRules(res.data); } catch(e){}
  };

  const fetchCameras = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/cameras`); setCameras(res.data); } catch(e){}
  };

  const fetchIntersections = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/intersections`); setIntersections(res.data); } catch(e){}
  };

  const fetchSignalConfig = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/admin/signal-config`); setSignalConfig(res.data); } catch(e){}
  };

  const fetchAiConfig = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/admin/ai-config`); setAiConfig(res.data); } catch(e){}
  };

  const fetchSystemSettings = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/system/mode`); setSystemSettings(res.data); } catch(e){
      setSystemSettings({ system_mode: 'AUTOMATIC', auto_challan_generation: false, data_retention_days: 90 });
    }
  };

  const [dataStats, setDataStats] = useState({ vehicle_detections: 0, vehicle_tracks: 0, traffic_records: 0, traffic_violations: 0, challans: 0, system_alerts: 0, metr_la_records: 0 });

  const fetchDataStats = async () => {
    try { const res = await axios.get(`${API_BASE_URL}/admin/data-stats`); setDataStats(res.data); } catch(e){}
  };

  useEffect(() => {
    fetchUsers();
    fetchRules();
    fetchCameras();
    fetchIntersections();
    fetchSignalConfig();
    fetchAiConfig();
    fetchSystemSettings();
    fetchDataStats();
  }, []);

  // Action Handlers with Confirmation
  const handleToggleUser = (u) => {
    setConfirmDialog({
      open: true,
      title: `${u.is_active ? 'Disable' : 'Enable'} User Account`,
      message: `Are you sure you want to ${u.is_active ? 'disable' : 'enable'} user "${u.username}"?`,
      action: async () => {
        try {
          await axios.put(`${API_BASE_URL}/users/${u.id}/toggle`);
          fetchUsers();
          showToast(`User ${u.username} ${u.is_active ? 'disabled' : 'enabled'}`);
        } catch(e) { showToast('Action failed', 'error'); }
      }
    });
  };

  const handleUpdateRole = (u, newRole) => {
    setConfirmDialog({
      open: true,
      title: 'Change User Role',
      message: `Change role of "${u.username}" from ${u.role} to ${newRole}?`,
      action: async () => {
        try {
          await axios.put(`${API_BASE_URL}/users/${u.id}/role?role=${newRole}`);
          fetchUsers();
          showToast(`Role updated to ${newRole}`);
        } catch(e) { showToast('Role update failed', 'error'); }
      }
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/users`, newUser);
      setShowUserModal(false);
      setNewUser({ username: '', email: '', password: '', role: 'VIEWER' });
      fetchUsers();
      showToast('User created successfully');
    } catch(err) {
      showToast(err.response?.data?.detail || 'Failed to create user', 'error');
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      if (currentRule.rule_id) {
        await axios.put(`${API_BASE_URL}/rules/${currentRule.rule_id}`, currentRule);
      } else {
        await axios.post(`${API_BASE_URL}/rules`, currentRule);
      }
      setShowRuleModal(false);
      fetchRules();
      showToast('Traffic Rule saved');
    } catch(err) {
      showToast('Failed to save rule', 'error');
    }
  };

  const handleSaveSignalConfig = async () => {
    setConfirmDialog({
      open: true,
      title: 'Update Signal Controller Weights & Parameters',
      message: 'Modifying adaptive signal timing parameters directly affects junction traffic flow algorithm. Proceed?',
      action: async () => {
        try {
          await axios.post(`${API_BASE_URL}/admin/signal-config`, signalConfig);
          fetchSignalConfig();
          showToast('Signal configuration saved successfully');
        } catch(e) { showToast('Failed to update signal config', 'error'); }
      }
    });
  };

  const handleSaveAiConfig = async () => {
    setConfirmDialog({
      open: true,
      title: 'Update AI Model Detection Thresholds',
      message: 'Adjusting YOLO confidence and tracking thresholds will affect vehicle detection sensitivity. Proceed?',
      action: async () => {
        try {
          await axios.post(`${API_BASE_URL}/admin/ai-config`, aiConfig);
          fetchAiConfig();
          showToast('AI configuration saved');
        } catch(e) { showToast('Failed to update AI config', 'error'); }
      }
    });
  };

  const handleSaveSystemSettings = async () => {
    setConfirmDialog({
      open: true,
      title: 'Update System-Wide Settings',
      message: 'Changing operational parameters like System Mode or Auto-Challans applies across all modules immediately. Proceed?',
      action: async () => {
        try {
          await axios.post(`${API_BASE_URL}/admin/system-settings`, systemSettings);
          fetchSystemSettings();
          showToast('System settings updated');
        } catch(e) { showToast('Failed to update system settings', 'error'); }
      }
    });
  };

  const handleSaveCamera = async (e) => {
    e.preventDefault();
    try {
      const isEdit = cameras.some(c => c.camera_id === currentCamera.camera_id);
      if (isEdit) {
        await axios.put(`${API_BASE_URL}/admin/cameras/${currentCamera.camera_id}`, currentCamera);
      } else {
        await axios.post(`${API_BASE_URL}/admin/cameras`, currentCamera);
      }
      setShowCameraModal(false);
      fetchCameras();
      showToast('Camera configuration saved');
    } catch(err) {
      showToast(err.response?.data?.detail || 'Failed to save camera', 'error');
    }
  };

  const handleSaveIntersection = async (e) => {
    e.preventDefault();
    try {
      const isEdit = intersections.some(i => i.intersection_id === currentIntersection.intersection_id);
      if (isEdit) {
        await axios.put(`${API_BASE_URL}/admin/intersections/${currentIntersection.intersection_id}`, currentIntersection);
      } else {
        await axios.post(`${API_BASE_URL}/admin/intersections`, currentIntersection);
      }
      setShowIntersectionModal(false);
      fetchIntersections();
      showToast('Intersection configuration saved');
    } catch(err) {
      showToast(err.response?.data?.detail || 'Failed to save intersection', 'error');
    }
  };

  const handleClearData = (targetLabel, targetKey) => {
    setConfirmDialog({
      open: true,
      title: `Clear ${targetLabel} Records`,
      message: `CAUTION: Are you sure you want to delete all ${targetLabel} records from the database? This action will be audited and cannot be undone.`,
      action: async () => {
        try {
          const res = await axios.post(`${API_BASE_URL}/admin/clear-data`, { target: targetKey });
          fetchDataStats();
          showToast(`Cleared ${res.data.deleted_count} ${targetLabel} records`);
        } catch(e) { showToast('Failed to clear data records', 'error'); }
      }
    });
  };

  const handleRebuildAnalytics = () => {
    setConfirmDialog({
      open: true,
      title: 'Rebuild Analytics Engine',
      message: 'Reindex and re-aggregate all time series and traffic observations for analytical prediction models?',
      action: async () => {
        try {
          await axios.post(`${API_BASE_URL}/admin/rebuild-analytics`);
          fetchDataStats();
          showToast('Analytics aggregations rebuilt successfully');
        } catch(e) { showToast('Failed to rebuild analytics', 'error'); }
      }
    });
  };

  // Restrict to ADMIN
  if (user && user.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: '#ef4444' }}>
        <Lock size={48} />
        <h2>Access Denied</h2>
        <p style={{ color: '#94a3b8' }}>Only system Administrators have authorization to access Administration module.</p>
      </div>
    );
  }

  const TABS = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'rules', label: 'Traffic Rules', icon: BookOpen },
    { id: 'intersections', label: 'Intersections', icon: MapPin },
    { id: 'cameras', label: 'Cameras', icon: Video },
    { id: 'signals', label: 'Signal Config', icon: Sliders },
    { id: 'ai', label: 'AI Config', icon: Cpu },
    { id: 'system', label: 'System Settings', icon: Settings },
    { id: 'data-management', label: 'Data Management', icon: Trash2 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 200,
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff',
          padding: '0.75rem 1.25rem', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#ef4444' }}><Settings size={24} color="#fff" /></div>
          <div>
            <h1>System Administration</h1>
            <p>Master Control Panel — Core System & Operational Configuration</p>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--gov-card-border)', overflowX: 'auto', paddingBottom: '2px' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.25rem', background: 'none', border: 'none',
                color: isActive ? '#3b82f6' : '#94a3b8',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#3b82f6" /> User Management
            </h2>
            <button
              onClick={() => setShowUserModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Create User
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  {['ID', 'Username', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>#{u.id}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '700' }}>{u.username}</td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={u.role}
                        onChange={e => handleUpdateRole(u, e.target.value)}
                        style={{ background: '#1e293b', color: ROLE_COLORS[u.role] || '#fff', border: '1px solid #334155', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: '700', fontSize: '0.8rem' }}
                      >
                        {['ADMIN', 'TRAFFIC_OFFICER', 'CONTROL_ROOM_OPERATOR', 'ANALYST', 'VIEWER'].map(r => (
                          <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', background: u.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: u.is_active ? '#10b981' : '#ef4444' }}>
                        {u.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => handleToggleUser(u)} style={{ background: 'transparent', border: '1px solid #334155', color: u.is_active ? '#ef4444' : '#10b981', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {u.is_active ? <><ToggleRight size={14}/> Disable</> : <><ToggleLeft size={14}/> Enable</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={18} color="#8b5cf6" /> Role-Based Access Control (RBAC) Permission Matrix
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>Resource / Module</th>
                  {['ADMIN', 'TRAFFIC_OFFICER', 'CONTROL_ROOM_OPERATOR', 'ANALYST', 'VIEWER'].map(r => (
                    <th key={r} style={{ padding: '0.75rem', textAlign: 'center', color: ROLE_COLORS[r], fontWeight: '800', fontSize: '0.75rem' }}>
                      {r.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '700', color: '#e2e8f0' }}>{row.resource}</td>
                    {['ADMIN', 'TRAFFIC_OFFICER', 'CONTROL_ROOM_OPERATOR', 'ANALYST', 'VIEWER'].map(r => {
                      const val = row[r];
                      const isNone = val === 'None';
                      const isFull = val.includes('Full');
                      return (
                        <td key={r} style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700',
                            background: isNone ? 'rgba(100,116,139,0.1)' : isFull ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                            color: isNone ? '#64748b' : isFull ? '#fca5a5' : '#60a5fa',
                            border: `1px solid ${isNone ? '#334155' : isFull ? '#ef444444' : '#3b82f644'}`
                          }}>
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRAFFIC RULES */}
      {activeTab === 'rules' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="#f59e0b" /> Traffic Rule Master
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', marginTop: '0.2rem', display: 'inline-block' }}>
                ⚠️ Demo penalty configuration — Not official current government traffic fines
              </span>
            </div>
            <button
              onClick={() => {
                setCurrentRule({ violation_type: '', vehicle_type: 'All', penalty_amount: 500, repeat_offence_amount: 1000, is_active: true });
                setShowRuleModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Add Rule
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  {['Rule ID', 'Violation Type', 'Vehicle Type', 'Penalty', 'Repeat Penalty', 'Status', 'Effective From', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>{r.rule_id}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '700' }}>{r.violation_type}</td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{r.vehicle_type}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '700', color: '#10b981' }}>₹{r.penalty_amount}</td>
                    <td style={{ padding: '0.75rem', color: '#ef4444' }}>₹{r.repeat_offence_amount}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', background: r.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: r.is_active ? '#10b981' : '#ef4444' }}>
                        {r.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{r.effective_from ? new Date(r.effective_from).toLocaleDateString() : 'Immediate'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => { setCurrentRule(r); setShowRuleModal(true); }} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INTERSECTIONS */}
      {activeTab === 'intersections' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="#10b981" /> Intersection Configuration
            </h2>
            <button
              onClick={() => {
                setCurrentIntersection({ intersection_id: `junction_${intersections.length + 1}`, name: '', location: '', lanes: 4, status: 'ACTIVE' });
                setShowIntersectionModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Add Intersection
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  {['ID', 'Junction Name', 'Location', 'Lanes', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {intersections.map(node => (
                  <tr key={node.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#64748b' }}>{node.intersection_id}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '700' }}>{node.name}</td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{node.location}</td>
                    <td style={{ padding: '0.75rem' }}>{node.lanes} Active Lanes</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        {node.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => { setCurrentIntersection(node); setShowIntersectionModal(true); }} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CAMERAS */}
      {activeTab === 'cameras' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} color="#0ea5e9" /> Camera Monitoring Setup
            </h2>
            <button
              onClick={() => {
                setCurrentCamera({ camera_id: `CAM-${cameras.length + 101}`, intersection: 'junction_1', direction: 'Northbound', resolution: '1080p', status: 'ONLINE' });
                setShowCameraModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Add Camera
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  {['Camera ID', 'Intersection', 'Direction', 'Resolution', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cameras.map(cam => (
                  <tr key={cam.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: '700', color: '#60a5fa' }}>{cam.camera_id}</td>
                    <td style={{ padding: '0.75rem' }}>{cam.intersection}</td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{cam.direction}</td>
                    <td style={{ padding: '0.75rem' }}>{cam.resolution || '1080p'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', background: cam.status === 'ONLINE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: cam.status === 'ONLINE' ? '#10b981' : '#ef4444' }}>
                        {cam.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => { setCurrentCamera(cam); setShowCameraModal(true); }} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SIGNAL CONFIGURATION */}
      {activeTab === 'signals' && signalConfig && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="#3b82f6" /> Adaptive Traffic Signal Algorithm & Timing Parameters
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Timing Bounds */}
            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#60a5fa' }}>Signal Timing Parameters (Seconds)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Minimum Green Time: <strong>{signalConfig.min_green_time}s</strong></label>
                  <input type="range" min="5" max="30" value={signalConfig.min_green_time} onChange={e => setSignalConfig({...signalConfig, min_green_time: parseInt(e.target.value)})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Maximum Green Time: <strong>{signalConfig.max_green_time}s</strong></label>
                  <input type="range" min="45" max="180" value={signalConfig.max_green_time} onChange={e => setSignalConfig({...signalConfig, max_green_time: parseInt(e.target.value)})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Yellow Clearance: <strong>{signalConfig.yellow_clearance}s</strong></label>
                  <input type="number" min="2" max="6" value={signalConfig.yellow_clearance} onChange={e => setSignalConfig({...signalConfig, yellow_clearance: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>All-Red Safety Clearance: <strong>{signalConfig.all_red_clearance}s</strong></label>
                  <input type="number" min="1" max="5" value={signalConfig.all_red_clearance} onChange={e => setSignalConfig({...signalConfig, all_red_clearance: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>
            </div>

            {/* Weights */}
            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#10b981' }}>Priority Score Formula Weights</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Vehicle Density Weight: <strong>{signalConfig.weight_density}</strong></label>
                  <input type="number" step="0.1" value={signalConfig.weight_density} onChange={e => setSignalConfig({...signalConfig, weight_density: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Waiting Time Weight: <strong>{signalConfig.weight_waiting_time}</strong></label>
                  <input type="number" step="0.1" value={signalConfig.weight_waiting_time} onChange={e => setSignalConfig({...signalConfig, weight_waiting_time: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Queue Length Weight: <strong>{signalConfig.weight_queue_length}</strong></label>
                  <input type="number" step="0.1" value={signalConfig.weight_queue_length} onChange={e => setSignalConfig({...signalConfig, weight_queue_length: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Recently Served Penalty: <strong>{signalConfig.penalty_recently_served}</strong></label>
                  <input type="number" value={signalConfig.penalty_recently_served} onChange={e => setSignalConfig({...signalConfig, penalty_recently_served: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.4rem', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleSaveSignalConfig}
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Save size={18} /> Save Signal Configuration
          </button>
        </div>
      )}

      {/* TAB 7: AI CONFIGURATION */}
      {activeTab === 'ai' && aiConfig && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="#8b5cf6" /> Computer Vision & AI Detection Model Configuration
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Confidence Threshold: <strong>{aiConfig.confidence_threshold}</strong></label>
              <input type="range" min="0.1" max="0.9" step="0.05" value={aiConfig.confidence_threshold} onChange={e => setAiConfig({...aiConfig, confidence_threshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>IoU NMS Threshold: <strong>{aiConfig.iou_threshold}</strong></label>
              <input type="range" min="0.1" max="0.9" step="0.05" value={aiConfig.iou_threshold} onChange={e => setAiConfig({...aiConfig, iou_threshold: parseFloat(e.target.value)})} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Detection Model Version</label>
              <select value={aiConfig.model_version} onChange={e => setAiConfig({...aiConfig, model_version: e.target.value})} style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}>
                <option value="YOLOv8n-Traffic-v2">YOLOv8n (Nano - Fast Real-time)</option>
                <option value="YOLOv8s-Traffic-v2">YOLOv8s (Small - Balanced)</option>
                <option value="YOLOv8m-Traffic-v2">YOLOv8m (Medium - High Precision)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Vehicle Tracking Engine</label>
              <button
                onClick={() => setAiConfig({...aiConfig, tracking_enabled: !aiConfig.tracking_enabled})}
                style={{ width: '100%', padding: '0.6rem', background: aiConfig.tracking_enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: aiConfig.tracking_enabled ? '#10b981' : '#ef4444', border: '1px solid #334155', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
              >
                {aiConfig.tracking_enabled ? 'ENABLED (ByteTrack)' : 'DISABLED'}
              </button>
            </div>
          </div>
          <button
            onClick={handleSaveAiConfig}
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Save size={18} /> Save AI Configuration
          </button>
        </div>
      )}

      {/* TAB 8: SYSTEM SETTINGS */}
      {activeTab === 'system' && systemSettings && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={18} color="#64748b" /> Global System Settings & Operational Modes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Operational Mode</label>
              <select value={systemSettings.system_mode} onChange={e => setSystemSettings({...systemSettings, system_mode: e.target.value})} style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontWeight: '700' }}>
                <option value="AUTOMATIC">AUTOMATIC (Fully Adaptive AI Control)</option>
                <option value="MANUAL">MANUAL (Manual Signal Control Only)</option>
                <option value="EMERGENCY_ONLY">EMERGENCY ONLY (Priority Vehicle Corridor Mode)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Auto-Challan Generation</label>
              <button
                onClick={() => setSystemSettings({...systemSettings, auto_challan_generation: !systemSettings.auto_challan_generation})}
                style={{ width: '100%', padding: '0.6rem', background: systemSettings.auto_challan_generation ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: systemSettings.auto_challan_generation ? '#10b981' : '#ef4444', border: '1px solid #334155', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
              >
                {systemSettings.auto_challan_generation ? 'ENABLED (Auto-Issue on Violation Approval)' : 'DISABLED'}
              </button>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>Data Retention (Days)</label>
              <input type="number" value={systemSettings.data_retention_days} onChange={e => setSystemSettings({...systemSettings, data_retention_days: parseInt(e.target.value)})} style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>
          </div>
          <button
            onClick={handleSaveSystemSettings}
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
          >
            <Save size={18} /> Save System Settings
          </button>
        </div>
      )}

      {/* TAB 9: DATA MANAGEMENT */}
      {activeTab === 'data-management' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Statistics Grid */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="#00e5ff" /> Database & Data Telemetry Statistics
              </h2>
              <button onClick={fetchDataStats} className="gov-btn" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <RefreshCw size={14} /> Refresh Stats
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Vehicle Detections</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{dataStats.vehicle_detections}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Persistent Tracks</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{dataStats.vehicle_tracks}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #00e5ff' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Traffic Records</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{dataStats.traffic_records}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Traffic Violations</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{dataStats.traffic_violations}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Fines & Challans</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{dataStats.challans}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>METR-LA Time-Series</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{dataStats.metr_la_records}</div>
              </div>
            </div>
          </div>

          {/* Controlled Actions */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={18} /> Controlled Administrative Data Actions
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Destructive actions delete specific telemetry subsets from SQLite while preserving system users, configuration, and audit logs. All actions require explicit confirmation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#38bdf8' }}>Clear METR-LA Dataset Records</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    Deletes all imported time-series observations sourced from METR-LA ({dataStats.metr_la_records} entries).
                  </p>
                </div>
                <button onClick={() => handleClearData('METR-LA Dataset', 'METR_LA')} className="gov-btn" style={{ marginTop: '1rem', background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}>
                  Clear METR-LA Data
                </button>
              </div>

              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#38bdf8' }}>Clear Recorded-Video Telemetry</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    Deletes vehicle detections and persistent tracks sourced from recorded video streams.
                  </p>
                </div>
                <button onClick={() => handleClearData('Recorded-Video Telemetry', 'RECORDED_VIDEO')} className="gov-btn" style={{ marginTop: '1rem', background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}>
                  Clear Recorded-Video Telemetry
                </button>
              </div>

              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#38bdf8' }}>Clear Demo & Sample Violations</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    Deletes sample test violations (`TEST-*`) and initial demo traffic records.
                  </p>
                </div>
                <button onClick={() => handleClearData('Demo & Sample Records', 'DEMO')} className="gov-btn" style={{ marginTop: '1rem', background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}>
                  Clear Demo Data
                </button>
              </div>

              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#10b981' }}>Rebuild Analytics Engine</h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    Reindexes time series metrics and re-aggregates peak flow counts for prediction models.
                  </p>
                </div>
                <button onClick={handleRebuildAnalytics} className="gov-btn" style={{ marginTop: '1rem', background: '#10b98120', border: '1px solid #10b981', color: '#10b981', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}>
                  Rebuild Analytics
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmDialog.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', border: '1px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', marginBottom: '1rem' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{confirmDialog.title}</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDialog({ open: false, title: '', message: '', action: null })} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => { confirmDialog.action(); setConfirmDialog({ open: false, title: '', message: '', action: null }); }} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}>
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER MODAL */}
      {showUserModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem' }}>Create New User Account</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Username" required value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="email" placeholder="Email" required value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="password" placeholder="Password" required value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <select value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}>
                {['ADMIN', 'TRAFFIC_OFFICER', 'CONTROL_ROOM_OPERATOR', 'ANALYST', 'VIEWER'].map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowUserModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '4px' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '700' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RULE MODAL */}
      {showRuleModal && currentRule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem' }}>{currentRule.rule_id ? 'Edit Traffic Rule' : 'Add Traffic Rule'}</h3>
            <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Violation Type" required value={currentRule.violation_type} onChange={e=>setCurrentRule({...currentRule, violation_type: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <select value={currentRule.vehicle_type} onChange={e=>setCurrentRule({...currentRule, vehicle_type: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}>
                {['All', 'car', 'motorcycle', 'bus', 'truck'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Penalty Amount (₹)</label>
                <input type="number" required value={currentRule.penalty_amount} onChange={e=>setCurrentRule({...currentRule, penalty_amount: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Repeat Offence Amount (₹)</label>
                <input type="number" required value={currentRule.repeat_offence_amount} onChange={e=>setCurrentRule({...currentRule, repeat_offence_amount: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowRuleModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '4px' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '700' }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA MODAL */}
      {showCameraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem' }}>Camera Configuration</h3>
            <form onSubmit={handleSaveCamera} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Camera ID (e.g. CAM-101)" required value={currentCamera.camera_id} onChange={e=>setCurrentCamera({...currentCamera, camera_id: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="Intersection (e.g. junction_1)" required value={currentCamera.intersection} onChange={e=>setCurrentCamera({...currentCamera, intersection: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="Direction" required value={currentCamera.direction} onChange={e=>setCurrentCamera({...currentCamera, direction: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <select value={currentCamera.status} onChange={e=>setCurrentCamera({...currentCamera, status: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}>
                <option value="ONLINE">ONLINE</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="DEGRADED">DEGRADED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCameraModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '4px' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '700' }}>Save Camera</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERSECTION MODAL */}
      {showIntersectionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem' }}>Intersection Configuration</h3>
            <form onSubmit={handleSaveIntersection} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Intersection ID (e.g. junction_bhopal_1)" required value={currentIntersection.intersection_id} onChange={e=>setCurrentIntersection({...currentIntersection, intersection_id: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="Name (e.g. DB Mall Square)" required value={currentIntersection.name} onChange={e=>setCurrentIntersection({...currentIntersection, name: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="City (e.g. Bhopal, New Delhi, Mumbai)" required value={currentIntersection.city} onChange={e=>setCurrentIntersection({...currentIntersection, city: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="Location / Zone" required value={currentIntersection.location} onChange={e=>setCurrentIntersection({...currentIntersection, location: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="Full Address" required value={currentIntersection.full_address} onChange={e=>setCurrentIntersection({...currentIntersection, full_address: e.target.value})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input type="number" step="any" placeholder="Latitude (e.g. 23.2333)" required value={currentIntersection.latitude} onChange={e=>setCurrentIntersection({...currentIntersection, latitude: parseFloat(e.target.value)})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
                <input type="number" step="any" placeholder="Longitude (e.g. 77.4346)" required value={currentIntersection.longitude} onChange={e=>setCurrentIntersection({...currentIntersection, longitude: parseFloat(e.target.value)})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              </div>
              <input type="number" placeholder="Lanes" min="1" max="8" required value={currentIntersection.lanes} onChange={e=>setCurrentIntersection({...currentIntersection, lanes: parseInt(e.target.value)})} style={{ padding: '0.5rem', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowIntersectionModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '4px' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: '700' }}>Save Intersection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
