'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/formComponents';
import { authService } from '@/services/authService';
import { useAccount } from '@/context/AccountContext';

const Header = ({ user }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedAccount } = useAccount();
  const [clientName, setClientName] = useState(null);
  
  // Update client name when pathname changes or when client name is updated
  useEffect(() => {
    const updateClientName = () => {
      if (pathname?.match(/^\/dashboard\/control-room\/client\/\d+$/)) {
        if (typeof window !== 'undefined') {
          const name = sessionStorage.getItem('currentClientName');
          setClientName(name);
        }
      } else {
        setClientName(null);
      }
    };
    
    updateClientName();
    
    // Listen for custom event when client name is set
    const handleClientNameUpdate = () => {
      updateClientName();
    };
    
    window.addEventListener('clientNameUpdated', handleClientNameUpdate);
    
    return () => {
      window.removeEventListener('clientNameUpdated', handleClientNameUpdate);
    };
  }, [pathname]);
  
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/control-room/users') return 'Users';
    if (pathname === '/dashboard/control-room/accounts') return 'Accounts';
    if (pathname === '/dashboard/control-room/gst-rates') return 'GST Rates';
    if (pathname === '/dashboard/control-room/fields-master') return 'Fields Master';
    if (pathname === '/dashboard/control-room/job-register') return 'Job Register';
    if (pathname === '/dashboard/control-room/job-register/add') return 'Add Job Register';
    if (pathname?.startsWith('/dashboard/control-room/job-register/edit/')) return 'Edit Job Register';
    if (pathname === '/dashboard/job/job') return 'Job';
    if (pathname === '/dashboard/job/job/add') return 'Add Job';
    if (pathname === '/dashboard/my-profile') return 'My Profile';
    
    // Client profile page - show client name
    if (pathname?.match(/^\/dashboard\/control-room\/client\/\d+$/)) {
      if (clientName) {
        return clientName;
      }
      return 'Client Profile';
    }
    
    // Default fallback - extract from pathname
    const segments = pathname?.split('/').filter(Boolean);
    if (segments && segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      // Convert kebab-case to Title Case
      return lastSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Dashboard';
  };

  const handleBack = () => {
    router.back();
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const showBackButton = pathname !== '/dashboard';

  // Get selected account display text
  const getSelectedAccountText = () => {
    if (!selectedAccount) return 'Select Account';
    if (selectedAccount.id === 'all') return 'All Accounts';
    return selectedAccount.account_name;
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center space-x-3">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
      </div>

      {/* Selected Account Display - Center */}
      <div className="hidden md:flex items-center justify-center flex-1 mx-4">
        <div className="px-6 py-2">
          <span className="text-sm font-medium text-gray-900">{getSelectedAccountText()}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {user && (
          <>
            <button
              onClick={() => router.push('/dashboard/my-profile')}
              className="hidden sm:flex items-center space-x-2 text-right hover:bg-gray-50 rounded-lg p-1.5 -m-1.5 transition-colors"
              title="My Profile"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-xs">
                  {user.first_name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-red-50 transition-colors text-red-600"
              title="Logout"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;



