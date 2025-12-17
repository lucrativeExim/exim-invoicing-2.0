'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Input, Button, SelectBox } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

export default function EditClientInfoPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id;
  
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
    status: 'Active',
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
      const adminUsers = response.data.filter(
        user => (user.user_role === 'Super_Admin' || user.user_role === 'Admin') && user.status === 'Active'
      );
      setOwners(adminUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      showError(err.response?.data?.error || 'Failed to fetch users');
    }
  }, [showError]);

  const fetchClientInfo = useCallback(async () => {
    try {
      const response = await api.get(`/client-info/${clientId}`);
      const data = response.data;
      setFormData({
        account_id: data.account_id || '',
        client_name: data.client_name || '',
        iec_no: data.iec_no || '',
        alias: data.alias || '',
        credit_terms: data.credit_terms || '',
        client_owner_ship: data.client_owner_ship || '',
        status: data.status || 'Active',
      });
    } catch (err) {
      console.error('Error fetching client info:', err);
      showError(err.response?.data?.error || 'Failed to fetch client info');
      router.push('/dashboard/control-room/client');
    }
  }, [clientId, router, showError]);

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    
    Promise.all([fetchAccounts(), fetchOwners(), fetchClientInfo()])
      .finally(() => setLoading(false));
  }, [router, fetchAccounts, fetchOwners, fetchClientInfo]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/client-info/${clientId}`, formData);
      success('Client info updated successfully');
      router.push('/dashboard/control-room/client');
    } catch (err) {
      console.error('Error updating client info:', err);
      showError(err.response?.data?.error || 'Failed to update client info');
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Client Info</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Update client information</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit}>
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
            <SelectBox
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'InActive', label: 'Inactive' },
              ]}
              placeholder="Select Status"
              error={errors.status}
            />
          </div>
          
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/control-room/client')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

