"use client";

import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAccount } from "@/context/AccountContext";
import { usePageTitle } from "@/context/PageTitleContext";
import Modal from "@/components/Modal";
import InvoiceDisplay from "@/components/InvoiceDisplay";
import ShowMore from "@/components/ShowMore";
import { Badge, Button } from "@/components/formComponents";
import { calculateServiceSubtotal as calculateServiceSubtotalUtil } from "@/utils/invoiceUtils";

// Helper function to get field value from JobFieldValue table
const getFieldValueFromJobFieldValue = (
  jobId,
  fieldName,
  jobFieldValuesMap
) => {
  if (!jobId || !fieldName || !jobFieldValuesMap[jobId]) {
    return null;
  }

  const fieldMap = jobFieldValuesMap[jobId];

  // Try exact match first
  if (fieldMap[fieldName]) {
    return fieldMap[fieldName];
  }

  // Try case-insensitive match
  const lowerFieldName = fieldName.toLowerCase();
  for (const key in fieldMap) {
    if (key.toLowerCase() === lowerFieldName) {
      return fieldMap[key];
    }
  }

  // Try variations: replace underscores with spaces and vice versa
  const variations = [
    fieldName.replace(/_/g, " "),
    fieldName.replace(/\s+/g, "_"),
    fieldName.replace(/_/g, "").toLowerCase(),
  ];

  for (const variation of variations) {
    if (fieldMap[variation]) {
      return fieldMap[variation];
    }
    // Case-insensitive match for variations
    for (const key in fieldMap) {
      if (key.toLowerCase() === variation.toLowerCase()) {
        return fieldMap[key];
      }
    }
  }

  return null;
};

// Helper function to check if field name is Quantity (case-insensitive)
const isQuantityField = (fieldName) => {
  if (!fieldName) return false;
  const lowerFieldName = fieldName.toLowerCase().trim();
  return lowerFieldName === "quantity";
};

