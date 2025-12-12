import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import type { Hospital } from '../services/api';
import { Building2, MapPin, Phone, Navigation } from 'lucide-react';

// Fix for default marker icons in React-Leaflet (only in browser)
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Create icons as functions to avoid re-creation issues
// Initialize icons properly to avoid Leaflet cleanup errors
const createHospitalIcon = () => {
  const icon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#ef4444" stroke="white" stroke-width="2"/>
        <path d="M16 10V22M10 16H22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
  // Ensure icon has proper Leaflet initialization
  if (!icon._leaflet_events) {
    icon._leaflet_events = {};
  }
  return icon;
};

const createUserLocationIcon = () => {
  const icon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
        <circle cx="12" cy="12" r="4" fill="white"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
  // Ensure icon has proper Leaflet initialization
  if (!icon._leaflet_events) {
    icon._leaflet_events = {};
  }
  return icon;
};

// Default hospital icon (non-selected)
const createDefaultHospitalIcon = () => {
  const icon = new L.Icon.Default();
  // Ensure icon has proper Leaflet initialization
  if (!icon._leaflet_events) {
    icon._leaflet_events = {};
  }
  return icon;
};

interface MapControllerProps {
  center: [number, number];
  zoom: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

interface HospitalMapProps {
  hospitals: Hospital[];
  userLocation?: { latitude: number; longitude: number } | null;
  selectedHospital?: Hospital | null;
  onHospitalClick?: (hospital: Hospital) => void;
}

// Separate component for markers to avoid cleanup issues
function MapMarkers({ 
  hospitals, 
  userLocation, 
  selectedHospital,
  onHospitalClick 
}: {
  hospitals: Hospital[];
  userLocation?: { latitude: number; longitude: number } | null;
  selectedHospital?: Hospital | null;
  onHospitalClick?: (hospital: Hospital) => void;
}) {
  // Create icons once and reuse them to avoid cleanup issues
  const hospitalIcon = useMemo(() => createHospitalIcon(), []);
  const defaultHospitalIcon = useMemo(() => createDefaultHospitalIcon(), []);
  const userLocationIcon = useMemo(() => createUserLocationIcon(), []);
  
  const validHospitals = useMemo(() => {
    return hospitals.filter(h => 
      h.latitude != null && 
      h.longitude != null && 
      !isNaN(h.latitude) && 
      !isNaN(h.longitude) &&
      isFinite(h.latitude) &&
      isFinite(h.longitude)
    );
  }, [hospitals]);
  
  // Cleanup icons on unmount
  useEffect(() => {
    return () => {
      // Cleanup function - icons will be garbage collected
      // The key is to ensure they're not being removed while still in use
    };
  }, []);

  return (
    <>
      {/* User location marker */}
      {userLocation && userLocation.latitude && userLocation.longitude && (
        <Marker
          key="user-location"
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userLocationIcon}
        >
          <Popup>
            <div className="text-sm font-semibold text-blue-600">
              Your Location
            </div>
          </Popup>
        </Marker>
      )}

      {/* Hospital markers */}
      {validHospitals.map((hospital) => {
        const getDirectionsUrl = (h: Hospital) => {
          if (h.latitude && h.longitude) {
            return `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`;
          }
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h.address}, ${h.city}, ${h.state}`)}`;
        };

        return (
          <Marker
            key={hospital.id}
            position={[hospital.latitude!, hospital.longitude!]}
            icon={selectedHospital?.id === hospital.id ? hospitalIcon : defaultHospitalIcon}
            eventHandlers={{
              click: () => {
                if (onHospitalClick) {
                  onHospitalClick(hospital);
                }
              },
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="flex items-start space-x-2 mb-2">
                  <Building2 className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{hospital.name}</h3>
                    <p className="text-xs text-gray-600 mb-2">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {hospital.city}, {hospital.state}
                    </p>
                    {hospital.distance_km && (
                      <p className="text-xs text-primary-600 font-semibold mb-2">
                        {hospital.distance_km.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                </div>
                
                {hospital.phone && (
                  <div className="flex items-center text-xs text-gray-700 mb-1">
                    <Phone className="h-3 w-3 mr-1" />
                    <a href={`tel:${hospital.phone}`} className="text-primary-600 hover:underline">
                      {hospital.phone}
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-2 mb-2">
                  {hospital.has_emergency && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Emergency</span>
                  )}
                  {hospital.has_maternity && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Maternity</span>
                  )}
                  {hospital.has_24hour && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">24hr</span>
                  )}
                </div>

                <a
                  href={getDirectionsUrl(hospital)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-primary-600 hover:text-primary-700 font-medium mt-2"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Get Directions
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function HospitalMap({ 
  hospitals, 
  userLocation, 
  selectedHospital,
  onHospitalClick 
}: HospitalMapProps) {
  // Filter hospitals with valid coordinates
  const validHospitals = useMemo(() => {
    return hospitals.filter(h => 
      h.latitude != null && 
      h.longitude != null && 
      !isNaN(h.latitude) && 
      !isNaN(h.longitude) &&
      isFinite(h.latitude) &&
      isFinite(h.longitude)
    );
  }, [hospitals]);

  // Determine map center and zoom
  const getMapCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.latitude, userLocation.longitude];
    }
    if (validHospitals.length > 0) {
      const avgLat = validHospitals.reduce((sum, h) => sum + (h.latitude || 0), 0) / validHospitals.length;
      const avgLng = validHospitals.reduce((sum, h) => sum + (h.longitude || 0), 0) / validHospitals.length;
      return [avgLat, avgLng];
    }
    // Default to Nigeria center (Abuja)
    return [9.0765, 7.3986];
  };

  const getMapZoom = (): number => {
    if (userLocation && validHospitals.length > 0) {
      return 12;
    }
    if (validHospitals.length > 0) {
      return 10;
    }
    return 6; // Nigeria overview
  };

  const center = getMapCenter();
  const zoom = getMapZoom();

  // Create a stable key for the map
  const mapKey = useMemo(() => {
    return `map-${validHospitals.length}-${userLocation ? 'loc' : 'no-loc'}`;
  }, [validHospitals.length, !!userLocation]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 shadow-lg">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} zoom={zoom} />

        <MapMarkers
          hospitals={validHospitals}
          userLocation={userLocation}
          selectedHospital={selectedHospital}
          onHospitalClick={onHospitalClick}
        />
      </MapContainer>
    </div>
  );
}
