import React, { useState, useEffect } from 'react';

function AdminDashboard() {
  const [adminData, setAdminData] = useState({ kpis: {}, complaints: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all complaints unconditionally 
  const fetchMasterData = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/complaints', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setAdminData({ kpis: data.kpis, complaints: data.complaints });
      }
    } catch (error) {
      console.error("Failed to fetch master data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const handleStatusChange = async (complaintId, newStatus) => {
    // Optional: Ask the admin for a note to send back to the citizen
    let adminNotes = '';
    if (newStatus === 'Work in Progress') {
      adminNotes = window.prompt("Add a note for the citizen (e.g., 'Contractor dispatched'):") || '';
    } else if (newStatus === 'Resolved') {
      adminNotes = window.prompt("Add resolution details (e.g., 'Bench replaced on June 25th'):") || '';
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/complaints/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: complaintId, status: newStatus, adminNotes: adminNotes })
      });

      if (response.ok) {
        // Re-fetch the data to instantly update the UI table
        fetchMasterData();
      } else {
        alert("Failed to update status in the database.");
      }
    } catch (error) {
      console.error("Critical error updating complaint:", error);
    }
  };

  if (isLoading) return <div style={{ padding: '20px' }}>Loading Master Database...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* GOD-MODE KPI GRID */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderTop: '4px solid #b91c1c' }}>
          <p>Total Active Complaints</p>
          <h3 style={{ color: '#b91c1c' }}>{adminData.kpis.pendingGrievances}</h3>
        </div>
        <div className="kpi-card" style={{ borderTop: '4px solid #15803d' }}>
          <p>Total Resolved</p>
          <h3 style={{ color: '#15803d' }}>{adminData.kpis.resolvedIssues}</h3>
        </div>
        <div className="kpi-card">
          <p>Active Field Staff</p>
          <h3>{adminData.kpis.activeFieldStaff}</h3>
        </div>
      </div>

      {/* MASTER DATA TABLE */}
      <div className="table-container">
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-admin)' }}>
          Master Grievance Control Panel
        </h3>
        
        <table className="data-table">
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Sector / Park</th>
              <th>Issue Logged</th>
              <th>Priority</th>
              <th>Admin Action</th>
            </tr>
          </thead>
          <tbody>
            {adminData.complaints.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>System Clear. No grievances found.</td></tr>
            ) : (
              adminData.complaints.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.id}</td>
                  <td>
                    <strong>{item.parkName}</strong><br/>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.sector}</span>
                  </td>
                  <td>
                    {item.issue}<br/>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Note: {item.remarks || 'None'}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.priority.toLowerCase()}`}>{item.priority}</span>
                  </td>
                  <td>
                    {/* 🔥 THE GOD-MODE DROPDOWN */}
                    <select 
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-slate)',
                        backgroundColor: item.status === 'Resolved' ? '#15803d20' : item.status === 'Work in Progress' ? '#b4530920' : '#b91c1c20',
                        color: item.status === 'Resolved' ? '#15803d' : item.status === 'Work in Progress' ? '#b45309' : '#b91c1c',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Unresolved">Unresolved</option>
                      <option value="Work in Progress">Work in Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
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

export default AdminDashboard;