'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import TableSearch from '@/components/TableSearch';
import { useTableSearch } from '@/hooks/useTableSearch';
import { usePagination } from '@/hooks/usePagination';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import Pagination from '@/components/Pagination';

export default function FieldsMasterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const { toast, success, error: showError, hideToast } = useToast();

  // Search functionality
  const searchFields = ['field_name', 'field_type'];
  const { searchTerm, setSearchTerm, filteredData: filteredFields, suggestions } = useTableSearch(
    fields,
    searchFields
  );

  // Pagination
  const pagination = usePagination(filteredFields, { itemsPerPage: 10 });

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

  const handleEdit = (field) => {
    router.push(`/dashboard/control-room/fields-master/edit/${field.id}`);
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
      <div className="mb-2 flex items-center justify-end">
        {/* <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Fields Master</h1>
          <p className="text-sm text-gray-600">Manage form fields and their configurations</p>
        </div> */}
        <Button
          onClick={() => router.push('/dashboard/control-room/fields-master/add')}
          variant="primary"
        >
          Add New Field
        </Button>
      </div>

      {/* Fields Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Fields</h2>
          <div className="w-80">
            <TableSearch
              value={searchTerm}
              onChange={setSearchTerm}
              suggestions={suggestions}
              placeholder="Search fields..."
              data={fields}
              searchFields={searchFields}
              maxSuggestions={5}
              storageKey="fields_master"
            />
          </div>
        </div>
        {fieldsLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading fields...</p>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No fields match your search' : 'No fields found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagination.paginatedData.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(field)}
                          className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                          title="Edit"
                          aria-label="Edit field"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {accessControl.isSuperAdmin() && (
                          <>
                            {deleteConfirmId === field.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(field.id)}
                                  className="p-1.5 rounded-md hover:bg-green-50 transition-colors text-green-600"
                                  title="Confirm Delete"
                                  aria-label="Confirm delete"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
                                  title="Cancel"
                                  aria-label="Cancel delete"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(field.id)}
                                className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-600"
                                title="Delete"
                                aria-label="Delete field"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!fieldsLoading && filteredFields.length > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.setCurrentPage}
            onItemsPerPageChange={pagination.setItemsPerPage}
          />
        )}
      </div>
    </>
  );
}

