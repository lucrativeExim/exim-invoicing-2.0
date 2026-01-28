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

export default function GstRatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gstRates, setGstRates] = useState([]);
  const [gstRatesLoading, setGstRatesLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const { toast, success, error: showError, hideToast } = useToast();

  // Search functionality
  const searchFields = ['sac_no', 'sgst', 'cgst', 'igst'];
  const { searchTerm, setSearchTerm, filteredData: filteredGstRates, suggestions } = useTableSearch(
    gstRates,
    searchFields
  );

  // Pagination
  const pagination = usePagination(filteredGstRates, { itemsPerPage: 10 });

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

  const handleEdit = (gstRate) => {
    router.push(`/dashboard/control-room/gst-rates/edit/${gstRate.id}`);
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
      <div className="mb-2 flex items-center justify-end">
        {/* <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">GST Rates</h1>
          <p className="text-sm text-gray-600">Manage GST rates and tax percentages</p>
        </div> */}
        <Button
          onClick={() => router.push('/dashboard/control-room/gst-rates/add')}
          variant="primary"
        >
          Add New GST Rate
        </Button>
      </div>

      {/* GST Rates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All GST Rates</h2>
          <div className="w-80">
            <TableSearch
              value={searchTerm}
              onChange={setSearchTerm}
              suggestions={suggestions}
              placeholder="Search GST rates..."
              data={gstRates}
              searchFields={searchFields}
              maxSuggestions={5}
              storageKey="gst_rates"
            />
          </div>
        </div>
        {gstRatesLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading GST rates...</p>
          </div>
        ) : filteredGstRates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No GST rates match your search' : 'No GST rates found'}
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagination.paginatedData.map((gstRate) => (
                  <tr key={gstRate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(gstRate)}
                          className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                          title="Edit"
                          aria-label="Edit GST rate"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {accessControl.isSuperAdmin() && (
                          <>
                            {deleteConfirmId === gstRate.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(gstRate.id)}
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
                                onClick={() => setDeleteConfirmId(gstRate.id)}
                                className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-600"
                                title="Delete"
                                aria-label="Delete GST rate"
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
                      {formatDateDDMMYYYY(gstRate.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!gstRatesLoading && filteredGstRates.length > 0 && (
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

