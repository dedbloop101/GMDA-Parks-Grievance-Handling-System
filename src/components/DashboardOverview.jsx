import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DataTable from 'react-data-table-component';

function DashboardOverview({ data, parkData }) {
  const [filterText, setFilterText] = useState('');

  if (!data || !data.kpis) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Syncing with GMDA Database...</div>;
  }

  const { kpis, complaints } = data;
  const totalParksCount = parkData && parkData.features ? parkData.features.length : 'Loading...';
  const totalComplaints = complaints.length;
  const wipComplaints = complaints.filter(c => c.status === 'Work in Progress').length;
  
  const statusData = [
    { name: 'Resolved', value: complaints.filter(c => c.status === 'Resolved').length, color: '#15803d' }, 
    { name: 'Work in Progress', value: wipComplaints, color: '#b45309' }, 
    { name: 'Unresolved', value: complaints.filter(c => c.status === 'Unresolved').length, color: '#b91c1c' } 
  ].filter(item => item.value > 0); 

  // 🔥 BULLETPROOF SEARCH LOGIC
  const filteredItems = complaints.filter(item => {
    const search = filterText.toLowerCase();
    const parkMatch = (item.parkName?.toLowerCase() || '').includes(search);
    const sectorMatch = (item.sector?.toLowerCase() || '').includes(search);
    const idMatch = (item.id?.toString() || '').includes(search);
    return parkMatch || sectorMatch || idMatch;
  });

  const columns = [
    { name: 'Park ID', selector: row => row.id, sortable: true, width: '80px', cell: row => <span style={{ fontFamily: 'monospace' }}>{row.id}</span> },
    { name: 'Park Landmark', selector: row => row.parkName, sortable: true, wrap: true, cell: row => <strong>{row.parkName}</strong> },
    { name: 'Sector Name', selector: row => row.sector, sortable: true, width: '120px' },
    { name: 'Park Issue', selector: row => row.issue, wrap: true, cell: row => <span style={{ color: 'var(--text-muted)' }}>{row.issue}</span> },
    { name: 'Priority', selector: row => row.priority, sortable: true, width: '100px', cell: row => <span className={`badge ${row.priority?.toLowerCase() || 'medium'}`}>{row.priority || 'Medium'}</span> },
    { 
      name: 'Status', 
      selector: row => row.status, 
      sortable: true, 
      width: '140px',
      cell: row => (
        <span className="badge" style={{ 
          backgroundColor: row.status === 'Resolved' ? '#15803d20' : row.status === 'Work in Progress' ? '#b4530920' : '#b91c1c20',
          color: row.status === 'Resolved' ? '#15803d' : row.status === 'Work in Progress' ? '#b45309' : '#b91c1c',
          border: `1px solid ${row.status === 'Resolved' ? '#15803d' : row.status === 'Work in Progress' ? '#b45309' : '#b91c1c'}`
        }}>
          {row.status}
        </span>
      ) 
    },
    { 
      name: 'Attachments', 
      center: true, 
      width: '110px',
      cell: row => (
        row.beforeImageUrl ? (
          <div onClick={() => window.open(row.beforeImageUrl, '_blank')} style={{ display: 'inline-block', cursor: 'pointer', border: '1px solid var(--border-slate)', borderRadius: '6px', overflow: 'hidden', width: '45px', height: '45px', backgroundColor: 'var(--bg-body)' }} title="Click to view full image">
            <img src={row.beforeImageUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No attachments</span>
        )
      ) 
    },
    { name: 'Remarks', selector: row => row.remarks, wrap: true, cell: row => <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.remarks || '-'}</span> }
  ];

  const customStyles = {
    headRow: { style: { backgroundColor: 'var(--bg-body)', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', borderBottom: '1px solid var(--border-slate)' } },
    rows: { style: { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '13px', borderBottom: '1px solid var(--border-slate)', '&:hover': { backgroundColor: 'var(--bg-body)' } } },
    pagination: { style: { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderTop: '1px solid var(--border-slate)' } },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      <div className="kpi-grid">
        <div className="kpi-card"><p>Total Parks Under GMDA</p><h3 style={{ color: 'var(--color-admin)' }}>{totalParksCount}</h3></div>
        <div className="kpi-card"><p>Operations Resolved </p><h3 style={{ color: '#15803d' }}>{kpis.resolvedIssues}</h3></div>
        <div className="kpi-card"><p>Active Complaints</p><h3 style={{ color: '#b91c1c' }}>{kpis.pendingGrievances}</h3></div>
        <div className="kpi-card"><p>Work in Progress</p><h3 style={{ color: '#b45309' }}>{wipComplaints}</h3></div>
      </div>

      {statusData.length > 0 && (
        <div className="table-container" style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0' }}>Complaint Resolution Status</h3>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', backgroundColor: 'var(--bg-body)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-slate)' }}>Total: {totalComplaints}</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" stroke="none">
                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-slate)', backgroundColor: 'var(--bg-card)' }} itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="table-container" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-slate)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Recent Park Complaint Logs</h3>
          <input 
            type="text" 
            placeholder="Search by ID, Sector, or Park..." 
            value={filterText} 
            onChange={(e) => setFilterText(e.target.value)} 
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-slate)', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', width: '250px', fontSize: '13px' }}
          />
        </div>
        
        <DataTable
          columns={columns}
          data={filteredItems}
          pagination
          paginationPerPage={10}
          highlightOnHover
          customStyles={customStyles}
          noDataComponent={<div style={{ padding: '30px', color: 'var(--text-muted)' }}>No active grievances in the system.</div>}
        />
      </div>

    </div>
  );
}

export default DashboardOverview;