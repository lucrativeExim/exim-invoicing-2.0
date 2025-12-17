'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';
import Tabs from '@/components/Tabs';

export default function ClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('client-info');
  const [clientInfos, setClientInfos] = useState([]);
  const [clientBus, setClientBus] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const { toast, success, error: showError, hideToast } = useToast();

  const fetchClientInfos = useCallback(async () => {
    try {
      const response = await api.get('/client-info');
      setClientInfos(response.data);
    } catch (err) {
      console.error('Error fetching client info:', err);
      showError(err.response?.data?.error || 'Failed to fetch client info');
    }
  }, [showError]);

  const fetchClientBus = useCallback(async () => {
    try {
      const response = await api.get('/client-bu');
      setClientBus(response.data);
    } catch (err) {
      console.error('Error fetching client BU:', err);
      showError(err.response?.data?.error || 'Failed to fetch client BU');
    }
  }, [showError]);

  const fetchServiceCharges = useCallback(async () => {
    try {
      const response = await api.get('/client-service-charges');
      setServiceCharges(response.data);
    } catch (err) {
      console.error('Error fetching service charges:', err);
      showError(err.response?.data?.error || 'Failed to fetch service charges');
    }
  }, [showError]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    await Promise.all([fetchClientInfos(), fetchClientBus(), fetchServiceCharges(), fetchUsers()]);
    setDataLoading(false);
  }, [fetchClientInfos, fetchClientBus, fetchServiceCharges, fetchUsers]);

  // Helper function to get owner name by ID
  const getOwnerName = (ownerId) => {
    if (!ownerId) return 'N/A';
    const user = users.find(u => String(u.id) === String(ownerId));
    return user ? `${user.first_name} ${user.last_name}` : ownerId;
  };

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    setLoading(false);
    fetchAllData();
  }, [router, fetchAllData]);

  const handleDeleteClientInfo = async (id) => {
    try {
      await api.delete(`/client-info/${id}`);
      success('Client info deleted successfully');
      setDeleteConfirmId(null);
      setDeleteType(null);
      fetchClientInfos();
    } catch (err) {
      console.error('Error deleting client info:', err);
      showError(err.response?.data?.error || 'Failed to delete client info');
    }
  };

  const handleDeleteClientBu = async (id) => {
    try {
      await api.delete(`/client-bu/${id}`);
      success('Branch deleted successfully');
      setDeleteConfirmId(null);
      setDeleteType(null);
      fetchClientBus();
    } catch (err) {
      console.error('Error deleting branch:', err);
      showError(err.response?.data?.error || 'Failed to delete branch');
    }
  };

  const handleDeleteServiceCharge = async (id) => {
    try {
      await api.delete(`/client-service-charges/${id}`);
      success('Service charge deleted successfully');
      setDeleteConfirmId(null);
      setDeleteType(null);
      fetchServiceCharges();
    } catch (err) {
      console.error('Error deleting service charge:', err);
      showError(err.response?.data?.error || 'Failed to delete service charge');
    }
  };

  const tabs = [
    { id: 'client-info', label: 'Client Info' },
    { id: 'branch-info', label: 'Branch Info' },
    { id: 'service-charges', label: 'Service Charges' },
  ];

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Client Management</h1>
          <p className="text-sm text-gray-600">Manage client information, branches, and service charges</p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'client-info' && (
            <Button
              onClick={() => router.push('/dashboard/control-room/client/add-client-info')}
              variant="primary"
            >
              Add Client Info
            </Button>
          )}
          {activeTab === 'branch-info' && (
            <Button
              onClick={() => router.push('/dashboard/control-room/client/add-branch-info')}
              variant="primary"
            >
              Add Branch Info
            </Button>
          )}
          {activeTab === 'service-charges' && (
            <Button
              onClick={() => router.push('/dashboard/control-room/client/add-service-charges')}
              variant="primary"
            >
              Add Service Charges
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'client-info' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Clients</h2>
            </div>
            {dataLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading clients...</p>
              </div>
            ) : clientInfos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No clients found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IEC No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alias</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Terms</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clientInfos.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.account?.account_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/dashboard/control-room/client/${client.id}`)}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {client.client_name || 'N/A'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.iec_no || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.alias || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.credit_terms || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getOwnerName(client.client_owner_ship)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            client.status === 'Active' ? 'bg-green-100 text-green-800' :
                            client.status === 'InActive' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/control-room/client/edit-client-info/${client.id}`)}
                              className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {accessControl.isSuperAdmin() && (
                              <>
                                {deleteConfirmId === client.id && deleteType === 'client-info' ? (
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteClientInfo(client.id)}
                                      className="p-1.5 rounded-md hover:bg-green-50 transition-colors text-green-600"
                                      title="Confirm Delete"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setDeleteConfirmId(null); setDeleteType(null); }}
                                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
                                      title="Cancel"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setDeleteConfirmId(client.id); setDeleteType('client-info'); }}
                                    className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-600"
                                    title="Delete"
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'branch-info' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Branches</h2>
            </div>
            {dataLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading branches...</p>
              </div>
            ) : clientBus.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No branches found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BU/DIV</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S-C/I</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clientBus.map((bu) => (
                      <tr key={bu.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bu.clientInfo?.client_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bu.bu_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bu.client_type || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bu.state?.state_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bu.city || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bu.gst_no || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bu.sc_i || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            bu.status === 'Active' ? 'bg-green-100 text-green-800' :
                            bu.status === 'InActive' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bu.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/control-room/client/edit-branch-info/${bu.id}`)}
                              className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {accessControl.isSuperAdmin() && (
                              <>
                                {deleteConfirmId === bu.id && deleteType === 'branch-info' ? (
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteClientBu(bu.id)}
                                      className="p-1.5 rounded-md hover:bg-green-50 transition-colors text-green-600"
                                      title="Confirm Delete"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setDeleteConfirmId(null); setDeleteType(null); }}
                                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
                                      title="Cancel"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setDeleteConfirmId(bu.id); setDeleteType('branch-info'); }}
                                    className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-600"
                                    title="Delete"
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'service-charges' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Service Charges</h2>
            </div>
            {dataLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading service charges...</p>
              </div>
            ) : serviceCharges.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No service charges found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">C-Id</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BU/DIV</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceCharges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {charge.group_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {charge.account?.account_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {charge.clientInfo?.client_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {charge.clientBu?.bu_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {charge.jobRegister?.job_title || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {charge.concern_person || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            charge.status === 'Active' ? 'bg-green-100 text-green-800' :
                            charge.status === 'InActive' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {charge.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/control-room/client/edit-service-charges/${charge.id}`)}
                              className="p-1.5 rounded-md hover:bg-blue-50 transition-colors text-blue-600"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {accessControl.isSuperAdmin() && (
                              <>
                                {deleteConfirmId === charge.id && deleteType === 'service-charges' ? (
                                  <div className="flex items-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteServiceCharge(charge.id)}
                                      className="p-1.5 rounded-md hover:bg-green-50 transition-colors text-green-600"
                                      title="Confirm Delete"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setDeleteConfirmId(null); setDeleteType(null); }}
                                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
                                      title="Cancel"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => { setDeleteConfirmId(charge.id); setDeleteType('service-charges'); }}
                                    className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-600"
                                    title="Delete"
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

