import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  HomeIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const mobileNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Health', href: '/health/records', icon: HeartIcon },
  { name: 'Risk', href: '/risk/history', icon: ExclamationTriangleIcon },
  { name: 'Appointments', href: '/appointments', icon: CalendarDaysIcon },
  { name: 'Profile', href: '/profile', icon: UserIcon },
];

export const MobileLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40">
      <nav className="flex items-center justify-around py-2">
        {mobileNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex flex-col items-center py-2 px-3 rounded-lg transition-colors',
                isActive
                  ? 'text-primary-600'
                  : 'text-neutral-500 hover:text-neutral-700'
              )}
            >
              <item.icon
                className={clsx(
                  'h-6 w-6 mb-1',
                  isActive ? 'text-primary-600' : 'text-neutral-500'
                )}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
