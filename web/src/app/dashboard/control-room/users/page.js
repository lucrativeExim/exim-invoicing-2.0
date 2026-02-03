'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import TableSearch from '@/components/TableSearch';
import { useTableSearch } from '@/hooks/useTableSearch';
import { usePagination } from '@/hooks/usePagination';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import Pagination from '@/components/Pagination';

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const { toast, success, error: showError, hideToast } = useToast();

  // Search functionality
  const searchFields = ['first_name', 'last_name', 'email', 'mobile', 'user_role'];
  const { searchTerm, setSearchTerm, filteredData: filteredUsers, suggestions } = useTableSearch(
    users,
    searchFields
  );

  // Pagination
  const pagination = usePagination(filteredUsers, { itemsPerPage: 10 });

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      showError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    // Check if user has permission to access this page
    if (!accessControl.canManageUsers()) {
      router.push('/dashboard');
      return;
    }
    
    setLoading(false);

    // Fetch users
    fetchUsers();
  }, [router, fetchUsers]);

  const handleEdit = (user) => {
    router.push(`/dashboard/control-room/users/edit/${user.id}`);
  };

  const formatUserRole = (role) => {
    if (!role) return 'N/A';
    return role.replace(/_/g, ' ');
  };

  const formatAuthority = (authority) => {
    if (!authority) return 'N/A';
    // Handle both string (comma-separated) and array formats
    const authorities = Array.isArray(authority) 
      ? authority 
      : typeof authority === 'string' 
        ? authority.split(',').map(a => a.trim()).filter(Boolean)
        : [authority];
    
    if (authorities.length === 0) return 'N/A';
    return authorities.map(a => a.replace(/_/g, ' ')).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      {/* Page Header */}
      <div className="mb-2 flex items-center justify-end">
            {/* <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Users</h1>
              <p className="text-sm text-gray-600">Manage system users and their access</p>
            </div> */}
            <Button
              onClick={() => router.push('/dashboard/control-room/users/add')}
              variant="primary"
            >
              Add New User
            </Button>
          </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
              <div className="w-80">
                <TableSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  suggestions={suggestions}
                  placeholder="Search users..."
                  data={users}
                  searchFields={searchFields}
                  maxSuggestions={5}
                  storageKey="users"
                />
              </div>
            </div>
            {usersLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'No users match your search' : 'No users found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Authority
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pagination.paginatedData.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => handleEdit(userItem)}
                            className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                            title="Edit"
                            aria-label="Edit user"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.first_name} {userItem.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{userItem.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{userItem.mobile || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {formatUserRole(userItem.user_role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const authorities = !userItem.authority 
                                ? [] 
                                : Array.isArray(userItem.authority)
                                  ? userItem.authority
                                  : typeof userItem.authority === 'string'
                                    ? userItem.authority.split(',').map(a => a.trim()).filter(Boolean)
                                    : [userItem.authority];
                              
                              if (authorities.length === 0) {
                                return <span className="text-sm text-gray-500">N/A</span>;
                              }
                              
                              return authorities.map((auth, idx) => (
                                <span 
                                  key={idx}
                                  className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800"
                                >
                                  {auth.replace(/_/g, ' ')}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!usersLoading && filteredUsers.length > 0 && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setCurrentPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
              />
            )}
          </div>
    </>
  );
}

