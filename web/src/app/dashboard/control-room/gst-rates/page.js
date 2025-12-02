'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import GstRateForm from './GstRateForm';
import api from '@/services/api';

export default function GstRatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gstRates, setGstRates] = useState([]);
  const [gstRatesLoading, setGstRatesLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGstRateId, setEditingGstRateId] = useState(null);
  const [formData, setFormData] = useState({
    sac_no: '',
    sgst: '',
    cgst: '',
    igst: '',
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

    // Fetch GST rates
    fetchGstRates();
  }, [router]);

  const fetchGstRates = async () => {
    setGstRatesLoading(true);
    try {
      const response = await api.get('/gst-rates');
      setGstRates(response.data);
    } catch (err) {
      console.error('Error fetching GST rates:', err);
      showError(err.response?.data?.error || 'Failed to fetch GST rates');
    } finally {
      setGstRatesLoading(false);
    }
  };

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
        (gr) =>
          gr.sac_no === value &&
          gr.id !== editingGstRateId
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
        (gr) =>
          gr.sac_no === formData.sac_no &&
          gr.id !== editingGstRateId
      );
      if (existingGstRate) {
        newErrors.sac_no = 'SAC number already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (gstRate) => {
    setFormData({
      sac_no: gstRate.sac_no || '',
      sgst: gstRate.sgst !== null && gstRate.sgst !== undefined ? String(gstRate.sgst) : '',
      cgst: gstRate.cgst !== null && gstRate.cgst !== undefined ? String(gstRate.cgst) : '',
      igst: gstRate.igst !== null && gstRate.igst !== undefined ? String(gstRate.igst) : '',
    });
    setEditingGstRateId(gstRate.id);
    setShowAddForm(true);
    setErrors({});
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingGstRateId(null);
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

    try {
      const isEditing = !!editingGstRateId;

      if (isEditing) {
        await api.put(`/gst-rates/${editingGstRateId}`, formData);
        success('GST rate updated successfully');
      } else {
        await api.post('/gst-rates', formData);
        success('GST rate created successfully');
      }
      
      resetForm();
      fetchGstRates();
    } catch (err) {
      console.error(`Error ${editingGstRateId ? 'updating' : 'creating'} GST rate:`, err);
      showError(err.response?.data?.error || `Failed to ${editingGstRateId ? 'update' : 'create'} GST rate`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/gst-rates/${id}`);
      success('GST rate deleted successfully');
      setDeleteConfirmId(null);
      fetchGstRates();
    } catch (err) {
      console.error('Error deleting GST rate:', err);
      showError(err.response?.data?.error || 'Failed to delete GST rate');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">GST Rates</h1>
          <p className="text-sm text-gray-600">Manage GST rates and tax percentages</p>
        </div>
        <Button
          onClick={() => {
            if (showAddForm) {
              resetForm();
            } else {
              setShowAddForm(true);
              setEditingGstRateId(null);
            }
          }}
          variant="primary"
        >
          {showAddForm ? 'Cancel' : 'Add New GST Rate'}
        </Button>
      </div>

      {/* Add/Edit GST Rate Form */}
      {showAddForm && (
        <GstRateForm
          formData={formData}
          errors={errors}
          editingGstRateId={editingGstRateId}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      {/* GST Rates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All GST Rates</h2>
        </div>
        {gstRatesLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading GST rates...</p>
          </div>
        ) : gstRates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No GST rates found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SAC Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SGST (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CGST (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IGST (%)
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
                {gstRates.map((gstRate) => (
                  <tr key={gstRate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {gstRate.sac_no || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {gstRate.sgst !== null && gstRate.sgst !== undefined ? `${gstRate.sgst}%` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {gstRate.cgst !== null && gstRate.cgst !== undefined ? `${gstRate.cgst}%` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {gstRate.igst !== null && gstRate.igst !== undefined ? `${gstRate.igst}%` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {gstRate.created_at
                        ? new Date(gstRate.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEdit(gstRate)}
                          className="text-sm"
                        >
                          Edit
                        </Button>
                        {accessControl.isSuperAdmin() && (
                          <>
                            {deleteConfirmId === gstRate.id ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDelete(gstRate.id)}
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
                                onClick={() => setDeleteConfirmId(gstRate.id)}
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

