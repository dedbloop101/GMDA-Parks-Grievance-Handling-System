import React, { useEffect, useRef } from 'react';
import * as turf from '@turf/turf';

function AdminMap({ complaints, parkData }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    
    // Initialize map only once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current).setView([28.4595, 77.0266], 12);
      
      // Using a cleaner, darker map style for the Admin view so the red/green dots pop
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
      
      markersGroupRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);
    }

    // Cross-reference Complaints with GeoJSON to drop pins
    if (parkData && complaints && markersGroupRef.current) {
      markersGroupRef.current.clearLayers();

      const bounds = [];

      complaints.forEach(complaint => {
        // Find the park coordinates from the GeoJSON using the saved parkName
        const parkFeature = parkData.features.find(p => 
          (p.properties.name || '').toLowerCase() === (complaint.parkName || '').toLowerCase()
        );

        if (parkFeature) {
          const center = turf.center(parkFeature);
          const [lng, lat] = center.geometry.coordinates;
          bounds.push([lat, lng]);

          const isResolved = complaint.status === 'Resolved';
          const markerColor = isResolved ? '#15803d' : '#dc2626'; // Dark Green vs Dark Red
          const fillColor = isResolved ? '#22c55e' : '#ef4444';   // Bright Green vs Bright Red

          // Active complaints get larger, pulsing-style markers
          const marker = window.L.circleMarker([lat, lng], {
            radius: isResolved ? 6 : 10, 
            color: markerColor,
            fillColor: fillColor,
            fillOpacity: 0.8,
            weight: 2
          });

          marker.bindPopup(`
            <div style="text-align: center; min-width: 150px;">
              <span style="font-size: 10px; font-weight: 900; letter-spacing: 1px; color: ${markerColor}; text-transform: uppercase;">
                ● ${complaint.status}
              </span>
              <h4 style="margin: 6px 0 2px 0; color: #1e293b;">${complaint.parkName}</h4>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: bold;">${complaint.issue}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Sector ${complaint.sector}</p>
              ${!isResolved ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #dc2626; font-weight: bold;">Priority: ${complaint.priority}</p>` : ''}
            </div>
          `);

          marker.addTo(markersGroupRef.current);
        }
      });

      // Gently zoom the map to fit all active complaints if any exist
      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [complaints, parkData]);

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px 20px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-slate)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>City-Wide Grievance Map</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Live geographic tracking of all reported park issues.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', fontSize: '13px', fontWeight: 'bold' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc2626' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span> Active Issue</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#15803d' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span> Resolved</span>
        </div>
      </div>
      <div ref={mapRef} style={{ flex: 1, width: '100%', zIndex: 1 }} />
    </div>
  );
}

export default AdminMap;