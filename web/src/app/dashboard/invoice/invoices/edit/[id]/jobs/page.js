"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAccount } from "@/context/AccountContext";
import { usePageTitle } from "@/context/PageTitleContext";
import InvoiceDisplay from "@/components/InvoiceDisplay";
import { Button } from "@/components/formComponents";

export default function EditJobsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id;
  const { selectedAccount: sessionAccount } = useAccount();
  const { setPageTitle } = usePageTitle();
  
  const [invoice, setInvoice] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [editingJobIds, setEditingJobIds] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [availableJobsLoading, setAvailableJobsLoading] = useState(false);
  const [editingInvoiceBreakdown, setEditingInvoiceBreakdown] = useState(null);
  const [editingInvoiceBreakdownLoading, setEditingInvoiceBreakdownLoading] = useState(false);
  const [isSavingJobs, setIsSavingJobs] = useState(false);
  const [editingJobsMap, setEditingJobsMap] = useState({});

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) return;

      try {
        setLoading(true);
        const response = await api.get(`/invoices/${invoiceId}`);
        const invoiceData = response.data;
        setInvoice(invoiceData);

        // Initialize editing job IDs with current selected jobs
        const currentJobIds = invoiceData.invoiceSelectedJobs
          ? invoiceData.invoiceSelectedJobs.map((invoiceJob) => invoiceJob.job?.id || invoiceJob.job_id).filter(Boolean)
          : [];
        setEditingJobIds(currentJobIds);
        
        // Initialize jobs map with existing jobs
        const jobsMap = {};
        if (invoiceData.invoiceSelectedJobs) {
          invoiceData.invoiceSelectedJobs.forEach((invoiceJob) => {
            const jobId = invoiceJob.job?.id || invoiceJob.job_id;
            if (jobId && invoiceJob.job) {
              jobsMap[jobId] = invoiceJob.job;
            }
          });
        }
        setEditingJobsMap(jobsMap);

        // Fetch account
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

    return () => {
      setPageTitle(null);
    };
  }, [invoiceId, router, sessionAccount, setPageTitle]);

  // Fetch available jobs
  useEffect(() => {
    const fetchAvailableJobs = async () => {
      if (!invoice) return;

      try {
        setAvailableJobsLoading(true);
        const firstJob = invoice.invoiceSelectedJobs?.[0]?.job;
        if (firstJob?.clientInfo && invoice.jobRegister) {
          const clientInfoId = firstJob.clientInfo.id;
          const clientBuId = firstJob.clientBu?.id;
          const jobRegisterId = invoice.job_register_id || invoice.jobRegister?.id;
          const accountId = firstJob.clientInfo.account_id;
          const billingType = invoice.billing_type || invoice.billingType;

          const params = new URLSearchParams({
            jobRegisterId: jobRegisterId || '',
            jobIdStatus: 'Active',
            excludeInvoices: 'true',
          });
          
          if (accountId) {
            params.append('accountId', accountId);
          }
          
          if (billingType) {
            params.append('billingType', billingType);
          }

          const response = await api.get(`/jobs?${params.toString()}`);
          const fetchedJobs = response.data || [];

          const available = fetchedJobs.filter((job) => {
            const matchesClient = job.clientInfo && 
              job.clientInfo.id.toString() === clientInfoId.toString();
            const matchesBU = !clientBuId || (job.clientBu && 
              job.clientBu.id.toString() === clientBuId.toString());
            const notInInvoice = !editingJobIds.includes(job.id);
            
            return matchesClient && matchesBU && notInInvoice;
          });

          // Include jobs from editingJobsMap that were removed (not in editingJobIds)
          // These are jobs that were manually removed and should appear in available jobs
          const removedJobs = Object.values(editingJobsMap).filter((job) => {
            // Job is in the map but not in editingJobIds (was removed)
            if (editingJobIds.includes(job.id)) return false;
            
            // Check if it matches the criteria
            const matchesClient = job.clientInfo && 
              job.clientInfo.id.toString() === clientInfoId.toString();
            const matchesBU = !clientBuId || (job.clientBu && 
              job.clientBu.id.toString() === clientBuId.toString());
            
            // Only include if not already in the fetched jobs
            const notInFetched = !available.find((j) => j.id === job.id);
            
            return matchesClient && matchesBU && notInFetched;
          });

          // Merge fetched jobs with removed jobs, removing duplicates
          const merged = [...available, ...removedJobs];
          const uniqueJobs = merged.filter((job, index, self) => 
            index === self.findIndex((j) => j.id === job.id)
          );

          setAvailableJobs(uniqueJobs);
        } else {
          setAvailableJobs([]);
        }
      } catch (error) {
        console.error("Error fetching available jobs:", error);
        setAvailableJobs([]);
      } finally {
        setAvailableJobsLoading(false);
      }
    };

    fetchAvailableJobs();
  }, [invoice, editingJobIds, editingJobsMap]);

  // Fetch invoice breakdown when editing job IDs change
  useEffect(() => {
    const fetchEditingInvoiceBreakdown = async () => {
      if (editingJobIds.length === 0 || !invoice) {
        setEditingInvoiceBreakdown(null);
        return;
      }

      try {
        setEditingInvoiceBreakdownLoading(true);
        const response = await api.get("/invoices/sample", {
          params: {
            job_ids: editingJobIds.join(","),
            billing_type: invoice.billing_type || invoice.billingType,
            reward_amount: invoice.reward_amount || 0,
            discount_amount: invoice.discount_amount || 0,
          },
        });
        setEditingInvoiceBreakdown(response.data);
      } catch (error) {
        console.error("Error fetching editing invoice breakdown:", error);
        setEditingInvoiceBreakdown(null);
      } finally {
        setEditingInvoiceBreakdownLoading(false);
      }
    };

    fetchEditingInvoiceBreakdown();
  }, [editingJobIds, invoice]);


  // Handle add job
  const handleAddJob = (job) => {
    const jobId = job.id;
    setEditingJobIds((prev) => [...prev, jobId]);
    setAvailableJobs((prev) => prev.filter((j) => j.id !== jobId));
    setEditingJobsMap((prev) => ({
      ...prev,
      [jobId]: job,
    }));
  };

  // Handle remove job
  const handleRemoveJob = (jobId) => {
    setEditingJobIds((prev) => prev.filter((id) => id !== jobId));
    // Keep the job in editingJobsMap so it can be restored to available jobs
    // The job will be filtered out from existing jobs display since it's not in editingJobIds
    const removedJob = editingJobsMap[jobId] || 
      invoice?.invoiceSelectedJobs?.find(
        (invoiceJob) => invoiceJob.job?.id === jobId
      )?.job;
    
    // Ensure the job is in editingJobsMap (don't delete it) so useEffect can find it
    if (removedJob) {
      setEditingJobsMap((prev) => ({
        ...prev,
        [jobId]: removedJob,
      }));
    }
  };

  // Handle save jobs
  const handleSaveJobs = async () => {
    if (!invoiceId || editingJobIds.length === 0) {
      alert("Please select at least one job");
      return;
    }

    try {
      setIsSavingJobs(true);
      
      const updateResponse = await api.put(`/invoices/${invoiceId}/jobs`, {
        job_ids: editingJobIds,
      });
      
      console.log("Invoice jobs updated:", updateResponse.data);
      
      await new Promise(resolve => setTimeout(resolve, 200));

      const response = await api.get(`/invoices/${invoiceId}`, {
        params: {
          _t: Date.now()
        }
      });
      
      alert(`Jobs updated successfully! ${editingJobIds.length} jobs are now in this invoice. Invoice amounts have been recalculated.`);
      
      // Navigate back to invoice view
      router.push(`/dashboard/invoice/invoices/view/${invoiceId}`);
    } catch (error) {
      console.error("Error saving jobs:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to update jobs. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSavingJobs(false);
    }
  };

  // Get invoice number for display
  const invoiceNumber = useMemo(() => {
    if (!invoice) return "NA";
    if (invoice.invoice_stage_status === "Proforma") {
      return invoice.proforma_view_id || invoice.draft_view_id || "NA";
    }
    return invoice.draft_view_id || invoice.proforma_view_id || "NA";
  }, [invoice]);

  // Set page title
  useEffect(() => {
    if (invoiceNumber && invoiceNumber !== "NA") {
      setPageTitle(`Edit Jobs - Invoice #${invoiceNumber}`);
    } else {
      setPageTitle("Edit Jobs");
    }
    return () => {
      setPageTitle(null);
    };
  }, [setPageTitle, invoiceNumber]);

  // Format date
  const invoiceDate = useMemo(() => {
    if (!invoice) return "NA";
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

  // Extract job IDs for preview
  const jobIds = useMemo(() => {
    return editingJobIds;
  }, [editingJobIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
        {/* Left Column - Job Selection */}
        <div className="w-1/2 border-r border-gray-200 bg-white p-4">
          {/* Existing Jobs Section */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Existing Jobs ({editingJobIds.length})
            </h2>
            {editingJobIds.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                No jobs selected
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {editingJobIds.map((jobId) => {
                  const job = editingJobsMap[jobId] || 
                    invoice?.invoiceSelectedJobs?.find(
                      (ij) => (ij.job?.id || ij.job_id) === jobId
                    )?.job;
                  const jobNo = job?.job_no || jobId;
                  
                  return (
                    <div
                      key={jobId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                    >
                      <span>{jobNo}</span>
                      <button
                        onClick={() => handleRemoveJob(jobId)}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        title="Remove job"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Jobs Section */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Available Jobs ({availableJobs.length})
            </h2>
            {availableJobsLoading ? (
              <div className="text-xs text-gray-500 text-center py-4">
                Loading available jobs...
              </div>
            ) : availableJobs.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                No available jobs
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableJobs.map((job) => (
                  <Button
                    key={job.id}
                    onClick={() => handleAddJob(job)}
                    variant="secondary"
                    size="sm"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium hover:bg-gray-200"
                    title="Add job"
                  >
                    <span>{job.job_no || job.id}</span>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center justify-end">
            <Button
              onClick={handleSaveJobs}
              disabled={isSavingJobs || editingJobIds.length === 0}
              variant="primary"
              size="sm"
            >
              {isSavingJobs ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="w-1/2 bg-gray-100 p-0">
          <div className="bg-white rounded-lg shadow-lg">
            <div 
              className="relative"
              style={{ 
                transform: 'scale(0.7)',
                transformOrigin: 'top left',
                width: '142.86%',
                minHeight: '142.86%'
              }}
            >
              {editingInvoiceBreakdownLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading preview...</p>
                  </div>
                </div>
              ) : editingInvoiceBreakdown ? (
                <InvoiceDisplay
                  invoiceData={editingInvoiceBreakdown}
                  account={displayAccount}
                  invoiceNo={invoiceNumber}
                  invoiceDate={invoiceDate}
                  jobIds={jobIds}
                  isLoading={false}
                  onBack={() => {}}
                  logoError={logoError}
                  onLogoError={setLogoError}
                />
              ) : (
                <div className="flex items-center justify-center min-h-[400px]">
                  <p className="text-gray-500">Select at least one job to see preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
