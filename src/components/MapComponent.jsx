import React, { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';

function MapComponent({ isActive, parkData, searchParkName, searchSectorId, onParkSelect, onCustomPinSelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false); 
  
  const [measurePoints, setMeasurePoints] = useState([]);
  const [measureDistance, setMeasureDistance] = useState(0);
  const [measureArea, setMeasureArea] = useState(0); 

  const isMeasuringRef = useRef(false);
  const isPinModeRef = useRef(false); 
  
  const callbacksRef = useRef({ onParkSelect, onCustomPinSelect });
  useEffect(() => {
    callbacksRef.current = { onParkSelect, onCustomPinSelect };
  }, [onParkSelect, onCustomPinSelect]);

  const measureGroupRef = useRef(null);
  const measureLineRef = useRef(null);
  const measurePolygonRef = useRef(null); 
  const searchResultsGroupRef = useRef(null); 
  const customPinGroupRef = useRef(null); 
  const customPinRef = useRef(null);

  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
    isPinModeRef.current = isPinMode;
    if (mapInstanceRef.current && mapInstanceRef.current._container) {
      mapInstanceRef.current._container.style.cursor = (isMeasuring || isPinMode) ? 'crosshair' : '';
    }
  }, [isMeasuring, isPinMode]);

  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
    isPinModeRef.current = isPinMode;
    if (mapInstanceRef.current && mapInstanceRef.current._container) {
      mapInstanceRef.current._container.style.cursor = (isMeasuring || isPinMode) ? 'crosshair' : '';
    }
  }, [isMeasuring, isPinMode]);

  useEffect(() => {
    if (!isPinMode && customPinGroupRef.current) {
      customPinGroupRef.current.clearLayers();
      customPinRef.current = null;
    }
  }, [isPinMode]);

  const resetMeasurement = () => {
    setMeasurePoints([]);
    setMeasureDistance(0);
    setMeasureArea(0);
    if (measureGroupRef.current) {
      measureGroupRef.current.clearLayers();
      measurePolygonRef.current = window.L.polygon([], { color: '#1d4ed8', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }).addTo(measureGroupRef.current);
      measureLineRef.current = window.L.polyline([], { color: '#1d4ed8', weight: 4, dashArray: '6, 8' }).addTo(measureGroupRef.current);
    }
  };
  
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
        measurePolygonRef.current = window.L.polygon([], { color: '#1d4ed8', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }).addTo(measureGroupRef.current);
        measureLineRef.current = window.L.polyline([], { color: '#1d4ed8', weight: 4, dashArray: '6, 8' }).addTo(measureGroupRef.current);

        searchResultsGroupRef.current = window.L.layerGroup().addTo(mapInstance);
        customPinGroupRef.current = window.L.layerGroup().addTo(mapInstance); 

        //  SINGLE CLICK HANDLER (Handles both Pin Drop and Measuring)
        const handleMapClick = (e) => {
          const { lat, lng } = e.latlng;

          // 1. PIN DROP MODE
          if (isPinModeRef.current) {
            // The Geofence check
            const gurugramBBox = [76.8500, 28.3200, 77.1150, 28.5080];
            const boundaryPolygon = turf.bboxPolygon(gurugramBBox);
            const clickedPoint = turf.point([lng, lat]);

            if (!turf.booleanPointInPolygon(clickedPoint, boundaryPolygon)) {
              window.alert("Location Out of Bounds: You can only drop pins and register complaints for parks inside the Gurugram city limits!");
              return; // Stop the pin from dropping
            }

            if (customPinRef.current) {
              mapInstance.removeLayer(customPinRef.current);
            }

            customPinRef.current = window.L.marker([lat, lng], {
              icon: window.L.divIcon({
                className: 'custom-pin-icon',
                html: `<div style="background-color: #2563eb; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })
            }).addTo(mapInstance);

            const popupContent = `
              <div style="text-align: center;">
                <b style="font-size: 14px; color: #1e40af;">Map Location</b><br>
                <span style="font-size: 11px; color: #64748b;">Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}</span><br>
                <button class="select-custom-pin-btn" style="margin-top: 8px; padding: 6px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">
                  Use this Location
                </button>
              </div>
            `;

            customPinRef.current.bindPopup(popupContent).openPopup();

            customPinRef.current.on('popupopen', (popupEvent) => {
              setTimeout(() => {
                const btn = popupEvent.popup._contentNode?.querySelector('.select-custom-pin-btn');
                if (btn) {
                  btn.onclick = () => {
                    if (callbacksRef.current.onCustomPinSelect) {
                      callbacksRef.current.onCustomPinSelect(lat, lng);
                    }
                    mapInstance.closePopup();
                  };
                }
              }, 50);
            });
            
            return; // Exit function so it doesn't trigger measure mode
          }

          // 2. MEASUREMENT MODE
          if (isMeasuringRef.current) {
            setMeasurePoints(prev => {
              const newPoint = [lat, lng];
              const updated = [...prev, newPoint];

              window.L.circleMarker([lat, lng], {
                radius: 5, color: '#1d4ed8', fillColor: '#ffffff', fillOpacity: 1, weight: 2
              }).addTo(measureGroupRef.current);

              measureLineRef.current.setLatLngs(updated);
              if (updated.length >= 3) measurePolygonRef.current.setLatLngs(updated);
              else measurePolygonRef.current.setLatLngs([]);

              if (updated.length > 1) {
                const turfCoords = updated.map(coord => [coord[1], coord[0]]);
                const line = turf.lineString(turfCoords);
                setMeasureDistance(turf.length(line, { units: 'meters' }));

                if (updated.length >= 3) {
                  const closedCoords = [...turfCoords, turfCoords[0]]; 
                  setMeasureArea(turf.area(turf.polygon([closedCoords])));
                } else {
                  setMeasureArea(0);
                }
              }
              return updated;
            });
          }
        };

        // Attach the single, merged click handler
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

  // SPATIAL SEARCH ENGINE
  useEffect(() => {
    if (!mapInstanceRef.current || !parkData) return;

    if (searchResultsGroupRef.current) {
      searchResultsGroupRef.current.clearLayers();
    }

    const searchTerm = (searchParkName || '').toLowerCase().trim();
    const sectorTerm = (searchSectorId || '').toLowerCase().trim();

    // 1. Normalize input (Sec-11 -> ["sector", "11"])
    const normalizedSector = sectorTerm
      .replace(/[^a-z0-9]/g, ' ') 
      .replace(/\bsec\b/g, 'sector') 
      .replace(/sector(\d+)/g, 'sector $1') 
      .replace(/\s+/g, ' ') 
      .trim();

    if (searchTerm.length < 2 && normalizedSector.length < 2) return;

    const sectorTokens = normalizedSector.split(' ').filter(t => t.length > 0);

    // THE TIGHT GEOFENCE SETUP FOR SEARCH
    // [minLng, minLat, maxLng, maxLat]
    // Max Latitude 28.508 set kiya hai (Ambience Mall border) -> Cuts off Vasant Kunj (28.53+)
    // Max Longitude 77.115 set kiya hai -> Cuts off Aya Nagar / Chhatarpur (77.12+)
    const gurugramBBox = [76.8500, 28.3200, 77.1150, 28.5080];
    const boundaryPolygon = turf.bboxPolygon(gurugramBBox);

    const matchedParks = parkData.features.filter(park => {
      const props = park.properties || {};
      const nameNorm = (props.name || '').toLowerCase();
      
      const allPropsStr = Object.values(props).join(" ").toLowerCase();
      const cleanPropsStr = allPropsStr.replace(/[^a-z0-9]/g, ' ');
      const parkDataTokens = cleanPropsStr.split(' ').filter(t => t.length > 0);

      // Strict Token Matching
      const matchesArea = sectorTokens.length > 0 
        ? sectorTokens.every(token => {
            if (/^\d+$/.test(token)) {
              return parkDataTokens.includes(token);
            }
            return allPropsStr.includes(token);
          })
        : true;

      const matchesName = searchTerm.length > 0 
        ? nameNorm.includes(searchTerm) 
        : true;

      // Agar text match hi nahi hua toh pehle hi reject kardo
      if (!(matchesArea && matchesName)) return false;
      
      // EXTRA FILTER: Agar galti se property me Delhi likha hai toh wahin uda do
      if (allPropsStr.includes('delhi') || allPropsStr.includes('vasant kunj') || allPropsStr.includes('new delhi')) {
        return false;
      }

      //  THE GEOFENCE CHECK
      const centerPoint = turf.center(park);
      return turf.booleanPointInPolygon(centerPoint, boundaryPolygon); 
    });

    if (matchedParks.length > 0) {
      matchedParks.forEach(park => {
        const centerPoint = turf.center(park);
        const [lng, lat] = centerPoint.geometry.coordinates;
        const parkNameDisplay = park.properties.name || "Unnamed Park Area";

        const marker = window.L.circleMarker([lat, lng], {
          radius: 8, color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.8, weight: 3
        });

        const popupContent = `
          <div style="text-align: center;">
            <b style="font-size: 14px;">${parkNameDisplay}</b><br>
            <button class="select-park-btn" data-parkname="${parkNameDisplay}" style="margin-top: 8px; padding: 6px 12px; background: #15803d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">
              Select this Park
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', (e) => {
          setTimeout(() => {
            const btn = e.popup._contentNode?.querySelector('.select-park-btn');
            if (btn) {
              btn.onclick = () => {
                if (callbacksRef.current.onParkSelect) {
                  callbacksRef.current.onParkSelect(btn.getAttribute('data-parkname'));
                }
                mapInstanceRef.current.closePopup();
              };
            }
          }, 50);
        });

        marker.addTo(searchResultsGroupRef.current);
      });

      try {
        const featureCollection = turf.featureCollection(matchedParks);
        const bbox = turf.bbox(featureCollection); 
        const leafletBounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]]; 
        mapInstanceRef.current.flyToBounds(leafletBounds, { padding: [40, 40], maxZoom: 15, duration: 1.2 });
      } catch (e) { console.error("Bounding box error", e); }
    }
  }, [searchParkName, searchSectorId, parkData]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 400); 
    }
  });

  return (
    <>
      <div id="complaint-map" ref={mapRef}></div>
      
      <div style={{ position: 'absolute', top: '60px', right: '10px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button
          type="button"
          title="Measurement Tool"
          onClick={(e) => {
            e.preventDefault();
            setIsMeasuring(!isMeasuring);
            setIsPinMode(false); 
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

        <button
          type="button"
          title="Drop Custom Location Pin"
          onClick={(e) => {
            e.preventDefault();
            setIsPinMode(!isPinMode);
            setIsMeasuring(false); 
          }}
          style={{
            width: '34px', height: '33px', backgroundColor: '#ffffff',
            border: '2px solid rgba(0,0,0,0.2)', borderRadius: '4px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', padding: 0, color: isPinMode ? '#2563eb' : '#333',
          }}
        >
          📍
        </button>
      </div>

      {isPinMode && (
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
          Tap anywhere on the map to drop a pin
        </div>
      )}

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