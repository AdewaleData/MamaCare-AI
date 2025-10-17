import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  HomeIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  PhoneIcon,
  UserIcon,
  BookOpenIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Health Records', href: '/health/records', icon: HeartIcon },
  { name: 'Risk Assessment', href: '/risk/history', icon: ExclamationTriangleIcon },
  { name: 'Appointments', href: '/appointments', icon: CalendarDaysIcon },
  { name: 'Emergency', href: '/emergency', icon: PhoneIcon },
  { name: 'Education', href: '/education', icon: BookOpenIcon },
  { name: 'Profile', href: '/profile', icon: UserIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200">
            <Link to="/dashboard" className="flex items-center">
              <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <span className="ml-3 text-lg font-bold text-neutral-900">MamaCare AI</span>
            </Link>
            <button
              type="button"
              className="text-neutral-400 hover:text-neutral-600"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                  onClick={onClose}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-primary-500' : 'text-neutral-400 group-hover:text-neutral-500'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-neutral-200">
          {/* Header */}
          <div className="flex h-16 items-center px-4 border-b border-neutral-200">
            <Link to="/dashboard" className="flex items-center">
              <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <span className="ml-3 text-lg font-bold text-neutral-900">MamaCare AI</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col px-4 py-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={clsx(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                      )}
                    >
                      <item.icon
                        className={clsx(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          isActive ? 'text-primary-500' : 'text-neutral-400 group-hover:text-neutral-500'
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};
