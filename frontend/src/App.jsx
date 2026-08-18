import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Administration from './pages/Administration';
import VehicleDetection from './pages/VehicleDetection';
import Violations from './pages/Violations';
import Challans from './pages/Challans';
import Cameras from './pages/Cameras';
import Emergency from './pages/Emergency';
import Analytics from './pages/Analytics';
import TrafficPrediction from './pages/TrafficPrediction';
import Intersections from './pages/Intersections';
import Alerts from './pages/Alerts';
import AuditLogs from './pages/AuditLogs';
import ControlRoom from './pages/ControlRoom';
import Signals from './pages/Signals';
import LiveTraffic from './pages/LiveTraffic';
import Placeholder from './pages/Placeholder';
import { getSignalStatus, getTrafficHistory, getAnalyticsSummary, overrideSignal } from './services/api';

// All roles that are considered "any authenticated"
const ALL = ['ADMIN', 'TRAFFIC_OFFICER', 'CONTROL_ROOM_OPERATOR', 'ANALYST', 'VIEWER'];
const ENFORCEMENT = ['ADMIN', 'TRAFFIC_OFFICER'];
const OPS = ['ADMIN', 'CONTROL_ROOM_OPERATOR'];
const ANALYTICS_ROLES = ['ADMIN', 'ANALYST', 'CONTROL_ROOM_OPERATOR'];

function AppRoutes() {
  const [signal, setSignal] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const { isAuthenticated } = useAuth();

  const toggleTheme = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.body.setAttribute('data-theme', nextMode ? 'dark' : 'light');
  };

  const fetchDashboardData = async () => {
    if (!isAuthenticated) return;
    try {
      const [sigRes, histRes, statsRes] = await Promise.allSettled([
        getSignalStatus('junction_1'),
        getTrafficHistory('junction_1', 30),
        getAnalyticsSummary('junction_1')
      ]);
      if (sigRes.status === 'fulfilled' && sigRes.value) setSignal(sigRes.value);
      if (histRes.status === 'fulfilled' && Array.isArray(histRes.value)) setHistory(histRes.value);
      if (statsRes.status === 'fulfilled' && statsRes.value) setAnalytics(statsRes.value);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleEmergencyOverride = async (targetLane) => {
    try {
      const updatedSignal = await overrideSignal(targetLane, 'junction_1');
      setSignal(updatedSignal);
      await fetchDashboardData();
    } catch (err) {
      console.error('Override failed:', err);
    }
  };

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected shell */}
      <Route path="/" element={
        <ProtectedRoute requiredRoles={ALL}>
          <Layout isLive={history.length > 0} darkMode={darkMode} onToggleTheme={toggleTheme} />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard signal={signal} history={history} analytics={analytics} fetchDashboardData={fetchDashboardData} />} />
        <Route path="live" element={<LiveTraffic />} />
        <Route path="control-room" element={
          <ProtectedRoute requiredRoles={OPS}>
            <ControlRoom />
          </ProtectedRoute>
        } />
        <Route path="detection" element={<VehicleDetection />} />

        <Route path="violations" element={
          <ProtectedRoute requiredRoles={ENFORCEMENT}>
            <Violations />
          </ProtectedRoute>
        } />
        <Route path="challans" element={
          <ProtectedRoute requiredRoles={ENFORCEMENT}>
            <Challans />
          </ProtectedRoute>
        } />
        <Route path="cameras" element={
          <ProtectedRoute requiredRoles={[...OPS, 'TRAFFIC_OFFICER']}>
            <Cameras />
          </ProtectedRoute>
        } />
        <Route path="signals" element={
          <ProtectedRoute requiredRoles={OPS}>
            <Signals />
          </ProtectedRoute>
        } />
        <Route path="emergency" element={
          <ProtectedRoute requiredRoles={OPS}>
            <Emergency />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute requiredRoles={ANALYTICS_ROLES}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="traffic-prediction" element={
          <ProtectedRoute requiredRoles={ANALYTICS_ROLES}>
            <TrafficPrediction />
          </ProtectedRoute>
        } />
        <Route path="intersections" element={<Intersections />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="admin" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Administration onOverride={handleEmergencyOverride} />
          </ProtectedRoute>
        } />
        <Route path="audit" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <Administration onOverride={handleEmergencyOverride} />
          </ProtectedRoute>
        } />
        <Route path="audit-logs" element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <AuditLogs />
          </ProtectedRoute>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
