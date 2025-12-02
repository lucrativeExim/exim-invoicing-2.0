'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/formComponents';
import { authService } from '@/services/authService';

const Header = ({ user }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/control-room/users') return 'Users';
    if (pathname === '/dashboard/control-room/accounts') return 'Accounts';
    if (pathname === '/dashboard/control-room/gst-rates') return 'GST Rates';
    if (pathname === '/dashboard/control-room/fields-master') return 'Fields Master';
    if (pathname === '/dashboard/control-room/job-register') return 'Job Register';
    if (pathname === '/dashboard/control-room/job-register/add') return 'Add Job Register';
    if (pathname?.startsWith('/dashboard/control-room/job-register/edit/')) return 'Edit Job Register';
    
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
      
      <div className="flex items-center space-x-3">
        {user && (
          <>
            <div className="hidden sm:flex items-center space-x-2 text-right">
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
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;



