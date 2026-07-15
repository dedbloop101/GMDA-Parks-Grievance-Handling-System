import { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

function AdminDashboard() {
  const API_BASE = `http://${window.location.hostname}:8000`;

  const [adminData, setAdminData] = useState({ kpis: {}, complaints: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState(''); 

  // Modal & Upload States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('Work in Progress');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [afterImage, setAfterImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const cleanComplaintData = (complaints) => {
    return complaints.map(complaint => ({
      ...complaint,
      parkName: complaint.parkName 
        ? complaint.parkName
            .replace('Unregistered Location', 'Map Location')
            .replace('Lat:', 'Latitude:')
            .replace('Lng:', 'Longitude:')
        : complaint.parkName
    }));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/complaints`, { cache: 'no-store' });
        if (response.ok && !cancelled) {
          const data = await response.json();
          setAdminData({ kpis: data.kpis, complaints: cleanComplaintData(data.complaints) });
        }
      } catch (error) {
        console.error("Failed to fetch master data:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/complaints`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setAdminData({ kpis: data.kpis, complaints: cleanComplaintData(data.complaints) });
      }
    } catch (error) {
      console.error("Failed to fetch master data:", error);
    }
  };

  const openManageModal = (complaint) => {
    setSelectedComplaint(complaint);
    setUpdateStatus(complaint.status);
    setResolutionRemarks(complaint.remarks || '');
    setAfterImage(null);
    setIsModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let finalImageUrl = null;

    try {
      if (afterImage) {
        const formData = new FormData();
        formData.append('image', afterImage);
        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) finalImageUrl = uploadData.imageUrl;
        else window.alert("Image upload failed, updating status without image.");
      }

      // JWT SECURE API CALL
      const response = await fetch(`${API_BASE}/api/complaints/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('jwtToken')}` 
        },
        body: JSON.stringify({ 
          id: selectedComplaint.id, 
          status: updateStatus, 
          adminNotes: resolutionRemarks,
          afterImageUrl: finalImageUrl
        })
      });

      if (response.ok) {
        fetchMasterData();
        setIsModalOpen(false);
      } else {
        alert("Failed to update status in the database.");
      }
    } catch (error) {
      console.error("Critical error updating complaint:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // SEARCH LOGIC
  const filteredItems = adminData.complaints.filter(
    item => 
      (item.parkName && item.parkName.toLowerCase().includes(filterText.toLowerCase())) ||
      (item.sector && item.sector.toLowerCase().includes(filterText.toLowerCase())) ||
      (item.id && item.id.toString().includes(filterText))
  );

  // DATA PROCESSING FOR CHARTS
  const statusCounts = adminData.complaints.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = [
    { name: 'Resolved', value: statusCounts['Resolved'] || 0, color: '#15803d' },
    { name: 'Work in Progress', value: statusCounts['Work in Progress'] || 0, color: '#b45309' },
    { name: 'Unresolved', value: statusCounts['Unresolved'] || 0, color: '#b91c1c' }
  ].filter(d => d.value > 0);

  const categoryCounts = adminData.complaints.reduce((acc, curr) => {
    const mainCategory = curr.issue ? curr.issue.split(':')[0] : 'Other';
    acc[mainCategory] = (acc[mainCategory] || 0) + 1;
    return acc;
  }, {});

  const categoryData = Object.keys(categoryCounts).map(key => ({
    name: key,
    Complaints: categoryCounts[key]
  })).sort((a, b) => b.Complaints - a.Complaints).slice(0, 5); // Top 5 Categories

  // CUSTOM COLORS FOR BAR CHART
  const BAR_COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6'];

  const columns = [
    {
      name: 'Log ID',
      selector: row => row.id,
      sortable: true,
      width: '90px',
      cell: row => <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{row.id}</span>
    },
    {
      name: 'Sector / Park',
      selector: row => row.parkName,
      sortable: true,
      wrap: true,
      cell: row => (
        <div>
          <strong>{row.parkName}</strong><br/>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.sector}</span>
        </div>
      )
    },
    {
      name: 'Issue Logged',
      selector: row => row.issue,
      wrap: true,
      cell: row => (
        <div>
          {row.issue}<br/>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Note: {row.remarks || 'None'}</span>
        </div>
      )
    },
    {
      name: 'Priority',
      selector: row => row.priority,
      sortable: true,
      width: '120px',
      cell: row => <span className={`badge ${row.priority?.toLowerCase() || 'medium'}`}>{row.priority || 'Medium'}</span>
    },
    {
      name: 'Attachments',
      center: true,
      width: '120px',
      cell: row => (
        row.beforeImageUrl ? (
          <div 
            onClick={() => window.open(row.beforeImageUrl, '_blank')}
            style={{ display: 'inline-block', cursor: 'pointer', border: '1px solid var(--border-slate)', borderRadius: '6px', overflow: 'hidden', width: '45px', height: '45px', backgroundColor: 'var(--bg-body)' }}
            title="Click to view full image"
          >
            <img src={row.beforeImageUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No attachments</span>
        )
      )
    },
    {
      name: 'Admin Action',
      center: true,
      width: '120px',
      cell: row => (
        <button 
          onClick={() => openManageModal(row)}
          style={{ 
            padding: '6px 12px', 
            backgroundColor: row.status === 'Resolved' ? '#15803d' : 'var(--color-admin)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer', 
            fontWeight: 'bold', 
            fontSize: '12px',
            width: '100%'
          }}
        >
          {row.status === 'Resolved' ? 'Review' : 'Manage'}
        </button>
      )
    }
  ];

  const customStyles = {
    headRow: { style: { backgroundColor: 'var(--bg-body)', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', borderBottom: '1px solid var(--border-slate)' } },
    rows: { style: { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '13px', borderBottom: '1px solid var(--border-slate)', '&:hover': { backgroundColor: 'var(--bg-body)' } } },
    pagination: { style: { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderTop: '1px solid var(--border-slate)' } },
  };

  if (isLoading) return <div style={{ padding: '20px' }}>Loading Master Database...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', position: 'relative' }}>
      
      {/* STRETCHED 3-BOX KPI GRID */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', width: '100%' }}>
        <div className="kpi-card" style={{ borderTop: '4px solid #b91c1c', padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>TOTAL ACTIVE COMPLAINTS</p>
          <h3 style={{ margin: 0, fontSize: '28px', color: '#b91c1c' }}>{adminData.kpis.pendingGrievances}</h3>
        </div>
        
        <div className="kpi-card" style={{ borderTop: '4px solid #15803d', padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>TOTAL RESOLVED</p>
          <h3 style={{ margin: 0, fontSize: '28px', color: '#15803d' }}>{adminData.kpis.resolvedIssues}</h3>
        </div>
        
        <div className="kpi-card" style={{ borderTop: '4px solid #2563eb', padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>ACTIVE FIELD STAFF</p>
          <h3 style={{ margin: 0, fontSize: '28px', color: '#2563eb' }}>{adminData.kpis.activeFieldStaff}</h3>
        </div>
      </div>

      {/* NEW: ANALYTICS CHARTS SECTION */}
      {adminData.complaints.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
          
          {/* Chart 1: Status Pie Chart */}
          <div className="table-container" style={{ display: 'flex', flexDirection: 'column', height: '350px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px', color: 'var(--text-main)' }}>System Resolution Status</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" stroke="none">
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-slate)', backgroundColor: 'var(--bg-card)' }} itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* FIXED & OPTIMIZED BAR CHART WITH RELIABLE CUSTOM LEGEND */}
          <div className="table-container" style={{ display: 'flex', flexDirection: 'column', height: 'auto', minHeight: '400px', padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px', color: 'var(--text-main)' }}>Top Problem Areas (Categories)</h3>
            
            {/* HIGHLY LEGIBLE CUSTOM HTML LEGEND (No Recharts Bug) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'flex-start', marginBottom: '20px', padding: '0 10px' }}>
              {categoryData.map((entry, index) => {
                const CORPORATE_COLORS = ['#1e293b', '#16a34a', '#d97706', '#dc2626', '#4b5563'];
                return (
                  <div key={`custom-legend-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500', color: 'var(--text-main)' }}>
                    <span style={{ width: '12px', height: '12px', backgroundColor: CORPORATE_COLORS[index % 5], borderRadius: '3px', display: 'inline-block' }}></span>
                    <span>{entry.name}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-slate)" vertical={false} />
                  
                  {/* ADDED X-AXIS PADDING SO TEXT DOES NOT CLIP */}
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }} 
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    padding={{ left: 30, right: 30 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  
                  <RechartsTooltip 
                    cursor={false} 
                    contentStyle={{ borderRadius: '4px', border: '1px solid var(--border-slate)', backgroundColor: '#ffffff', color: '#000000', fontSize: '13px' }} 
                  />
                  
                  <Bar dataKey="Complaints" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {categoryData.map((entry, index) => {
                      const CORPORATE_COLORS = ['#1e293b', '#16a34a', '#d97706', '#dc2626', '#4b5563'];
                      return <Cell key={`cell-${index}`} fill={CORPORATE_COLORS[index % 5]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* DATA TABLE */}
      <div className="table-container" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-slate)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-admin)', margin: 0 }}>
            Master Grievance Control Panel
          </h3>
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
          noDataComponent={<div style={{ padding: '30px', color: 'var(--text-muted)' }}>System Clear. No grievances found.</div>}
        />
      </div>

      {/* MANAGE COMPLAINT MODAL */}
      {isModalOpen && selectedComplaint && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '500px', border: '1px solid var(--border-slate)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-slate)', paddingBottom: '10px' }}>
              Resolve Complaint #{selectedComplaint.id}
            </h3>
            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>Update Status</label>
                <select className="form-select" value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                  <option value="Unresolved">Unresolved (New)</option>
                  <option value="Work in Progress">Work in Progress</option>
                  <option value="Resolved">Resolved (Closed)</option>
                </select>
              </div>
              {updateStatus === 'Resolved' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>Upload "After" Photo Proof</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ padding: '8px 16px', backgroundColor: 'var(--color-input)', border: '1px solid var(--border-slate)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📸 Take Photo / Upload
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => setAfterImage(e.target.files[0])} />
                    </label>
                    {afterImage && <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>✓ Ready</span>}
                  </div>
                </div>
              )}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>Official Admin Notes</label>
                <textarea className="form-textarea" rows="3" placeholder="e.g., Contractor dispatched / Bench replaced..." value={resolutionRemarks} onChange={(e) => setResolutionRemarks(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" disabled={isUploading} style={{ flex: 1, padding: '10px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                  {isUploading ? 'Uploading & Saving...' : 'Save Updates'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border-slate)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;