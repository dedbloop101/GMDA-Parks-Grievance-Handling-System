import React from 'react';

function Sidebar({ activeTab, onTabChange, isMobileOpen, onMobileClose }) {
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
              <span>📊</span> Overview Dashboard
            </button>
            <button 
              onClick={() => onTabChange('grievance')}
              className={`nav-item ${activeTab === 'grievance' ? 'active-tab' : ''}`}
            >
              <span>📝</span> File Park Complaint
            </button>
            <button 
              onClick={() => onTabChange('tracking')}
              className={`nav-item ${activeTab === 'tracking' ? 'active-tab' : ''}`}
            >
              <span>📍</span> Before And After Status
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;