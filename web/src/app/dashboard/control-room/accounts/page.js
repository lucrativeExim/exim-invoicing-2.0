'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import AccountForm from './AccountForm';
import api from '@/services/api';

export default function AccountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
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
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const { toast, success, error: showError, hideToast } = useToast();

  useEffect(() => {
    // Check if user has permission to access this page
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    
    setLoading(false);

    // Fetch accounts
    fetchAccounts();
  }, [router]);

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      showError(err.response?.data?.error || 'Failed to fetch accounts');
    } finally {
      setAccountsLoading(false);
    }
  };

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
        (acc) =>
          acc.invoice_serial_initial === processedValue &&
          acc.id !== editingAccountId
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
        (acc) =>
          acc.invoice_serial_initial === formData.invoice_serial_initial &&
          acc.id !== editingAccountId
      );
      if (existingAccount) {
        newErrors.invoice_serial_initial = 'Invoice serial initial already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (account) => {
    setFormData({
      account_name: account.account_name || '',
      account_address: account.account_address || '',
      bank_name: account.bank_name || '',
      bank_address: account.bank_address || '',
      account_no: account.account_no || '',
      ifsc_no: account.ifsc_no || '',
      gst_no: account.gst_no || '',
      pan_no: account.pan_no || '',
      msme_details: account.msme_details || '',
      remark: account.remark || '',
      invoice_serial_initial: account.invoice_serial_initial || '',
      invoice_serial_second_no: account.invoice_serial_second_no || '',
      status: account.status || 'Active',
    });
    setEditingAccountId(account.id);
    setShowAddForm(true);
    setErrors({});
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingAccountId(null);
    setFormData({
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
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const isEditing = !!editingAccountId;

      if (isEditing) {
        await api.put(`/accounts/${editingAccountId}`, formData);
        success('Account updated successfully');
      } else {
        await api.post('/accounts', formData);
        success('Account created successfully');
      }
      
      resetForm();
      fetchAccounts();
    } catch (err) {
      console.error(`Error ${editingAccountId ? 'updating' : 'creating'} account:`, err);
      showError(err.response?.data?.error || `Failed to ${editingAccountId ? 'update' : 'create'} account`);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/accounts/${id}`);
      success('Account deleted successfully');
      setDeleteConfirmId(null);
      fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      showError(err.response?.data?.error || 'Failed to delete account');
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Accounts</h1>
          <p className="text-sm text-gray-600">Manage account information and details</p>
        </div>
        <Button
          onClick={() => {
            if (showAddForm) {
              resetForm();
            } else {
              setShowAddForm(true);
              setEditingAccountId(null);
            }
          }}
          variant="primary"
        >
          {showAddForm ? 'Cancel' : 'Add New Account'}
        </Button>
      </div>

      {/* Add/Edit Account Form */}
      {showAddForm && (
        <AccountForm
          formData={formData}
          errors={errors}
          editingAccountId={editingAccountId}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Accounts</h2>
        </div>
        {accountsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No accounts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IFSC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PAN No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {account.account_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.bank_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.account_no || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.ifsc_no || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.gst_no || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{account.pan_no || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          account.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : account.status === 'InActive'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.created_at
                        ? new Date(account.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEdit(account)}
                          className="text-sm"
                        >
                          Edit
                        </Button>
                        {accessControl.isSuperAdmin() && (
                          <>
                            {deleteConfirmId === account.id ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDelete(account.id)}
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
                                onClick={() => setDeleteConfirmId(account.id)}
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

