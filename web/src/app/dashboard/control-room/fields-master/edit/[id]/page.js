'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import FieldsMasterForm from '../../FieldsMasterForm';
import api from '@/services/api';

export default function EditFieldMasterPage() {
  const router = useRouter();
  const params = useParams();
  const fieldId = params?.id;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [field, setField] = useState(null);
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

  const fetchField = useCallback(async () => {
    try {
      const response = await api.get(`/fields-master/${fieldId}`);
      const fieldData = response.data;
      setField(fieldData);
      setFormData({
        field_name: fieldData.field_name || '',
        field_type: fieldData.field_type || '',
        default_value: fieldData.default_value === true || fieldData.default_value === 'true',
        treatment: Array.isArray(fieldData.treatment) ? fieldData.treatment : [],
        dropdown_options: Array.isArray(fieldData.dropdown_options) ? fieldData.dropdown_options : [],
      });
    } catch (err) {
      console.error('Error fetching Field:', err);
      showError(err.response?.data?.error || 'Failed to fetch Field');
      router.push('/dashboard/control-room/fields-master');
    }
  }, [fieldId, showError, router]);

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
    
    if (fieldId) {
      fetchField();
      fetchFields();
      setLoading(false);
    }
  }, [fieldId, router, fetchField, fetchFields]);

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
        (f) => f.field_name === value && Number(f.id) !== Number(fieldId)
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
        (f) => f.field_name === formData.field_name && Number(f.id) !== Number(fieldId)
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

      await api.put(`/fields-master/${fieldId}`, submitData);
      success('Field updated successfully');
      router.push('/dashboard/control-room/fields-master');
    } catch (err) {
      console.error('Error updating Field:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update Field';
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

  if (loading || !field) {
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Field</h1>
        </div>
        <p className="text-sm text-gray-600 ml-10">Update field master information</p>
      </div>

      {/* Form */}
      <FieldsMasterForm
        formData={formData}
        errors={errors}
        editingFieldsMasterId={fieldId}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
}

