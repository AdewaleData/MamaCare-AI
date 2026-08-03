import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useTranslation } from '../contexts/TranslationContext';
import { useTheme } from '../contexts/ThemeContext';
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
  Moon,
  Sun,
} from 'lucide-react';

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

export default function Layout() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

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
  const getNavigationSections = (): NavigationSection[] => {
    const role = user?.role || 'patient';

    if (role === 'provider') {
      return [
        {
          title: 'Workspace',
          items: [
            { name: 'Provider Dashboard', href: '/app/provider-dashboard', icon: LayoutDashboard },
            { name: 'MamaCare Chat', href: '/app/chat', icon: MessageCircle },
          ],
        },
        {
          title: 'Account',
          items: [
            { name: 'Profile', href: '/app/profile', icon: User },
          ],
        },
      ];
    }

    if (role === 'government') {
      return [
        {
          title: 'Workspace',
          items: [
            { name: 'Government Dashboard', href: '/app/government-dashboard', icon: LayoutDashboard },
          ],
        },
        {
          title: 'Account',
          items: [
            { name: 'Profile', href: '/app/profile', icon: User },
          ],
        },
      ];
    }

    // Patient navigation
    return [
      {
        title: 'Overview',
        items: [
          { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
          { name: 'Recommendations', href: '/app/recommendations', icon: FileText },
        ],
      },
      {
        title: 'Care',
        items: [
          { name: 'Pregnancy', href: '/app/pregnancy', icon: Baby },
          { name: 'Health Records', href: '/app/health', icon: Heart },
          { name: 'Risk Assessment', href: '/app/risk-assessment', icon: Activity },
          { name: 'Appointments', href: '/app/appointments', icon: Calendar },
        ],
      },
      {
        title: 'Support',
        items: [
          { name: 'MamaCare Chat', href: '/app/chat', icon: MessageCircle },
          { name: 'Find Providers', href: '/app/providers', icon: Stethoscope },
          { name: 'Hospitals', href: '/app/hospitals', icon: Building2 },
          { name: 'Emergency', href: '/app/emergency', icon: AlertTriangle },
          { name: 'Subscriptions', href: '/app/subscriptions', icon: CreditCard },
        ],
      },
      {
        title: 'Account',
        items: [
          { name: 'Profile', href: '/app/profile', icon: User },
        ],
      },
    ];
  };

  const navigationSections = getNavigationSections();

  const isActive = (path: string) => location.pathname === path;

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const themeLabel = resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <div className="page-shell">
      {/* Mobile menu button - hidden on desktop */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50 px-4 py-3 flex items-center justify-between backdrop-blur-xl">
        <div className="flex items-center">
          <img src="/logo.png" alt="MamaCare AI Logo" className="h-8 w-8 object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-700 hover:bg-gray-100/80 transition-all duration-200 active:scale-95"
            aria-label={themeLabel}
            title={themeLabel}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
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
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-[86vw] max-w-sm bg-white shadow-2xl slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <img src="/logo.png" alt="MamaCare AI Logo" className="h-8 w-8 object-contain" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                    title={themeLabel}
                    aria-label={themeLabel}
                  >
                    {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-5">
                  {navigationSections.map((section) => (
                    <div key={section.title}>
                      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        {section.title}
                      </p>
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`
                                group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                                ${active
                                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }
                              `}
                              aria-current={active ? 'page' : undefined}
                            >
                              <span className={`
                                flex h-8 w-8 items-center justify-center rounded-lg transition-colors
                                ${active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-gray-700'}
                              `}>
                                <Icon className="h-4 w-4 flex-shrink-0" />
                              </span>
                              <span className="truncate">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </nav>

              <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50/70">
                <div className="flex items-center space-x-3 rounded-xl bg-white px-3 py-3 ring-1 ring-gray-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-semibold text-white">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">
                    <Globe className="inline h-3 w-3 mr-1" />
                    {t('language', 'Language')}
                  </label>
                  <select
                    value={user?.language_preference || 'en'}
                    onChange={(e) => {
                      handleLanguageChange(e.target.value);
                      queryClient.invalidateQueries({ queryKey: ['translations'] });
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
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
                  className="w-full flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
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
        <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-72 lg:flex-col border-r border-gray-200 bg-white/95 backdrop-blur-xl">
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
              <div className="flex items-center">
                <img src="/logo.png" alt="MamaCare AI Logo" className="h-10 w-10 object-contain" />
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-xl border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50"
                title={themeLabel}
                aria-label={themeLabel}
              >
                {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            <nav className="flex-1 px-3 py-5">
              <div className="space-y-6">
                {navigationSections.map((section) => (
                  <div key={section.title}>
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`
                              group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                              ${active
                                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                            aria-current={active ? 'page' : undefined}
                          >
                            <span className={`
                              flex h-8 w-8 items-center justify-center rounded-lg transition-colors
                              ${active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-gray-700'}
                            `}>
                              <Icon className="h-4 w-4 flex-shrink-0" />
                            </span>
                            <span className="truncate">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50/70 p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 rounded-xl bg-white px-3 py-3 ring-1 ring-gray-100">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-sm font-semibold text-white shadow-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">
                    <Globe className="mr-1 inline h-3 w-3" />
                    {t('language', 'Language')}
                  </label>
                  <select
                    value={user?.language_preference || 'en'}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      console.log('Language selector changed to:', newLang);
                      handleLanguageChange(newLang);
                    }}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    disabled={updateLanguageMutation.isPending}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  {updateLanguageMutation.isPending && (
                    <p className="mt-1.5 flex items-center text-xs text-gray-500">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary-500 animate-pulse"></span>
                      Updating language...
                    </p>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-72 flex flex-col flex-1 pt-16 lg:pt-0">
          <main className="flex-1">
            <div className="py-5 sm:py-6 lg:py-8">
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

