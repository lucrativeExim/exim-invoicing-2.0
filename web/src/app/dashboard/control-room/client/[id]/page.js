'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import api from '@/services/api';

export default function ClientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id;
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState(null);
  const [clientBus, setClientBus] = useState([]);
  const [serviceCharges, setServiceCharges] = useState([]);
  const [expandedBu, setExpandedBu] = useState({});
  const { toast, error: showError, hideToast } = useToast();

  useEffect(() => {
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }
    if (clientId) {
      fetchClientData();
    }
    
    // Cleanup: remove client name from sessionStorage when leaving the page
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('currentClientName');
      }
    };
  }, [clientId, router]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [clientResponse, busResponse, chargesResponse] = await Promise.all([
        api.get(`/client-info/${clientId}`),
        api.get(`/client-bu/by-client/${clientId}`),
        api.get(`/client-service-charges?clientInfoId=${clientId}`),
      ]);

      setClientInfo(clientResponse.data);
      setClientBus(busResponse.data || []);
      setServiceCharges(chargesResponse.data || []);
      
      // Store client name in sessionStorage for header display
      if (typeof window !== 'undefined' && clientResponse.data?.client_name) {
        sessionStorage.setItem('currentClientName', clientResponse.data.client_name);
        // Trigger a custom event to notify Header component
        window.dispatchEvent(new Event('clientNameUpdated'));
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
      showError(err.response?.data?.error || 'Failed to fetch client data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBu = (buId) => {
    setExpandedBu((prev) => ({
      ...prev,
      [buId]: !prev[buId],
    }));
  };

  const getServiceChargesForBu = (buId) => {
    return serviceCharges.filter((charge) => charge.client_bu_id === buId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading client profile...</p>
        </div>
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Client not found</p>
          <button
            onClick={() => router.push('/dashboard/control-room/client')}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Back to Client List
          </button>
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
        <button
          onClick={() => router.push('/dashboard/control-room/client')}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Client List
        </button>
      </div>

      {/* Client Basic Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Client Name</label>
            <p className="text-sm text-gray-900 mt-1">{clientInfo.client_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Account</label>
            <p className="text-sm text-gray-900 mt-1">{clientInfo.account?.account_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">IEC No</label>
            <p className="text-sm text-gray-900 mt-1">{clientInfo.iec_no || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Alias</label>
            <p className="text-sm text-gray-900 mt-1">{clientInfo.alias || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Credit Terms</label>
            <p className="text-sm text-gray-900 mt-1">{clientInfo.credit_terms || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Owner</label>
            <p className="text-sm text-gray-900 mt-1">{clientInfo.client_owner_ship || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
              clientInfo.status === 'Active' ? 'bg-green-100 text-green-800' :
              clientInfo.status === 'InActive' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {clientInfo.status || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* BU Accordion */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Business Units / Branches</h2>
        </div>
        {clientBus.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No business units found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {clientBus.map((bu) => {
              const isExpanded = expandedBu[bu.id];
              const buServiceCharges = getServiceChargesForBu(bu.id);

              return (
                <div key={bu.id} className="border-b border-gray-200 last:border-b-0">
                  <button
                    onClick={() => toggleBu(bu.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <h3 className="text-base font-semibold text-gray-900">{bu.bu_name || 'N/A'}</h3>
                      <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                        {bu.client_type && (
                          <span>Type: {bu.client_type}</span>
                        )}
                        {bu.state?.state_name && (
                          <span>State: {bu.state.state_name}</span>
                        )}
                        {bu.city && (
                          <span>City: {bu.city}</span>
                        )}
                        {bu.gst_no && (
                          <span>GST: {bu.gst_no}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {buServiceCharges.length} Service Charge{buServiceCharges.length !== 1 ? 's' : ''}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      {/* BU Details */}
                      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500">BU Name</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.bu_name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Client Type</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.client_type || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">State</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.state?.state_name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">City</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.city || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Pincode</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.pincode || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Branch Code</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.branch_code || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">GST No</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.gst_no || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">S-C/I</label>
                          <p className="text-sm text-gray-900 mt-1">{bu.sc_i || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Status</label>
                          <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                            bu.status === 'Active' ? 'bg-green-100 text-green-800' :
                            bu.status === 'InActive' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bu.status || 'N/A'}
                          </span>
                        </div>
                        {bu.address && (
                          <div className="md:col-span-2 lg:col-span-3">
                            <label className="text-xs font-medium text-gray-500">Address</label>
                            <p className="text-sm text-gray-900 mt-1">{bu.address}</p>
                          </div>
                        )}
                      </div>

                      {/* Service Charges Table */}
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Service Charges</h4>
                        {buServiceCharges.length === 0 ? (
                          <p className="text-sm text-gray-500">No service charges found for this BU</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">C-Id</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Job Title</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact Person</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Phone</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Min</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Max</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {buServiceCharges.map((charge) => (
                                  <tr key={charge.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {charge.group_id || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {charge.jobRegister?.job_title || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {charge.concern_person || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {charge.concern_email_id || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {charge.concern_phone_no || 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {charge.min || '0'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {charge.max || '0'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        charge.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        charge.status === 'InActive' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {charge.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Service Charges Flat Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Service Charges</h2>
        </div>
        {serviceCharges.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No service charges found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BU Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">C-Id</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fixed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per SHB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CA Charges</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CE Charges</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg. Other Charges</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serviceCharges.map((charge) => {
                  const bu = clientBus.find(b => b.id === charge.client_bu_id);
                  return (
                    <tr key={charge.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bu?.bu_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {charge.group_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.jobRegister?.job_title || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.concern_person || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.concern_email_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.concern_phone_no || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.min || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.max || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.in_percentage || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.fixed || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.per_shb || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.ca_charges || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.ce_charges || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {charge.registration_other_charges || '0'}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

