'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AccountContext = createContext();

const STORAGE_KEY = 'selectedAccount';

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};

export const AccountProvider = ({ children }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load selected account from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSelectedAccount(parsed);
        } catch (e) {
          console.error('Error parsing stored account:', e);
        }
      }
      setLoading(false);
    }
  }, []);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event) => {
      // Only handle changes to our storage key
      if (event.key === STORAGE_KEY) {
        if (event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            setSelectedAccount(parsed);
          } catch (e) {
            console.error('Error parsing storage event value:', e);
          }
        } else {
          // Account was removed
          setSelectedAccount(null);
        }
      }
    };

    // Add storage event listener for cross-tab synchronization
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save selected account to localStorage when it changes
  const selectAccount = useCallback((account) => {
    setSelectedAccount(account);
    if (typeof window !== 'undefined') {
      if (account) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Get display name for the selected account
  const getSelectedAccountDisplayName = useCallback(() => {
    if (!selectedAccount) return 'Select Account';
    if (selectedAccount.id === 'all') return 'All Accounts';
    return selectedAccount.account_name;
  }, [selectedAccount]);

  // Check if "All Accounts" is selected
  const isAllAccountsSelected = useCallback(() => {
    return selectedAccount?.id === 'all';
  }, [selectedAccount]);

  // Get the selected accounts list (all accounts if "All Accounts" selected, otherwise just the selected one)
  const getSelectedAccountsList = useCallback(() => {
    if (!selectedAccount) return [];
    if (selectedAccount.id === 'all') {
      return accounts;
    }
    return [selectedAccount];
  }, [selectedAccount, accounts]);

  const value = {
    accounts,
    setAccounts,
    selectedAccount,
    selectAccount,
    loading,
    setLoading,
    getSelectedAccountDisplayName,
    isAllAccountsSelected,
    getSelectedAccountsList,
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
};

export default AccountContext;
