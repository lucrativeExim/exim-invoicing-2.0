'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import GstRateForm from '../GstRateForm';
import api from '@/services/api';

export default function AddGstRatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gstRates, setGstRates] = useState([]);
  const [formData, setFormData] = useState({
    sac_no: '',
    sgst: '',
    cgst: '',
    igst: '',
  });
  const [errors, setErrors] = useState({});
  const { toast, success, error: showError, hideToast } = useToast();

  const fetchGstRates = useCallback(async () => {
    try {
      const response = await api.get('/gst-rates');
      setGstRates(response.data);
    } catch (err) {
      console.error('Error fetching GST rates:', err);
      showError(err.response?.data?.error || 'Failed to fetch GST rates');
    }
  }, [showError]);

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    setLoading(false);
    fetchGstRates();
  }, [router, fetchGstRates]);

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
    
    // Check SAC number uniqueness on change
    if (name === 'sac_no' && value) {
      const existingGstRate = gstRates.find(
        (gr) => gr.sac_no === value
      );
      if (existingGstRate) {
        setErrors((prev) => ({
          ...prev,
          sac_no: 'SAC number already exists',
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.sac_no?.trim()) {
      newErrors.sac_no = 'SAC number is required';
    }

    // Check SAC number uniqueness
    if (formData.sac_no) {
      const existingGstRate = gstRates.find(
        (gr) => gr.sac_no === formData.sac_no
      );
      if (existingGstRate) {
        newErrors.sac_no = 'SAC number already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      sac_no: '',
      sgst: '',
      cgst: '',
      igst: '',
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/gst-rates', formData);
      success('GST rate created successfully');
      router.push('/dashboard/control-room/gst-rates');
    } catch (err) {
      console.error('Error creating GST rate:', err);
      showError(err.response?.data?.error || 'Failed to create GST rate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/control-room/gst-rates');
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
            onClick={() => router.push('/dashboard/control-room/gst-rates')}
            className="mr-3 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add New GST Rate</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Create a new GST rate record</p>
      </div>

      {/* Form */}
      <GstRateForm
        formData={formData}
        errors={errors}
        editingGstRateId={null}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
}

