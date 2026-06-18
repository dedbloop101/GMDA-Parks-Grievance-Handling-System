import React from 'react';
import { mockParksData } from '../data/mockParks';

function DashboardOverview() {
  const { kpiSummary, recentComplaints } = mockParksData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      <div className="kpi-grid">
        <div className="kpi-card">
          <p>Total GMDA Parks</p>
          <h3 style={{ color: '#60a5fa' }}>{kpiSummary.totalParks}</h3>
        </div>
        <div className="kpi-card">
          <p>Active Grievances</p>
          <h3 style={{ color: '#f87171' }}>{kpiSummary.pendingGrievances}</h3>
        </div>
        <div className="kpi-card">
          <p>Resolved Operations</p>
          <h3 style={{ color: '#34d399' }}>{kpiSummary.resolvedIssues}</h3>
        </div>
        <div className="kpi-card">
          <p>Dispatched Field Staff</p>
          <h3 style={{ color: '#a78bfa' }}>{kpiSummary.activeFieldStaff}</h3>
        </div>
      </div>

      <div className="table-container">
        <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Recent Park Infrastructure Logs</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Park Landmark</th>
              <th>Sector ID</th>
              <th>Infrastructure Issue</th>
              <th>Priority</th>
              <th>Operation Status</th>
            </tr>
          </thead>
          <tbody>
            {recentComplaints.map((item) => (
              <tr key={item.id}>
                <td style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{item.id}</td>
                <td><strong>{item.parkName}</strong></td>
                <td>{item.sector}</td>
                <td style={{ color: 'var(--text-muted)' }}>{item.issue}</td>
                <td><span className={`badge ${item.priority.toLowerCase()}`}>{item.priority}</span></td>
                <td><span className={`badge ${item.status.replace(/\s+/g, '').toLowerCase()}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default DashboardOverview;