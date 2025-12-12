import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { providersApi, Provider } from '../services/api';
import { Search, Stethoscope, Building2, Check, Loader2, X } from 'lucide-react';

interface ProviderSelectorProps {
  value?: string; // Selected provider name
  onChange: (providerName: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ProviderSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: ProviderSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Fetch providers
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers', searchQuery],
    queryFn: () => providersApi.list(searchQuery, undefined, true),
    enabled: isOpen,
  });

  // Find selected provider when value changes
  useEffect(() => {
    if (value && providers.length > 0) {
      const provider = providers.find(p => p.full_name === value);
      if (provider) {
        setSelectedProvider(provider);
      }
    } else if (!value) {
      setSelectedProvider(null);
    }
  }, [value, providers]);

  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    onChange(provider.full_name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedProvider(null);
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Healthcare Provider
      </label>
      
      {/* Selected Provider Display */}
      {selectedProvider && !isOpen ? (
        <div className="relative">
          <div className="input flex items-center justify-between pr-10">
            <div className="flex items-center space-x-3">
              <Stethoscope className="h-5 w-5 text-primary-600" />
              <div>
                <div className="font-medium text-gray-900">{selectedProvider.full_name}</div>
                {selectedProvider.organization_name && (
                  <div className="text-sm text-gray-500">{selectedProvider.organization_name}</div>
                )}
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="absolute inset-0 w-full"
              aria-label="Change provider"
            />
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="input pl-10 pr-10"
              placeholder="Search for a healthcare provider..."
              disabled={disabled}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-auto">
                {isLoading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Loading providers...</p>
                  </div>
                ) : providers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No providers found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => handleSelectProvider(provider)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          selectedProvider?.id === provider.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <Stethoscope className="h-5 w-5 text-primary-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {provider.full_name}
                              </div>
                              {provider.organization_name && (
                                <div className="text-sm text-gray-500 truncate flex items-center mt-0.5">
                                  <Building2 className="h-3 w-3 mr-1 flex-shrink-0" />
                                  {provider.organization_name}
                                </div>
                              )}
                              {provider.email && (
                                <div className="text-xs text-gray-400 mt-0.5 truncate">
                                  {provider.email}
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedProvider?.id === provider.id && (
                            <Check className="h-5 w-5 text-primary-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!selectedProvider && !isOpen && (
        <p className="mt-1 text-xs text-gray-500">
          Search and select your healthcare provider
        </p>
      )}
    </div>
  );
}

