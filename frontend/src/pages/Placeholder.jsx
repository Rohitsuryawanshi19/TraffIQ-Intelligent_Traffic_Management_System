import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export default function Placeholder({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="header-title">
          <div>
            <h1>{title}</h1>
            <p>Module Status: Not Configured</p>
          </div>
        </div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '360px', color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
        <SlidersHorizontal size={42} style={{ marginBottom: '1rem', color: '#475569' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>{title} Module</h2>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b', maxWidth: '420px' }}>
          This operational feature is currently disabled or not configured in system settings. Contact system administrator for module activation.
        </p>
      </div>
    </div>
  );
}
