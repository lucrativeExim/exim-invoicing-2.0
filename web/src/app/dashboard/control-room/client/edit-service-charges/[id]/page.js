'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Input, Button, SelectBox } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

export default function EditServiceChargesPage() {
  const router = useRouter();
  const params = useParams();
  const chargeId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [jobRegisters, setJobRegisters] = useState([]);
  const [formData, setFormData] = useState({
    group_id: '',
    account_id: '',
    client_info_id: '',
    client_bu_id: '',
    job_register_id: '',
    concern_person: '',
    concern_email_id: '',
    concern_phone_no: '',
    min: '',
    max: '',
    in_percentage: '',
    fixed: '',
    per_shb: '',
    ca_charges: '',
    ce_charges: '',
    registration_other_charges: '',
    invoice_description: '',
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

  const fetchAllClients = useCallback(async () => {
    try {
      const response = await api.get('/client-info');
      setClients(response.data.filter(client => client.status === 'Active'));
    } catch (err) {
      console.error('Error fetching clients:', err);
      showError(err.response?.data?.error || 'Failed to fetch clients');
    }
  }, [showError]);

  const fetchBranches = useCallback(async (clientInfoId) => {
    if (!clientInfoId) {
      setBranches([]);
      return;
    }
    try {
      const response = await api.get(`/client-bu/by-client/${clientInfoId}`);
      setBranches(response.data.filter(bu => bu.status === 'Active'));
    } catch (err) {
      console.error('Error fetching branches:', err);
      showError(err.response?.data?.error || 'Failed to fetch branches');
    }
  }, [showError]);

  const fetchJobRegisters = useCallback(async () => {
    try {
      const response = await api.get('/job-register?activeOnly=true');
      setJobRegisters(response.data);
    } catch (err) {
      console.error('Error fetching job registers:', err);
      showError(err.response?.data?.error || 'Failed to fetch job registers');
    }
  }, [showError]);

  const fetchServiceCharge = useCallback(async () => {
    try {
      const response = await api.get(`/client-service-charges/${chargeId}`);
      const data = response.data;
      setFormData({
        group_id: data.group_id || '',
        account_id: data.account_id || '',
        client_info_id: data.client_info_id || '',
        client_bu_id: data.client_bu_id || '',
        job_register_id: data.job_register_id || '',
        concern_person: data.concern_person || '',
        concern_email_id: data.concern_email_id || '',
        concern_phone_no: data.concern_phone_no || '',
        min: data.min || '',
        max: data.max || '',
        in_percentage: data.in_percentage || '',
        fixed: data.fixed || '',
        per_shb: data.per_shb || '',
        ca_charges: data.ca_charges || '',
        ce_charges: data.ce_charges || '',
        registration_other_charges: data.registration_other_charges || '',
        invoice_description: data.invoice_description || '',
        status: data.status || 'Active',
      });
      
      // Fetch branches for the selected client
      if (data.client_info_id) {
        fetchBranches(data.client_info_id);
      }
    } catch (err) {
      console.error('Error fetching service charge:', err);
      showError(err.response?.data?.error || 'Failed to fetch service charge');
      router.push('/dashboard/control-room/client');
    }
  }, [chargeId, router, showError, fetchBranches]);

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    
    Promise.all([
      fetchAccounts(),
      fetchAllClients(),
      fetchJobRegisters(),
      fetchServiceCharge(),
    ]).finally(() => setLoading(false));
  }, [router, fetchAccounts, fetchAllClients, fetchJobRegisters, fetchServiceCharge]);

  // Fetch branches when client changes
  useEffect(() => {
    if (formData.client_info_id && !loading) {
      fetchBranches(formData.client_info_id);
    }
  }, [formData.client_info_id, loading, fetchBranches]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Reset branch when client changes
    if (name === 'client_info_id') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        client_bu_id: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }

    if (name === 'concern_phone_no' && value) {
      const phoneValidation = validatePhoneNo(value);
      if (!phoneValidation.valid) {
        setErrors((prev) => ({ ...prev, concern_phone_no: phoneValidation.message }));
      }
    }
    
    if (name === 'concern_email_id' && value) {
      const emailValidation = validateEmails(value);
      if (!emailValidation.valid) {
        setErrors((prev) => ({ ...prev, concern_email_id: emailValidation.message }));
      }
    }
  };

  const validatePhoneNo = (phone_no) => {
    if (!phone_no) return { valid: true, message: '' };
    const cleaned = String(phone_no).trim().replace(/[\s-]/g, '');
    if (cleaned.length !== 10) {
      return { valid: false, message: 'Phone number must be exactly 10 digits' };
    }
    if (!/^[6-9][0-9]{9}$/.test(cleaned)) {
      return { valid: false, message: 'Invalid Indian phone number.' };
    }
    return { valid: true, message: '' };
  };

  const validateEmails = (emails) => {
    if (!emails) return { valid: true, message: '' };
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
    if (emailList.length > 3) {
      return { valid: false, message: 'Maximum 3 email addresses allowed' };
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emailList) {
      if (!emailPattern.test(email)) {
        return { valid: false, message: `Invalid email format: ${email}` };
      }
    }
    return { valid: true, message: '' };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.account_id) {
      newErrors.account_id = 'Account name is required';
    }

    if (!formData.client_info_id) {
      newErrors.client_info_id = 'Client name is required';
    }

    if (!formData.client_bu_id) {
      newErrors.client_bu_id = 'BU/DIV is required';
    }

    if (!formData.job_register_id) {
      newErrors.job_register_id = 'Job title is required';
    }

    if (formData.concern_phone_no) {
      const phoneValidation = validatePhoneNo(formData.concern_phone_no);
      if (!phoneValidation.valid) {
        newErrors.concern_phone_no = phoneValidation.message;
      }
    }

    if (formData.concern_email_id) {
      const emailValidation = validateEmails(formData.concern_email_id);
      if (!emailValidation.valid) {
        newErrors.concern_email_id = emailValidation.message;
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
      const { group_id, ...updateData } = formData;
      await api.put(`/client-service-charges/${chargeId}`, updateData);
      success('Service charges updated successfully');
      router.push('/dashboard/control-room/client');
    } catch (err) {
      console.error('Error updating service charges:', err);
      showError(err.response?.data?.error || 'Failed to update service charges');
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Service Charges</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Update service charges information</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* C-Id (Read-only) */}
            <Input
              label="C-Id"
              name="group_id"
              value={formData.group_id}
              onChange={() => {}}
              readOnly
              disabled
              className="bg-gray-50"
              required
            />
            
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
            
            <SelectBox
              label="BU/DIV"
              name="client_bu_id"
              value={formData.client_bu_id}
              onChange={handleChange}
              options={branches.map(bu => ({
                value: bu.id,
                label: bu.bu_name || 'N/A',
              }))}
              placeholder="Select BU/DIV"
              error={errors.client_bu_id}
              isDisabled={!formData.client_info_id}
              required
            />
            
            <SelectBox
              label="Job Title"
              name="job_register_id"
              value={formData.job_register_id}
              onChange={handleChange}
              options={jobRegisters.map(job => ({
                value: job.id,
                label: `${job.job_code || 'N/A'} - ${job.job_title || 'Untitled'}`,
              }))}
              placeholder="Select Job"
              error={errors.job_register_id}
              required
            />
            
            <Input
              label="Concern Person"
              name="concern_person"
              value={formData.concern_person}
              onChange={handleChange}
              error={errors.concern_person}
            />
            
            <Input
              label="Email ID"
              name="concern_email_id"
              value={formData.concern_email_id}
              onChange={handleChange}
              error={errors.concern_email_id}
              placeholder="email1@example.com, email2@example.com (max 3)"
            />
            
            <Input
              label="Phone No"
              name="concern_phone_no"
              value={formData.concern_phone_no}
              onChange={handleChange}
              error={errors.concern_phone_no}
              placeholder="10 digit Indian phone number"
              maxLength={10}
            />
            
            <Input
              label="Min"
              name="min"
              type="number"
              step="0.01"
              value={formData.min}
              onChange={handleChange}
              error={errors.min}
            />
            
            <Input
              label="Max"
              name="max"
              type="number"
              step="0.01"
              value={formData.max}
              onChange={handleChange}
              error={errors.max}
            />
            
            <Input
              label="In Percentage"
              name="in_percentage"
              type="number"
              step="0.01"
              value={formData.in_percentage}
              onChange={handleChange}
              error={errors.in_percentage}
            />
            
            <Input
              label="Fixed"
              name="fixed"
              type="number"
              step="0.01"
              value={formData.fixed}
              onChange={handleChange}
              error={errors.fixed}
            />
            
            <Input
              label="Per SHB/PROD/INV/Mandays"
              name="per_shb"
              type="number"
              step="0.01"
              value={formData.per_shb}
              onChange={handleChange}
              error={errors.per_shb}
            />
            
            <Input
              label="CA Charges"
              name="ca_charges"
              type="number"
              step="0.01"
              value={formData.ca_charges}
              onChange={handleChange}
              error={errors.ca_charges}
            />
            
            <Input
              label="CE Charges"
              name="ce_charges"
              type="number"
              step="0.01"
              value={formData.ce_charges}
              onChange={handleChange}
              error={errors.ce_charges}
            />
            
            <Input
              label="Registration/Other Charges"
              name="registration_other_charges"
              type="number"
              step="0.01"
              value={formData.registration_other_charges}
              onChange={handleChange}
              error={errors.registration_other_charges}
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
            
            <div className="md:col-span-2 lg:col-span-3">
              <div className="mb-4">
                <label htmlFor="invoice_description" className="block text-sm font-medium text-gray-700 mb-2">
                  Charges Description
                </label>
                <textarea
                  id="invoice_description"
                  name="invoice_description"
                  value={formData.invoice_description || ''}
                  onChange={handleChange}
                  rows={3}
                  className={`input-field ${errors.invoice_description ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Enter charges description"
                />
                {errors.invoice_description && <p className="mt-1 text-sm text-red-600">{errors.invoice_description}</p>}
              </div>
            </div>
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

