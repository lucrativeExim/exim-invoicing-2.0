'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

export default function JobRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobRegisters, setJobRegisters] = useState([]);
  const [jobRegistersLoading, setJobRegistersLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const { toast, success, error: showError, hideToast } = useToast();

  useEffect(() => {
    // Check if user has permission to access this page
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    
    setLoading(false);

    // Fetch job registers
    fetchJobRegisters();
  }, [router]);

  const fetchJobRegisters = async () => {
    setJobRegistersLoading(true);
    try {
      const response = await api.get('/job-register');
      setJobRegisters(response.data);
    } catch (err) {
      console.error('Error fetching job registers:', err);
      showError(err.response?.data?.error || 'Failed to fetch job registers');
    } finally {
      setJobRegistersLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/job-register/${id}`);
      success('Job register deleted successfully');
      setDeleteConfirmId(null);
      fetchJobRegisters();
    } catch (err) {
      console.error('Error deleting job register:', err);
      showError(err.response?.data?.error || 'Failed to delete job register');
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'Delete':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="mb-6 flex items-center justify-end">
        <Link href="/dashboard/control-room/job-register/add">
          <Button variant="primary">
            Add New Job Register
          </Button>
        </Link>
      </div>

      {/* Job Registers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Job Registers</h2>
        </div>
        {jobRegistersLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading job registers...</p>
          </div>
        ) : jobRegisters.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No job registers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST Rate (SAC)
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
                {jobRegisters.map((jobRegister) => (
                  <tr key={jobRegister.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {jobRegister.job_code || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {jobRegister.job_title || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {jobRegister.job_type || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {jobRegister.gstRate?.sac_no || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                          jobRegister.status
                        )}`}
                      >
                        {formatStatus(jobRegister.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {jobRegister.created_at
                        ? new Date(jobRegister.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link href={`/dashboard/control-room/job-register/edit/${jobRegister.id}`}>
                          <Button
                            type="button"
                            variant="outline"
                            className="text-sm"
                          >
                            Edit
                          </Button>
                        </Link>
                        {accessControl.isSuperAdmin() && (
                          <>
                            {deleteConfirmId === jobRegister.id ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDelete(jobRegister.id)}
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
                                onClick={() => setDeleteConfirmId(jobRegister.id)}
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

