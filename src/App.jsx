import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import MapComponent from './components/MapComponent';
import gmdaLogo from './assets/gmda-logo.png'; 
import AdminDashboard from './components/AdminDashboard';

function App() {
  
  // 🔥 NEW: SESSION PERSISTENCE (STEP 1)
  // Instead of defaulting to false/empty, we first check localStorage.
  // This prevents the user from being kicked out when they refresh the page.

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [citizenName, setCitizenName] = useState(() => localStorage.getItem('citizenName') || 'Chirag Panwar'); 
  const [mobileInput, setMobileInput] = useState(() => localStorage.getItem('userMobile') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || 'citizen');

  const [authMode, setAuthMode] = useState('login'); 
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState(''); 
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [theme, setTheme] = useState('light');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('Broken Gym Equipment');
  const [subCategory, setSubCategory] = useState(''); 
  const [remarks, setRemarks] = useState(''); 
  const [parkNameInput, setParkNameInput] = useState('');
  const [sectorIdInput, setSectorIdInput] = useState('');

  const [isFormFloating, setIsFormFloating] = useState(true);
  const [formPos, setFormPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });

  const [parkData, setParkData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  // 🔥 NEW: MASTER LOGOUT FUNCTION (STEP 2)
  // This securely wipes the state AND destroys the browser's saved session.

  const handleSecureLogout = () => {
    setIsLoggedIn(false);
    setMobileInput('');
    setPassword('');
    setUserRole('citizen');
    setActiveTab('overview');
    
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('citizenName');
    localStorage.removeItem('userMobile');
    localStorage.removeItem('userRole'); // 🔥 FIXED: Actually wipes the role now
  };

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const checkPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { label: '', color: 'transparent', width: '0%' };
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { label: 'Weak', color: '#b91c1c', width: '33%' };
    if (score === 3 || score === 4) return { label: 'Medium', color: '#b45309', width: '66%' };
    if (score >= 5) return { label: 'Strong', color: '#15803d', width: '100%' };
  };

  const strength = checkPasswordStrength(regPassword);
  const newPassStrength = checkPasswordStrength(newPassword);

  // Initial GeoJSON Load
  useEffect(() => {
    fetch('/gurugram_parks.geojson')
      .then(res => res.json())
      .then(data => setParkData(data))
      .catch(err => console.error("Failed to load GeoJSON:", err));
  }, []);

  const fetchLiveDashboardData = async () => {
    try {
      // NEW: Pass the citizenName as a query parameter to the backend
      const response = await fetch(`http://127.0.0.1:8000/api/complaints?citizenName=${encodeURIComponent(citizenName)}`, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setDashboardData({ kpis: data.kpis, complaints: data.complaints });
      }
    } catch (error) {
      console.error("Failed to sync dashboard:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === 'overview') {
      fetchLiveDashboardData();
    }
  }, [isLoggedIn, activeTab]);

  const handlePointerDown = (e) => {
    if (!isFormFloating) return; 
    setIsDragging(true);
    dragRef.current = { startX: e.clientX - formPos.x, startY: e.clientY - formPos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setFormPos({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (mobileInput.trim() === '' || password.trim() === '') return;
    
    if (mobileInput.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileInput, password: password })
      });
      const data = await response.json();

      if (response.ok) {
        setCitizenName(data.user.fullName); 
        setIsLoggedIn(true);
        setUserRole(data.user.role);
        setActiveTab('overview');

        // 🔥 NEW: BROWSER SAVE (STEP 3a)
        // Commits the successful login tokens to the browser's hard drive
      
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('citizenName', data.user.fullName);
        localStorage.setItem('userMobile', data.user.mobile);
        localStorage.setItem('userRole', data.user.role);
      
      } else {
        alert(`Login Failed: ${data.message}`);
      }
    } catch (error) {
      alert("Failed to connect to the server. Have you registered?");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (regMobile.length !== 10) return alert("Registration Failed: Mobile number must be exactly 10 digits.");
    if (regPassword.length < 8) return alert("Registration Failed: Password must be at least 8 characters long.");
    if (/\d{4}/.test(regPassword)) return alert("Registration Failed: Password cannot contain more than 3 consecutive numbers.");

    try {
      const response = await fetch('http://127.0.0.1:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: regName, mobile: regMobile, password: regPassword })
      });
      const data = await response.json();

      if (response.ok) {
        setCitizenName(regName);
        setMobileInput(regMobile);
        setIsLoggedIn(true);
        setActiveTab('overview');

        // 🔥 NEW: BROWSER SAVE (STEP 3b)
        // Commits the newly registered user tokens to the browser's hard drive
      
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('citizenName', regName);
        localStorage.setItem('userMobile', regMobile);

        setRegName(''); setRegMobile(''); setRegPassword('');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert("Failed to connect to the server. Is Flask running?");
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenName: citizenName,
          parkName: parkNameInput,
          sectorId: sectorIdInput,
          category: selectedCategory,
          subCategory: subCategory,
          remarks: remarks
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedCategory('Broken Gym Equipment'); 
        setSubCategory(''); 
        setParkNameInput('');
        setSectorIdInput('');
        setRemarks('');
        
        fetchLiveDashboardData();
        setActiveTab('overview'); 
      } else {
        window.alert(`Error Logging Complaint: ${data.message}`);
      }
    } catch (error) {
      window.alert("Critical Failure: Could not connect to the GMDA servers.");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) return window.alert("Security Policy: New passwords do not match.");
    if (newPassword.length < 8) return window.alert("Security Policy: New password must be at least 8 characters long.");
    if (/\d{4}/.test(newPassword)) return window.alert("Security Policy: New password cannot contain more than 3 consecutive numbers.");

    try {
      const response = await fetch('http://127.0.0.1:8000/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileInput, oldPassword: oldPassword, newPassword: newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        window.alert("Success: Security credentials updated successfully.");
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        window.alert(`Verification Error: ${data.message}`);
      }
    } catch (error) {
      window.alert("Critical Failure: Could not connect to the GMDA servers.");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-gate-body">
        <div className="portal-container">
          <div className="left-action-panel">
            <div className="gmda-branding-hub">
            {/* Groups the Logo and Heading together horizontally */}
            <div className="branding-header-row">
              <img src={gmdaLogo} alt="GMDA" />
              <h1 className="system-headline">Parks Grievance Handling System</h1>
            </div>
              <p className="system-tagline">One Stop Solution for Your Park Related Concerns</p>
            </div>
            <div className="quick-nav-links">
              <button className="nav-anchor-btn" onClick={() => setAuthMode('register')}>Account Setup</button>
              <button className="nav-anchor-btn" onClick={() => alert('Please Sign In first to register a complaint!')}>Register Complaints </button>
            </div>
          </div>
          <div className="right-auth-panel">
            {authMode === 'login' ? (
              <div className="form-stage-box">
                <form onSubmit={handleLoginSubmit}>
                  <div className="stage-title-another"> Sign-In</div>
                  <div className="input-wrapper">
                    <input 
                      id="loginMobile" name="loginMobile" type="tel" maxLength="10" className="input-field" 
                      placeholder="10-Digit Mobile Number" value={mobileInput} 
                      onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, ''))} required 
                    />
                  </div>
                  <div className="input-wrapper">
                    <input id="loginPassword" name="loginPassword" type="password" className="input-field" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="submit-portal-btn">Sign In</button>
                </form>
              </div>
            ) : (
              <div className="form-stage-box">
                <div className="stage-title">Account Registration</div>
                <div className="input-wrapper">
                  <p><i>All fields are Mandatory*</i></p>
                </div>
                <form onSubmit={handleRegisterSubmit}>
                  <div className="input-wrapper">
                    <input id="regName" name="regName" type="text" className="input-field" placeholder="Full Name*" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  </div>
                  <div className="input-wrapper">
                    <input 
                      id="regMobile" name="regMobile" type="tel" maxLength="10" className="input-field" 
                      placeholder="10-Digit Mobile Number*" value={regMobile} 
                      onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))} required 
                    />
                  </div>
                  <div className="input-wrapper" style={{ marginBottom: regPassword ? '8px' : '16px' }}>
                    <input 
                      id="regPassword" name="regPassword" type="password" className="input-field" placeholder="Create Password*" value={regPassword} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/\d{4}/.test(val)) setRegPassword(val);
                        else window.alert("Security Policy: Passwords cannot contain more than 3 consecutive numbers.");
                      }} required 
                    />
                  </div>
                  
                  {regPassword && (
                    <div style={{ marginBottom: '16px', padding: '0 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: strength.color }}>
                        <span style={{ color: 'var(--text-muted)' }}>Password Strength</span>
                        <span>{strength.label}</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'var(--border-slate)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: strength.width, backgroundColor: strength.color, transition: 'all 0.3s' }}></div>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="submit-portal-btn">Sign Up</button>

                  <div style={{ textAlign: 'center', marginTop: '15px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Already registered? </span>
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('login')}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--color-admin)', 
                        fontWeight: 'bold', 
                        fontSize: '13px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Sign In here
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme}`}>
      <Navbar 
        citizenName={citizenName} 
        theme={theme}
        toggleTheme={toggleTheme}
        onMenuToggle={() => setMobileMenuOpen(!isMobileMenuOpen)} 
        onProfileClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
        
        // NEW: INJECT LOGOUT (STEP 4a)
        // Passes the secure logout function to the Top Navbar
        onLogout={handleSecureLogout} 
      />
      <div className="workspace">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }} 
          isMobileOpen={isMobileMenuOpen} 
          onMobileClose={() => setMobileMenuOpen(false)}
          
          // NEW: INJECT LOGOUT (STEP 4b)
          // Passes the secure logout function to the Mobile Sidebar
          onLogout={handleSecureLogout} 
        />
        <main className="main-stage">
          <div className="stage-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', textTransform: 'capitalize', color: 'var(--text-main)' }}>{activeTab} Panel</h2>
              </div>
            </div>
          </div>

          {activeTab === 'overview' && (
             userRole === 'admin' 
               ? <AdminDashboard /> 
               : <DashboardOverview data={dashboardData} parkData={parkData} />
          )}
          
          {activeTab === 'Complaint' && (
            <div className={`complaint-portal-layout ${!isFormFloating ? 'docked' : ''}`}>
              
             <div 
                className={`complaint-form-container ${isFormFloating ? 'floating' : 'docked'}`}
                style={{
                  position: isFormFloating ? 'fixed' : 'relative',
                  top: isFormFloating ? '115px' : 'auto',  
                  left: isFormFloating ? '220px' : 'auto', 
                  transform: isFormFloating ? `translate3d(${formPos.x}px, ${formPos.y}px, 0)` : 'none',
                  transition: (isDragging && isFormFloating) ? 'none' : undefined,
                  zIndex: 9999 
                }}
              >
                
                <div 
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid var(--border-slate)',
                    cursor: isFormFloating ? (isDragging ? 'grabbing' : 'grab') : 'default'
                  }}
                >
                  <h3 style={{ color: 'var(--text-main)', margin: 0, pointerEvents: 'none' }}>Submit Complaint</h3>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      type="button" 
                      className="layout-toggle-btn" 
                      onPointerDown={(e) => e.stopPropagation()} 
                      onClick={() => { setIsFormFloating(!isFormFloating); setFormPos({ x: 0, y: 0 }); }}
                    >
                      {isFormFloating ? 'Dock' : 'Float'}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleComplaintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                   <div className="form-group">
                    <label htmlFor="sectorIdInput">Sector Number*</label>
                    <input id="sectorIdInput" name="sectorId" type="text" className="form-input" value={sectorIdInput} onChange={(e) => setSectorIdInput(e.target.value)} placeholder="e.g., Sector 29" required />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="parkNameInput">Park Name*</label>
                    <input id="parkNameInput" name="parkName" type="text" className="form-input" value={parkNameInput} onChange={(e) => setParkNameInput(e.target.value)} placeholder="e.g., Leisure Valley Park" required />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="categorySelect">Complaint Category*</label>
                    <select id="categorySelect" name="category" className="form-select" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSubCategory(''); }}>
                      <option value="Broken Gym Equipment">Gym Equipment Related</option>
                      <option value="Streetlights Not Working">Streetlights Related</option>
                      <option value="Damaged Benches">Park Benches Related</option>
                      <option value="Play Area Issues">Park Play Area Related</option>
                      <option value="Waterlogging">Waterlogging</option>
                      <option value="Garbage Accumulation">Garbage Accumulation</option>
                      <option value="Walking Track Issues">Walking Track Related</option>
                      <option value="Overgrown Vegetation">Vegetation/Terrain Related</option>
                      <option value="Public Amenities">Public Amenities Related</option>
                      <option value="Stray Animal Danger">Animal Related</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {selectedCategory === 'Broken Gym Equipment' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Gym Equipment Related Complaint Type*</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="No Gym Equipment">No Gym Equipment</option>
                        <option value="Damaged/Non-functional">Damaged/Non-functional</option>
                        <option value="Missing Parts">Missing Parts</option> 
                      </select>
                    </div>
                  )}
                   {selectedCategory === 'Damaged Benches' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Park Benches Related Complaint Type</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="No Benches">No Benches</option>
                        <option value="Damaged/Non-functional">Damaged/Non-functional</option>
                        <option value="Graffiti/Vandalism">Graffiti/Vandalism on the benches</option>
                      </select>
                    </div>
                  )}
                   {selectedCategory === 'Streetlights Not Working' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Streetlight Related Complaint Type*</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="No Street Light">No Street Light</option>
                        <option value="Dark spot">Dark spot</option>
                        <option value="Fused Bulb">Fused Bulb</option>
                      </select>
                    </div>
                  )}
                  {selectedCategory === 'Play Area Issues' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Park Play Area Related Complaint Type*</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="No Play Equipment">No Play Equipment</option>
                        <option value="Damaged/Non-functional">Damaged/Non-functional</option>
                        <option value="Safety Hazards">Safety Hazards (e.g. sharp edges, broken parts)</option>
                      </select>
                    </div>
                  )}

                  {selectedCategory === 'Walking Track Issues' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Walking Track Related Complaint Type*</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="Broken Tiles/Pavers">Broken Tiles/Pavers</option>
                        <option value="Potholes/Uneven Surface">Potholes/Uneven Surface</option>
                        <option value="Slippery Area">Slippery Area (Moss/Mud)</option>
                      </select>
                    </div>
                  )}

                  {selectedCategory === 'Overgrown Vegetation' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Vegetation Related Complaint Type* </label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="Grass Needs Mowing">Grass Needs Mowing</option>
                        <option value="Dead/Fallen Branches">Dead/Fallen Branches</option>
                        <option value="Shrubs Need Pruning">Shrubs Need Pruning</option>
                      </select>
                    </div>
                  )}

                  {selectedCategory === 'Public Amenities' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Amenity Related Complaint Type*</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="Drinking Water Tap Broken">Drinking Water Tap Broken</option>
                        <option value="Public Toilet Locked/Unclean">Public Toilet Locked/Unclean</option>
                        <option value="Dustbins Missing/Full">Dustbins Missing/Full</option>
                      </select>
                    </div>
                  )}

                  {selectedCategory === 'Stray Animal Danger' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Animal Related Complaint Type*</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the complaint type --</option>
                        <option value="Aggressive Stray Dogs">Aggressive Stray Dogs</option>
                        <option value="Cattle Inside Park">Cattle Inside Park</option>
                        <option value="Dead Animal">Dead Animal</option> 
                      </select>
                    </div>
                  )}

                  {selectedCategory === 'Other' && (
                    <div className="form-group">
                      <label htmlFor="otherCommentsTextarea">Specify Issue Details*</label>
                      <textarea id="otherCommentsTextarea" name="otherComments" className="form-textarea" placeholder="Please specify the issue details..." rows="4" required />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="remarksInput">Remarks (Optional)</label>
                    <textarea id="remarksInput" name="remarks" className="form-textarea" placeholder="Add any specific location details or notes here..." rows="2" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  </div>

                  <button type="submit" className="submit-complaint-btn">Submit</button>
                </form>
              </div>

              {/* NEW: Clean Map Component Integration */}
              <div className="complaint-map-container" style={{ position: 'relative' }}>
                <MapComponent 
                  isActive={activeTab === 'Complaint'}
                  parkData={parkData}
                  searchParkName={parkNameInput}
                  searchSectorId={sectorIdInput}
                />
              </div>

            </div>
          )}

          {activeTab === 'Before And After Status' && <div className="view-placeholder"><h3>Before And After Status Coming Soon....</h3></div>}
          
          {activeTab === 'profile' && (
            <div className="profile-details-page" style={{ flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              
              <div className="profile-card-large">
                <div className="profile-card-header" style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '25px', 
                  textAlign: 'center',
                  paddingBottom: '20px' 
                }}>
                  
                  {/* 1. TOP: The Badge */}
                  <span className="badge verified" style={{ 
                    fontSize: '18px', 
                    padding: '6px 14px', 
                    fontWeight: '800', 
                    letterSpacing: '1px'
                  }}>
                    CITIZEN PROFILE
                  </span>

                  {/* 2. CENTER: The Avatar Logo */}
                  <div className="large-avatar" style={{ margin: '0' }}>
                    {(citizenName || "User").split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                  </div>
                  
                  {/* 3. BOTTOM: The Name */}
                  <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '28px' }}>
                    {citizenName}
                  </h3>
                </div>
                
                <div className="profile-card-body">
                  <div className="profile-info-row">
                    <span className="info-label">Full Name:</span>
                    <span className="info-value" style={{ color: 'var(--text-main)' }}>{citizenName}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Phone Number:</span>
                    <span className="info-value" style={{ color: 'var(--text-main)' }}>{mobileInput}</span>
                  </div>
                </div>
              </div>

              <div className="profile-card-large">
                <div className="profile-card-header" style={{ paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid var(--border-slate)' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '15px', textTransform: 'uppercase' }}>Update Security Settings</h3>
                </div>
                
                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div className="form-group">
                    <label htmlFor="oldPassword">Current Password</label>
                    <input id="oldPassword" type="password" className="form-input" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input 
                      id="newPassword" type="password" className="form-input" value={newPassword} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/\d{4}/.test(val)) setNewPassword(val);
                        else window.alert("Security Policy: Passwords cannot contain more than 3 consecutive numbers.");
                      }} 
                      placeholder="Create a new secure password" required 
                    />
                  </div>

                  {newPassword && (
                    <div style={{ padding: '0 4px', marginTop: '-8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: newPassStrength.color }}>
                        <span style={{ color: 'var(--text-muted)' }}>Strength</span>
                        <span>{newPassStrength.label}</span>
                      </div>
                      <div style={{ height: '3px', backgroundColor: 'var(--border-slate)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: newPassStrength.width, backgroundColor: newPassStrength.color, transition: 'all 0.3s' }}></div>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input id="confirmPassword" type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-type new password" required />
                  </div>

                  <button type="submit" className="submit-complaint-btn" style={{ marginTop: '5px' }}>Update Password</button>
                </form>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;