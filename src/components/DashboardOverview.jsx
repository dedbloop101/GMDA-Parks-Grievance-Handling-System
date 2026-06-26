import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function DashboardOverview({ data, parkData }) {
  if (!data || !data.kpis) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Syncing with GMDA Database...</div>;
  }

  const { kpis, complaints } = data;
  
  const totalParksCount = parkData && parkData.features ? parkData.features.length : 'Loading...';

  // NEW: Calculate Total Complaints and Status Distribution
  const totalComplaints = complaints.length;

  // NEW: Calculate Work In Progress count
  const wipComplaints = complaints.filter(c => c.status === 'Work in Progress').length;
  
  const statusData = [
    { name: 'Resolved', value: complaints.filter(c => c.status === 'Resolved').length, color: '#15803d' }, // Green
    { name: 'Work in Progress', value: complaints.filter(c => c.status === 'Work in Progress').length, color: '#b45309' }, // Amber
    { name: 'Unresolved', value: complaints.filter(c => c.status === 'Unresolved').length, color: '#b91c1c' } // Red
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
          <p>Active Complaints</p>
          <h3 style={{ color: '#b91c1c' }}>{kpis.pendingGrievances}</h3>
        </div>
        <div className="kpi-card">
          <p>Work in Progress</p>
          <h3 style={{ color: '#b45309' }}>{wipComplaints}</h3>
        </div>
      </div>

      {/* MID SECTION: CHART & QUICK STATS */}
      {statusData.length > 0 && (
        <div className="table-container" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0' }}>Complaint Resolution Status</h3>
            {/* 🔥 NEW: Total indicator next to the chart title */}
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', backgroundColor: 'var(--bg-body)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-slate)' }}>
              Total: {totalComplaints}
            </span>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((entry, index) => (
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
              <th>Log ID</th>
              <th>Park Landmark</th>
              <th>Sector Name</th>
              <th>Park Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Remarks</th>
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
                  
                  {/* Status Badge */}
                  <td>
                    <span className="badge" style={{ 
                      backgroundColor: item.status === 'Resolved' ? '#15803d20' : item.status === 'Work in Progress' ? '#b4530920' : '#b91c1c20',
                      color: item.status === 'Resolved' ? '#15803d' : item.status === 'Work in Progress' ? '#b45309' : '#b91c1c',
                      border: `1px solid ${item.status === 'Resolved' ? '#15803d' : item.status === 'Work in Progress' ? '#b45309' : '#b91c1c'}`
                    }}>
                      {item.status}
                    </span>
                  </td>
                  
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