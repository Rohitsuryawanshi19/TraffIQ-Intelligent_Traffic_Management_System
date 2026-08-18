import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Activity, Video, ShieldAlert, FileWarning, 
  Camera, Settings2, Ambulance, BarChart3, Map, BellRing, 
  Settings, FileText, ChevronLeft, ChevronRight, TrendingUp, LogOut, User, Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: null },
  { name: 'Control Room', path: '/control-room', icon: Radio, roles: ['ADMIN', 'CONTROL_ROOM_OPERATOR'] },
  { name: 'Live Traffic', path: '/live', icon: Activity, roles: null },
  { name: 'Vehicle Detection', path: '/detection', icon: Video, roles: null },
  { name: 'Violations & Enforcement', path: '/violations', icon: ShieldAlert, roles: ['ADMIN', 'TRAFFIC_OFFICER'] },
  { name: 'Fines & Challans', path: '/challans', icon: FileWarning, roles: ['ADMIN', 'TRAFFIC_OFFICER'] },
  { name: 'Signal Management', path: '/signals', icon: Settings2, roles: ['ADMIN', 'CONTROL_ROOM_OPERATOR'] },
  { name: 'Emergency Management', path: '/emergency', icon: Ambulance, roles: ['ADMIN', 'CONTROL_ROOM_OPERATOR'] },
  { name: 'Analytics & Reports', path: '/analytics', icon: BarChart3, roles: ['ADMIN', 'ANALYST', 'CONTROL_ROOM_OPERATOR'] },
  { name: 'Traffic Prediction', path: '/traffic-prediction', icon: TrendingUp, roles: ['ADMIN', 'ANALYST', 'CONTROL_ROOM_OPERATOR'] },
  { name: 'Camera Monitoring', path: '/cameras', icon: Camera, roles: ['ADMIN', 'CONTROL_ROOM_OPERATOR', 'TRAFFIC_OFFICER'] },
  { name: 'Intersections', path: '/intersections', icon: Map, roles: null },
  { name: 'Alerts & Incidents', path: '/alerts', icon: BellRing, roles: null },
  { name: 'Administration', path: '/admin', icon: Settings, roles: ['ADMIN'] },
  { name: 'Audit Logs', path: '/audit-logs', icon: FileText, roles: ['ADMIN'] },
];

const ROLE_COLORS = {
  ADMIN: '#ef4444',
  TRAFFIC_OFFICER: '#10b981',
  CONTROL_ROOM_OPERATOR: '#8b5cf6',
  ANALYST: '#f59e0b',
  VIEWER: '#64748b',
};

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const canSee = (item) => {
    if (!item.roles) return true;
    if (user?.role === 'ADMIN') return true;
    return item.roles.includes(user?.role);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ 
        padding: isCollapsed ? '0.75rem 0.5rem' : '0.5rem 0.75rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#000e26',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <img 
          src="/traffiq_logo.png" 
          alt="TRAFFIQ Logo" 
          style={{ 
            width: isCollapsed ? '36px' : '100%',
            height: isCollapsed ? '36px' : 'auto',
            maxHeight: isCollapsed ? '36px' : '85px',
            objectFit: isCollapsed ? 'cover' : 'contain', 
            objectPosition: isCollapsed ? 'left center' : 'center',
            display: 'block'
          }} 
        />
      </div>

      {/* User info */}
      {user && !isCollapsed && (
        <div style={{ margin: '0 0.75rem 0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', borderLeft: `3px solid ${ROLE_COLORS[user.role] || '#64748b'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={14} color="#94a3b8" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>{user.username}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: ROLE_COLORS[user.role] || '#64748b', fontWeight: '700', marginTop: '0.2rem' }}>
            {user.role?.replace(/_/g, ' ')}
          </div>
        </div>
      )}
      
      <nav className="sidebar-menu">
        {NAV_ITEMS.filter(canSee).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.name : ''}
          >
            <item.icon size={20} />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer: logout + collapse */}
      <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.75rem', borderRadius: '6px', border: 'none',
            background: 'transparent', color: '#ef4444', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: '600', width: '100%', textAlign: 'left'
          }}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
        <div className="sidebar-footer" onClick={toggleSidebar}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isCollapsed && <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Collapse</span>}
        </div>
      </div>
    </aside>
  );
}
