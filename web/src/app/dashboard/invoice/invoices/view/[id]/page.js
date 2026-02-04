"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAccount } from "@/context/AccountContext";
import Modal from "@/components/Modal";
import { Button } from "@/components/formComponents";
import InvoiceDisplay from "@/components/InvoiceDisplay";

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id;
  const { selectedAccount: sessionAccount } = useAccount();
  
  const [invoice, setInvoice] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poNoInput, setPoNoInput] = useState("");
  const [isUpdatingPO, setIsUpdatingPO] = useState(false);
  const [isIRNModalOpen, setIsIRNModalOpen] = useState(false);
  const [irnNoInput, setIrnNoInput] = useState("");
  const [isUpdatingIRN, setIsUpdatingIRN] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);
  const [isShiftingToProforma, setIsShiftingToProforma] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const isPrintingRef = useRef(false);

  // Lock body scroll when invoice is displayed (Draft/Proforma Invoice)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch invoice data - all data comes from single API call
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) return;

      try {
        setLoading(true);
        // Single API call - returns all needed data (same structure as /invoices/sample)
        const response = await api.get(`/invoices/${invoiceId}`);
        const invoiceData = response.data;
        setInvoice(invoiceData);

        // Fetch account if we have account_id from invoice
        let accountId = null;
        if (invoiceData.account_id) {
          accountId = invoiceData.account_id;
        } else if (invoiceData.invoiceSelectedJobs && invoiceData.invoiceSelectedJobs.length > 0) {
          const firstJob = invoiceData.invoiceSelectedJobs[0].job;
          if (firstJob && firstJob.clientInfo && firstJob.clientInfo.account_id) {
            accountId = firstJob.clientInfo.account_id;
          }
        }

        if (accountId) {
          try {
            const accountResponse = await api.get(`/accounts/${accountId}`);
            setAccount(accountResponse.data);
          } catch (error) {
            console.error("Error fetching account:", error);
            // Use session account as fallback
            if (sessionAccount && sessionAccount.id !== "all") {
              setAccount(sessionAccount);
            }
          }
        } else if (sessionAccount && sessionAccount.id !== "all") {
          setAccount(sessionAccount);
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        alert("Failed to load invoice. Please try again.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, router, sessionAccount]);

  // Extract job IDs from invoice response
  const jobIds = useMemo(() => {
    if (!invoice?.jobs) {
      // Fallback: extract from invoiceSelectedJobs if jobs not available
      if (invoice?.invoiceSelectedJobs) {
        return invoice.invoiceSelectedJobs
          .map((invoiceJob) => invoiceJob.job?.id)
          .filter(Boolean);
      }
      return [];
    }
    return invoice.jobs.map((job) => job.id).filter(Boolean);
  }, [invoice]);

  // Format date (use proforma_created_at for Proforma Invoice, created_at for Draft Invoice)
  const invoiceDate = useMemo(() => {
    if (!invoice) return "NA";
    // For Proforma Invoice, use proforma_created_at if available, otherwise fallback to created_at
    let dateToUse = null;
    if (invoice.invoice_stage_status === "Proforma" && invoice.proforma_created_at) {
      dateToUse = invoice.proforma_created_at;
    } else if (invoice.created_at) {
      dateToUse = invoice.created_at;
    }
    
    if (!dateToUse) return "NA";
    
    const date = new Date(dateToUse);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }, [invoice]);

  // Get invoice number (proforma_view_id for Proforma Invoice, draft_view_id for Draft Invoice)
  const invoiceNumber = useMemo(() => {
    if (!invoice) return "NA";
    // For Proforma Invoice, prioritize proforma_view_id
    if (invoice.invoice_stage_status === "Proforma") {
      return invoice.proforma_view_id || invoice.draft_view_id || "NA";
    }
    // For Draft Invoice, use draft_view_id
    return invoice.draft_view_id || invoice.proforma_view_id || "NA";
  }, [invoice]);

  // Get invoice type label
  const invoiceTypeLabel = useMemo(() => {
    if (!invoice) return "Invoice";
    return invoice.invoice_stage_status === "Draft" ? "Draft Invoice" : "Proforma Invoice";
  }, [invoice]);

  // Check if invoice is draft or proforma
  const isDraft = useMemo(() => {
    return invoice?.invoice_stage_status === "Draft";
  }, [invoice]);

  const isProforma = useMemo(() => {
    return invoice?.invoice_stage_status === "Proforma";
  }, [invoice]);

  // Handle PO No modal open
  const handleOpenPOModal = () => {
    const poNo = invoice?.po_no;
    // Set to empty string if po_no is null, undefined, or "NA"
    setPoNoInput(poNo && poNo !== "NA" ? poNo : "");
    setIsPOModalOpen(true);
  };

  // Handle PO No modal close
  const handleClosePOModal = () => {
    setIsPOModalOpen(false);
    setPoNoInput("");
  };

  // Handle PO No save
  const handleSavePO = async () => {
    if (!invoiceId) return;

    try {
      setIsUpdatingPO(true);
      await api.put(`/invoices/${invoiceId}`, {
        po_no: poNoInput.trim() || null,
      });

      // Refresh invoice data
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoice(response.data);
      
      handleClosePOModal();
    } catch (error) {
      console.error("Error updating PO No:", error);
      alert("Failed to update PO No. Please try again.");
    } finally {
      setIsUpdatingPO(false);
    }
  };

  // Handle IRN No modal open
  const handleOpenIRNModal = () => {
    const irnNo = invoice?.irn_no;
    // Set to empty string if irn_no is null, undefined, or "NA"
    setIrnNoInput(irnNo && irnNo !== "NA" ? irnNo : "");
    setIsIRNModalOpen(true);
  };

  // Handle IRN No modal close
  const handleCloseIRNModal = () => {
    setIsIRNModalOpen(false);
    setIrnNoInput("");
  };

  // Handle IRN No save
  const handleSaveIRN = async () => {
    if (!invoiceId) return;

    try {
      setIsUpdatingIRN(true);
      await api.put(`/invoices/${invoiceId}`, {
        irn_no: irnNoInput.trim() || null,
      });

      // Refresh invoice data
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoice(response.data);
      
      handleCloseIRNModal();
    } catch (error) {
      console.error("Error updating IRN No:", error);
      alert("Failed to update IRN No. Please try again.");
    } finally {
      setIsUpdatingIRN(false);
    }
  };

  // Handle Note modal open
  const handleOpenNoteModal = () => {
    const note = invoice?.note;
    // Set to empty string if note is null, undefined, or empty
    setNoteInput(note && note.trim() !== "" ? note : "");
    setIsNoteModalOpen(true);
  };

  // Handle Note modal close
  const handleCloseNoteModal = () => {
    setIsNoteModalOpen(false);
    setNoteInput("");
  };

  // Handle Note save
  const handleSaveNote = async () => {
    if (!invoiceId) return;

    try {
      setIsUpdatingNote(true);
      await api.put(`/invoices/${invoiceId}`, {
        note: noteInput.trim() || null,
      });

      // Refresh invoice data
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoice(response.data);
      
      handleCloseNoteModal();
    } catch (error) {
      console.error("Error updating Note:", error);
      alert("Failed to update Note. Please try again.");
    } finally {
      setIsUpdatingNote(false);
    }
  };

  // Handle Shift to Proforma
  const handleShiftToProforma = async () => {
    if (!invoiceId) return;

    // Confirm action
    if (!confirm("Are you sure you want to shift this invoice to Proforma?")) {
      return;
    }

    try {
      setIsShiftingToProforma(true);
      await api.put(`/invoices/${invoiceId}`, {
        invoice_stage_status: "Proforma",
      });

      // Refresh invoice data
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoice(response.data);
      
      alert("Invoice shifted to Proforma successfully!");
      // Redirect to invoices page with draft type filter
      router.push("/dashboard/invoice/invoices?type=draft");
    } catch (error) {
      console.error("Error shifting invoice to Proforma:", error);
      alert("Failed to shift invoice to Proforma. Please try again.");
    } finally {
      setIsShiftingToProforma(false);
    }
  };

  // Handle PDF generation and download
  const handleGeneratePdf = async () => {
    try {
      if (!invoice || !invoiceId) {
        alert("Invoice data not loaded. Please wait...");
        return;
      }

      if (isPrintingRef.current) return;
      isPrintingRef.current = true;
      setGeneratingPdf(true);

      // Use the invoice-specific PDF endpoint which includes po_no, irn_no, and note
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob', // Important for binary data
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}-${invoiceDate}.pdf`;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invoice not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayAccount = account || sessionAccount;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto print:bg-white">
      {/* Action Buttons - Hidden on Print */}
      <div className="bg-white border-b border-gray-200 p-2 flex justify-between items-center print:hidden sticky top-0 z-50 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back
          </button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
        
        <div className="flex justify-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {invoiceTypeLabel}
          </h1>
        </div>
        <div className="flex gap-2">
          {invoice?.invoice_stage_status === "Draft" && (
            <button
              onClick={handleShiftToProforma}
              disabled={isShiftingToProforma}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isShiftingToProforma ? "Shifting..." : "Shift to Proforma"}
            </button>
          )}
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
        invoiceData={invoice}
        account={displayAccount}
        invoiceNo={invoiceNumber}
        invoiceDate={invoiceDate}
        jobIds={jobIds}
        isLoading={loading}
        onBack={() => router.back()}
        onEditPO={handleOpenPOModal}
        onEditIRN={isProforma ? handleOpenIRNModal : undefined}
        onEditNote={handleOpenNoteModal}
        onShiftToProforma={isDraft ? handleShiftToProforma : undefined}
        isDraft={isDraft}
        isProforma={isProforma}
        logoError={logoError}
        onLogoError={setLogoError}
      />

      {/* PO No Modal */}
      <Modal
        isOpen={isPOModalOpen}
        onClose={handleClosePOModal}
        title="Add / Edit PO No."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>
          
          {/* Input Field */}
          <div>
            <input
              type="text"
              value={poNoInput}
              onChange={(e) => setPoNoInput(e.target.value)}
              placeholder="Enter PO No."
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSavePO();
                }
              }}
            />
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClosePOModal}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSavePO}
              disabled={isUpdatingPO}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingPO ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* IRN No Modal */}
      <Modal
        isOpen={isIRNModalOpen}
        onClose={handleCloseIRNModal}
        title="Add / Edit IRN No."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>
          
          {/* Input Field */}
          <div>
            <input
              type="text"
              value={irnNoInput}
              onChange={(e) => setIrnNoInput(e.target.value)}
              placeholder="Enter IRN No."
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveIRN();
                }
              }}
            />
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseIRNModal}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveIRN}
              disabled={isUpdatingIRN}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingIRN ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleCloseNoteModal}
        title="Add / Edit Note"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>
          
          {/* Textarea Field */}
          <div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Enter Note"
              rows={6}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-y"
              autoFocus
            />
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseNoteModal}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={isUpdatingNote}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingNote ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
