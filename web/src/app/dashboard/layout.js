'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/authService';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AccountProvider } from '@/context/AccountContext';
import { PageTitleProvider } from '@/context/PageTitleContext';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check authentication
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Get user from localStorage
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, [router]);

  // Collapse sidebar by default when on invoice view page
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/invoice/invoices/view/')) {
      setSidebarCollapsed(true);
    }
  }, [pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AccountProvider>
      <PageTitleProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Sidebar - Fixed */}
          <Sidebar isCollapsed={sidebarCollapsed} onToggle={toggleSidebar} />

          {/* Header - Fixed */}
          <Header user={user} sidebarCollapsed={sidebarCollapsed} />

          {/* Main Content */}
          <main 
            className="overflow-y-auto p-4 transition-all duration-300" 
            style={{ 
              marginLeft: sidebarCollapsed ? '64px' : '256px',
              marginTop: '56px',
              minHeight: 'calc(100vh - 56px)'
            }}
          >
            {children}
          </main>
        </div>
      </PageTitleProvider>
    </AccountProvider>
  );
}

