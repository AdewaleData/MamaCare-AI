import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useTranslation } from '../contexts/TranslationContext';
import UniversalVoiceAssistant from './UniversalVoiceAssistant';
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
  Menu,
  X,
  MessageCircle,
  Stethoscope,
} from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
      console.log('Changing language to:', lang);
      
      // Update user in store immediately for instant UI update
      const updatedUser = { ...user, language_preference: lang };
      setAuth(updatedUser, localStorage.getItem('access_token') || '');
      
      // Force remove all translation queries and refetch
      queryClient.removeQueries({ queryKey: ['translations'] });
      
      // Small delay to ensure state is updated, then refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['translations'] });
        queryClient.refetchQueries({ queryKey: ['translations', lang] });
      }, 100);
      
      // Then update on backend (async, don't wait)
      updateLanguageMutation.mutate({
        ...user,
        language_preference: lang,
      }, {
        onSuccess: (data) => {
          console.log('Backend updated, new user data:', data);
          // Update auth store with fresh data from backend
          const token = localStorage.getItem('access_token');
          if (token) {
            setAuth(data, token);
          }
          // Force refetch translations with new language
          queryClient.removeQueries({ queryKey: ['translations'] });
          queryClient.refetchQueries({ queryKey: ['translations', lang] });
        },
        onError: (error) => {
          console.error('Error updating language:', error);
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
        { name: 'MamaCare Chat', href: '/app/chat', icon: MessageCircle },
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
      { name: 'MamaCare Chat', href: '/app/chat', icon: MessageCircle },
      { name: 'Find Providers', href: '/app/providers', icon: Stethoscope },
      { name: 'Hospitals', href: '/app/hospitals', icon: Building2 },
      { name: 'Emergency', href: '/app/emergency', icon: AlertTriangle },
      { name: 'Subscriptions', href: '/app/subscriptions', icon: CreditCard },
      { name: 'Profile', href: '/app/profile', icon: User },
    ];
  };

  const navigation = getNavigation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      {/* Mobile menu button - hidden on desktop */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
            <img src="/logo.png" alt="MamaCare AI Logo" className="h-6 w-6 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-gradient">MamaCare AI</h1>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-gray-700 hover:bg-gray-100/80 transition-all duration-200 active:scale-95"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl">
                    <img src="/logo.png" alt="MamaCare AI Logo" className="h-6 w-6 object-contain" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">MamaCare AI</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200
                        ${active
                          ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 shadow-sm border-l-4 border-primary-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-gray-200 p-4 space-y-3">
                <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    <Globe className="inline h-3 w-3 mr-1" />
                    {t('language', 'Language')}
                  </label>
                  <select
                    value={user?.language_preference || 'en'}
                    onChange={(e) => {
                      handleLanguageChange(e.target.value);
                      queryClient.invalidateQueries({ queryKey: ['translations'] });
                    }}
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 bg-white transition-all"
                    disabled={updateLanguageMutation.isPending}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 border-2 border-gray-200 hover:border-gray-300"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 glass-card border-r border-gray-200/50 backdrop-blur-xl bg-white/95">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-8 fade-in">
              <div className="flex items-center space-x-3 group">
                <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300 float">
                  <img src="/logo.png" alt="MamaCare AI Logo" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-gradient">MamaCare AI</span>
                  <p className="text-xs text-gray-500 mt-0.5">Health & Wellness</p>
                </div>
              </div>
            </div>
            
            <nav className="mt-2 flex-1 px-4 space-y-1.5">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300
                      transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden
                      ${active
                        ? 'bg-gradient-to-r from-primary-50 via-primary-100/80 to-primary-50 text-primary-700 shadow-lg border-l-4 border-primary-600'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/50 hover:text-gray-900 hover:shadow-md'
                      }
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent"></div>
                    )}
                    <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-all duration-300 relative z-10 ${active ? 'text-primary-600 scale-110' : 'text-gray-400 group-hover:text-primary-500 group-hover:scale-110'}`} />
                    <span className={`relative z-10 ${active ? 'font-bold' : ''}`}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex-shrink-0 border-t border-gray-200/50 p-4 space-y-3 bg-gradient-to-t from-gray-50/50 to-transparent">
              <div className="flex items-center space-x-3 pb-3 border-b border-gray-200/50">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              {/* Language Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  <Globe className="inline h-3 w-3 mr-1" />
                  {t('language', 'Language')}
                </label>
                <select
                  value={user?.language_preference || 'en'}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    console.log('Language selector changed to:', newLang);
                    handleLanguageChange(newLang);
                  }}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 bg-white transition-all duration-200 hover:border-gray-300"
                  disabled={updateLanguageMutation.isPending}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                {updateLanguageMutation.isPending && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                    <span className="inline-block w-2 h-2 bg-primary-500 rounded-full animate-pulse mr-1.5"></span>
                    Updating language...
                  </p>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50/80 transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-72 flex flex-col flex-1 pt-16 lg:pt-0">
          <main className="flex-1">
            <div className="py-6 lg:py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="fade-in">
                  <Outlet />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Universal Voice Assistant - works on all pages */}
      <UniversalVoiceAssistant />
    </div>
  );
}

