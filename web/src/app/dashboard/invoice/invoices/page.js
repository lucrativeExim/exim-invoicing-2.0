'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SelectBox } from '@/components/formComponents';
import api from '@/services/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoiceType, setInvoiceType] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const invoiceTypeOptions = [
    { value: 'draft', label: 'Draft Invoice' },
    { value: 'proforma', label: 'Proforma Invoice' },
  ];

  // Initialize invoice type from URL params on mount
  useEffect(() => {
    const typeFromUrl = searchParams.get('type');
    if (typeFromUrl && (typeFromUrl === 'draft' || typeFromUrl === 'proforma')) {
      setInvoiceType(typeFromUrl);
    }
  }, [searchParams]);

  const handleInvoiceTypeChange = (e) => {
    const selectedValue = e.target.value || '';
    setInvoiceType(selectedValue);
    
    // Update URL with selected invoice type
    const params = new URLSearchParams(searchParams.toString());
    if (selectedValue && (selectedValue === 'draft' || selectedValue === 'proforma')) {
      params.set('type', selectedValue);
    } else {
      params.delete('type');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Fetch invoices when invoice type changes
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!invoiceType) {
        setInvoices([]);
        return;
      }

      setLoading(true);
      try {
        let invoiceStatus = 'Active';
        let invoiceStageStatus = null;

        if (invoiceType === 'draft') {
          invoiceStageStatus = 'Draft';
        } else if (invoiceType === 'proforma') {
          invoiceStageStatus = 'Proforma';
        }

        // Build params object, only include invoice_stage_status if it has a value
        const params = {
          invoice_status: invoiceStatus,
        };
        if (invoiceStageStatus) {
          params.invoice_stage_status = invoiceStageStatus;
        }

        const response = await api.get('/invoices', { params });

        setInvoices(response.data || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [invoiceType]);


  // Format amount for display
  const formatAmount = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  // Handle view invoice
  const handleViewInvoice = (invoiceId) => {
    router.push(`/dashboard/invoice/invoices/view/${invoiceId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-1">
      <div className="mx-auto">
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Invoice Type Dropdown */}
          <div className="col-span-4">
            <SelectBox
              label="Invoice Type"
              name="invoiceType"
              value={invoiceType}
              onChange={handleInvoiceTypeChange}
              options={invoiceTypeOptions}
              placeholder="Select invoice type..."
              isClearable={true}
              isSearchable={false}
            />
          </div>
        </div>

        {/* Invoices Table */}
        {invoiceType && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {invoiceType === 'draft' ? 'Draft Invoices' : 'Proforma Invoices'}
              </h2>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No invoices found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        View
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {invoiceType === 'draft' ? 'Draft ID' : 'Proforma ID'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Register
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Billing Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => handleViewInvoice(invoice.id)}
                            className="px-2 py-1 text-xs font-medium text-cyan-700 bg-cyan-200 hover:bg-cyan-300 rounded shadow-sm hover:shadow transition-all duration-200"
                            title="View Invoice"
                          >
                            View
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoiceType === 'draft' ? invoice.draft_view_id || '-' : invoice.proforma_view_id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.jobRegister?.job_code || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.billing_type || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.invoice_type || '-'}
                        </td> 
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateDDMMYYYY(invoice.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.addedByUser
                            ? `${invoice.addedByUser.first_name} ${invoice.addedByUser.last_name}`
                            : '-'}
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
    </div>
  );
}

