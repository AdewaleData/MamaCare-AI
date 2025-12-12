import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hospitalsApi } from '../services/api';
import { MapPin, Phone, Mail, Globe, Search, Loader2, Navigation, Building2, ExternalLink, AlertCircle, Map, List } from 'lucide-react';
import type { Hospital, HospitalSearchParams } from '../services/api';
import { useTranslation } from '../contexts/TranslationContext';
import HospitalMap from '../components/HospitalMap';

export default function HospitalsPage() {
  const { t } = useTranslation();
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
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Query for location-based search
  const { data: nearbyHospitals, isLoading: isLoadingNearby } = useQuery({
    queryKey: ['hospitals', 'nearby', userLocation, searchTrigger],
    queryFn: async () => {
      if (userLocation) {
        return hospitalsApi.findNearby(userLocation.latitude, userLocation.longitude, 25, 20);
      }
      return [];
    },
    enabled: useLocation && !!userLocation,
  });

  // Query for filter-based search
  const { data: filteredHospitals, isLoading: isLoadingFiltered, error } = useQuery({
    queryKey: ['hospitals', 'filtered', searchParams, searchTrigger],
    queryFn: async () => {
      try {
        // Clean up params - remove empty strings
        const cleanParams: HospitalSearchParams = {
          ...searchParams,
          city: searchParams.city?.trim() || undefined,
          state: searchParams.state?.trim() || undefined,
          limit: 20,
        };
        console.log('[HospitalsPage] Fetching hospitals with params:', cleanParams);
        const result = await hospitalsApi.find(cleanParams);
        console.log('[HospitalsPage] Received hospitals:', result?.length || 0);
        return result || [];
      } catch (err) {
        console.error('[HospitalsPage] Error fetching hospitals:', err);
        throw err;
      }
    },
    enabled: !useLocation || hasSearched,
    retry: 1,
  });

  // Determine which data to use
  const hospitals = useLocation && userLocation ? nearbyHospitals : filteredHospitals;
  const isLoading = useLocation && userLocation ? isLoadingNearby : isLoadingFiltered;

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setUseLocation(true);
          setHasSearched(true);
          setSearchTrigger(prev => prev + 1);
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
    setHasSearched(true);
    setSearchTrigger(prev => prev + 1);
  };

  const handleCheckboxChange = (field: keyof HospitalSearchParams, checked: boolean) => {
    setSearchParams({
      ...searchParams,
      [field]: checked ? true : undefined,
    });
  };

  const getDirectionsUrl = (hospital: Hospital) => {
    if (hospital.latitude && hospital.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospital.address}, ${hospital.city}, ${hospital.state}`)}`;
  };

  // Load all hospitals on initial mount
  useEffect(() => {
    if (!hasSearched && !useLocation) {
      console.log('[HospitalsPage] Initial mount - triggering search');
      setHasSearched(true);
      setSearchTrigger(1);
    }
  }, [hasSearched, useLocation]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('find_hospitals', 'Find Hospitals')}</h1>
        <p className="text-lg text-gray-600">{t('search_hospitals_description', 'Search for hospitals and healthcare facilities near you')}</p>
      </div>

      {/* Search Filters */}
      <div className="card hover:shadow-xl transition-all duration-300">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('search_filters', 'Search Filters')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('city', 'City')}</label>
            <input
              type="text"
              value={searchParams.city || ''}
              onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
              className="input"
              placeholder={t('enter_city', 'Enter city')}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('state', 'State')}</label>
            <input
              type="text"
              value={searchParams.state || ''}
              onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
              className="input"
              placeholder={t('enter_state', 'Enter state')}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('hospital_type', 'Hospital Type')}</label>
            <select
              value={searchParams.type || ''}
              onChange={(e) => setSearchParams({ ...searchParams, type: e.target.value || undefined })}
              className="input"
            >
              <option value="">{t('all_types', 'All Types')}</option>
              <option value="general">{t('general', 'General')}</option>
              <option value="maternity">{t('maternity', 'Maternity')}</option>
              <option value="clinic">{t('clinic', 'Clinic')}</option>
              <option value="emergency">{t('emergency', 'Emergency')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={searchParams.has_emergency === true}
              onChange={(e) => handleCheckboxChange('has_emergency', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">{t('emergency', 'Emergency')}</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={searchParams.has_maternity === true}
              onChange={(e) => handleCheckboxChange('has_maternity', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">{t('maternity', 'Maternity')}</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={searchParams.has_ambulance === true}
              onChange={(e) => handleCheckboxChange('has_ambulance', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">{t('ambulance', 'Ambulance')}</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={searchParams.has_24hour === true}
              onChange={(e) => handleCheckboxChange('has_24hour', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">{t('24_hour', '24 Hour')}</span>
          </label>
        </div>

        <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
          <button 
            onClick={handleSearch} 
            className="btn-primary inline-flex items-center shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Search className="mr-2 h-5 w-5" />
            {t('search', 'Search')}
          </button>
          <button 
            onClick={getCurrentLocation} 
            className="btn-secondary inline-flex items-center shadow-sm hover:shadow-md transition-all duration-300"
          >
            <Navigation className="mr-2 h-5 w-5" />
            {t('use_my_location', 'Use My Location')}
          </button>
          {(hasSearched || useLocation) && (
            <button
              onClick={() => {
                setSearchParams({
                  city: '',
                  state: '',
                  has_emergency: undefined,
                  has_maternity: undefined,
                  has_ambulance: undefined,
                  has_24hour: undefined,
                  type: undefined,
                  limit: 20,
                });
                setUseLocation(false);
                setUserLocation(null);
                setHasSearched(false);
              }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              {t('clear_filters', 'Clear Filters')}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="card text-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('loading_hospitals', 'Loading hospitals...')}</p>
        </div>
      ) : error ? (
        <div className="card text-center py-16">
          <AlertCircle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('error_loading_hospitals', 'Error Loading Hospitals')}</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error 
              ? error.message 
              : typeof error === 'object' && error !== null && 'message' in error
              ? String(error.message)
              : t('unknown_error', 'Unknown error')}
          </p>
          <div className="text-xs text-gray-500 mb-4">
            {t('check_console', 'Check browser console for details')}
          </div>
          <button onClick={handleSearch} className="btn-primary">
            {t('try_again', 'Try Again')}
          </button>
        </div>
      ) : hospitals && hospitals.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {t('found', 'Found')} <span className="font-semibold text-gray-900">{hospitals.length}</span> {t('hospitals', 'hospitals')}
            </p>
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 inline-flex items-center ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4 mr-1.5" />
                {t('list', 'List')}
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 inline-flex items-center ${
                  viewMode === 'map'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Map className="h-4 w-4 mr-1.5" />
                {t('map', 'Map')}
              </button>
            </div>
          </div>

          {/* Map View */}
          {viewMode === 'map' && (
            <div className="card p-0 overflow-hidden">
              <div className="h-[600px] w-full">
                <HospitalMap
                  hospitals={hospitals}
                  userLocation={userLocation}
                  selectedHospital={selectedHospital}
                  onHospitalClick={setSelectedHospital}
                />
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {hospitals.map((hospital) => (
                <div 
                  key={hospital.id} 
                  className={`card hover:shadow-xl transition-all duration-300 border-l-4 ${
                selectedHospital?.id === hospital.id 
                  ? 'border-l-primary-600 bg-primary-50/30' 
                  : 'border-l-primary-500'
                  } cursor-pointer`}
                  onClick={() => {
                setSelectedHospital(hospital);
                setViewMode('map');
                // Scroll to top to show map
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{hospital.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge badge-primary capitalize">{hospital.type}</span>
                        {hospital.category && (
                          <span className="badge badge-secondary capitalize">{hospital.category}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 ml-12">
                    <div className="flex items-start text-sm text-gray-700">
                      <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" />
                      <div>
                        <span>{hospital.address}, {hospital.city}, {hospital.state}</span>
                        {hospital.distance_km && (
                          <span className="ml-2 text-primary-600 font-semibold">
                            • {hospital.distance_km.toFixed(1)} km {t('away', 'away')}
                          </span>
                        )}
                      </div>
                    </div>

                    {hospital.phone && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <a href={`tel:${hospital.phone}`} className="text-primary-600 hover:text-primary-700 hover:underline">
                          {hospital.phone}
                        </a>
                      </div>
                    )}

                    {hospital.email && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <a href={`mailto:${hospital.email}`} className="text-primary-600 hover:text-primary-700 hover:underline">
                          {hospital.email}
                        </a>
                      </div>
                    )}

                    {hospital.website && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Globe className="h-4 w-4 mr-2 text-gray-500" />
                        <a 
                          href={hospital.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center"
                        >
                          {hospital.website}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {hospital.has_emergency && (
                        <span className="badge badge-danger">{t('emergency', 'Emergency')}</span>
                      )}
                      {hospital.has_maternity && (
                        <span className="badge badge-primary">{t('maternity', 'Maternity')}</span>
                      )}
                      {hospital.has_ambulance && (
                        <span className="badge badge-warning">{t('ambulance', 'Ambulance')}</span>
                      )}
                      {hospital.has_24hour && (
                        <span className="badge badge-success">{t('24_hour', '24 Hour')}</span>
                      )}
                    </div>

                    {hospital.total_beds && (
                      <div className="text-xs text-gray-500 mt-2">
                        {t('beds', 'Beds')}: {hospital.available_beds || 0} / {hospital.total_beds} {t('available', 'available')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  <a
                    href={getDirectionsUrl(hospital)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm inline-flex items-center whitespace-nowrap"
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    {t('directions', 'Directions')}
                  </a>
                </div>
              </div>
            </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-16">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t('no_hospitals_found', 'No Hospitals Found')}</h2>
          <p className="text-gray-600 mb-4">
            {hasSearched || useLocation
              ? t('try_adjusting_filters', 'Try adjusting your search filters or location.')
              : t('click_search_to_load', 'Click the Search button to load hospitals.')}
          </p>
          {!hasSearched && !useLocation && (
            <button onClick={handleSearch} className="btn-primary mb-4">
              <Search className="mr-2 h-4 w-4" />
              {t('load_hospitals', 'Load Hospitals')}
            </button>
          )}
          <button
            onClick={() => {
              setSearchParams({
                city: '',
                state: '',
                has_emergency: undefined,
                has_maternity: undefined,
                has_ambulance: undefined,
                has_24hour: undefined,
                type: undefined,
                limit: 20,
              });
              setUseLocation(false);
              setUserLocation(null);
              setHasSearched(false);
            }}
            className="btn-secondary"
          >
            {t('clear_filters', 'Clear Filters')}
          </button>
        </div>
      )}
    </div>
  );
}
