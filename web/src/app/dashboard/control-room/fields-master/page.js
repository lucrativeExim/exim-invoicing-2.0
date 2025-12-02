'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import FieldsMasterForm from './FieldsMasterForm';
import api from '@/services/api';

export default function FieldsMasterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: '',
    default_value: false,
    treatment: [],
    dropdown_options: [],
  });
  const [errors, setErrors] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const { toast, success, error: showError, hideToast } = useToast();

  useEffect(() => {
    // Check if user has permission to access this page
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    
    setLoading(false);

    // Fetch Fields Master records
    fetchFields();
  }, [router]);

  const fetchFields = async () => {
    setFieldsLoading(true);
    try {
      const response = await api.get('/fields-master');
      setFields(response.data);
    } catch (err) {
      console.error('Error fetching Fields Master:', err);
      showError(err.response?.data?.error || 'Failed to fetch Fields Master records');
    } finally {
      setFieldsLoading(false);
    }
  };

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
        (f) =>
          f.field_name === value &&
          f.id !== editingFieldId
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
        (f) =>
          f.field_name === formData.field_name &&
          f.id !== editingFieldId
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

  const handleEdit = (field) => {
    setFormData({
      field_name: field.field_name || '',
      field_type: field.field_type || '',
      default_value: field.default_value === true || field.default_value === 'true',
      treatment: Array.isArray(field.treatment) ? field.treatment : [],
      dropdown_options: Array.isArray(field.dropdown_options) ? field.dropdown_options : [],
    });
    setEditingFieldId(field.id);
    setShowAddForm(true);
    setErrors({});
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingFieldId(null);
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

    try {
      const isEditing = !!editingFieldId;

      const submitData = {
        ...formData,
        default_value: formData.default_value === true || formData.default_value === 'true',
      };

      // ALWAYS clear dropdown_options if field_type is not Dropdown
      // This ensures dropdown_options are never sent when field_type is not Dropdown
      if (submitData.field_type !== 'Dropdown') {
        submitData.dropdown_options = null;
      } else if (!submitData.dropdown_options || (Array.isArray(submitData.dropdown_options) && submitData.dropdown_options.length === 0)) {
        // If field_type is Dropdown but no options provided, don't send dropdown_options
        // The backend will validate and return an error
        delete submitData.dropdown_options;
      }

      if (isEditing) {
        await api.put(`/fields-master/${editingFieldId}`, submitData);
        success('Field updated successfully');
      } else {
        await api.post('/fields-master', submitData);
        success('Field created successfully');
      }
      
      resetForm();
      fetchFields();
    } catch (err) {
      console.error(`Error ${editingFieldId ? 'updating' : 'creating'} Field:`, err);
      const errorMessage = err.response?.data?.error || `Failed to ${editingFieldId ? 'update' : 'create'} Field`;
      showError(errorMessage);
      
      // Set field-specific errors if provided
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/fields-master/${id}`);
      success('Field deleted successfully');
      setDeleteConfirmId(null);
      fetchFields();
    } catch (err) {
      console.error('Error deleting Field:', err);
      showError(err.response?.data?.error || 'Failed to delete Field');
    }
  };

  const getFieldTypeLabel = (fieldType) => {
    const typeMap = {
      'Text': 'Text',
      'Date': 'Date',
      'Dropdown': 'Dropdown',
      'Attachment': 'Attachment',
      'Number': 'Number',
    };
    return typeMap[fieldType] || fieldType;
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Fields Master</h1>
          <p className="text-sm text-gray-600">Manage form fields and their configurations</p>
        </div>
        <Button
          onClick={() => {
            if (showAddForm) {
              resetForm();
            } else {
              setShowAddForm(true);
              setEditingFieldId(null);
            }
          }}
          variant="primary"
        >
          {showAddForm ? 'Cancel' : 'Add New Field'}
        </Button>
      </div>

      {/* Add/Edit Field Form */}
      {showAddForm && (
        <FieldsMasterForm
          formData={formData}
          errors={errors}
          editingFieldsMasterId={editingFieldId}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      {/* Fields Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Fields</h2>
        </div>
        {fieldsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading fields...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No fields found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Treatment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dropdown Options
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
                {fields.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {field.field_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getFieldTypeLabel(field.field_type)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {field.default_value === true || field.default_value === 'true' || field.default_value === 1 ? 'Yes' : 'No'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {Array.isArray(field.treatment) && field.treatment.length > 0
                          ? field.treatment.join(', ')
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {field.field_type === 'Dropdown' && Array.isArray(field.dropdown_options) && field.dropdown_options.length > 0
                          ? field.dropdown_options.join(', ')
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.created_at
                        ? new Date(field.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEdit(field)}
                          className="text-sm"
                        >
                          Edit
                        </Button>
                        {accessControl.isSuperAdmin() && (
                          <>
                            {deleteConfirmId === field.id ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDelete(field.id)}
                                  className="text-sm text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-sm"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeleteConfirmId(field.id)}
                                className="text-sm text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Delete
                              </Button>
                            )}
                          </>
                        )}
                      </div>
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

