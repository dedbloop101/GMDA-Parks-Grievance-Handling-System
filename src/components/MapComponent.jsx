import React, { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';

function MapComponent({ isActive, parkData, searchParkName, searchSectorId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [measureDistance, setMeasureDistance] = useState(0);
  const [measureArea, setMeasureArea] = useState(0); 

  const isMeasuringRef = useRef(false);
  const measureGroupRef = useRef(null);
  const measureLineRef = useRef(null);
  const measurePolygonRef = useRef(null); 
  const searchMarkerRef = useRef(null);

  // Sync state to ref for event listeners
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

  // CORE MAP INITIALIZATION ENGINE
  useEffect(() => {
    if (isActive && window.L && mapRef.current) {
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
  }, [isActive]);

  // SPATIAL SEARCH AND AUTO-PAN ENGINE
  useEffect(() => {
    if (!mapInstanceRef.current || !parkData) return;

    // Cleans up the marker automatically if form inputs are cleared
    if (!searchParkName && !searchSectorId) {
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
        searchMarkerRef.current = null;
      }
      return;
    }

    const searchTerm = searchParkName.toLowerCase();
    const sectorTerm = searchSectorId.toLowerCase();

    const foundPark = parkData.features.find(park => {
      const name = park.properties.name ? park.properties.name.toLowerCase() : "";
      const address = park.properties["addr:suburb"] ? park.properties["addr:suburb"].toLowerCase() : "";
      const fullString = `${name} ${address}`;

      if (!searchTerm && sectorTerm) {
          return fullString.includes(sectorTerm);
      }
      
      return name.includes(searchTerm) && 
             (sectorTerm === '' || fullString.includes(sectorTerm));
    });

    if (foundPark) {
      const centerPoint = turf.center(foundPark);
      const [lng, lat] = centerPoint.geometry.coordinates;

      mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });

      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }

      const parkNameDisplay = foundPark.properties.name || "Unnamed Park Area";

      searchMarkerRef.current = window.L.circleMarker([lat, lng], {
        radius: 8, color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.8, weight: 3
      }).addTo(mapInstanceRef.current)
        .bindPopup(`<b>${parkNameDisplay}</b><br>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .openPopup();
    }
  }, [searchParkName, searchSectorId, parkData]);

  // Invalidate map size to prevent gray tiles on layout shifts
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 400); 
    }
  });

  return (
    <>
      <div id="complaint-map" ref={mapRef}></div>
      
      {/* Measurement Tool Controls */}
      <div style={{ position: 'absolute', top: '60px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsMeasuring(!isMeasuring);
            if (isMeasuring) resetMeasurement();
          }}
          style={{
            width: '34px', height: '33px', backgroundColor: '#ffffff',
            border: '2px solid rgba(0,0,0,0.2)', borderRadius: '4px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', padding: 0, color: isMeasuring ? '#dc2626' : '#333',
          }}
        >
          {isMeasuring ? '🛑' : '📐'}
        </button>
      </div>

      {/* Measurement Output HUD */}
      {isMeasuring && (
        <div style={{
          position: 'absolute', top: '100px', right: '10px', zIndex: 1000,
          backgroundColor: 'var(--bg-card)', padding: '16px 24px',
          borderRadius: '4px', border: '1px solid var(--border-slate)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex',
          flexDirection: 'column', gap: '4px', minWidth: '200px'
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
                marginTop: '8px', padding: '6px', backgroundColor: 'var(--color-input)', 
                border: '1px solid var(--border-slate)', borderRadius: '4px', 
                fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-main)', cursor: 'pointer'
              }}
            >
              Reset Data
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default MapComponent;