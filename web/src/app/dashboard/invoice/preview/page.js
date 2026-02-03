"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/services/api";
import { useAccount } from "@/context/AccountContext";
import InvoiceDisplay from "@/components/InvoiceDisplay";

export default function InvoicePreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedAccount: sessionAccount } = useAccount();
  const isPrintingRef = useRef(false);
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [invoiceBreakdown, setInvoiceBreakdown] = useState(null);
  const [invoiceBreakdownLoading, setInvoiceBreakdownLoading] = useState(true);

  // Get query parameters
  const jobIdsParam = searchParams.get("job_ids");
  const billingType = searchParams.get("billing_type");
  const rewardAmount = searchParams.get("reward_amount") || "0";
  const discountAmount = searchParams.get("discount_amount") || "0";
  const invoiceType = searchParams.get("invoice_type") || "Full Invoice";

  // Parse job IDs
  const jobIds = useMemo(() => {
    if (!jobIdsParam) return [];
    return jobIdsParam.split(",").map((id) => parseInt(id.trim())).filter(Boolean);
  }, [jobIdsParam]);

  // Validate required params
  useEffect(() => {
    if (!jobIdsParam || !billingType) {
      alert("Missing required parameters. Redirecting to invoice creation...");
      router.push("/dashboard/invoice/invoice-creation");
    }
  }, [jobIdsParam, billingType, router]);

  // Fetch invoice breakdown from API (includes all needed data)
  useEffect(() => {
    const fetchInvoiceBreakdown = async () => {
      if (jobIds.length === 0 || !billingType) {
        return;
      }

      try {
        setInvoiceBreakdownLoading(true);
        const response = await api.get("/invoices/sample", {
          params: {
            job_ids: jobIds.join(","),
            billing_type: billingType,
            reward_amount: rewardAmount || 0,
            discount_amount: discountAmount || 0,
          },
        });

        setInvoiceBreakdown(response.data);
      } catch (error) {
        console.error("Error fetching invoice breakdown:", error);
        alert("Error fetching invoice breakdown. Please try again.");
        router.push("/dashboard/invoice/invoice-creation");
      } finally {
        setInvoiceBreakdownLoading(false);
      }
    };

    fetchInvoiceBreakdown();
  }, [jobIds, billingType, rewardAmount, discountAmount, router]);

  // Get current date
  const currentDate = useMemo(() => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  // Handle PDF generation and download
  const handleGeneratePdf = async () => {
    try {
      if (!invoiceBreakdown || !sessionAccount) {
        alert("Invoice data not loaded. Please wait...");
        return;
      }

      if (isPrintingRef.current) return;
      isPrintingRef.current = true;
      setGeneratingPdf(true);

      // Build query parameters for PDF endpoint
      const params = new URLSearchParams({
        job_ids: jobIds.join(","),
        billing_type: billingType,
        reward_amount: rewardAmount || 0,
        discount_amount: discountAmount || 0,
        invoice_no: "NA",
        invoice_date: currentDate,
      });

      // Add account_id if available
      if (sessionAccount && sessionAccount.id !== "all") {
        params.append("account_id", sessionAccount.id);
      }

      // Call PDF endpoint
      const response = await api.get(`/invoices/sample/pdf?${params.toString()}`, {
        responseType: 'blob', // Important for binary data
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${currentDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to generate PDF. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setGeneratingPdf(false);
      isPrintingRef.current = false;
    }
  };

  // Handle save invoice
  const handleSaveInvoice = async () => {
    try {
      if (!invoiceBreakdown) {
        alert("Invoice data not loaded. Please wait...");
        return;
      }

      setLoading(true);

      const invoiceData = {
        account_id: sessionAccount && sessionAccount.id !== "all" ? parseInt(sessionAccount.id) : null,
        job_register_id: invoiceBreakdown.jobRegisterId,
        billing_type: billingType,
        invoice_type: invoiceType,
        pay_amount: invoiceBreakdown.finalAmount.toFixed(2),
        amount: invoiceBreakdown.professionalCharges.toFixed(2),
        professional_charges: billingType === "Reimbursement" ? 0 : invoiceBreakdown.professionalCharges,
        registration_other_charges: billingType === "Reimbursement" ? 0 : invoiceBreakdown.registrationCharges,
        ca_charges: billingType === "Reimbursement" ? 0 : invoiceBreakdown.caCharges,
        ce_charges: billingType === "Reimbursement" ? 0 : invoiceBreakdown.ceCharges,
        ca_cert_count: billingType === "Reimbursement" ? 0 : invoiceBreakdown.caCertCount || 0,
        ce_cert_count: billingType === "Reimbursement" ? 0 : invoiceBreakdown.ceCertCount || 0,
        application_fees: billingType === "Service" ? 0 : invoiceBreakdown.applicationFees,
        remi_one_charges: billingType === "Service" ? 0 : invoiceBreakdown.remiOneCharges || 0,
        remi_two_charges: billingType === "Service" ? 0 : invoiceBreakdown.remiTwoCharges || 0,
        remi_three_charges: billingType === "Service" ? 0 : invoiceBreakdown.remiThreeCharges || 0,
        remi_four_charges: billingType === "Service" ? 0 : invoiceBreakdown.remiFourCharges || 0,
        remi_five_charges: billingType === "Service" ? null : invoiceBreakdown.remiFiveCharges || null,
        reward_amount: billingType === "Reimbursement" ? 0 : parseFloat(rewardAmount || 0),
        discount_amount: billingType === "Reimbursement" ? 0 : parseFloat(discountAmount || 0),
        note: null,
        po_no: null,
        irn_no: null,
        job_ids: jobIds,
      };

      const response = await api.post("/invoices", invoiceData);

      if (response.data) {
        alert("Invoice saved successfully!");
        router.push("/dashboard/invoice/invoices?type=draft");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      const errorMessage =
        error.response?.data?.details ||
        error.response?.data?.error ||
        error.message ||
        "Failed to save invoice. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (invoiceBreakdownLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">Loading invoice preview...</div>
        </div>
      </div>
    );
  }

  if (!invoiceBreakdown) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 text-red-600">
            Failed to load invoice data
          </div>
          <button
            onClick={() => router.push("/dashboard/invoice/invoice-creation")}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Invoice Creation
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            overflow: visible !important;
            height: auto !important;
          }
          html {
            overflow: visible !important;
            height: auto !important;
          }
          body > div:first-child {
            position: static !important;
            height: auto !important;
            overflow: visible !important;
            inset: auto !important;
            max-height: none !important;
          }
        }
      `}</style>
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto print:bg-white">
        {/* Action Buttons - Hidden on Print */}
        <div className="bg-white border-b border-gray-200 p-2 flex justify-between items-center print:hidden sticky top-0 z-50 shadow-sm">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Back
        </button>
        <div className="flex justify-center">
          <h1 className="text-2xl font-bold text-gray-900">Invoice Preview</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveInvoice}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Invoice"}
          </button>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generatingPdf ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Use shared InvoiceDisplay component */}
      <InvoiceDisplay
        invoiceData={invoiceBreakdown}
        account={sessionAccount}
        invoiceNo="NA"
        invoiceDate={currentDate}
        jobIds={jobIds}
        onSaveInvoice={handleSaveInvoice}
        showSaveButton={true}
        isLoading={loading}
        onBack={() => router.back()}
        onPrint={() => window.print()}
        logoError={logoError}
        onLogoError={setLogoError}
      />
      </div>
    </>
  );
}
