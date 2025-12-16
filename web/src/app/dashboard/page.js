'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/services/authService';
import { useAccount } from '@/context/AccountContext';
import accountService from '@/services/accountService';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { accounts, setAccounts, selectedAccount, selectAccount, setLoading } = useAccount();

  useEffect(() => {
    // Get user from localStorage
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    // Fetch accounts
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const data = await accountService.getAccounts();
        setAccounts(data.filter(acc => acc.status === 'Active'));
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [setAccounts, setLoading]);

  const handleAccountSelect = (account) => {
    selectAccount(account);
    setIsDropdownOpen(false);
  };

  const handleSelectAllAccounts = () => {
    // Store all accounts info when "All Accounts" is selected
    selectAccount({ id: 'all', account_name: 'All Accounts', allAccounts: accounts });
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* Welcome Section with Account Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back, {user?.first_name || 'User'}!
          </h1>
          <p className="text-sm text-gray-600">Manage your invoices and track your business operations</p>
        </div>
        
        {/* Account Selection Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-full sm:w-64 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-primary-500 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all"
          >
            <span className="truncate">
              {selectedAccount ? (selectedAccount.id === 'all' ? 'All Accounts' : selectedAccount.account_name) : 'Select Account Name'}
            </span>
            <svg
              className={`w-5 h-5 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
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
              <div className="absolute right-0 z-20 mt-2 w-full sm:w-64 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Total Invoices</p>
              <p className="text-xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Paid</p>
              <p className="text-xl font-bold text-gray-900">0</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">$0</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* User Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
        {user && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <p className="text-sm text-gray-900">
                {user.first_name} {user.last_name}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <p className="text-sm text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
              <p className="text-sm text-gray-900">{user.mobile || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <p className="text-sm text-gray-900">{user.user_role || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Authority</label>
              <p className="text-sm text-gray-900">{user.authority || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                user.status === 'Active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
