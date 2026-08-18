import React, { useState, useEffect } from 'react';
import { Sun, Moon, Bell, User, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROUTE_NAMES = {
  '/': 'Dashboard',
  '/control-room': 'Control Room',
  '/live': 'Live Traffic',
  '/detection': 'Vehicle Detection',
  '/violations': 'Violations & Enforcement',
  '/challans': 'Fines & Challans',
  '/cameras': 'Camera Monitoring',
  '/signals': 'Signal Management',
  '/emergency': 'Emergency Management',
  '/analytics': 'Analytics & Reports',
  '/traffic-prediction': 'Traffic Prediction',
  '/intersections': 'Intersections',
  '/alerts': 'Alerts & Incidents',
  '/admin': 'Administration',
  '/audit-logs': 'Audit Logs'
};

export default function Header({ isLive = true, darkMode = false, onToggleTheme, onToggleMobileSidebar }) {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const location = useLocation();
  const currentPage = ROUTE_NAMES[location.pathname] || 'Dashboard';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="gov-topbar">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onToggleMobileSidebar}>
          <Menu size={18} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="app-title">TRAFFIQ Control Node</span>
          <span className="page-subtitle">{currentPage}</span>
        </div>
      </div>
      
      <div className="header-right">
        <div className="header-status desktop-only">
          <div className="status-indicator"></div>
          {isLive ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
        </div>
        <div className="desktop-only" style={{ background: 'rgba(0, 229, 255, 0.1)', border: '1px solid #00e5ff', color: '#00e5ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
          LIVE SIMULATION
        </div>
        
        <div className="header-time desktop-only">
          {time.toLocaleDateString()} {time.toLocaleTimeString()}
        </div>

        <button className="icon-btn">
          <Bell size={16} />
        </button>

        <button 
          className="icon-btn"
          onClick={onToggleTheme}
          title="Toggle Light/Dark Theme"
        >
          {darkMode ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} />}
        </button>

        <div className="user-profile">
          <User size={16} />
          <span className="desktop-only">{user?.username || 'System User'}</span>
        </div>
      </div>
    </div>
  );
}
