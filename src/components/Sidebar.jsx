
function Sidebar({ activeTab, onTabChange, isMobileOpen, onMobileClose, onLogout, userRole }) {
  return (
    <>
      {isMobileOpen && <div className="sidebar-overlay" onClick={onMobileClose}></div>}
      
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="nav-group">
          <h3 className="sidebar-group-title">Navigation</h3>
          <div className="nav-links">
            <button 
              onClick={() => onTabChange('overview')}
              className={`nav-item ${activeTab === 'overview' ? 'active-tab' : ''}`}
            >
              <span style={{ marginRight: '8px' }}>📊</span> Overview 
            </button>
            <button 
              onClick={() => onTabChange('Complaint')}
              className={`nav-item ${activeTab === 'Complaint' ? 'active-tab' : ''
                
              }`}
            >
              <span style={{ marginRight: '8px' }}>📝</span> {userRole === 'admin' ? 'City-Wide Map' : 'File Park Complaint'}
            </button>
            <button 
              onClick={() => onTabChange('Before And After Status')}
              className={`nav-item ${activeTab === 'Before And After Status' ? 'active-tab' : ''}`}
            >
              <span style={{ marginRight: '8px' }}>📍</span> Before And After Status
            </button>
          </div>
        </div>

        {/* NEW: Secure Logout Button globally anchored to the bottom */}
        <div className="nav-group mobile-only-logout" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-slate)', paddingTop: '15px' }}>
           <button 
              onClick={onLogout}
              className="nav-item"
              style={{ color: 'var(--color-critical)', fontWeight: '700' }}
            >
              <span style={{ marginRight: '8px' }}>🚪</span> Secure Logout
            </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;