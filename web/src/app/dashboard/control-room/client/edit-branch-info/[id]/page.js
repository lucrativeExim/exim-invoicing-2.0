'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Input, Button, SelectBox } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

const CLIENT_TYPES = [
  { value: 'DTA', label: 'DTA' },
  { value: 'SEZ', label: 'SEZ' },
  { value: 'EOU', label: 'EOU' },
  { value: 'MOOWR', label: 'MOOWR' },
];

const SC_I_OPTIONS = [
  { value: 'SC', label: 'SC' },
  { value: 'I', label: 'I' },
  { value: 'EXEMPTED', label: 'EXEMPTED' },
];

export default function EditBranchInfoPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [states, setStates] = useState([]);
  const [formData, setFormData] = useState({
    client_info_id: '',
    bu_name: '',
    client_type: '',
    state_id: '',
    city: '',
    pincode: '',
    branch_code: '',
    address: '',
    gst_no: '',
    sc_i: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState({});
  const { toast, success, error: showError, hideToast } = useToast();

  const fetchClients = useCallback(async () => {
    try {
      const response = await api.get('/client-info');
      setClients(response.data.filter(client => client.status === 'Active'));
    } catch (err) {
      console.error('Error fetching clients:', err);
      showError(err.response?.data?.error || 'Failed to fetch clients');
    }
  }, [showError]);

  const fetchStates = useCallback(async () => {
    try {
      const response = await api.get('/states');
      setStates(response.data);
    } catch (err) {
      console.error('Error fetching states:', err);
      showError(err.response?.data?.error || 'Failed to fetch states');
    }
  }, [showError]);

  const fetchBranchInfo = useCallback(async () => {
    try {
      const response = await api.get(`/client-bu/${branchId}`);
      const data = response.data;
      setFormData({
        client_info_id: data.client_info_id || '',
        bu_name: data.bu_name || '',
        client_type: data.client_type || '',
        state_id: data.state_id || '',
        city: data.city || '',
        pincode: data.pincode || '',
        branch_code: data.branch_code || '',
        address: data.address || '',
        gst_no: data.gst_no || '',
        sc_i: data.sc_i || '',
        status: data.status || 'Active',
      });
    } catch (err) {
      console.error('Error fetching branch info:', err);
      showError(err.response?.data?.error || 'Failed to fetch branch info');
      router.push('/dashboard/control-room/client');
    }
  }, [branchId, router, showError]);

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    
    Promise.all([fetchClients(), fetchStates(), fetchBranchInfo()])
      .finally(() => setLoading(false));
  }, [router, fetchClients, fetchStates, fetchBranchInfo]);

  // Auto-select EXEMPTED when client_type is SEZ
  useEffect(() => {
    if (formData.client_type === 'SEZ' && formData.sc_i !== 'EXEMPTED') {
      setFormData(prev => ({ ...prev, sc_i: 'EXEMPTED' }));
    }
  }, [formData.client_type, formData.sc_i]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    if (name === 'gst_no') {
      processedValue = value.toUpperCase();
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }

    if (name === 'pincode' && processedValue) {
      const pincodeValidation = validatePincode(processedValue);
      if (!pincodeValidation.valid) {
        setErrors((prev) => ({ ...prev, pincode: pincodeValidation.message }));
      }
    }
    
    if (name === 'gst_no' && processedValue) {
      const gstValidation = validateGSTNo(processedValue);
      if (!gstValidation.valid) {
        setErrors((prev) => ({ ...prev, gst_no: gstValidation.message }));
      }
    }
  };

  const validateGSTNo = (gst_no) => {
    if (!gst_no) return { valid: true, message: '' };
    const cleaned = gst_no.trim().toUpperCase();
    if (cleaned.length !== 15) {
      return { valid: false, message: 'GST number must be exactly 15 characters' };
    }
    const gstPattern = /^[0-9]{2}[A-Z0-9]{10}[A-Z0-9]{1}Z[0-9]{1}$/;
    if (!gstPattern.test(cleaned)) {
      return { valid: false, message: 'Invalid GST format. Format: 27ABCDE1234F1Z5' };
    }
    return { valid: true, message: '' };
  };

  const validatePincode = (pincode) => {
    if (!pincode) return { valid: true, message: '' };
    const cleaned = String(pincode).trim();
    if (cleaned.length !== 6) {
      return { valid: false, message: 'Pincode must be exactly 6 digits' };
    }
    if (!/^[0-9]{6}$/.test(cleaned)) {
      return { valid: false, message: 'Pincode must contain only digits' };
    }
    return { valid: true, message: '' };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.client_info_id) {
      newErrors.client_info_id = 'Client name is required';
    }

    if (!formData.bu_name?.trim()) {
      newErrors.bu_name = 'BU/DIV is required';
    }

    if (!formData.client_type) {
      newErrors.client_type = 'Client type is required';
    }

    if (!formData.gst_no?.trim()) {
      newErrors.gst_no = 'GST No is required';
    } else {
      const gstValidation = validateGSTNo(formData.gst_no);
      if (!gstValidation.valid) {
        newErrors.gst_no = gstValidation.message;
      }
    }

    if (!formData.sc_i) {
      newErrors.sc_i = 'S-C or I is required';
    }

    if (formData.pincode) {
      const pincodeValidation = validatePincode(formData.pincode);
      if (!pincodeValidation.valid) {
        newErrors.pincode = pincodeValidation.message;
      }
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
      await api.put(`/client-bu/${branchId}`, formData);
      success('Branch info updated successfully');
      router.push('/dashboard/control-room/client');
    } catch (err) {
      console.error('Error updating branch info:', err);
      showError(err.response?.data?.error || 'Failed to update branch info');
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Branch Info</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Update branch/division information</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectBox
              label="Client Name"
              name="client_info_id"
              value={formData.client_info_id}
              onChange={handleChange}
              options={clients.map(client => ({
                value: client.id,
                label: client.client_name,
              }))}
              placeholder="Select Client"
              error={errors.client_info_id}
              required
            />
            <Input
              label="BU/DIV"
              name="bu_name"
              value={formData.bu_name}
              onChange={handleChange}
              error={errors.bu_name}
              placeholder="Business Unit / Division"
              required
            />
            <SelectBox
              label="Client Type"
              name="client_type"
              value={formData.client_type}
              onChange={handleChange}
              options={CLIENT_TYPES}
              placeholder="Select Client Type"
              error={errors.client_type}
              required
            />
            <SelectBox
              label="State"
              name="state_id"
              value={formData.state_id}
              onChange={handleChange}
              options={states.map(state => ({
                value: state.id,
                label: state.state_name,
              }))}
              placeholder="Select State"
              error={errors.state_id}
            />
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              error={errors.city}
            />
            <Input
              label="Pin Code"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              error={errors.pincode}
              placeholder="6 digits"
              maxLength={6}
            />
            <Input
              label="Branch Code"
              name="branch_code"
              value={formData.branch_code}
              onChange={handleChange}
              error={errors.branch_code}
            />
            <Input
              label="GST No"
              name="gst_no"
              value={formData.gst_no}
              onChange={handleChange}
              error={errors.gst_no}
              placeholder="27ABCDE1234F1Z5"
              maxLength={15}
              required
            />
            <SelectBox
              label="S-C or I"
              name="sc_i"
              value={formData.sc_i}
              onChange={handleChange}
              options={SC_I_OPTIONS}
              placeholder="Select S-C or I"
              error={errors.sc_i}
              isDisabled={formData.client_type === 'SEZ'}
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
            <div className="md:col-span-2">
              <div className="mb-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  rows={3}
                  className={`input-field ${errors.address ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Enter full address"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>
            </div>
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

