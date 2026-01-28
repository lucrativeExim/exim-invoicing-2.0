'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Input, Button, SelectBox } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

export default function AddClientInfoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [owners, setOwners] = useState([]);
  const [formData, setFormData] = useState({
    account_id: '',
    client_name: '',
    iec_no: '',
    alias: '',
    credit_terms: '',
    client_owner_ship: '',
  });
  const [errors, setErrors] = useState({});
  const { toast, success, error: showError, hideToast } = useToast();

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data.filter(acc => acc.status === 'Active'));
    } catch (err) {
      console.error('Error fetching accounts:', err);
      showError(err.response?.data?.error || 'Failed to fetch accounts');
    }
  }, [showError]);

  const fetchOwners = useCallback(async () => {
    try {
      const response = await api.get('/users');
      // Filter Super Admin and Admin users for owner dropdown
      const adminUsers = response.data.filter(
        user => (user.user_role === 'Super_Admin' || user.user_role === 'Admin') && user.status === 'Active'
      );
      setOwners(adminUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      showError(err.response?.data?.error || 'Failed to fetch users');
    }
  }, [showError]);

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    setLoading(false);
    fetchAccounts();
    fetchOwners();
  }, [router, fetchAccounts, fetchOwners]);

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

    if (!formData.account_id) {
      newErrors.account_id = 'Account name is required';
    }

    if (!formData.client_name?.trim()) {
      newErrors.client_name = 'Client name is required';
    }

    if (!formData.iec_no?.trim()) {
      newErrors.iec_no = 'IEC No is required';
    }

    if (!formData.client_owner_ship) {
      newErrors.client_owner_ship = 'Client owner ship is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      account_id: '',
      client_name: '',
      iec_no: '',
      alias: '',
      credit_terms: '',
      client_owner_ship: '',
    });
    setErrors({});
  };

  const handleSubmit = async (saveAndNext = false) => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/client-info', formData);
      success('Client info created successfully');
      
      if (saveAndNext) {
        // Navigate to Branch Info form with the new client ID
        router.push(`/dashboard/control-room/client/add-branch-info?clientId=${response.data.id}`);
      } else {
        router.push('/dashboard/control-room/client');
      }
    } catch (err) {
      console.error('Error creating client info:', err);
      showError(err.response?.data?.error || 'Failed to create client info');
    } finally {
      setSubmitting(false);
    }
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
            onClick={() => router.push('/dashboard/control-room/client')}
            className="mr-3 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add Client Info</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Create a new client information record</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectBox
              label="Account Name"
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              options={accounts.map(acc => ({
                value: acc.id,
                label: acc.account_name,
              }))}
              placeholder="Select Account"
              error={errors.account_id}
              required
            />
            <Input
              label="Client Name"
              name="client_name"
              value={formData.client_name}
              onChange={handleChange}
              error={errors.client_name}
              required
            />
            <Input
              label="IEC No"
              name="iec_no"
              value={formData.iec_no}
              onChange={handleChange}
              error={errors.iec_no}
              placeholder="Import Export Code"
              required
            />
            <Input
              label="Alias"
              name="alias"
              value={formData.alias}
              onChange={handleChange}
              error={errors.alias}
            />
            <Input
              label="Credit Terms"
              name="credit_terms"
              value={formData.credit_terms}
              onChange={handleChange}
              error={errors.credit_terms}
            />
            <SelectBox
              label="Client Owner Ship"
              name="client_owner_ship"
              value={formData.client_owner_ship}
              onChange={handleChange}
              options={owners.map(owner => ({
                value: String(owner.id),
                label: `${owner.first_name} ${owner.last_name} (${owner.user_role.replace('_', ' ')})`,
              }))}
              placeholder="Select Owner"
              error={errors.client_owner_ship}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/dashboard/control-room/client')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={submitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save & Next'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

