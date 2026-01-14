'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { accessControl } from '@/services/accessControl';

// Import logo from assets/images folder
// Make sure to add logo.png file to: web/src/assets/images/logo.png
import logoImage from '@/assets/images/logo.png';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setCanManageUsers(accessControl.canManageUsers());
    
    // Auto-expand Control Room menu if on control-room page
    if (pathname.startsWith('/dashboard/control-room')) {
      setExpandedMenus((prev) => ({
        ...prev,
        'Control Room': true,
      }));
    }
    
    // Auto-expand Job menu if on job page
    if (pathname.startsWith('/dashboard/job')) {
      setExpandedMenus((prev) => ({
        ...prev,
        'Job': true,
      }));
    }
    
    // Auto-expand Invoice menu if on invoice page
    if (pathname.startsWith('/dashboard/invoice')) {
      setExpandedMenus((prev) => ({
        ...prev,
        'Invoice': true,
      }));
    }
    
  }, [pathname]);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      path: '/dashboard',
    },
    {
      name: 'Customers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      path: '/customers',
    },
    {
      name: 'Products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      path: '/products',
    },
    {
      name: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/reports',
    },
    ...(canManageUsers
      ? [
          {
            name: 'Control Room',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ),
            path: '/dashboard/control-room',
            children: [
              {
                name: 'Users',
                path: '/dashboard/control-room/users',
              },
              {
                name: 'Accounts',
                path: '/dashboard/control-room/accounts',
              },
              {
                name: 'GST Rates',
                path: '/dashboard/control-room/gst-rates',
              },
              {
                name: 'Fields Master',
                path: '/dashboard/control-room/fields-master',
              },
              {
                name: 'Job Register',
                path: '/dashboard/control-room/job-register',
              },
              {
                name: 'Client',
                path: '/dashboard/control-room/client',
              },
            ],
          },
        ]
      : []),
      {
        name: 'Job',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
        path: '/dashboard/job/job',
        children: [
          {
            name: 'job',
            path: '/dashboard/job/job',
          },
        ],
      },
      {
        name: 'Invoice',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        path: '/dashboard/invoice/invoice-creation',
        children: [
          {
            name: 'Invoice Creation',
            path: '/dashboard/invoice/invoice-creation',
          },
          {
            name: 'Invoices',
            path: '/dashboard/invoice/invoices',
          },
        ],
      },
    {
      name: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: '/settings',
    },
  ];

  const toggleMenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const isMenuActive = (item) => {
    if (item.path === pathname) return true;
    if (item.children) {
      return item.children.some((child) => child.path === pathname);
    }
    return false;
  };

  const isMenuExpanded = (menuName) => {
    return expandedMenus[menuName] || false;
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 bg-yellow-50">
              {!logoError ? (
                <Image
                  src={logoImage}
                  alt="Lucrative Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-full h-full bg-yellow-400 rounded-lg flex items-center justify-center">
                  <div className="w-5 h-5 bg-yellow-500 rounded-full"></div>
                </div>
              )}
            </div>
            <span className="font-bold text-gray-900 text-sm">Lucrative</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto overflow-hidden bg-yellow-50">
            {!logoError ? (
              <Image
                src={logoImage}
                alt="Lucrative Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full bg-yellow-400 rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-yellow-500 rounded-full"></div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = isMenuActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = hasChildren && isMenuExpanded(item.name);

            return (
              <li key={item.name}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      title={isCollapsed ? item.name : ''}
                    >
                      <span className={`flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="text-sm font-medium flex-1 text-left">{item.name}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                    {!isCollapsed && isExpanded && (
                      <ul className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.path;
                          return (
                            <li key={child.name}>
                              <Link
                                href={child.path}
                                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                  isChildActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                <span className="text-sm font-medium capitalize">{child.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.path}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={isCollapsed ? item.name : ''}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-sm font-medium flex-1 capitalize">{item.name}</span>
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;



