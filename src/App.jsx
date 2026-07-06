import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import MapComponent from './components/MapComponent';
import AdminMap from './components/AdminMap';
import gmdaLogo from './assets/gmda-logo.png'; 
import AdminDashboard from './components/AdminDashboard';
import BeforeAfterGallery from './components/BeforeAfterGallery';

function App() {
  //DYNAMIC IP:
  const API_BASE = `http://${window.location.hostname}:8000`;
  
  // SESSION PERSISTENCE
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('isLoggedIn') === 'true');
  const [citizenName, setCitizenName] = useState(() => sessionStorage.getItem('citizenName') || 'Chirag Panwar'); 
  const [mobileInput, setMobileInput] = useState(() => sessionStorage.getItem('userMobile') || '');
  const [userEmail, setUserEmail] = useState(() => sessionStorage.getItem('userEmail') || '');
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('userRole') || 'citizen');

  // AUTHENTICATION STATES
  const [authMode, setAuthMode] = useState('login'); 
  const [authMethod, setAuthMethod] = useState('mobile'); 
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Standard Mobile Auth States
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState(''); 
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Email OTP Auth States
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0); // 🔥 TIMER STATE

  const [theme, setTheme] = useState('light');

  // Password Change States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Complaint Form States
  const [selectedCategory, setSelectedCategory] = useState('Broken Gym Equipment');
  const [subCategory, setSubCategory] = useState(''); 
  const [remarks, setRemarks] = useState(''); 
  const [parkNameInput, setParkNameInput] = useState('');
  const [sectorIdInput, setSectorIdInput] = useState('');

  // Floating Form States
  const [isFormFloating, setIsFormFloating] = useState(true);
  const [formPos, setFormPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });

  const [parkData, setParkData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // MASTER LOGOUT FUNCTION
  const handleSecureLogout = () => {
    setIsLoggedIn(false);
    setMobileInput('');
    setUserEmail('');
    setPassword('');
    setEmailInput('');
    setOtpInput('');
    setIsOtpSent(false);
    setOtpTimer(0);
    setUserRole('citizen');
    setActiveTab('overview');
    
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('citizenName');
    sessionStorage.removeItem('userMobile');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole'); 
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

  useEffect(() => {
    fetch('/gurugram_parks.geojson')
      .then(res => res.json())
      .then(data => setParkData(data))
      .catch(err => console.error("Failed to load GeoJSON:", err));
  }, []);

  const fetchLiveDashboardData = async () => {
    try {
      const endpoint = userRole === 'admin' 
      ? `${API_BASE}/api/complaints` 
      : `${API_BASE}/api/complaints?citizenName=${encodeURIComponent(citizenName)}`;
       
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        
        const cleanedComplaints = data.complaints.map(complaint => {
          if (complaint.parkName && complaint.parkName.includes('Unregistered Location')) {
            return {
              ...complaint,
              parkName: complaint.parkName.replace('Unregistered Location', 'Map Location').replace('Lat:', 'Latitude:').replace('Lng:', 'Longitude:')
            };
          }
          return complaint;
        });

        setDashboardData({ kpis: data.kpis, complaints: cleanedComplaints });
      }
    } catch (error) {
      console.error("Failed to sync dashboard:", error);
    }
  };

  // OTP Countdown Logic
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  useEffect(() => {
    if (isLoggedIn && (activeTab === 'overview' || activeTab === 'Before And After Status')) {
      fetchLiveDashboardData();
    }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'Complaint' && userRole === 'admin') {
      fetchLiveDashboardData();
    }
  }, [isLoggedIn, activeTab, userRole]);

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
  
  const executeLogin = (user) => {
    setCitizenName(user.fullName); 
    setMobileInput(user.mobile || '');
    setUserEmail(user.email || '');
    setIsLoggedIn(true);
    setUserRole(user.role);
    setActiveTab('overview');

    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('citizenName', user.fullName);
    sessionStorage.setItem('userMobile', user.mobile || '');
    sessionStorage.setItem('userEmail', user.email || '');
    sessionStorage.setItem('userRole', user.role);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (mobileInput.trim() === '' || password.trim() === '') return;
    
    if (mobileInput.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileInput, password: password })
      });
      const data = await response.json();

      if (response.ok) {
        executeLogin(data.user);
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
      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: regName, mobile: regMobile, password: regPassword })
      });
      const data = await response.json();

      if (response.ok) {
        executeLogin(data.user);
        setRegName(''); setRegMobile(''); setRegPassword('');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert("Failed to connect to the server. Is Flask running?");
    }
  };

  const requestOtp = async () => {
    if (!emailInput.includes('@')) return alert("Enter a valid email address.");
    try {
      const response = await fetch(`${API_BASE}/api/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });
      if (response.ok) {
        setIsOtpSent(true);
        setOtpTimer(180); // 🔥 3 Minute Timer
      } else {
        alert("Failed to send OTP. Please check if the email is already registered or try again later.");
      }
    } catch (e) {
      alert("Server connection error.");
    }
  };

  const submitOtpLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/verify-login-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, otp: otpInput })
      });
      const data = await response.json();
      if (response.ok) {
        executeLogin(data.user);
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("Server error.");
    }
  };

  const submitOtpRegister = async (e) => {
    e.preventDefault();
    if (!regName) return alert("Please enter your Full Name.");
    
    try {
      const response = await fetch(`${API_BASE}/api/verify-register-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: regName, email: emailInput, otp: otpInput })
      });
      const data = await response.json();
      if (response.ok) {
        executeLogin(data.user);
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("Server error.");
    }
  };

 const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let finalImageUrl = null;

    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);

        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          body: formData 
        });
        
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) {
          finalImageUrl = uploadData.imageUrl;
        } else {
          window.alert("Image upload failed, submitting complaint without image.");
        }
      }

      const response = await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenName: citizenName,
          parkName: parkNameInput,
          sectorId: sectorIdInput,
          category: selectedCategory,
          subCategory: subCategory,
          remarks: remarks,
          beforeImageUrl: finalImageUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedCategory('Broken Gym Equipment'); 
        setSubCategory(''); 
        setParkNameInput('');
        setSectorIdInput('');
        setRemarks('');
        setSelectedImage(null);
        
        fetchLiveDashboardData();
        setActiveTab('overview'); 
      } else {
        window.alert(`Error Logging Complaint: ${data.message}`);
      }
    } catch (error) {
      window.alert("Critical Failure: Could not connect to the GMDA servers.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) return window.alert("Security Policy: New passwords do not match.");
    if (newPassword.length < 8) return window.alert("Security Policy: New password must be at least 8 characters long.");
    if (/\d{4}/.test(newPassword)) return window.alert("Security Policy: New password cannot contain more than 3 consecutive numbers.");

    try {
      const response = await fetch(`${API_BASE}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileInput, email: userEmail, oldPassword: oldPassword, newPassword: newPassword })
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

  const OrDivider = () => (
    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-slate)' }}></div>
      <span style={{ margin: '0 10px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>OR</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-slate)' }}></div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="auth-gate-body">
        <div className="portal-container">
          <div className="left-action-panel">
            <div className="gmda-branding-hub">
            <div className="branding-header-row">
              <img src={gmdaLogo} alt="GMDA" />
              <h1 className="system-headline">Parks Grievance Handling System</h1>
            </div>
              <p className="system-tagline">Report park issues quickly. Track your complaint every step of the way.</p>
            </div>
            <div className="quick-nav-links">
              <button className="nav-anchor-btn" onClick={() => { setAuthMode('register'); setIsOtpSent(false); }}>Create Account</button>
              <button className="nav-anchor-btn" onClick={() => alert('Please Sign In first to register a complaint!')}>Register Complaints </button>
            </div>
          </div>
          
          <div className="right-auth-panel">
            {authMode === 'login' ? (
              <div className="form-stage-box">
                <div className="stage-title-another">Sign-In</div>
                
                {authMethod === 'mobile' ? (
                  <>
                    <form onSubmit={handleLoginSubmit}>
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

                    <OrDivider />

                    <button 
                      type="button" 
                      className="submit-portal-btn" 
                      style={{ backgroundColor: 'transparent', border: '2px solid var(--color-admin)', color: 'var(--color-admin)' }} 
                      onClick={() => { setAuthMethod('email'); setIsOtpSent(false); setOtpInput(''); }}
                    >
                      Sign In with Email 
                    </button>
                  </>
                ) : (
                  <>
                    <form onSubmit={submitOtpLogin}>
                      <div className="input-wrapper">
                        <input type="email" className="input-field" placeholder="Email Address" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isOtpSent} required />
                      </div>
                      
                      {/* 🔥 LOGIN OTP WITH TIMER UI */}
                      {isOtpSent ? (
                        <>
                          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <span style={{ color: '#15803d', fontWeight: 'bold', fontSize: '13px' }}>
                              OTP has been sent to your email
                            </span>
                          </div>
                          <div className="input-wrapper">
                            <input type="text" maxLength="6" className="input-field" placeholder="Enter 6-Digit OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} required />
                          </div>
                          <button type="submit" className="submit-portal-btn" style={{ backgroundColor: '#15803d' }}>Verify & Sign In</button>
                          
                          <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            {otpTimer > 0 ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>
                                Resend OTP in {Math.floor(otpTimer / 60).toString().padStart(2, '0')}:{(otpTimer % 60).toString().padStart(2, '0')}
                              </span>
                            ) : (
                              <button 
                                type="button" 
                                onClick={requestOtp} 
                                style={{ background: 'none', border: 'none', color: 'var(--color-admin)', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <button type="button" className="submit-portal-btn" onClick={requestOtp}>Send OTP</button>
                      )}
                    </form>

                    <OrDivider />

                    <button 
                      type="button" 
                      className="submit-portal-btn" 
                      style={{ backgroundColor: 'transparent', border: '2px solid var(--color-admin)', color: 'var(--color-admin)' }} 
                      onClick={() => { setAuthMethod('mobile'); setIsOtpSent(false); setOtpInput(''); }}
                    >
                      Sign In with Mobile & Password
                    </button>
                  </>
                )}

              </div>
            ) : (
              <div className="form-stage-box">
                <div className="stage-title">Account Registration</div>
                <div className="input-wrapper">
                  <p><i>All fields are Mandatory*</i></p>
                </div>

                {authMethod === 'mobile' ? (
                  <>
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
                    </form>

                    <OrDivider />

                    <button 
                      type="button" 
                      className="submit-portal-btn" 
                      style={{ backgroundColor: 'transparent', border: '2px solid var(--color-admin)', color: 'var(--color-admin)' }} 
                      onClick={() => { setAuthMethod('email'); setIsOtpSent(false); setOtpInput(''); }}
                    >
                      Register with Email 
                    </button>
                  </>
                ) : (
                  <>
                    <form onSubmit={submitOtpRegister}>
                      <div className="input-wrapper">
                        <input type="text" className="input-field" placeholder="Full Name*" value={regName} onChange={(e) => setRegName(e.target.value)} disabled={isOtpSent} required />
                      </div>
                      <div className="input-wrapper">
                        <input type="email" className="input-field" placeholder="Email Address*" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={isOtpSent} required />
                      </div>
                      
                      {/* 🔥 REGISTER OTP WITH TIMER UI */}
                      {isOtpSent ? (
                        <>
                          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <span style={{ color: '#15803d', fontWeight: 'bold', fontSize: '13px' }}>
                              ✓ OTP has been sent to your email
                            </span>
                          </div>
                          <div className="input-wrapper">
                            <input type="text" maxLength="6" className="input-field" placeholder="Enter 6-Digit OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} required />
                          </div>
                          <button type="submit" className="submit-portal-btn" style={{ backgroundColor: '#15803d' }}>Verify & Register</button>

                          <div style={{ textAlign: 'center', marginTop: '15px' }}>
                            {otpTimer > 0 ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' }}>
                                Resend OTP in {Math.floor(otpTimer / 60).toString().padStart(2, '0')}:{(otpTimer % 60).toString().padStart(2, '0')}
                              </span>
                            ) : (
                              <button 
                                type="button" 
                                onClick={requestOtp} 
                                style={{ background: 'none', border: 'none', color: 'var(--color-admin)', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <button type="button" className="submit-portal-btn" onClick={requestOtp}>Send OTP</button>
                      )}
                    </form>

                    <OrDivider />

                    <button 
                      type="button" 
                      className="submit-portal-btn" 
                      style={{ backgroundColor: 'transparent', border: '2px solid var(--color-admin)', color: 'var(--color-admin)' }} 
                      onClick={() => { setAuthMethod('mobile'); setIsOtpSent(false); setOtpInput(''); }}
                    >
                      Register with Mobile & Password
                    </button>
                  </>
                )}

                <div style={{ textAlign: 'center', marginTop: '25px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Already registered? </span>
                  <button 
                    type="button" 
                    onClick={() => { setAuthMode('login'); setIsOtpSent(false); }}
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
        userRole={userRole}
        theme={theme}
        toggleTheme={toggleTheme}
        onMenuToggle={() => setMobileMenuOpen(!isMobileMenuOpen)} 
        onProfileClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
        onLogout={handleSecureLogout} 
      />
      <div className="workspace">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }} 
          isMobileOpen={isMobileMenuOpen} 
          onMobileClose={() => setMobileMenuOpen(false)}
          onLogout={handleSecureLogout} 
          userRole={userRole}
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
            userRole === 'admin' ? (
              <div style={{ height: 'calc(100vh - 100px)', width: '100%', backgroundColor: 'var(--bg-card)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-slate)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <AdminMap 
                  complaints={dashboardData?.complaints || []} 
                  parkData={parkData} 
                />
              </div>
            ) : (
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
                      <label htmlFor="sectorIdInput">Area (Your Locality)*</label>
                      <input 
                        id="sectorIdInput" name="sectorId" type="text" className="form-input" 
                        value={sectorIdInput} onChange={(e) => setSectorIdInput(e.target.value)} 
                        placeholder="e.g., Sector 29, Ashok Vihar" required 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="parkNameInput">Park Name*</label>
                      <input 
                        id="parkNameInput" name="parkName" type="text" className="form-input" 
                        value={parkNameInput} onChange={(e) => setParkNameInput(e.target.value)} 
                        placeholder="e.g., Leisure Valley Park" required 
                      />
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

                    <div className="form-group">
                      <label>Attach "Before" Photo (Optional)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label 
                          style={{
                            padding: '8px 16px', backgroundColor: 'var(--color-input)', border: '1px solid var(--border-slate)',
                            borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-main)',
                            display: 'flex', alignItems: 'center', gap: '8px'
                          }}
                        >
                          📸 Take Photo / Upload
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setSelectedImage(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        {selectedImage && <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>✓ Image Selected</span>}
                      </div>
                    </div>

                    <button type="submit" className="submit-complaint-btn">Submit</button>
                  </form>
                </div>

                <div className="complaint-map-container" style={{ position: 'relative' }}>
                  <MapComponent 
                    isActive={activeTab === 'Complaint'}
                    parkData={parkData}
                    searchParkName={parkNameInput}
                    searchSectorId={sectorIdInput}
                    onParkSelect={(selectedName) => setParkNameInput(selectedName)}
                    onSectorSelect={(selectedSector) => setSectorIdInput(selectedSector)}
                    onCustomPinSelect={(lat, lng) => {
                      setSectorIdInput('Map Location');
                      setParkNameInput(`Map Location [Latitude: ${lat.toFixed(4)}, Longitude: ${lng.toFixed(4)}]`);
                    }}
                  />
                </div>
              </div>
            )
          )}

          {activeTab === 'Before And After Status' && (
            <BeforeAfterGallery complaintsData={dashboardData?.complaints || []} />
          )}
          
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
                  <span className="badge verified" style={{ fontSize: '18px', padding: '6px 14px', fontWeight: '800', letterSpacing: '1px' }}>
                    CITIZEN PROFILE
                  </span>
                  <div className="large-avatar" style={{ margin: '0' }}>
                    {(citizenName || "User").split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                  </div>
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
                    <span className="info-label">Contact:</span>
                    <span className="info-value" style={{ color: 'var(--text-main)' }}>{mobileInput || userEmail || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {(mobileInput || userEmail) && (
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
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;