import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useTranslation } from '../contexts/TranslationContext';
import {
  LayoutDashboard,
  Heart,
  FileText,
  AlertTriangle,
  User,
  LogOut,
  Baby,
  Activity,
  Globe,
  Calendar,
  Building2,
  CreditCard,
} from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  
  const handleLogout = React.useCallback(() => {
    // Clear all query cache immediately
    queryClient.clear();
    // Clear auth state
    logout();
    // Navigate immediately - use window.location for instant redirect
    window.location.href = '/login';
  }, [logout, queryClient]);
  const { t, language } = useTranslation();
  
  // Don't add redirect here - PrivateRoute already handles it
  // Adding redirect here can cause loops
  
  const updateLanguageMutation = useMutation({
    mutationFn: authApi.updateUser,
    onSuccess: (data) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        setAuth(data, token);
      }
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });

  const handleLanguageChange = React.useCallback((lang: string) => {
    if (user) {
      // Update user in store immediately for instant UI update
      const updatedUser = { ...user, language_preference: lang };
      setAuth(updatedUser, localStorage.getItem('access_token') || '');
      
      // Invalidate and remove old translations cache, then refetch with new language
      queryClient.removeQueries({ queryKey: ['translations'] });
      queryClient.refetchQueries({ queryKey: ['translations', lang] });
      
      // Then update on backend (async, don't wait)
      updateLanguageMutation.mutate({
        ...user,
        language_preference: lang,
      }, {
        onSuccess: () => {
          // After backend update, ensure translations are fresh
          queryClient.refetchQueries({ queryKey: ['translations', lang] });
        }
      });
    }
  }, [user, updateLanguageMutation, setAuth, queryClient]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
    { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
    { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  ];

  // Role-based navigation
  const getNavigation = () => {
    const role = user?.role || 'patient';
    
    if (role === 'provider') {
      return [
        { name: 'Provider Dashboard', href: '/app/provider-dashboard', icon: LayoutDashboard },
        { name: 'Profile', href: '/app/profile', icon: User },
      ];
    }
    
    if (role === 'government') {
      return [
        { name: 'Government Dashboard', href: '/app/government-dashboard', icon: LayoutDashboard },
        { name: 'Profile', href: '/app/profile', icon: User },
      ];
    }
    
    // Patient navigation
    return [
      { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
      { name: 'Recommendations', href: '/app/recommendations', icon: FileText },
      { name: 'Pregnancy', href: '/app/pregnancy', icon: Baby },
      { name: 'Health Records', href: '/app/health', icon: Heart },
      { name: 'Risk Assessment', href: '/app/risk-assessment', icon: Activity },
      { name: 'Appointments', href: '/app/appointments', icon: Calendar },
      { name: 'Hospitals', href: '/app/hospitals', icon: Building2 },
      { name: 'Emergency', href: '/app/emergency', icon: AlertTriangle },
      { name: 'Subscriptions', href: '/app/subscriptions', icon: CreditCard },
      { name: 'Profile', href: '/app/profile', icon: User },
    ];
  };

  const navigation = getNavigation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button - hidden on desktop */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/logo.jpeg" alt="MamaCare AI Logo" className="h-6 w-6 object-contain mr-2" />
          <h1 className="text-xl font-bold text-primary-600">MamaCare AI</h1>
        </div>
        <button
          type="button"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-8">
              <div className="flex items-center">
                <img src="/logo.jpeg" alt="MamaCare AI Logo" className="h-8 w-8 object-contain" />
                <span className="ml-2 text-2xl font-bold text-gray-900">MamaCare AI</span>
              </div>
            </div>
            
            <nav className="mt-5 flex-1 px-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                      ${active
                        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                
                {/* Language Selector */}
                <div className="mt-3 mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    <Globe className="inline h-3 w-3 mr-1" />
                    {t('language', 'Language')}
                  </label>
                  <select
                    value={user?.language_preference || 'en'}
                    onChange={(e) => {
                      handleLanguageChange(e.target.value);
                      // Invalidate translations query to refetch with new language
                      queryClient.invalidateQueries({ queryKey: ['translations'] });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    disabled={updateLanguageMutation.isPending}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  {updateLanguageMutation.isPending && (
                    <p className="text-xs text-gray-500 mt-1">Updating language...</p>
                  )}
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="mr-3 h-5 w-5 text-gray-400" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col flex-1">
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

