'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import FieldsMasterForm from '../FieldsMasterForm';
import api from '@/services/api';

export default function AddFieldMasterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: '',
    default_value: false,
    treatment: [],
    dropdown_options: [],
  });
  const [errors, setErrors] = useState({});
  const { toast, success, error: showError, hideToast } = useToast();

  const fetchFields = useCallback(async () => {
    try {
      const response = await api.get('/fields-master');
      setFields(response.data);
    } catch (err) {
      console.error('Error fetching Fields Master:', err);
      showError(err.response?.data?.error || 'Failed to fetch Fields Master records');
    }
  }, [showError]);

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    setLoading(false);
    fetchFields();
  }, [router, fetchFields]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If field_type is changing and it's not Dropdown, clear dropdown_options
    if (name === 'field_type' && value !== 'Dropdown') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        dropdown_options: null, // Clear dropdown_options when field_type is not Dropdown
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Check field name uniqueness on change
    if (name === 'field_name' && value) {
      const existingField = fields.find(
        (f) => f.field_name === value
      );
      if (existingField) {
        setErrors((prev) => ({
          ...prev,
          field_name: 'Field name already exists',
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.field_name?.trim()) {
      newErrors.field_name = 'Field name is required';
    }

    // Check field name uniqueness
    if (formData.field_name) {
      const existingField = fields.find(
        (f) => f.field_name === formData.field_name
      );
      if (existingField) {
        newErrors.field_name = 'Field name already exists';
      }
    }

    if (!formData.field_type) {
      newErrors.field_type = 'Field type is required';
    }

    if (formData.field_type === 'Dropdown') {
      if (!formData.dropdown_options || formData.dropdown_options.length === 0) {
        newErrors.dropdown_options = 'Dropdown options are required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      field_name: '',
      field_type: '',
      default_value: false,
      treatment: [],
      dropdown_options: [],
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
      const submitData = {
        ...formData,
        default_value: formData.default_value === true || formData.default_value === 'true',
      };

      // ALWAYS clear dropdown_options if field_type is not Dropdown
      if (submitData.field_type !== 'Dropdown') {
        submitData.dropdown_options = null;
      } else if (!submitData.dropdown_options || (Array.isArray(submitData.dropdown_options) && submitData.dropdown_options.length === 0)) {
        delete submitData.dropdown_options;
      }

      await api.post('/fields-master', submitData);
      success('Field created successfully');
      router.push('/dashboard/control-room/fields-master');
    } catch (err) {
      console.error('Error creating Field:', err);
      const errorMessage = err.response?.data?.error || 'Failed to create Field';
      showError(errorMessage);
      
      // Set field-specific errors if provided
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/control-room/fields-master');
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
            onClick={() => router.push('/dashboard/control-room/fields-master')}
            className="mr-3 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add New Field</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Create a new field master record</p>
      </div>

      {/* Form */}
      <FieldsMasterForm
        formData={formData}
        errors={errors}
        editingFieldsMasterId={null}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
}

