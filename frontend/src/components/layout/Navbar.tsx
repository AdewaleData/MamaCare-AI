import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  ChevronDownIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface NavbarProps {
  onMenuClick: () => void;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
];

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(languages[0]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden -m-2.5 p-2.5 text-neutral-700"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Logo */}
            <Link to="/dashboard" className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MC</span>
                </div>
              </div>
              <div className="ml-3 hidden sm:block">
                <h1 className="text-xl font-bold text-neutral-900">MamaCare AI</h1>
              </div>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language selector */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-1 text-sm text-neutral-700 hover:text-neutral-900"
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
              >
                <GlobeAltIcon className="h-4 w-4" />
                <span className="hidden sm:block">{currentLanguage.flag}</span>
                <ChevronDownIcon className="h-3 w-3" />
              </button>

              {languageMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      className={clsx(
                        'flex w-full items-center px-4 py-2 text-sm',
                        currentLanguage.code === lang.code
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      )}
                      onClick={() => {
                        setCurrentLanguage(lang);
                        setLanguageMenuOpen(false);
                      }}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <button
              type="button"
              className="relative rounded-full bg-white p-1 text-neutral-400 hover:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-danger-500 rounded-full"></span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-2 text-sm text-neutral-700 hover:text-neutral-900"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden sm:block">{user?.full_name}</span>
                <ChevronDownIcon className="h-3 w-3" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <Link
                    to="/pregnancy"
                    className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Pregnancy Info
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
