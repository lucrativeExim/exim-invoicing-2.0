'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import AccountForm from '../../AccountForm';
import api from '@/services/api';

export default function EditAccountPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params?.id;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    account_name: '',
    account_address: '',
    bank_name: '',
    bank_address: '',
    account_no: '',
    ifsc_no: '',
    gst_no: '',
    pan_no: '',
    msme_details: '',
    remark: '',
    invoice_serial_initial: '',
    invoice_serial_second_no: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState({});
  const { toast, success, error: showError, hideToast } = useToast();

  const fetchAccount = useCallback(async () => {
    try {
      const response = await api.get(`/accounts/${accountId}`);
      const accountData = response.data;
      setAccount(accountData);
      setFormData({
        account_name: accountData.account_name || '',
        account_address: accountData.account_address || '',
        bank_name: accountData.bank_name || '',
        bank_address: accountData.bank_address || '',
        account_no: accountData.account_no || '',
        ifsc_no: accountData.ifsc_no || '',
        gst_no: accountData.gst_no || '',
        pan_no: accountData.pan_no || '',
        msme_details: accountData.msme_details || '',
        remark: accountData.remark || '',
        invoice_serial_initial: accountData.invoice_serial_initial || '',
        invoice_serial_second_no: accountData.invoice_serial_second_no || '',
        status: accountData.status || 'Active',
      });
    } catch (err) {
      console.error('Error fetching account:', err);
      showError(err.response?.data?.error || 'Failed to fetch account');
      router.push('/dashboard/control-room/accounts');
    }
  }, [accountId, showError, router]);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      showError(err.response?.data?.error || 'Failed to fetch accounts');
    }
  }, [showError]);

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    
    if (accountId) {
      fetchAccount();
      fetchAccounts();
      setLoading(false);
    }
  }, [accountId, router, fetchAccount, fetchAccounts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-uppercase GST and PAN numbers
    let processedValue = value;
    if (name === 'gst_no' || name === 'pan_no') {
      processedValue = value.toUpperCase();
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Real-time validation for GST and PAN
    if (name === 'gst_no' && processedValue) {
      const gstValidation = validateGSTNo(processedValue);
      if (!gstValidation.valid) {
        setErrors((prev) => ({
          ...prev,
          gst_no: gstValidation.message,
        }));
      }
    }
    
    if (name === 'pan_no' && processedValue) {
      const panValidation = validatePANNo(processedValue);
      if (!panValidation.valid) {
        setErrors((prev) => ({
          ...prev,
          pan_no: panValidation.message,
        }));
      }
    }
    
    // Check invoice serial initial uniqueness on change
    if (name === 'invoice_serial_initial' && processedValue) {
      const existingAccount = accounts.find(
        (acc) => acc.invoice_serial_initial === processedValue && acc.id !== accountId
      );
      if (existingAccount) {
        setErrors((prev) => ({
          ...prev,
          invoice_serial_initial: 'Invoice serial initial already exists',
        }));
      }
    }
  };

  // Validate GST number format
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

  // Validate PAN number format
  const validatePANNo = (pan_no) => {
    if (!pan_no) return { valid: true, message: '' };
    
    const cleaned = pan_no.trim().toUpperCase();
    
    if (cleaned.length !== 10) {
      return { valid: false, message: 'PAN number must be exactly 10 characters' };
    }
    
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(cleaned)) {
      return { valid: false, message: 'Invalid PAN format. Format: ABCDE1234F' };
    }
    
    return { valid: true, message: '' };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.account_name?.trim()) {
      newErrors.account_name = 'Account name is required';
    }

    // Validate GST number format
    if (formData.gst_no) {
      const gstValidation = validateGSTNo(formData.gst_no);
      if (!gstValidation.valid) {
        newErrors.gst_no = gstValidation.message;
      }
    }

    // Validate PAN number format
    if (formData.pan_no) {
      const panValidation = validatePANNo(formData.pan_no);
      if (!panValidation.valid) {
        newErrors.pan_no = panValidation.message;
      }
    }

    // Check invoice serial initial uniqueness
    if (formData.invoice_serial_initial) {
      const existingAccount = accounts.find(
        (acc) => acc.invoice_serial_initial === formData.invoice_serial_initial && acc.id !== accountId
      );
      if (existingAccount) {
        newErrors.invoice_serial_initial = 'Invoice serial initial already exists';
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
      await api.put(`/accounts/${accountId}`, formData);
      success('Account updated successfully');
      router.push('/dashboard/control-room/accounts');
    } catch (err) {
      console.error('Error updating account:', err);
      showError(err.response?.data?.error || 'Failed to update account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/control-room/accounts');
  };

  if (loading || !account) {
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
            onClick={() => router.push('/dashboard/control-room/accounts')}
            className="mr-3 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Account</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Update account information</p>
      </div>

      {/* Form */}
      <AccountForm
        formData={formData}
        errors={errors}
        editingAccountId={accountId}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
}

