import { useState, useEffect } from 'react';

function AdminDashboard() {
  // 🔥 DYNAMIC IP FIX: Yahan bhi API_BASE use hoga
  const API_BASE = `http://${window.location.hostname}:8000`;

  const [adminData, setAdminData] = useState({ kpis: {}, complaints: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Upload States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('Work in Progress');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [afterImage, setAfterImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // 🔥 CLEANUP LOGIC: Data format sahi karne wala function
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

      const response = await fetch(`${API_BASE}/api/complaints/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  if (isLoading) return <div style={{ padding: '20px' }}>Loading Master Database...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', position: 'relative' }}>
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
                    <span className={`badge ${item.priority?.toLowerCase() || 'medium'}`}>{item.priority || 'Medium'}</span>
                  </td>
                  <td>
                    <button 
                      onClick={() => openManageModal(item)}
                      style={{ 
                        padding: '6px 12px', 
                        backgroundColor: item.status === 'Resolved' ? '#15803d' : 'var(--color-admin)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold', 
                        fontSize: '12px' 
                      }}
                    >
                      {item.status === 'Resolved' ? 'Review' : 'Manage'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                      📷 Take Photo / Upload
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