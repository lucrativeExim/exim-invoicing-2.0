'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/context/AccountContext';

export default function SampleInvoicePage() {
  const router = useRouter();
  const { selectedAccount: sessionAccount } = useAccount();
  
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get invoice data from localStorage (set before navigation)
    const storedData = localStorage.getItem('sampleInvoiceData');
    if (storedData) {
      try {
        setInvoiceData(JSON.parse(storedData));
      } catch (error) {
        console.error('Error parsing invoice data:', error);
      }
    }
    setLoading(false);
  }, []);

  // Helper function to convert number to words (Indian currency format)
  const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (n) => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
      }
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
    };
    
    const convert = (n) => {
      if (n === 0) return '';
      if (n < 100) return convertHundreds(n);
      if (n < 1000) {
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        return convertHundreds(hundred) + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
      }
      if (n < 100000) {
        const thousand = Math.floor(n / 1000);
        const remainder = n % 1000;
        return convertHundreds(thousand) + ' Thousand' + (remainder > 0 ? ' ' + convert(remainder) : '');
      }
      if (n < 10000000) {
        const lakh = Math.floor(n / 100000);
        const remainder = n % 100000;
        return convertHundreds(lakh) + ' Lakh' + (remainder > 0 ? ' ' + convert(remainder) : '');
      }
      const crore = Math.floor(n / 10000000);
      const remainder = n % 10000000;
      return convertHundreds(crore) + ' Crore' + (remainder > 0 ? ' ' + convert(remainder) : '');
    };
    
    const parts = parseFloat(num).toFixed(2).split('.');
    const rupees = parseInt(parts[0]);
    const paise = parseInt(parts[1] || 0);
    
    let result = convert(rupees);
    if (paise > 0) {
      result += ' and ' + convertHundreds(paise) + ' Paise';
    }
    return result + ' Only';
  };

  // Calculate tax amounts and totals
  const invoiceCalculations = useMemo(() => {
    if (!invoiceData) return null;
    
    const baseAmount = parseFloat(invoiceData.finalAmount || invoiceData.amount || 0);
    const cgstRate = 9; // 9%
    const sgstRate = 9; // 9%
    const igstRate = 18; // 18%
    
    const cgstAmount = (baseAmount * cgstRate) / 100;
    const sgstAmount = (baseAmount * sgstRate) / 100;
    const igstAmount = 0; // Will be 0 if CGST/SGST is used
    
    const applicationFees = parseFloat(invoiceData.applicationFees || 0);
    
    const total = baseAmount + cgstAmount + sgstAmount + igstAmount + applicationFees;
    
    return {
      baseAmount,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      applicationFees,
      total,
      totalInWords: numberToWords(total)
    };
  }, [invoiceData]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading invoice...</div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No invoice data found</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const account = invoiceData.account || sessionAccount;
  const currentDate = invoiceData.date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  return (
    <div className="min-h-screen print:bg-white">
      {/* Action Buttons - Hidden on Print */}
      <div className="bg-white border-b border-gray-200 p-1 flex justify-between items-center print:hidden sticky top-0 z-50 shadow-sm">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Back
        </button>
        <div className="flex justify-center">
            <h1 className="text-2xl font-bold text-gray-900">Sample Invoice</h1>
          </div>
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
        >
          Print Invoice
        </button>
      </div>

      {/* Invoice Container - Paper-like appearance */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-full">
        <div className="bg-white shadow-2xl print:shadow-none p-8 print:p-8" style={{ minHeight: '29.7cm' }}>
          {/* GST Invoice Title - Top Right */}
          

          {/* Top Section: Company Info (Left) and Invoice Details (Right) */}
          <div className="grid grid-cols-12 gap-4 mb-4 pb-4">
            {/* Left: Company Info */}
            <div className="col-span-7">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-gray-500 text-center">Logo</span>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-base mb-1">{account?.account_name || 'NA'}</div>
                  
                </div>
              </div>
            </div>

            {/* Right: Invoice Details Box */}
            <div className="col-span-5">
              <div className="p-3">
                <div className="text-lg font-bold mb-3 text-center">GST Invoice</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Invoice No.:</span>
                    <span className="text-right">{invoiceData.invoiceNo || 'NA'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Date:</span>
                    <span className="text-right">{currentDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Job No:</span>
                    <span className="text-right">{invoiceData.jobNo || 'NA'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Customer Id:</span>
                    <span className="text-right">{invoiceData.customerId || 'NA'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Po No:</span>
                    <span className="text-right">{invoiceData.poNo || 'NA'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">IRN No.:</span>
                    <span className="text-xs break-all text-right">{invoiceData.irnNo || 'NA'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billed To Section */}
          <div className="mb-4">
            <div className="font-semibold text-sm mb-1">Billed To:</div>
            <div className="p-2 text-sm">
              <div className="font-semibold">{invoiceData.billedTo || 'NA'}</div>
              {invoiceData.billedToAddress && (
                <div className="text-xs text-gray-700 mt-1">{invoiceData.billedToAddress}</div>
              )}
            </div>
            
          </div>

          {/* Professional Service Charges Section */}
          <div className="mb-4">
            <div className="bg-gray-200 px-3 py-2 flex justify-between items-center">
              <span className="font-bold text-sm">PROFESSIONAL SERVICE CHARGES REGARDING</span>
              <span className="font-bold text-sm">AMOUNT</span>
            </div>
            <div className="p-3">
              <div className="mb-2">
                <div className="font-semibold text-sm mb-1">
                  <span className="font-bold">DETAILS:</span> {invoiceData.serviceDetails || 'NA'}
                </div>
                {invoiceData.dynamicFields && (
                  <div className="p-2 mb-2 text-xs">
                    {invoiceData.dynamicFields}
                  </div>
                )}
                <div className="p-2 text-xs">
                  <span className="font-semibold">Charges As Under:</span> {invoiceData.chargesAsUnder || 'NA'}
                </div>
              </div>
              <div className="text-right text-base font-bold mt-2">
                ₹ {parseFloat(invoiceData.finalAmount || invoiceData.amount || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Note Section */}
          {invoiceData.note && (
            <div className="px-3 py-1.5 mb-4 text-xs border-t border-b border-black">
              <span className="font-semibold">NOTE:</span> {invoiceData.note}
            </div>
          )}

          {/* Bottom Section: Bank Details (Left) and Charges/Taxes (Right) */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Left: Bank Details */}
            <div className="space-y-3">
              <div className="p-3">
                <div className="font-bold text-sm mb-2 pb-1">BANK Details</div>
                <div className="space-y-1 text-xs">
                  <div><span className="font-semibold">Bank Of:</span> {account?.bank_name || 'NA'}</div>
                  <div><span className="font-semibold">Branch:</span> {account?.bank_address || 'NA'}</div>
                  <div><span className="font-semibold">A/C No. Current A/C:</span> {account?.account_no || 'NA'}</div>
                  <div><span className="font-semibold">IFSC Code:</span> {account?.ifsc_no || 'NA'}</div>
                </div>
              </div>
              <div className="p-3">
                <div className="space-y-1 text-xs">
                  <div><span className="font-semibold">SAC No.:</span> {invoiceData.sacNo || 'NA'}</div>
                  <div><span className="font-semibold">GST Detail:</span> {account?.gst_no || 'NA'}</div>
                  <div><span className="font-semibold">PAN No.:</span> {account?.pan_no || 'NA'}</div>
                  <div><span className="font-semibold">MSME Registration No.:</span> {account?.msme_details || 'NA'}</div>
                </div>
              </div>
            </div>

            {/* Right: Charges and Taxes */}
            <div className="p-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Discount/Reward:</span>
                  <span>₹ {parseFloat(invoiceData.rewardDiscountAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Registration/Other Chargess:</span>
                  <span>₹ {parseFloat(invoiceData.registrationCharges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Arrangement of CA CERT. ({invoiceData.caCertCount || 0} Nos):</span>
                  <span>₹ {parseFloat(invoiceData.caCharges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Arrangement of CE CERT. ({invoiceData.ceCertCount || 0} Nos):</span>
                  <span>₹ {parseFloat(invoiceData.ceCharges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1.5 mt-1.5">
                  <span>Subtotal:</span>
                  <span>₹ {parseFloat(invoiceData.finalAmount || invoiceData.amount || 0).toFixed(2)}</span>
                </div>
                {invoiceCalculations && (
                  <>
                    <div className="flex justify-between">
                      <span>C GST: {invoiceCalculations.cgstRate}%:</span>
                      <span>₹ {invoiceCalculations.cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>S GST: {invoiceCalculations.sgstRate}%:</span>
                      <span>₹ {invoiceCalculations.sgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>I GST: {invoiceCalculations.igstRate}%:</span>
                      <span>₹ {invoiceCalculations.igstAmount.toFixed(2)}</span>
                    </div>
                    <div className="pt-1.5 mt-1.5">
                      <div className="font-semibold mb-1">Reimbursements:</div>
                      <div className="flex justify-between ml-3">
                        <span>Application Fees:</span>
                        <span>₹ {invoiceCalculations.applicationFees.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between ml-3">
                        <span>Any other:</span>
                        <span>₹ 0.00</span>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 mt-2">
                      <span>TOTAL:</span>
                      <span>₹ {invoiceCalculations.total.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Total Amount in Words */}
          {invoiceCalculations && (
            <div className="p-3 mb-4 border-t border-b border-black">
              <div className="text-xs">
                <span className="font-semibold">Total:</span> Rs. {invoiceCalculations.totalInWords}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 text-center mb-2">
            <span className="font-semibold text-sm">Thank You For Business.</span>
          </div>

          {/* Page Number - Bottom Right */}
          <div className="text-right text-xs text-gray-600">
            Page 1 of 1
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:p-8 {
            padding: 2rem !important;
          }
          .print\\:max-w-full {
            max-width: 100% !important;
          }
          .print\\:border-0 {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:bg-white {
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
