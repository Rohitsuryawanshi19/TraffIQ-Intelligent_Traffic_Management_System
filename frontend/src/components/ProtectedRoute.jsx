import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldOff } from 'lucide-react';

/**
 * Wraps any route element.
 * - Not logged in → redirect /login
 * - Logged in but wrong role → 403 message
 * - OK → render children
 */
export default function ProtectedRoute({ children, requiredRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const allowed = user?.role === 'ADMIN' || requiredRoles.includes(user?.role);
    if (!allowed) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: '#94a3b8'
        }}>
          <ShieldOff size={48} color="#ef4444" />
          <h2 style={{ color: '#ef4444', margin: 0 }}>Access Denied</h2>
          <p style={{ margin: 0, textAlign: 'center' }}>
            Your role <strong style={{ color: '#fff' }}>{user?.role}</strong> does not have permission to view this page.
          </p>
          <p style={{ fontSize: '0.8rem', margin: 0 }}>Required: {requiredRoles.join(' / ')}</p>
        </div>
      );
    }
  }

  return children;
}
