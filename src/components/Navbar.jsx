import gmdaLogo from '../assets/gmda-logo.png';

function Navbar({ citizenName, theme, toggleTheme, onMenuToggle, onProfileClick, onLogout }) {
  return (
    <header className="navbar">
      <div className="logo-section">
        <button className="hamburger-btn" onClick={onMenuToggle}>
          ☰
        </button>
        <img src={gmdaLogo} alt="GMDA Logo" className="logo-img" />
        <div>
          <h1 className="navbar-title">Parks Grievance Ecosystem</h1>
          <p className="navbar-subtitle">Citizen Portal</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        
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
          {(citizenName || "User").split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
        </div>
        
        <div className="profile-meta-details">
          <span className="profile-display-name">{citizenName}</span>
          <span 
            className="profile-role-tag" 
            onClick={(e) => {
              e.stopPropagation(); 
              if(onLogout) onLogout();
            }}
          >
            LOGOUT
          </span>
        </div>
      </div>
      </div>
    </header>
  );
}

export default Navbar;