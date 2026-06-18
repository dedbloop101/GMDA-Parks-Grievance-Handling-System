import React, { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import gmdaLogo from './assets/gmda-logo.png'; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Authentication states
  const [mobileInput, setMobileInput] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState(''); 
  const [citizenName, setCitizenName] = useState('Chirag Panwar'); 

  // Theme State
  const [theme, setTheme] = useState('light');
  const [newPassword, setNewPassword] = useState('');

  // Form State Tracking
  const [selectedCategory, setSelectedCategory] = useState('Broken Gym Equipment');
  const [subCategory, setSubCategory] = useState(''); 
  
  // AUTO-PAN SEARCH STATES
  const [parkNameInput, setParkNameInput] = useState('');
  const [sectorIdInput, setSectorIdInput] = useState('');

  // Layout & Drag State
  const [isFormFloating, setIsFormFloating] = useState(true);
  const [formPos, setFormPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });

  // Custom Measurement Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [measureDistance, setMeasureDistance] = useState(0);
  const [measureArea, setMeasureArea] = useState(0); 

  // OFFICIAL GEOJSON STATE
  const [parkData, setParkData] = useState(null);

  // DOM & Logic Refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const isMeasuringRef = useRef(false);
  const measureGroupRef = useRef(null);
  const measureLineRef = useRef(null);
  const measurePolygonRef = useRef(null); 
  const searchMarkerRef = useRef(null);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // FETCH THE GEOJSON ON LOAD
  useEffect(() => {
    // Fetches the raw file straight from the public folder asynchronously
    fetch('/gurugram_parks.geojson')
      .then(res => res.json())
      .then(data => {
        console.log(`✅ Loaded ${data.features.length} parks from GeoJSON`);
        setParkData(data);
      })
      .catch(err => console.error("Failed to load GeoJSON:", err));
  }, []);

  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
    if (mapInstanceRef.current && mapInstanceRef.current._container) {
      mapInstanceRef.current._container.style.cursor = isMeasuring ? 'crosshair' : '';
    }
  }, [isMeasuring]);

  const resetMeasurement = () => {
    setMeasurePoints([]);
    setMeasureDistance(0);
    setMeasureArea(0);
    if (measureGroupRef.current && measureLineRef.current && measurePolygonRef.current) {
      measureGroupRef.current.clearLayers();
      measurePolygonRef.current = window.L.polygon([], { 
        color: '#1d4ed8', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 
      }).addTo(measureGroupRef.current);
      measureLineRef.current = window.L.polyline([], { 
        color: '#1d4ed8', weight: 4, dashArray: '6, 8' 
      }).addTo(measureGroupRef.current);
    }
  };

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

  // GIS MAP INSTANCE CONTROLLER
  useEffect(() => {
    if (activeTab === 'grievance' && isLoggedIn && window.L && mapRef.current) {
      if (mapInstanceRef.current) return;

      try {
        const mapInstance = window.L.map(mapRef.current).setView([28.4595, 77.0266], 12);
        mapInstanceRef.current = mapInstance;

        const osm = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
        const topo = window.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
        const satellite = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

        window.L.control.layers({ 
          "Street Map": osm, 
          "Topographic": topo, 
          "Satellite": satellite 
        }, null, { position: 'topright' }).addTo(mapInstance);

        measureGroupRef.current = window.L.layerGroup().addTo(mapInstance);
        
        measurePolygonRef.current = window.L.polygon([], { 
          color: '#1d4ed8', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 
        }).addTo(measureGroupRef.current);
        
        measureLineRef.current = window.L.polyline([], { 
          color: '#1d4ed8', weight: 4, dashArray: '6, 8' 
        }).addTo(measureGroupRef.current);

        const handleMapClick = (e) => {
          if (!isMeasuringRef.current) return;

          setMeasurePoints(prev => {
            const newPoint = [e.latlng.lat, e.latlng.lng];
            const updated = [...prev, newPoint];

            window.L.circleMarker(e.latlng, {
              radius: 5, color: '#1d4ed8', fillColor: '#ffffff', fillOpacity: 1, weight: 2
            }).addTo(measureGroupRef.current);

            measureLineRef.current.setLatLngs(updated);
            
            if (updated.length >= 3) {
              measurePolygonRef.current.setLatLngs(updated);
            } else {
              measurePolygonRef.current.setLatLngs([]);
            }

            if (updated.length > 1) {
              const turfCoords = updated.map(coord => [coord[1], coord[0]]);
              const line = turf.lineString(turfCoords);
              const distanceInMeters = turf.length(line, { units: 'meters' });
              setMeasureDistance(distanceInMeters);

              if (updated.length >= 3) {
                const closedCoords = [...turfCoords, turfCoords[0]]; 
                const polygon = turf.polygon([closedCoords]);
                const areaInSqMeters = turf.area(polygon);
                setMeasureArea(areaInSqMeters);
              } else {
                setMeasureArea(0);
              }
            }

            return updated;
          });
        };

        mapInstance.on('click', handleMapClick);

      } catch (fatalError) {
        console.error("Map Engine crashed:", fatalError);
      }

      return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.off('click');
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
      };
    }
  }, [activeTab, isLoggedIn]);

  // AUTO-PANNING ENGINE (Live GeoJSON Data)
  useEffect(() => {
    // Now it only aborts if BOTH inputs are completely empty
    if (!mapInstanceRef.current || !parkData || (!parkNameInput && !sectorIdInput)) return;

    const searchTerm = parkNameInput.toLowerCase();
    const sectorTerm = sectorIdInput.toLowerCase();

    const foundPark = parkData.features.find(park => {
      const name = park.properties.name ? park.properties.name.toLowerCase() : "";
      const address = park.properties["addr:suburb"] ? park.properties["addr:suburb"].toLowerCase() : "";
      const fullString = `${name} ${address}`;

      // If they only type a sector, just find the first park in that sector
      if (!searchTerm && sectorTerm) {
          return fullString.includes(sectorTerm);
      }
      
      // If they type a name (and maybe a sector), match it strictly
      return name.includes(searchTerm) && 
             (sectorTerm === '' || fullString.includes(sectorTerm));
    });

    if (foundPark) {
      const centerPoint = turf.center(foundPark);
      const [lng, lat] = centerPoint.geometry.coordinates;

      mapInstanceRef.current.flyTo([lat, lng], 16, {
        animate: true,
        duration: 1.5 
      });

      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }

      const parkNameDisplay = foundPark.properties.name || "Unnamed Park Area";

      searchMarkerRef.current = window.L.circleMarker([lat, lng], {
        radius: 8,
        color: '#dc2626',
        fillColor: '#ef4444', 
        fillOpacity: 0.8,
        weight: 3
      }).addTo(mapInstanceRef.current)
        .bindPopup(`<b>${parkNameDisplay}</b><br>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .openPopup();
    }
  }, [parkNameInput, sectorIdInput, parkData]); // <-- Dependencies now include parkData

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 400); 
    }
  }, [isFormFloating, isMobileMenuOpen]);
  
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (mobileInput.trim() === '' || password.trim() === '') return;
    setIsLoggedIn(true);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setCitizenName(regName); 
    alert(`Account created successfully for ${regName}!`);
    setAuthMode('login');
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-gate-body">
        <div className="portal-container">
          <div className="left-action-panel">
            <div className="gmda-branding-hub">
              <img src={gmdaLogo} alt="GMDA" />
              <h2 className="system-headline">Parks Grievance Handling System</h2>
            </div>
            <div className="quick-nav-links">
              <button className="nav-anchor-btn" onClick={() => setAuthMode('register')}>➔ Citizen Registration / Account Setup</button>
              <button className="nav-anchor-btn" onClick={() => alert('Please Sign In first to register a complaint!')}>➔ Register Your Grievance/Complaints</button>
            </div>
          </div>
          <div className="right-auth-panel">
            {authMode === 'login' ? (
              <div className="form-stage-box">
                <form onSubmit={handleLoginSubmit}>
                  <div className="stage-title">Citizen Secure Sign In</div>
                  <div className="input-wrapper">
                    <input id="loginMobile" name="loginMobile" type="tel" className="input-field" placeholder="Mobile Number" value={mobileInput} onChange={(e) => setMobileInput(e.target.value)} required />
                  </div>
                  <div className="input-wrapper">
                    <input id="loginPassword" name="loginPassword" type="password" className="input-field" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="submit-portal-btn">Sign In</button>
                </form>
              </div>
            ) : (
              <div className="form-stage-box">
                <div className="stage-title">Citizen Account Registration</div>
                <form onSubmit={handleRegisterSubmit}>
                  <div className="input-wrapper">
                    <input id="regName" name="regName" type="text" className="input-field" placeholder="Full Name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  </div>
                  <div className="input-wrapper">
                    <input id="regMobile" name="regMobile" type="tel" className="input-field" placeholder="Mobile Number" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} required />
                  </div>
                  <div className="input-wrapper">
                    <input id="regPassword" name="regPassword" type="password" className="input-field" placeholder="Create Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="submit-portal-btn" style={{ backgroundColor: '#047857' }}>Create Account</button>
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
      />
      <div className="workspace">
        <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }} isMobileOpen={isMobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <main className="main-stage">
          <div className="stage-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', textTransform: 'capitalize', color: 'var(--text-main)' }}>{activeTab} Panel</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GMDA Infrastructure Management Core</p>
              </div>
              <button className="logout-trigger-btn" onClick={() => { setIsLoggedIn(false); setMobileInput(''); setPassword(''); }}>🚪 Secure Logout</button>
            </div>
          </div>

          {activeTab === 'overview' && <DashboardOverview />}
          
          {activeTab === 'grievance' && (
            <div className={`complaint-portal-layout ${!isFormFloating ? 'docked' : ''}`}>
              
             <div 
                className={`complaint-form-container ${isFormFloating ? 'floating' : 'docked'}`}
                style={{
                  position: isFormFloating ? 'fixed' : 'relative',
                  top: isFormFloating ? '115px' : 'auto',  // Clears the navbar
                  left: isFormFloating ? '310px' : 'auto', // Clears the sidebar
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
                  <h3 style={{ color: 'var(--text-main)', margin: 0, pointerEvents: 'none' }}>
                    Submit Complaint
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      type="button" 
                      className="layout-toggle-btn" 
                      onPointerDown={(e) => e.stopPropagation()} 
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMeasuring(!isMeasuring);
                        if (isMeasuring) resetMeasurement();
                      }}
                      style={{
                        backgroundColor: isMeasuring ? '#fee2e2' : 'var(--color-input)',
                        color: isMeasuring ? '#dc2626' : 'var(--text-main)',
                        borderColor: isMeasuring ? '#f8b4b4' : 'var(--border-slate)'
                      }}
                    >
                      {isMeasuring ? '🛑 Stop' : '📐 Measure'}
                    </button>

                    <button 
                      type="button" 
                      className="layout-toggle-btn" 
                      onPointerDown={(e) => e.stopPropagation()} 
                      onClick={() => {
                        setIsFormFloating(!isFormFloating);
                        setFormPos({ x: 0, y: 0 }); 
                      }}
                    >
                      {isFormFloating ? '◨ Dock' : '◳ Float'}
                    </button>
                  </div>
                </div>

                <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    alert("Grievance Logged Successfully!"); 
                    setSelectedCategory('Broken Gym Equipment'); 
                    setSubCategory(''); 
                    setParkNameInput('');
                    setSectorIdInput('');
                    if (searchMarkerRef.current) searchMarkerRef.current.remove();
                    e.target.reset(); 
                    setActiveTab('overview'); 
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  <div className="form-group">
                    <label htmlFor="parkNameInput">Park Name</label>
                    <input 
                      id="parkNameInput" 
                      name="parkName" 
                      type="text" 
                      className="form-input" 
                      value={parkNameInput}
                      onChange={(e) => setParkNameInput(e.target.value)}
                      placeholder="e.g., Leisure Valley Park"
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="sectorIdInput">Sector ID</label>
                    <input 
                      id="sectorIdInput" 
                      name="sectorId" 
                      type="text" 
                      className="form-input" 
                      value={sectorIdInput}
                      onChange={(e) => setSectorIdInput(e.target.value)}
                      placeholder="e.g., Sector 29"
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="categorySelect">Category</label>
                    <select id="categorySelect" name="category" className="form-select" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSubCategory(''); }}>
                      <option value="Broken Gym Equipment">Broken Gym Equipment</option>
                      <option value="Streetlights Not Working">Streetlights Not Working</option>
                      <option value="Damaged Benches">Damaged Benches</option>
                      <option value="Play Area Issues">Play Area Issues</option>
                      <option value="Waterlogging">Waterlogging</option>
                      <option value="Garbage Accumulation">Garbage Accumulation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {selectedCategory === 'Broken Gym Equipment' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Gym Equipment Issue Type</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the issue type --</option>
                        <option value="No Gym Equipment">No Gym Equipment</option>
                        <option value="Damaged/Non-functional">Damaged/Non-functional</option>
                        <option value="Missing Parts">Missing Parts</option> 
                      </select>
                    </div>
                  )}
                   {selectedCategory === 'Damaged Benches' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Benches Issue Type</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the issue type --</option>
                        <option value="No Benches">No Benches</option>
                        <option value="Damaged/Non-functional">Damaged/Non-functional</option>
                        <option value="Graffiti/Vandalism">Graffiti/Vandalism on the benches</option>
                      </select>
                    </div>
                  )}
                   {selectedCategory === 'Streetlights Not Working' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Streetlight Issue Type</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the issue type --</option>
                        <option value="No Street Light">No Street Light</option>
                        <option value="Dark spot">Dark spot</option>
                        <option value="Fused Bulb">Fused Bulb</option>
                      </select>
                    </div>
                  )}
                  {selectedCategory === 'Play Area Issues' && (
                    <div className="form-group">
                      <label htmlFor="subCategorySelect">Play Area Issue Type</label>
                      <select id="subCategorySelect" name="subCategory" className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required>
                        <option value="" disabled>-- Please select the issue type --</option>
                        <option value="No Play Equipment">No Play Equipment</option>
                        <option value="Damaged/Non-functional">Damaged/Non-functional</option>
                        <option value="Safety Hazards">Safety Hazards (e.g. sharp edges, broken parts)</option>
                      </select>
                    </div>
                  )}
                  {selectedCategory === 'Other' && (
                    <div className="form-group">
                      <label htmlFor="otherCommentsTextarea">Specify Issue Details</label>
                      <textarea id="otherCommentsTextarea" name="otherComments" className="form-textarea" placeholder="Please specify the issue details..." rows="4" required />
                    </div>
                  )}
                  <button type="submit" className="submit-complaint-btn">Submit Complaint Log</button>
                </form>
              </div>

              <div className="complaint-map-container" style={{ position: 'relative' }}>
                <div id="complaint-map" ref={mapRef}></div>
                
                {isMeasuring && (
                  <div style={{
                    position: 'absolute', top: '20px', right: '20px', zIndex: 1000,
                    backgroundColor: 'var(--bg-card)', padding: '16px 24px',
                    borderRadius: '12px', border: '2px solid #1d4ed8',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex',
                    flexDirection: 'column', gap: '4px', minWidth: '200px', pointerEvents: 'auto'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Perimeter Distance
                    </h4>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1' }}>
                      {measureDistance < 1000 ? `${Math.round(measureDistance)} m` : `${(measureDistance / 1000).toFixed(2)} km`}
                    </div>

                    {measurePoints.length >= 3 && (
                      <>
                        <h4 style={{ margin: '12px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total Area
                        </h4>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-citizen)', lineHeight: '1' }}>
                          {measureArea < 1000000 
                            ? `${Math.round(measureArea).toLocaleString()} m²` 
                            : `${(measureArea / 1000000).toFixed(2)} km²`}
                        </div>
                      </>
                    )}

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      {measurePoints.length} points placed
                    </div>
                    
                    {measurePoints.length > 0 && (
                      <button 
                        type="button" 
                        onClick={resetMeasurement} 
                        style={{
                          marginTop: '8px', padding: '8px', backgroundColor: 'var(--color-input)', 
                          border: '1px solid var(--border-slate)', borderRadius: '6px', 
                          fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', cursor: 'pointer'
                        }}
                      >
                        ↻ Clear Measurements
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'tracking' && <div className="view-placeholder"><h3>Before And After Status Coming Soon....</h3></div>}
          
          {activeTab === 'profile' && (
            <div className="profile-details-page">
              <div className="profile-card-large">
                <div className="profile-card-header">
                  <div className="large-avatar">
                    {(citizenName || "User").split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{citizenName}</h3>
                    <span className="badge verified" style={{ marginTop: '5px' }}>Verified Profile</span>
                  </div>
                </div>
                
                <div className="profile-card-body">
                  <div className="profile-info-row">
                    <span className="info-label">Full Name:</span>
                    <span className="info-value" style={{ color: 'var(--text-main)' }}>{citizenName}</span>
                  </div>
                  <div className="profile-info-row">
                    <span className="info-label">Phone Number:</span>
                    <span className="info-value" style={{ color: 'var(--text-main)' }}>{mobileInput || "8595616328"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;