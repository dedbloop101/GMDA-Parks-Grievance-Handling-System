import React, { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';

function AdminMap({ complaints, parkData }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  
  //  THE NEW FILTER STATE
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    
    // Initialize map only once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current).setView([28.4595, 77.0266], 12);
      
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
      
      markersGroupRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);
    }

    if (complaints && markersGroupRef.current) {
      markersGroupRef.current.clearLayers();
      const bounds = [];

      //  FILTERING LOGIC
      const complaintsToShow = complaints.filter(c => {
        if (activeFilter === 'All') return true;
        const status = c.status || 'Unresolved';
        return status === activeFilter;
      });

      complaintsToShow.forEach(complaint => {
        let lat, lng;
        
        //  CUSTOM LOCATION FIX: Extracting Lat/Lng directly from the string using Regex
        const customLocMatch = complaint.parkName?.match(/Latitude:\s*([0-9.]+),\s*Longitude:\s*([0-9.]+)/i);

        if (customLocMatch) {
          lat = parseFloat(customLocMatch[1]);
          lng = parseFloat(customLocMatch[2]);
        } else if (parkData && parkData.features) {
          // If not custom, find in GeoJSON database
          const parkFeature = parkData.features.find(p => 
            (p.properties.name || '').toLowerCase() === (complaint.parkName || '').toLowerCase()
          );
          if (parkFeature) {
            const center = turf.center(parkFeature);
            lng = center.geometry.coordinates[0];
            lat = center.geometry.coordinates[1];
          }
        }

        // If we successfully found coordinates (either custom or GeoJSON)
        if (lat && lng) {
          bounds.push([lat, lng]);

          const status = complaint.status || 'Unresolved';
          
          // 3-TIER COLOR SYSTEM
          let markerColor = '#dc2626'; // Default Red (Unresolved)
          let fillColor = '#ef4444'; 
          
          if (status === 'Resolved') {
            markerColor = '#15803d'; // Green
            fillColor = '#22c55e';
          } else if (status === 'Work in Progress') {
            markerColor = '#c2410c'; // Orange
            fillColor = '#f97316';
          }

          const marker = window.L.circleMarker([lat, lng], {
            radius: status === 'Resolved' ? 6 : (status === 'Work in Progress' ? 8 : 10), 
            color: markerColor,
            fillColor: fillColor,
            fillOpacity: 0.8,
            weight: 2
          });

          marker.bindPopup(`
            <div style="text-align: center; min-width: 160px;">
              <span style="font-size: 10px; font-weight: 900; letter-spacing: 1px; color: ${markerColor}; text-transform: uppercase;">
                ● ${status}
              </span>
              <h4 style="margin: 6px 0 2px 0; color: #1e293b; font-size: 14px;">${complaint.parkName}</h4>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold;">${complaint.issue}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">${complaint.sector !== 'Map Location' ? 'Sector: ' + complaint.sector : 'Custom Map Pin'}</p>
              ${status !== 'Resolved' ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #dc2626; font-weight: bold;">Priority: ${complaint.priority || 'Medium'}</p>` : ''}
            </div>
          `);

          marker.addTo(markersGroupRef.current);
        }
      });

      // Gently zoom map to fit all active markers
      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [complaints, parkData, activeFilter]);

  // Button Style Generator
  const getBtnStyle = (filterName) => ({
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: '4px',
    border: activeFilter === filterName ? 'none' : '1px solid var(--border-slate)',
    backgroundColor: activeFilter === filterName ? 'var(--color-admin)' : 'var(--bg-body)',
    color: activeFilter === filterName ? '#ffffff' : 'var(--text-muted)',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* MAP HEADER & FILTER PANEL */}
      <div style={{ padding: '15px 20px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-slate)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '16px' }}>City-Wide Grievance Map</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Live geographic tracking of reported park issues.</p>
        </div>
        
        {/*  SMART FILTERS */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={getBtnStyle('All')} onClick={() => setActiveFilter('All')}>Total ({complaints.length})</button>
          <button style={getBtnStyle('Unresolved')} onClick={() => setActiveFilter('Unresolved')}>
            <span style={{ color: activeFilter === 'Unresolved' ? '#fff' : '#dc2626' }}>●</span> Unresolved
          </button>
          <button style={getBtnStyle('Work in Progress')} onClick={() => setActiveFilter('Work in Progress')}>
            <span style={{ color: activeFilter === 'Work in Progress' ? '#fff' : '#f97316' }}>●</span> WIP
          </button>
          <button style={getBtnStyle('Resolved')} onClick={() => setActiveFilter('Resolved')}>
            <span style={{ color: activeFilter === 'Resolved' ? '#fff' : '#15803d' }}>●</span> Resolved
          </button>
        </div>
      </div>

      {/* ACTUAL LEAFLET MAP */}
      <div ref={mapRef} style={{ flex: 1, width: '100%', zIndex: 1 }} />
      
    </div>
  );
}

export default AdminMap;