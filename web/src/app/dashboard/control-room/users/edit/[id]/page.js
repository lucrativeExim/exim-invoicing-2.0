'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import UserForm from '../../UserForm';
import api from '@/services/api';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [jobRegisters, setJobRegisters] = useState([]);
  const [jobRegistersLoading, setJobRegistersLoading] = useState(false);
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

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      const userData = response.data;
      
      // Convert comma-separated strings to arrays
      const authorities = !userData.authority 
        ? [] 
        : Array.isArray(userData.authority)
          ? userData.authority
          : typeof userData.authority === 'string'
            ? userData.authority.split(',').map(a => a.trim()).filter(Boolean)
            : [];

      const jobRegisterIds = !userData.job_register_ids
        ? []
        : typeof userData.job_register_ids === 'string'
          ? userData.job_register_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
          : Array.isArray(userData.job_register_ids)
            ? userData.job_register_ids.map(id => parseInt(id)).filter(id => !isNaN(id))
            : [];

      setUser(userData);
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        password: '', // Don't populate password when editing
        mobile: userData.mobile || '',
        user_role: userData.user_role || '',
        authority: authorities,
        job_register_ids: jobRegisterIds,
      });
    } catch (err) {
      console.error('Error fetching user:', err);
      showError(err.response?.data?.error || 'Failed to fetch user');
      router.push('/dashboard/control-room/users');
    }
  }, [userId, showError, router]);

  const fetchJobRegisters = useCallback(async () => {
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
  }, [showError]);

  useEffect(() => {
    if (!accessControl.canManageUsers()) {
      router.push('/dashboard');
      return;
    }
    
    if (userId) {
      fetchUser();
      fetchJobRegisters();
      setLoading(false);
    }
  }, [userId, router, fetchUser, fetchJobRegisters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password is only required when creating a new user
    if (formData.password && formData.password.length < 6) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
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
      if (!submitData.password) {
        delete submitData.password;
      }

      await api.put(`/users/${userId}`, submitData);
      success('User updated successfully');
      router.push('/dashboard/control-room/users');
    } catch (err) {
      console.error('Error updating user:', err);
      showError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/control-room/users');
  };

  if (loading || !user) {
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <button
            onClick={() => router.push('/dashboard/control-room/users')}
            className="mr-3 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Update user information</p>
      </div>

      {/* Form */}
      <UserForm
        formData={formData}
        errors={errors}
        editingUserId={userId}
        jobRegisters={jobRegisters}
        jobRegistersLoading={jobRegistersLoading}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
}

