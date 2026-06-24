import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function DashboardOverview({ data, parkData }) {
  if (!data || !data.kpis) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Syncing with GMDA Database...</div>;
  }

  const { kpis, complaints } = data;
  
  // DYNAMIC TOTAL PARKS: Count the features inside the GeoJSON file
  const totalParksCount = parkData && parkData.features ? parkData.features.length : 'Loading...';

  // DYNAMIC CHART DATA: Calculate priority distribution from live complaints
  const activeComplaints = complaints.filter(c => c.status !== 'Resolved');
  
  const priorityData = [
    { name: 'High Priority', value: activeComplaints.filter(c => c.priority === 'High').length, color: '#b91c1c' },
    { name: 'Medium Priority', value: activeComplaints.filter(c => c.priority === 'Medium').length, color: '#b45309' },
    { name: 'Low Priority', value: activeComplaints.filter(c => c.priority === 'Low').length, color: '#15803d' }
  ].filter(item => item.value > 0); // Only show slices that actually have data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* KPI GRID */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <p>Total Parks Under GMDA</p>
          <h3 style={{ color: 'var(--color-admin)' }}>{totalParksCount}</h3>
        </div>
        <div className="kpi-card">
          <p>Operations Resolved </p>
          <h3 style={{ color: '#15803d' }}>{kpis.resolvedIssues}</h3>
        </div>
        <div className="kpi-card">
          <p>Unresolved Complaints</p>
          <h3 style={{ color: '#b91c1c' }}>{kpis.pendingGrievances}</h3>
        </div>
        <div className="kpi-card">
          <p>Work in Progress</p>
          <h3 style={{ color: 'var(--text-main)' }}>{kpis.activeFieldStaff}</h3>
        </div>
      </div>

      {/* MID SECTION: CHART & QUICK STATS */}
      {priorityData.length > 0 && (
        <div className="table-container" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0' }}>Active Complaint Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-slate)', backgroundColor: 'var(--bg-card)' }}
                itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* DATA TABLE */}
      <div className="table-container">
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>Recent Park Complaint Logs</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Park ID</th>
              <th>Park Landmark</th>
              <th>Sector Name</th>
              <th>Park Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Remarks from the citizen</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No active grievances in the system.
                </td>
              </tr>
            ) : (
              complaints.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace' }}>{item.id}</td>
                  <td><strong>{item.parkName}</strong></td>
                  <td>{item.sector}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.issue}</td>
                  <td><span className={`badge ${item.priority.toLowerCase()}`}>{item.priority}</span></td>
                  <td><span className={`badge ${item.status.replace(/\s+/g, '').toLowerCase()}`}>{item.status}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.remarks ? item.remarks : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default DashboardOverview;