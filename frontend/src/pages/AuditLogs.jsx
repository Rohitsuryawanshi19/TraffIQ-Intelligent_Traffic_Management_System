import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Filter, RefreshCw, Download, Shield, User, Clock, ChevronDown, X } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const MODULE_COLORS = {
  SIGNAL:    '#3b82f6',
  VIOLATION: '#f59e0b',
  CHALLAN:   '#8b5cf6',
  CAMERA:    '#0ea5e9',
  USER:      '#10b981',
  RULE:      '#f97316',
  EMERGENCY: '#ef4444',
  SYSTEM:    '#64748b',
};

const ACTION_COLORS = {
  CREATED:     '#10b981',
  UPDATED:     '#3b82f6',
  DELETED:     '#ef4444',
  APPROVED:    '#10b981',
  REJECTED:    '#ef4444',
  OVERRIDE:    '#f97316',
  ROLE_CHANGE: '#8b5cf6',
  LOGIN:       '#64748b',
};

const ROLES = ['ADMIN', 'TRAFFIC_OFFICER', 'CONTROL_ROOM_OPERATOR', 'ANALYST', 'VIEWER', 'SYSTEM'];
const MODULES = ['SIGNAL', 'VIOLATION', 'CHALLAN', 'CAMERA', 'USER', 'RULE', 'EMERGENCY', 'SYSTEM'];
const ACTIONS = ['CREATED', 'UPDATED', 'DELETED', 'APPROVED', 'REJECTED', 'OVERRIDE', 'ROLE_CHANGE', 'LOGIN'];

function Badge({ label, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px',
      fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.05em',
      background: color ? `${color}22` : '#1e293b', color: color || '#94a3b8',
      border: `1px solid ${color ? color + '44' : '#334155'}`
    }}>
      {label}
    </span>
  );
}

function DetailModal({ log, onClose }) {
  if (!log) return null;
  const rows = [
    ['Audit ID', log.audit_id],
    ['User', log.username],
    ['Role', log.role],
    ['Action', log.action],
    ['Module', log.module],
    ['Entity', log.entity],
    ['Entity ID', log.entity_id],
    ['Timestamp', log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'],
    ['Details', log.details],
    ['Previous Value', log.prev_value],
    ['New Value', log.new_value],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={18} color="#3b82f6" /> Audit Record
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map(([label, val]) => val && (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
              <span style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    username: '', role: '', module: '', action: '', entity: '', entity_id: '',
    date_from: '', date_to: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v));
      const res = await axios.get(`${API_BASE_URL}/audit-logs`, { params });
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const clearFilters = () => setFilters({
    username: '', role: '', module: '', action: '', entity: '', entity_id: '',
    date_from: '', date_to: '',
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const exportCSV = () => {
    const headers = ['Audit ID', 'User', 'Role', 'Action', 'Module', 'Entity', 'Entity ID', 'Timestamp', 'Prev Value', 'New Value', 'Details'];
    const rows = logs.map(l => [
      l.audit_id, l.username, l.role, l.action, l.module, l.entity, l.entity_id || '',
      l.timestamp ? new Date(l.timestamp).toISOString() : '',
      l.prev_value || '', l.new_value || '', l.details || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit_logs_${Date.now()}.csv`; a.click();
  };

  const inputStyle = {
    background: '#0f172a', color: '#fff', border: '1px solid #334155',
    padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', width: '100%'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="header-title">
          <div className="gov-emblem-badge" style={{ background: '#475569' }}><FileText size={24} color="#fff" /></div>
          <div>
            <h1>Audit Logs</h1>
            <p>Immutable system event trail — view only (ADMIN)</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: activeFilterCount ? 'rgba(59,130,246,0.15)' : '#1e293b', border: `1px solid ${activeFilterCount ? '#3b82f6' : '#334155'}`, borderRadius: '6px', color: activeFilterCount ? '#60a5fa' : '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
          >
            <Filter size={16} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`} <ChevronDown size={14} />
          </button>
          <button onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(71,85,105,0.2)', border: '1px solid #334155', borderLeft: '3px solid #3b82f6', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Shield size={16} color="#3b82f6" />
        Audit records are <strong style={{ color: '#fff' }}>append-only</strong>. No modification or deletion is permitted through the system interface.
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>User</label>
              <input style={inputStyle} placeholder="username" value={filters.username} onChange={e => setFilters(f => ({...f, username: e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Role</label>
              <select style={inputStyle} value={filters.role} onChange={e => setFilters(f => ({...f, role: e.target.value}))}>
                <option value="">All Roles</option>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Module</label>
              <select style={inputStyle} value={filters.module} onChange={e => setFilters(f => ({...f, module: e.target.value}))}>
                <option value="">All Modules</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Action</label>
              <select style={inputStyle} value={filters.action} onChange={e => setFilters(f => ({...f, action: e.target.value}))}>
                <option value="">All Actions</option>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Entity</label>
              <input style={inputStyle} placeholder="entity name" value={filters.entity} onChange={e => setFilters(f => ({...f, entity: e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Entity ID</label>
              <input style={inputStyle} placeholder="e.g. VIO-001" value={filters.entity_id} onChange={e => setFilters(f => ({...f, entity_id: e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Date From</label>
              <input type="date" style={inputStyle} value={filters.date_from} onChange={e => setFilters(f => ({...f, date_from: e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Date To</label>
              <input type="date" style={inputStyle} value={filters.date_to} onChange={e => setFilters(f => ({...f, date_to: e.target.value}))} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>
              <X size={14} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Total Records', value: logs.length, color: '#3b82f6' },
          { label: 'Unique Users', value: new Set(logs.map(l => l.username)).size, color: '#10b981' },
          { label: 'Modules', value: new Set(logs.map(l => l.module)).size, color: '#8b5cf6' },
          { label: 'Today', value: logs.filter(l => l.timestamp && new Date(l.timestamp).toDateString() === new Date().toDateString()).length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--gov-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.25rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--gov-text-muted)', textTransform: 'uppercase' }}>
            {loading ? 'Loading...' : `${logs.length} records`}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Click row for details</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155' }}>
                {['Audit ID', 'User', 'Role', 'Action', 'Module', 'Entity', 'Entity ID', 'Timestamp'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    {loading ? 'Loading audit records...' : 'No audit records found.'}
                  </td>
                </tr>
              )}
              {logs.map(log => (
                <tr
                  key={log.id}
                  onClick={() => setSelected(log)}
                  style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>{log.audit_id || `#${log.id}`}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={12} color="#64748b" />{log.username || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge label={log.role?.replace(/_/g,' ') || '—'} color="#64748b" />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge label={log.action || '—'} color={ACTION_COLORS[log.action]} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge label={log.module || '—'} color={MODULE_COLORS[log.module]} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#e2e8f0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.entity || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.entity_id || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={12} />
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