// Helper function to calculate total quantity across all jobs
const calculateTotalQuantity = (jobIds, jobFieldValuesMap, fieldName) => {
  if (!jobIds || jobIds.length === 0) return null;
  
  let total = 0;
  let hasValidQuantity = false;

  jobIds.forEach((jobId) => {
    const quantityValue = getFieldValueFromJobFieldValue(
      jobId,
      fieldName,
      jobFieldValuesMap
    );
    
    if (quantityValue !== null && quantityValue !== undefined && quantityValue !== "NA") {
      const numValue = parseFloat(quantityValue);
      if (!isNaN(numValue)) {
        total += numValue;
        hasValidQuantity = true;
      }
    }
  });

  return hasValidQuantity ? total : null;
};

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id;
  const { selectedAccount: sessionAccount } = useAccount();
  const { setPageTitle } = usePageTitle();
  
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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelAction, setCancelAction] = useState(null); // 'cancel' or 'cancelAndEdit'
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState(true);
  const [isChargesOpen, setIsChargesOpen] = useState(true);
  const [isJobsOpen, setIsJobsOpen] = useState(true);
 // Map of jobId -> job data for display
  const isPrintingRef = useRef(false);

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

    // Cleanup: clear page title when component unmounts
    return () => {
      setPageTitle(null);
    };
  }, [invoiceId, router, sessionAccount, setPageTitle]);

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

  // Set page title with invoice number
  useEffect(() => {
    if (invoice && invoiceNumber && invoiceNumber !== "NA") {
      setPageTitle(`Invoice  #${invoiceNumber}`);
    } else {
      setPageTitle("Invoice");
    }
  }, [invoice, invoiceNumber, setPageTitle]);

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

  // Build jobFieldValuesMap from jobs data
  const jobFieldValuesMap = useMemo(() => {
    if (!invoice?.jobs) return {};
    const map = {};
    invoice.jobs.forEach((job) => {
      if (job.id && job.jobFieldValues) {
        map[job.id] = {};
        job.jobFieldValues.forEach((fv) => {
          map[job.id][fv.field_name] = fv.field_value;
        });
      }
    });
    return map;
  }, [invoice?.jobs]);

  // Get first job for display
  const firstJob = useMemo(() => {
    return invoice?.jobs && invoice.jobs.length > 0 ? invoice.jobs[0] : null;
  }, [invoice?.jobs]);

  // Get job code name
  const jobCodeName = useMemo(() => {
    return invoice?.jobRegister?.job_code || "NA";
  }, [invoice?.jobRegister]);

  // Get client info from first job's service charge
  const clientInfo = useMemo(() => {
    if (jobIds.length === 0 || !invoice?.jobServiceChargesMap) return null;
    return invoice.jobServiceChargesMap[jobIds[0]] || null;
  }, [jobIds, invoice?.jobServiceChargesMap]);

  // Calculate invoice calculations from API response
  const invoiceCalculations = useMemo(() => {
    if (!invoice) return null;

    const gst = invoice.gst || {};
    const total = invoice.finalAmount || 0;
    
    // Calculate remi charges total from remiCharges map or remiFields array
    let remiChargesTotal = 0;
    if (invoice.remiCharges && typeof invoice.remiCharges === 'object') {
      remiChargesTotal = Object.values(invoice.remiCharges).reduce(
        (sum, val) => sum + parseFloat(val || 0),
        0
      );
    } else if (invoice.remiFields && Array.isArray(invoice.remiFields)) {
      remiChargesTotal = invoice.remiFields.reduce(
        (sum, field) => sum + parseFloat(field.charges || 0),
        0
      );
    }

    return {
      baseAmount: invoice.professionalCharges || 0,
      subtotal: invoice.serviceSubtotal || 0,
      cgstRate: gst.cgstRate || 0,
      sgstRate: gst.sgstRate || 0,
      igstRate: gst.igstRate || 0,
      cgstAmount: gst.cgstAmount || 0,
      sgstAmount: gst.sgstAmount || 0,
      igstAmount: gst.igstAmount || 0,
      applicationFees: invoice.applicationFees || 0,
      remiCharges: remiChargesTotal,
      total,
    };
  }, [invoice]);

  // Get billing type
  const billingType = invoice?.billingType || invoice?.billing_type;
  const billingFieldNames = invoice?.billingFieldNames || [];

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "NA";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format user name helper
  const formatUserName = (user) => {
    if (!user) return "NA";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "NA";
  };

  // Get job IDs from invoiceSelectedJobs
  const selectedJobIds = useMemo(() => {
    if (!invoice?.invoiceSelectedJobs) return [];
    const ids = invoice.invoiceSelectedJobs.map((invoiceJob) => invoiceJob.job?.id || invoiceJob.job_id).filter(Boolean);
    console.log("selectedJobIds calculated:", ids, "from invoiceSelectedJobs count:", invoice.invoiceSelectedJobs.length);
    return ids;
  }, [invoice?.invoiceSelectedJobs]);

  // Debug: Track invoice changes
  useEffect(() => {
    if (invoice) {
      console.log("Invoice state updated:", {
        id: invoice.id,
        invoiceSelectedJobsCount: invoice.invoiceSelectedJobs?.length,
        jobsCount: invoice.jobs?.length,
        finalAmount: invoice.finalAmount,
        selectedJobIdsCount: selectedJobIds.length
      });
    }
  }, [invoice, selectedJobIds]);

  // Handle open edit jobs page
  const handleOpenEditJobs = () => {
    router.push(`/dashboard/invoice/invoices/edit/${invoiceId}/jobs`);
  };

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
      // Update invoice status to Proforma
      await api.put(`/invoices/${invoiceId}`, {
        invoice_stage_status: "Proforma",
      });

      // Refresh invoice data to show Proforma invoice
      const response = await api.get(`/invoices/${invoiceId}`);
      setInvoice(response.data);
      
      alert("Invoice shifted to Proforma successfully!");
      // Stay on the same page to show the Proforma invoice
    } catch (error) {
      console.error("Error shifting invoice to Proforma:", error);
      alert("Failed to shift invoice to Proforma. Please try again.");
    } finally {
      setIsShiftingToProforma(false);
    }
  };

  // Handle cancel modal open
  const handleOpenCancelModal = (action) => {
    setCancelAction(action);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  // Handle cancel modal close
  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancelReason("");
    setCancelAction(null);
  };

  // Handle cancel invoice
  const handleCancelInvoice = async () => {
    if (!invoiceId || !cancelReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }

    try {
      setIsCanceling(true);
      const response = await api.post(`/invoices/${invoiceId}/cancel`, {
        cancel_reason: cancelReason.trim(),
        action: cancelAction,
      });

      if (cancelAction === 'cancelAndEdit' && response.data.newInvoiceId) {
        // Redirect to the new invoice
        alert("Invoice canceled and cloned successfully!");
        router.push(`/dashboard/invoice/invoices/view/${response.data.newInvoiceId}`);
      } else {
        // Just cancel - refresh the invoice data
        alert("Invoice canceled successfully!");
        const invoiceResponse = await api.get(`/invoices/${invoiceId}`);
        setInvoice(invoiceResponse.data);
        handleCloseCancelModal();
      }
    } catch (error) {
      console.error("Error canceling invoice:", error);
      alert("Failed to cancel invoice. Please try again.");
    } finally {
      setIsCanceling(false);
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
    <div className="bg-gray-50 min-h-full">
      {/* Two Column Layout */}
      <div className="flex">
        {/* Left Column - Invoice Details */}
        <div className="w-1/2 border-r border-gray-200 bg-white p-3">
          {/* Invoice Header with Badge */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Invoice #{invoiceNumber}</h2>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  invoice?.invoice_stage_status === "Draft"
                    ? "draft"
                    : invoice?.invoice_stage_status === "Proforma"
                    ? "proforma"
                    : invoice?.invoice_stage_status === "Canceled"
                    ? "canceled"
                    : "default"
                }
              >
                {invoice?.invoice_stage_status || "NA"}
              </Badge>
              {invoice?.invoice_stage_status === "Canceled" && (
                <Badge variant="canceled">Canceled</Badge>
              )}
              {invoice?.linked_canceled_invoice && (
                <Badge variant="draft">Reopened</Badge>
              )}
              {(invoice?.invoice_stage_status === "Draft" || invoice?.invoice_stage_status === "Proforma") && (
                <ShowMore
                  onMoveToProforma={invoice?.invoice_stage_status === "Draft" ? handleShiftToProforma : undefined}
                  onDownloadPdf={handleGeneratePdf}
                  onCancel={invoice?.invoice_stage_status === "Proforma" ? handleOpenCancelModal : undefined}
                  onCancelAndEdit={invoice?.invoice_stage_status === "Proforma" ? handleOpenCancelModal : undefined}
                  isDraft={invoice?.invoice_stage_status === "Draft"}
                  isProforma={invoice?.invoice_stage_status === "Proforma"}
                  isShiftingToProforma={isShiftingToProforma}
                  generatingPdf={generatingPdf}
                />
              )}
            </div>
          </div>

          {/* Section 1: Customer & Invoice Info */}
          <div className="mb-3 bg-gray-50 rounded-lg border border-gray-200">
            <div 
              className="px-2 py-1.5 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100"
              onClick={() => setIsCustomerInfoOpen(!isCustomerInfoOpen)}
            >
              <h3 className="text-sm font-semibold text-gray-900">Customer & Invoice Info</h3>
              <svg 
                className={`w-4 h-4 text-gray-500 transition-transform ${isCustomerInfoOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {isCustomerInfoOpen && (
            <div className="p-2">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Invoice No</div>
                  <div className="font-medium text-xs break-words">{invoiceNumber}</div>
                </div>
                <div>
                  <div 
                    className="text-gray-500 mb-0.5 text-[10px] hover:text-primary-600 transition-colors cursor-pointer"
                    onClick={handleOpenPOModal}
                  >
                    PO No
                  </div>
                  <div className="font-medium text-xs break-words">{invoice?.po_no || "NA"}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Job No</div>
                  <div className="font-medium text-xs break-words">
                    {selectedJobIds.length > 1 ? `${selectedJobIds.length} Jobs` : (invoice?.invoiceSelectedJobs?.[0]?.job?.job_no || selectedJobIds[0] || "NA")}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Invoice Type</div>
                  <div className="font-medium text-xs break-words">{invoice?.invoice_type || "NA"}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Billing Type</div>
                  <div className="font-medium text-xs break-words">{billingType || "NA"}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Job Code</div>
                  <div className="font-medium text-xs break-words">{jobCodeName}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Client Name</div>
                  <div className="font-medium text-xs break-words">
                    {invoice?.invoiceSelectedJobs?.[0]?.job?.clientInfo?.client_name || "NA"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Customer ID</div>
                  <div className="font-medium text-xs break-words">
                    {clientInfo?.group_id || "NA"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Draft Created</div>
                  <div className="font-medium text-xs break-words">{formatDate(invoice?.created_at)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Draft Created By</div>
                  <div className="font-medium text-xs break-words">{formatUserName(invoice?.addedByUser)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Proforma Created</div>
                  <div className="font-medium text-xs break-words">{formatDate(invoice?.proforma_created_at)}</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-0.5 text-[10px]">Proforma Created By</div>
                  <div className="font-medium text-xs break-words">{formatUserName(invoice?.proformaCreatedByUser)}</div>
                </div>
                {invoice?.invoice_stage_status === "Canceled" && (
                  <>
                    <div>
                      <div className="text-gray-500 mb-0.5 text-[10px]">Proforma Canceled At</div>
                      <div className="font-medium text-xs break-words">{formatDate(invoice?.proforma_canceled_at)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5 text-[10px]">Proforma Canceled By</div>
                      <div className="font-medium text-xs break-words">{formatUserName(invoice?.proformaCanceledByUser)}</div>
                    </div>
                    {invoice?.cancel_reason && (
                      <div className="col-span-4">
                        <div className="text-gray-500 mb-0.5 text-[10px]">Cancel Reason</div>
                        <div className="font-medium text-xs break-words">{invoice.cancel_reason}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Section 2: Charges */}
          <div className="mb-3 bg-gray-50 rounded-lg border border-gray-200">
            <div 
              className="px-2 py-1.5 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100"
              onClick={() => setIsChargesOpen(!isChargesOpen)}
            >
              <h3 className="text-sm font-semibold text-gray-900">Charges</h3>
              <svg 
                className={`w-4 h-4 text-gray-500 transition-transform ${isChargesOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {isChargesOpen && (
            <div className="p-2">
              {/* Total Amount on Top */}
              <div className="mb-2 pb-2 border-b border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">Total Amount</span>
                  <span className="text-sm font-bold text-gray-900">
                    ₹ {invoiceCalculations?.total?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
              {/* Professional Service Charges */}
              <div className="mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-700">Professional Service Charges</span>
                  <span className="text-xs text-gray-900">
                    ₹ {billingType === "Reimbursement" && invoiceCalculations
                      ? (invoiceCalculations.applicationFees + invoiceCalculations.remiCharges).toFixed(2)
                      : (invoice?.professionalCharges || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Arrangement of CA CERT. */}
              {parseFloat(invoice?.caCharges || 0) > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">
                      Arrangement of CA CERT. ({invoice?.caCertCount || 0} Nos)
                    </span>
                    <span className="text-xs text-gray-900">
                      ₹ {parseFloat(invoice?.caCharges || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {/* Arrangement of CE CERT. */}
              {parseFloat(invoice?.ceCharges || 0) > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-700">
                      Arrangement of CE CERT. ({invoice?.ceCertCount || 0} Nos)
                    </span>
                    <span className="text-xs text-gray-900">
                      ₹ {parseFloat(invoice?.ceCharges || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {/* Subtotal */}
              <div className="mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-900">Subtotal</span>
                  <span className="text-xs font-semibold text-gray-900">
                    ₹ {invoiceCalculations?.subtotal?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Section 3: Jobs */}
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <div 
              className="px-2 py-1.5 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100"
              onClick={() => setIsJobsOpen(!isJobsOpen)}
            >
              <h3 className="text-sm font-semibold text-gray-900">
                Jobs ({invoice?.invoiceSelectedJobs?.length || 0})
              </h3>
              <div className="flex items-center gap-1">
                {!isProforma && invoice?.invoice_stage_status !== "Canceled" && (() => {
                  const rewardAmount = parseFloat(invoice?.rewardAmount || invoice?.reward_amount || 0);
                  const discountAmount = parseFloat(invoice?.discountAmount || invoice?.discount_amount || 0);
                  const hasRewardOrDiscount = rewardAmount > 0 || discountAmount > 0;
                  
                  return !hasRewardOrDiscount ? (
                    <button 
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditJobs();
                      }}
                    >
                      Edit
                    </button>
                  ) : null;
                })()}
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform ${isJobsOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {isJobsOpen && (
            <div className="p-2">
              {invoice?.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0 ? (
                <div className="space-y-1">
                  {invoice.invoiceSelectedJobs.map((invoiceJob, index) => {
                    const jobId = invoiceJob.job?.id || invoiceJob.job_id;
                    const processorName = invoiceJob.job?.processor 
                      ? `${invoiceJob.job.processor.first_name || ""} ${invoiceJob.job.processor.last_name || ""}`.trim() || "NA"
                      : "NA";
                    return (
                      <div
                        key={jobId || `job-${index}`}
                        className="flex items-center justify-between p-1 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <div className="flex items-center justify-between flex-1 pr-2">
                          <span className="text-xs font-medium break-words">
                            Job {index + 1} {invoiceJob.job?.job_no ? `- ${invoiceJob.job.job_no}` : jobId ? `- ID: ${jobId}` : ""}
                          </span>
                          {processorName !== "NA" && (
                            <span className="text-xs font-medium break-words">
                               {processorName}
                            </span>
                          )}
                        </div>
                        {/* <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg> */}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500">No jobs selected</div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Right Column - Invoice Preview */}
        <div className="w-1/2 bg-gray-100 p-0">
          <div className="bg-white rounded-lg shadow-lg ">
            <div 
              className="relative"
              style={{ 
                transform: 'scale(0.7)',
                transformOrigin: 'top left',
                width: '142.86%',
                minHeight: '142.86%'
              }}
            >
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
            </div>
          </div>
        </div>
      </div>

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
            <Button
              type="button"
              onClick={handleClosePOModal}
              variant="secondary"
              className="bg-gray-500 hover:bg-gray-600"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleSavePO}
              disabled={isUpdatingPO}
              variant="primary"
            >
              {isUpdatingPO ? "Saving..." : "Save"}
            </Button>
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
            <Button
              type="button"
              onClick={handleCloseIRNModal}
              variant="secondary"
              className="bg-gray-500 hover:bg-gray-600"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleSaveIRN}
              disabled={isUpdatingIRN}
              variant="primary"
            >
              {isUpdatingIRN ? "Saving..." : "Save"}
            </Button>
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
            <Button
              type="button"
              onClick={handleCloseNoteModal}
              variant="secondary"
              className="bg-gray-500 hover:bg-gray-600"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleSaveNote}
              disabled={isUpdatingNote}
              variant="primary"
            >
              {isUpdatingNote ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Invoice Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        title={cancelAction === 'cancelAndEdit' ? "Cancel and Edit Invoice" : "Cancel Invoice"}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>
          
          {/* Confirmation Message */}
          <div className="text-gray-700">
            Are you sure you want to cancel this invoice?
            {cancelAction === 'cancelAndEdit' && (
              <span className="block mt-2 text-sm text-gray-600">
                A new draft invoice will be created for editing.
              </span>
            )}
          </div>

          {/* Cancellation Reason Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason"
              rows={4}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-y"
              autoFocus
            />
          </div>

          {/* Separator */}
          <div className="border-t border-gray-200 -mx-6 px-6"></div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              onClick={handleCloseCancelModal}
              variant="secondary"
              className="bg-gray-500 hover:bg-gray-600"
            >
              No, Keep Invoice
            </Button>
            <Button
              type="button"
              onClick={handleCancelInvoice}
              disabled={isCanceling || !cancelReason.trim()}
              variant="danger"
            >
              {isCanceling ? "Processing..." : "Yes, Cancel Invoice"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
