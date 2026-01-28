'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { usePageTitle } from '@/context/PageTitleContext';
import { useAccount } from '@/context/AccountContext';
import accountService from '@/services/accountService';

const Header = ({ user, sidebarCollapsed = false }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { pageTitle } = usePageTitle();
  const { accounts, setAccounts, selectedAccount, selectAccount, setLoading, getSelectedAccountDisplayName } = useAccount();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch accounts if not already loaded
  useEffect(() => {
    const fetchAccounts = async () => {
      if (accounts.length === 0) {
        try {
          setLoading(true);
          const data = await accountService.getAccounts();
          setAccounts(data.filter(acc => acc.status === 'Active'));
        } catch (error) {
          console.error('Error fetching accounts:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAccounts();
  }, [accounts.length, setAccounts, setLoading]);
  
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/control-room/users') return 'Users';
    if (pathname === '/dashboard/control-room/accounts') return 'Accounts';
    if (pathname === '/dashboard/control-room/gst-rates') return 'GST Rates';
    if (pathname === '/dashboard/control-room/fields-master') return 'Fields Master';
    if (pathname === '/dashboard/control-room/job-register') return 'Job Register';
    if (pathname === '/dashboard/control-room/job-register/add') return 'Add Job Register';
    if (pathname?.startsWith('/dashboard/control-room/job-register/edit/')) return 'Edit Job Register';
    if (pathname === '/dashboard/my-profile') return 'My Profile';
    
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

  // Use custom pageTitle if set, otherwise use default getPageTitle()
  const displayTitle = pageTitle || getPageTitle();

  const handleBack = () => {
    router.back();
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const handleAccountSelect = (account) => {
    selectAccount(account);
    setIsDropdownOpen(false);
  };

  const handleSelectAllAccounts = () => {
    // Store all accounts info when "All Accounts" is selected
    selectAccount({ id: 'all', account_name: 'All Accounts', allAccounts: accounts });
    setIsDropdownOpen(false);
  };

  const showBackButton = pathname !== '/dashboard';
  const selectedAccountName = getSelectedAccountDisplayName();

  return (
    <header 
      className="fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20 transition-all duration-300" 
      style={{ left: sidebarCollapsed ? '64px' : '256px' }}
    >
      {/* Left Section */}
      <div className="flex items-center space-x-3 flex-1">
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
        <h1 className="text-lg font-semibold text-gray-900">{displayTitle}</h1>
      </div>
      
      {/* Center Section - Account Selection Dropdown */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-primary-50 rounded-lg border border-primary-200 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all"
          >
            <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm font-medium text-primary-700 whitespace-nowrap">
              {selectedAccountName || 'Select Account'}
            </span>
            <svg
              className={`w-4 h-4 text-primary-600 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              
              {/* Dropdown content */}
              <div className="absolute left-1/2 -translate-x-1/2 z-20 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                {/* All Accounts Option */}
                <button
                  onClick={handleSelectAllAccounts}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between ${
                    selectedAccount?.id === 'all' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span>All Accounts</span>
                  {selectedAccount?.id === 'all' && (
                    <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-100" />
                
                {/* Individual Accounts */}
                {accounts.length > 0 ? (
                  accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account)}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 transition-colors flex items-center justify-between ${
                        selectedAccount?.id === account.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="truncate">{account.account_name}</span>
                      {selectedAccount?.id === account.id && (
                        <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No accounts available
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center space-x-3 flex-1 justify-end">
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
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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



