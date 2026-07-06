import gmdaLogo from '../assets/gmda-logo.png';

function Navbar({ citizenName, theme, userRole, toggleTheme, onMenuToggle, onProfileClick, onLogout }) {
  return (
    <header className="navbar">
      <div className="logo-section">
        <button className="hamburger-btn" onClick={onMenuToggle}>
          ☰
        </button>
        <img src={gmdaLogo} alt="GMDA Logo" className="logo-img" />
        <div>
          <h1 className="navbar-title">Parks Grievance System</h1>
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
            {/* The Avatar Box: Still uses your real name to generate initials! */}
            {(citizenName || "User").split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
          </div>
        
          <div className="profile-meta-details">
            {/* The Text Block: Shows 'System Admin' or 'Citizen' based on role */}
            <span className="profile-display-name" style={{ textTransform: 'capitalize' }}>
              {userRole === 'admin' ? 'System Admin' : 'Citizen'}
            </span>
            
            {/* The Logout Button */}
            <span 
              className="profile-role-tag" 
              onClick={(e) => {
                e.stopPropagation(); 
                if(onLogout) onLogout();
              }}
              style={{ cursor: 'pointer' }}
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