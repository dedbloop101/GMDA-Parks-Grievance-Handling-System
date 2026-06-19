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
              <span>📊</span> Overview 
            </button>
            <button 
              onClick={() => onTabChange('Complaint')}
              className={`nav-item ${activeTab === 'Complaint' ? 'active-tab' : ''}`}
            >
              <span>📝</span> File Park Complaint
            </button>
            <button 
              onClick={() => onTabChange('Before And After Status')}
              className={`nav-item ${activeTab === 'Before And After Status' ? 'active-tab' : ''}`}
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