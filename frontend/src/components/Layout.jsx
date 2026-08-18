import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout({ isLive, darkMode, onToggleTheme }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobileSidebar = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileSidebar = () => setMobileMenuOpen(false);

  return (
    <div className="app-layout">
      
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={closeMobileSidebar}></div>
      )}

      {/* Sidebar Navigation */}
      <div className={`sidebar-wrapper ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <Header 
          isLive={isLive} 
          darkMode={darkMode} 
          onToggleTheme={onToggleTheme} 
          onToggleMobileSidebar={toggleMobileSidebar}
        />
        <div className="page-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
