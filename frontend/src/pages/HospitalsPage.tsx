import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hospitalsApi } from '../services/api';
import { MapPin, Phone, Mail, Globe, Search, Loader2, Navigation, Building2 } from 'lucide-react';
import type { Hospital, HospitalSearchParams } from '../services/api';

export default function HospitalsPage() {
  const [searchParams, setSearchParams] = useState<HospitalSearchParams>({
    city: '',
    state: '',
    has_emergency: undefined,
    has_maternity: undefined,
    has_ambulance: undefined,
    has_24hour: undefined,
    type: undefined,
    limit: 20,
  });

  const [useLocation, setUseLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { data: hospitals, isLoading, refetch } = useQuery({
    queryKey: ['hospitals', searchParams],
    queryFn: async () => {
      if (useLocation && userLocation) {
        return hospitalsApi.findNearby(userLocation.latitude, userLocation.longitude, 25, 10);
      }
      return hospitalsApi.find(searchParams);
    },
    enabled: !useLocation || !!userLocation,
  });

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setUseLocation(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please use search filters instead.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSearch = () => {
    setUseLocation(false);
    refetch();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Find Hospitals</h1>
        <p className="mt-2 text-gray-600">Search for hospitals and healthcare facilities near you</p>
      </div>

      {/* Search Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input
              type="text"
              value={searchParams.city || ''}
              onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
              className="input"
              placeholder="Enter city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
            <input
              type="text"
              value={searchParams.state || ''}
              onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
              className="input"
              placeholder="Enter state"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hospital Type</label>
            <select
              value={searchParams.type || ''}
              onChange={(e) => setSearchParams({ ...searchParams, type: e.target.value || undefined })}
              className="input"
            >
              <option value="">All Types</option>
              <option value="general">General</option>
              <option value="maternity">Maternity</option>
              <option value="clinic">Clinic</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={searchParams.has_emergency === true}
              onChange={(e) => setSearchParams({ ...searchParams, has_emergency: e.target.checked || undefined })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Emergency</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={searchParams.has_maternity === true}
              onChange={(e) => setSearchParams({ ...searchParams, has_maternity: e.target.checked || undefined })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Maternity</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={searchParams.has_ambulance === true}
              onChange={(e) => setSearchParams({ ...searchParams, has_ambulance: e.target.checked || undefined })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Ambulance</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={searchParams.has_24hour === true}
              onChange={(e) => setSearchParams({ ...searchParams, has_24hour: e.target.checked || undefined })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">24 Hour</span>
          </label>
        </div>

        <div className="flex items-center space-x-4 pt-4 border-t">
          <button onClick={handleSearch} className="btn-primary inline-flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Search
          </button>
          <button onClick={getCurrentLocation} className="btn-secondary inline-flex items-center">
            <Navigation className="mr-2 h-5 w-5" />
            Use My Location
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="card text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </div>
      ) : hospitals && hospitals.length > 0 ? (
        <div className="space-y-4">
          {hospitals.map((hospital) => (
            <div key={hospital.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Building2 className="h-5 w-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{hospital.name}</h3>
                    <span className="badge badge-primary">{hospital.type}</span>
                    {hospital.category && (
                      <span className="badge badge-secondary">{hospital.category}</span>
                    )}
                  </div>

                  <div className="space-y-2 ml-8">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {hospital.address}, {hospital.city}, {hospital.state}
                      {hospital.distance_km && (
                        <span className="ml-2 text-primary-600 font-medium">
                          ({hospital.distance_km.toFixed(1)} km away)
                        </span>
                      )}
                    </div>

                    {hospital.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {hospital.phone}
                      </div>
                    )}

                    {hospital.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {hospital.email}
                      </div>
                    )}

                    {hospital.website && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Globe className="h-4 w-4 mr-2" />
                        <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                          {hospital.website}
                        </a>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {hospital.has_emergency && (
                        <span className="badge badge-danger">Emergency</span>
                      )}
                      {hospital.has_maternity && (
                        <span className="badge badge-primary">Maternity</span>
                      )}
                      {hospital.has_ambulance && (
                        <span className="badge badge-warning">Ambulance</span>
                      )}
                      {hospital.has_24hour && (
                        <span className="badge badge-success">24 Hour</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Hospitals Found</h2>
          <p className="text-gray-600">Try adjusting your search filters or location.</p>
        </div>
      )}
    </div>
  );
}

