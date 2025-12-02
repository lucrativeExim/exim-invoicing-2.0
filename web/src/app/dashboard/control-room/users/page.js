'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import UserForm from './UserForm';
import api from '@/services/api';

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [jobRegisters, setJobRegisters] = useState([]);
  const [jobRegistersLoading, setJobRegistersLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    mobile: '',
    user_role: '',
    authority: [],
    job_register_ids: [],
  });
  const [errors, setErrors] = useState({});
  const { toast, success, error: showError, hideToast } = useToast();

  useEffect(() => {
    // Check if user has permission to access this page
    if (!accessControl.canManageUsers()) {
      router.push('/dashboard');
      return;
    }
    
    setLoading(false);

    // Fetch users and job registers
    fetchUsers();
    fetchJobRegisters();
  }, [router]);

  const fetchUsers = async () => {
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
  };

  const fetchJobRegisters = async () => {
    setJobRegistersLoading(true);
    try {
      const response = await api.get('/job-register?activeOnly=true');
      setJobRegisters(response.data);
    } catch (err) {
      console.error('Error fetching job registers:', err);
      showError(err.response?.data?.error || 'Failed to fetch job registers');
    } finally {
      setJobRegistersLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const isEditing = !!editingUserId;

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password is only required when creating a new user
    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.user_role) {
      newErrors.user_role = 'User role is required';
    }

    if (!formData.authority || formData.authority.length === 0) {
      newErrors.authority = 'At least one authority is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (user) => {
    // Convert comma-separated strings to arrays
    const authorities = !user.authority 
      ? [] 
      : Array.isArray(user.authority)
        ? user.authority
        : typeof user.authority === 'string'
          ? user.authority.split(',').map(a => a.trim()).filter(Boolean)
          : [];

    const jobRegisterIds = !user.job_register_ids
      ? []
      : typeof user.job_register_ids === 'string'
        ? user.job_register_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        : Array.isArray(user.job_register_ids)
          ? user.job_register_ids.map(id => parseInt(id)).filter(id => !isNaN(id))
          : [];

    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '', // Don't populate password when editing
      mobile: user.mobile || '',
      user_role: user.user_role || '',
      authority: authorities,
      job_register_ids: jobRegisterIds,
    });
    setEditingUserId(user.id);
    setShowAddForm(true);
    setErrors({});
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingUserId(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      mobile: '',
      user_role: '',
      authority: [],
      job_register_ids: [],
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const isEditing = !!editingUserId;
      
      // Convert authority array to comma-separated string for backend
      // job_register_ids should be sent as array (will be converted to string in backend)
      const submitData = {
        ...formData,
        authority: Array.isArray(formData.authority) 
          ? formData.authority.join(',') 
          : formData.authority,
        job_register_ids: Array.isArray(formData.job_register_ids) 
          ? formData.job_register_ids 
          : [],
      };

      // Remove password if it's empty when editing
      if (isEditing && !submitData.password) {
        delete submitData.password;
      }

      if (isEditing) {
        await api.put(`/users/${editingUserId}`, submitData);
        success('User updated successfully');
      } else {
        await api.post('/users', submitData);
        success('User created successfully');
      }
      
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(`Error ${editingUserId ? 'updating' : 'creating'} user:`, err);
      showError(err.response?.data?.error || `Failed to ${editingUserId ? 'update' : 'create'} user`);
    }
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
      <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Users</h1>
              <p className="text-sm text-gray-600">Manage system users and their access</p>
            </div>
            <Button
              onClick={() => {
                if (showAddForm) {
                  resetForm();
                } else {
                  setShowAddForm(true);
                  setEditingUserId(null);
                }
              }}
              variant="primary"
            >
              {showAddForm ? 'Cancel' : 'Add New User'}
            </Button>
          </div>

      {/* Add/Edit User Form */}
      {showAddForm && (
        <UserForm
          formData={formData}
          errors={errors}
          editingUserId={editingUserId}
          jobRegisters={jobRegisters}
          jobRegistersLoading={jobRegistersLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
            </div>
            {usersLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              userItem.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : userItem.status === 'InActive'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {userItem.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userItem.created_at
                            ? new Date(userItem.created_at).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleEdit(userItem)}
                            className="text-sm"
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
    </>
  );
}

