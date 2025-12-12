import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { providersApi, Provider, ProviderSearchParams } from '../services/api';
import { Search, Stethoscope, Building2, Mail, Phone, CheckCircle, Loader2, User, MapPin, Navigation } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function ProvidersPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [sortBy, setSortBy] = useState<'name' | 'distance'>('name');

  const searchParams: ProviderSearchParams = {
    search: searchQuery || undefined,
    organization: organizationFilter || undefined,
    verified_only: false, // Show all providers including pending
    latitude: useLocation && userLocation ? userLocation.latitude : undefined,
    longitude: useLocation && userLocation ? userLocation.longitude : undefined,
    radius_km: useLocation && userLocation ? radiusKm : undefined,
    sort_by: sortBy,
  };

  const { data: providers = [], isLoading, error } = useQuery({
    queryKey: ['providers', searchQuery, organizationFilter, userLocation, useLocation, radiusKm, sortBy],
    queryFn: () => {
      console.log('[ProvidersPage] Fetching providers with params:', searchParams);
      return providersApi.list(searchParams);
    },
    onError: (err) => {
      console.error('[ProvidersPage] Error fetching providers:', err);
    },
    onSuccess: (data) => {
      console.log('[ProvidersPage] Received providers:', data?.length || 0, data);
    },
  });

  // Get unique organizations for filter
  const organizations = Array.from(
    new Set(providers.map(p => p.organization_name).filter(Boolean))
  ).sort();

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setUseLocation(true);
          setSortBy('distance'); // Auto-switch to distance sorting when location is enabled
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check your browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Find Your Healthcare Provider</h1>
        <p className="mt-2 text-gray-600">
          Search and connect with verified healthcare providers
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              placeholder="Search by name, email, or organization..."
            />
          </div>
          <div>
            <select
              value={organizationFilter}
              onChange={(e) => setOrganizationFilter(e.target.value)}
              className="input"
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location and Sorting Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={getCurrentLocation}
              className={`btn-secondary flex items-center space-x-2 ${useLocation ? 'bg-primary-50 border-primary-300' : ''}`}
            >
              <Navigation className="h-4 w-4" />
              <span>{useLocation ? 'Location Active' : 'Use My Location'}</span>
            </button>
            {useLocation && (
              <button
                onClick={() => {
                  setUseLocation(false);
                  setUserLocation(null);
                  setSortBy('name');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {useLocation && userLocation && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Distance (km)
              </label>
              <input
                type="number"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                min="1"
                max="500"
                className="input text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'distance')}
              className="input text-sm"
              disabled={sortBy === 'distance' && (!useLocation || !userLocation)}
            >
              <option value="name">Name (A-Z)</option>
              <option value="distance" disabled={!useLocation || !userLocation}>
                Distance (Nearest First)
              </option>
            </select>
            {sortBy === 'distance' && (!useLocation || !userLocation) && (
              <p className="mt-1 text-xs text-gray-500">
                Enable location to sort by distance
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Providers List */}
      {error && (
        <div className="card p-4 bg-danger-50 border border-danger-200 rounded-lg mb-4">
          <p className="text-danger-700 text-sm">
            Error loading providers: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      )}
      {isLoading ? (
        <div className="card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading providers...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="card p-12 text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Providers Found</h3>
          <p className="text-gray-600">
            {searchQuery || organizationFilter
              ? 'Try adjusting your search criteria'
              : 'No providers available at the moment. Providers will appear here once they register.'}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-2 text-xs text-gray-500">
              Debug: verified_only={searchParams.verified_only?.toString()}, 
              search={searchQuery || 'none'}, 
              total={providers.length}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold text-gray-900">{providers.length}</span> provider{providers.length !== 1 ? 's' : ''}
              {sortBy === 'name' && ' (sorted alphabetically)'}
              {sortBy === 'distance' && useLocation && ' (sorted by distance)'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
            <div
              key={provider.id}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {provider.full_name}
                    </h3>
                    {provider.verification_status === 'verified' && (
                      <CheckCircle className="h-5 w-5 text-success-500 flex-shrink-0" title="Verified" />
                    )}
                  </div>
                  
                  {provider.organization_name && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{provider.organization_name}</span>
                    </div>
                  )}

                  {/* Location and Distance */}
                  {(provider.city || provider.address) && (
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {provider.city}
                        {provider.state && `, ${provider.state}`}
                      </span>
                    </div>
                  )}

                  {provider.distance_km != null && typeof provider.distance_km === 'number' && (
                    <div className="flex items-center text-sm font-medium text-primary-600 mb-2">
                      <Navigation className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>{provider.distance_km.toFixed(1)} km away</span>
                    </div>
                  )}

                  {provider.email && (
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{provider.email}</span>
                    </div>
                  )}

                  {provider.phone && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span>{provider.phone}</span>
                    </div>
                  )}

                  {user?.role === 'patient' && (
                    <button
                      onClick={() => {
                        // Navigate to pregnancy page with provider pre-selected
                        window.location.href = '/app/pregnancy';
                      }}
                      className="mt-4 w-full btn-primary text-sm"
                    >
                      Select as My Provider
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {/* Info Box */}
      <div className="card bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> All providers shown are verified healthcare professionals. 
          You can select a provider when creating or updating your pregnancy information.
        </p>
      </div>
    </div>
  );
}

