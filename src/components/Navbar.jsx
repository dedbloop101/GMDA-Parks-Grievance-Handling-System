import React from 'react';
import gmdaLogo from '../assets/gmda-logo.png'; 

// FIXED: Destructured 'theme' and 'toggleTheme' from incoming props
function Navbar({ citizenName, theme, toggleTheme, onMenuToggle, onProfileClick }) {
  
  const getInitials = (name) => {
    if (!name) return "CP";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="logo-section">
        <button className="hamburger-btn" onClick={onMenuToggle}>
          ☰
        </button>
        <img src={gmdaLogo} alt="GMDA Logo" className="logo-img" />
        <div>
          <h1 className="navbar-title">Parks Infrastructure Ecosystem</h1>
          <p className="navbar-subtitle">Citizen Portal</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        
        {/* NOW WORKING: Theme engine variables bound correctly */}
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className="citizen-profile-hub" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
          <div className="profile-badge-avatar">
            {getInitials(citizenName)}
          </div>
          <div className="profile-meta-details">
            <span className="profile-display-name">{citizenName}</span>
            <span className="profile-role-tag">Verified Citizen</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;