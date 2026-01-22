"use client";

import { useState, useEffect, useMemo, Fragment, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SelectBox } from "@/components/formComponents";
import api from "@/services/api";
import { useAccount } from "@/context/AccountContext";
import logoImage from "@/assets/images/invoice-logo.png";

// Helper function to convert field name to database column name
const getFieldKey = (fieldName) => {
  return fieldName
    .toLowerCase()
    .replace(/\//g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

// Helper function to get field value from JobFieldValue table
// Supports multiple field name variations (case-insensitive, with/without underscores/spaces)
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

export default function InvoiceCreationPage() {
  const router = useRouter();
  const { selectedAccount: sessionAccount, loading: accountLoading } =
    useAccount();
  const [jobCodes, setJobCodes] = useState([]);
  const [selectedJobCode, setSelectedJobCode] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [billingType, setBillingType] = useState("Service & Reimbursement");
  const [invoiceType, setInvoiceType] = useState("Full Invoice");
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [clientServiceCharges, setClientServiceCharges] = useState([]);
  const [selectedClientServiceCharge, setSelectedClientServiceCharge] =
    useState(null);
  const [jobServiceChargesMap, setJobServiceChargesMap] = useState({}); // Map of job_id -> job_service_charge
  const [jobFieldValuesMap, setJobFieldValuesMap] = useState({}); // Map of job_id -> { field_name: field_value }
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSampleInvoice, setShowSampleInvoice] = useState(false);
  const [showPartialInvoiceModal, setShowPartialInvoiceModal] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [partialInvoiceBreakdown, setPartialInvoiceBreakdown] = useState({
    professionalCharges: { openingAmt: 0, payAmt: 0 },
    registrationCharges: { openingAmt: 0, payAmt: 0 },
    caCert: { openingAmt: 0, payAmt: 0 },
    ceCert: { openingAmt: 0, payAmt: 0 },
    applicationFees: { openingAmt: 0, payAmt: 0 },
    remiOne: { openingAmt: 0, payAmt: 0 },
    remiTwo: { openingAmt: 0, payAmt: 0 },
    remiThree: { openingAmt: 0, payAmt: 0 },
    remiFour: { openingAmt: 0, payAmt: 0 },
    remiFive: { openingAmt: 0, payAmt: 0 },
  });
  const [invoiceCalculation, setInvoiceCalculation] = useState({
    quantity: "",
    amount: "",
    percentage: "0.00",
    perShb: "0",
    reward_amount: "",
    discount_amount: "",
  });
  const [billingFieldNames, setBillingFieldNames] = useState([]);
  const [rewardDiscountType, setRewardDiscountType] = useState("reward"); // "reward" or "discount"
  const [rewardDiscountErrors, setRewardDiscountErrors] = useState({
    amount: "",
  });
  const rewardDiscountAmountInputRef = useRef(null);
  const isTypingRewardDiscountRef = useRef(false);
  const isPrintingRef = useRef(false);
  const [excludedJobIds, setExcludedJobIds] = useState([]); // Jobs with active, non-canceled invoices
  const [invoiceBreakdown, setInvoiceBreakdown] = useState(null); // API response from /invoices/sample
  const [invoiceBreakdownLoading, setInvoiceBreakdownLoading] = useState(false);

  // Lock body scroll when Invoice Calculation Modal or Sample Invoice modal is open
  useEffect(() => {
    if (showInvoiceModal || showSampleInvoice || showPartialInvoiceModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showInvoiceModal, showSampleInvoice, showPartialInvoiceModal]);

  // Fetch job codes on mount
  useEffect(() => {
    const fetchJobCodes = async () => {
      try {
        setLoading(true);
        const response = await api.get("/job-register?activeOnly=true");
        setJobCodes(response.data || []);
      } catch (error) {
        console.error("Error fetching job codes:", error);
        setJobCodes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobCodes();
  }, []);

  // Fetch billing field names from job register fields when job code is selected
  useEffect(() => {
    const fetchBillingFieldNames = async () => {
      if (!selectedJobCode) {
        setBillingFieldNames([]);
        return;
      }

      try {
        console.log(`[fetchBillingFieldNames] Fetching fields for job register ID: ${selectedJobCode}`);
        const response = await api.get(
          `/job-register-fields/job-register/${selectedJobCode}/active`
        );
        const fieldsData = response.data;

        if (fieldsData && fieldsData.form_fields_json) {
          // Parse the form_fields_json if it's a string
          let fields = fieldsData.form_fields_json;
          if (typeof fields === "string") {
            fields = JSON.parse(fields);
          }

          // Filter fields where billing is true
          const billingFields = Array.isArray(fields)
            ? fields
                .filter((field) => field.billing === true)
                .map((field) => field.name)
            : [];

          setBillingFieldNames(billingFields);
        } else {
          setBillingFieldNames([]);
        }
      } catch (error) {
        console.error("Error fetching billing field names:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
          selectedJobCode: selectedJobCode
        });
        
        // If 404, it means no active field exists - this is acceptable, just show empty fields
        if (error.response?.status === 404) {
          console.log(`No active job register field found for job register ID: ${selectedJobCode}`);
        }
        
        setBillingFieldNames([]);
      }
    };

    fetchBillingFieldNames();
  }, [selectedJobCode]);

  // Fetch client service charges when job code is selected
  useEffect(() => {
    const fetchClientServiceCharges = async () => {
      // Wait for account context to load
      if (accountLoading) {
        return;
      }

      if (!selectedJobCode) {
        setClientServiceCharges([]);
        setClients([]);
        setSelectedClient("");
        setSelectedClientServiceCharge(null);
        setJobs([]);
        return;
      }

      // Check if account is selected from session store
      if (!sessionAccount || sessionAccount.id === "all") {
        setClientServiceCharges([]);
        setClients([]);
        setSelectedClient("");
        setSelectedClientServiceCharge(null);
        setJobs([]);
        return;
      }

      try {
        setClientsLoading(true);
        // Fetch client service charges for the selected job register and account
        // This includes related clientInfo and clientBu data
        // Filter by both jobRegisterId and accountId from session store
        const accountId = sessionAccount.id;
        const response = await api.get(
          `/client-service-charges?jobRegisterId=${selectedJobCode}&accountId=${accountId}`
        );
        const charges = response.data || [];

        console.log("Fetched client service charges:", {
          jobRegisterId: selectedJobCode,
          accountId: accountId,
          count: charges.length,
          charges: charges,
        });

        // Filter only active charges with valid client info and BU data
        const activeCharges = charges.filter((charge) => {
          // Check main charge status
          if (charge.status !== "Active") return false;

          // Check if required data exists
          if (!charge.clientInfo || !charge.clientBu || !charge.group_id)
            return false;

          // Check clientInfo status (if status exists, it must be Active)
          if (charge.clientInfo.status && charge.clientInfo.status !== "Active")
            return false;

          // Check clientBu status (if status exists, it must be Active)
          if (charge.clientBu.status && charge.clientBu.status !== "Active")
            return false;

          return true;
        });

        // Sort by group_id, then client_name, then bu_name
        activeCharges.sort((a, b) => {
          if (a.group_id !== b.group_id) {
            return (a.group_id || "").localeCompare(b.group_id || "");
          }
          if (a.clientInfo.client_name !== b.clientInfo.client_name) {
            return (a.clientInfo.client_name || "").localeCompare(
              b.clientInfo.client_name || ""
            );
          }
          return (a.clientBu.bu_name || "").localeCompare(
            b.clientBu.bu_name || ""
          );
        });

        setClientServiceCharges(activeCharges);

        console.log("Active client service charges after filtering:", {
          activeCount: activeCharges.length,
          activeCharges: activeCharges,
        });

        // Also maintain legacy clients array for backward compatibility
        const uniqueClients = [];
        const seenClientIds = new Set();
        activeCharges.forEach((charge) => {
          if (
            charge.clientInfo &&
            charge.clientInfo.id &&
            !seenClientIds.has(charge.clientInfo.id)
          ) {
            seenClientIds.add(charge.clientInfo.id);
            uniqueClients.push({
              id: charge.clientInfo.id,
              client_name: charge.clientInfo.client_name,
              account_id: charge.account_id,
            });
          }
        });
        setClients(uniqueClients);
      } catch (error) {
        console.error("Error fetching client service charges:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          jobRegisterId: selectedJobCode,
          accountId: sessionAccount?.id,
        });
        setClientServiceCharges([]);
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };

    fetchClientServiceCharges();
  }, [selectedJobCode, sessionAccount, accountLoading]);

  // Set selected client service charge when client is selected
  useEffect(() => {
    if (!selectedClient) {
      setSelectedClientServiceCharge(null);
      setJobs([]);
      return;
    }

    // If "All Clients" is selected, don't set a specific service charge
    if (selectedClient === "ALL_CLIENTS") {
      setSelectedClientServiceCharge(null);
      return;
    }

    // Find the selected client service charge by composite key
    const charge = clientServiceCharges.find((c) => {
      const compositeKey = `${c.group_id}-${c.clientInfo?.id}-${c.clientBu?.id}`;
      return compositeKey === selectedClient;
    });

    if (charge) {
      setSelectedClientServiceCharge(charge);
    } else {
      setSelectedClientServiceCharge(null);
    }
  }, [selectedClient, clientServiceCharges]);

  // Auto-select account when client service charge is selected
  useEffect(() => {
    if (!selectedClient) {
      setSelectedAccount("");
      setJobs([]);
      return;
    }

    // If "All Clients" is selected, use the session account
    if (selectedClient === "ALL_CLIENTS") {
      if (sessionAccount && sessionAccount.id !== "all") {
        setSelectedAccount(sessionAccount.id.toString());
      } else {
        setSelectedAccount("");
      }
      return;
    }

    // Find the selected client service charge by composite key
    const charge = clientServiceCharges.find((c) => {
      const compositeKey = `${c.group_id}-${c.clientInfo?.id}-${c.clientBu?.id}`;
      return compositeKey === selectedClient;
    });

    if (charge) {
      setSelectedClientServiceCharge(charge);
      // Auto-select the account for this charge
      if (charge.account_id) {
        setSelectedAccount(charge.account_id.toString());
      } else {
        setSelectedAccount("");
      }
    } else {
      setSelectedAccount("");
      setSelectedClientServiceCharge(null);
    }
  }, [selectedClient, clientServiceCharges, sessionAccount]);

  // Fetch jobs when all filters are selected
  useEffect(() => {
    const fetchJobs = async () => {
      if (!selectedJobCode || !selectedClient) {
        setJobs([]);
        setSelectedJobIds([]);
        setJobServiceChargesMap({});
        return;
      }

      // Check if "All Clients" is selected
      const isAllClients = selectedClient === "ALL_CLIENTS";

      // If "All Clients" is selected, fetch all jobs for the account
      if (isAllClients) {
        if (!sessionAccount || sessionAccount.id === "all") {
          setJobs([]);
          setSelectedJobIds([]);
          setJobServiceChargesMap({});
          return;
        }

        try {
          setJobsLoading(true);
          // Fetch all jobs for the selected job register and account with invoice_type
          const accountId = sessionAccount.id;
          const response = await api.get(
            `/jobs?jobRegisterId=${selectedJobCode}&jobIdStatus=Active`
          );
          const allJobs = response.data || [];

          // Filter jobs by account_id only (all clients for this account)
          const filteredJobs = allJobs.filter((job) => {
            const matchesAccount =
              job.clientInfo &&
              job.clientInfo.account_id &&
              job.clientInfo.account_id.toString() === accountId.toString();

            return matchesAccount;
          });

          setJobs(filteredJobs);
          setSelectedJobIds([]); // Clear selections when "All Clients" is selected
          setJobServiceChargesMap({});

          // Build jobFieldValuesMap from jobs data
          const fieldValuesMap = {};
          filteredJobs.forEach((job) => {
            if (job.jobFieldValues && Array.isArray(job.jobFieldValues)) {
              fieldValuesMap[job.id] = {};
              job.jobFieldValues.forEach((fv) => {
                fieldValuesMap[job.id][fv.field_name] = fv.field_value;
              });
            }
          });
          setJobFieldValuesMap(fieldValuesMap);
        } catch (error) {
          console.error("Error fetching jobs for all clients:", error);
          setJobs([]);
          setSelectedJobIds([]);
          setJobServiceChargesMap({});
          setJobFieldValuesMap({});
        } finally {
          setJobsLoading(false);
        }
        return;
      }

      // If no service charge selected (and not "All Clients"), don't fetch jobs
      if (!selectedClientServiceCharge) {
        setJobs([]);
        setSelectedJobIds([]);
        setJobServiceChargesMap({});
        return;
      }

      try {
        setJobsLoading(true);
        // Fetch all jobs for the selected job register with invoice_type
        const response = await api.get(
          `/jobs?jobRegisterId=${selectedJobCode}&jobIdStatus=Active`
        );
        const allJobs = response.data || [];

        // Filter jobs by client_info_id, client_bu_id, and account_id from selected service charge
        const filteredJobs = allJobs.filter((job) => {
          const matchesClient =
            job.clientInfo &&
            job.clientInfo.id.toString() ===
              selectedClientServiceCharge.client_info_id?.toString();
          const matchesBU =
            job.clientBu &&
            job.clientBu.id.toString() ===
              selectedClientServiceCharge.client_bu_id?.toString();
          const matchesAccount =
            selectedClientServiceCharge.account_id &&
            job.clientInfo &&
            job.clientInfo.account_id &&
            job.clientInfo.account_id.toString() ===
              selectedClientServiceCharge.account_id.toString();

          return matchesClient && matchesBU && matchesAccount;
        });

        setJobs(filteredJobs);
        setSelectedJobIds([]);
        setJobServiceChargesMap({});

        // Build jobFieldValuesMap from jobs data
        const fieldValuesMap = {};
        filteredJobs.forEach((job) => {
          if (job.jobFieldValues && Array.isArray(job.jobFieldValues)) {
            fieldValuesMap[job.id] = {};
            job.jobFieldValues.forEach((fv) => {
              fieldValuesMap[job.id][fv.field_name] = fv.field_value;
            });
          }
        });
        setJobFieldValuesMap(fieldValuesMap);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
        setSelectedJobIds([]);
        setJobServiceChargesMap({});
        setJobFieldValuesMap({});
      } finally {
        setJobsLoading(false);
      }
    };

    fetchJobs();
  }, [
    selectedJobCode,
    selectedClient,
    selectedClientServiceCharge,
    sessionAccount,
  ]);

  // Fetch active invoices for selected jobs and calculate Opening Amt
  useEffect(() => {
    const fetchActiveInvoicesAndCalculateOpeningAmt = async () => {
      // Only fetch if we have selected jobs
      if (selectedJobIds.length === 0) {
        // Reset opening amounts if no jobs selected
        setPartialInvoiceBreakdown((prev) => ({
          professionalCharges: { openingAmt: 0, payAmt: prev.professionalCharges.payAmt },
          registrationCharges: { openingAmt: 0, payAmt: prev.registrationCharges.payAmt },
          caCert: { openingAmt: 0, payAmt: prev.caCert.payAmt },
          ceCert: { openingAmt: 0, payAmt: prev.ceCert.payAmt },
          applicationFees: { openingAmt: 0, payAmt: prev.applicationFees.payAmt },
          remiOne: { openingAmt: 0, payAmt: prev.remiOne.payAmt },
          remiTwo: { openingAmt: 0, payAmt: prev.remiTwo.payAmt },
          remiThree: { openingAmt: 0, payAmt: prev.remiThree.payAmt },
          remiFour: { openingAmt: 0, payAmt: prev.remiFour.payAmt },
          remiFive: { openingAmt: 0, payAmt: prev.remiFive.payAmt },
        }));
        return;
      }

      try {
        // Fetch all active invoices
        const response = await api.get('/invoices', {
          params: {
            invoice_status: 'Active',
          },
        });

        const activeInvoices = response.data || [];

        // Filter invoices that contain any of the selected jobs
        const relevantInvoices = activeInvoices.filter((invoice) => {
          if (!invoice.invoiceSelectedJobs || !Array.isArray(invoice.invoiceSelectedJobs)) {
            return false;
          }
          // Check if any of the selected jobs are in this invoice
          return invoice.invoiceSelectedJobs.some((selectedJob) =>
            selectedJobIds.includes(selectedJob.job_id)
          );
        });

        // Calculate Opening Amt by summing Pay Amt values from all relevant invoices
        // Opening Amt = sum of Pay Amt from all previous active partial invoices
        const openingAmt = {
          professionalCharges: 0,
          registrationCharges: 0,
          caCert: 0,
          ceCert: 0,
          applicationFees: 0,
          remiOne: 0,
          remiTwo: 0,
          remiThree: 0,
          remiFour: 0,
          remiFive: 0,
        };

        relevantInvoices.forEach((invoice) => {
          // Sum up Pay Amt values (which represent what was invoiced in partial invoices)
          // For partial invoices, Pay Amt is what was actually invoiced
          openingAmt.professionalCharges += parseFloat(invoice.professional_charges || 0);
          openingAmt.registrationCharges += parseFloat(invoice.registration_other_charges || 0);
          openingAmt.caCert += parseFloat(invoice.ca_charges || 0);
          openingAmt.ceCert += parseFloat(invoice.ce_charges || 0);
          openingAmt.applicationFees += parseFloat(invoice.application_fees || 0);
          openingAmt.remiOne += parseFloat(invoice.remi_one_charges || 0);
          openingAmt.remiTwo += parseFloat(invoice.remi_two_charges || 0);
          openingAmt.remiThree += parseFloat(invoice.remi_three_charges || 0);
          openingAmt.remiFour += parseFloat(invoice.remi_four_charges || 0);
          openingAmt.remiFive += parseFloat(invoice.remi_five_charges || 0);
        });

        // Update partialInvoiceBreakdown with calculated Opening Amt
        // Preserve existing Pay Amt values
        setPartialInvoiceBreakdown((prev) => ({
          professionalCharges: { openingAmt: openingAmt.professionalCharges, payAmt: prev.professionalCharges.payAmt },
          registrationCharges: { openingAmt: openingAmt.registrationCharges, payAmt: prev.registrationCharges.payAmt },
          caCert: { openingAmt: openingAmt.caCert, payAmt: prev.caCert.payAmt },
          ceCert: { openingAmt: openingAmt.ceCert, payAmt: prev.ceCert.payAmt },
          applicationFees: { openingAmt: openingAmt.applicationFees, payAmt: prev.applicationFees.payAmt },
          remiOne: { openingAmt: openingAmt.remiOne, payAmt: prev.remiOne.payAmt },
          remiTwo: { openingAmt: openingAmt.remiTwo, payAmt: prev.remiTwo.payAmt },
          remiThree: { openingAmt: openingAmt.remiThree, payAmt: prev.remiThree.payAmt },
          remiFour: { openingAmt: openingAmt.remiFour, payAmt: prev.remiFour.payAmt },
          remiFive: { openingAmt: openingAmt.remiFive, payAmt: prev.remiFive.payAmt },
        }));
      } catch (error) {
        console.error('Error fetching active invoices for Opening Amt calculation:', error);
        // On error, reset opening amounts to 0
        setPartialInvoiceBreakdown((prev) => ({
          professionalCharges: { openingAmt: 0, payAmt: prev.professionalCharges.payAmt },
          registrationCharges: { openingAmt: 0, payAmt: prev.registrationCharges.payAmt },
          caCert: { openingAmt: 0, payAmt: prev.caCert.payAmt },
          ceCert: { openingAmt: 0, payAmt: prev.ceCert.payAmt },
          applicationFees: { openingAmt: 0, payAmt: prev.applicationFees.payAmt },
          remiOne: { openingAmt: 0, payAmt: prev.remiOne.payAmt },
          remiTwo: { openingAmt: 0, payAmt: prev.remiTwo.payAmt },
          remiThree: { openingAmt: 0, payAmt: prev.remiThree.payAmt },
          remiFour: { openingAmt: 0, payAmt: prev.remiFour.payAmt },
          remiFive: { openingAmt: 0, payAmt: prev.remiFive.payAmt },
        }));
      }
    };

    fetchActiveInvoicesAndCalculateOpeningAmt();
  }, [selectedJobIds]);

  // Fetch invoices to exclude jobs that have active, non-canceled invoices with matching billing_type
  useEffect(() => {
    const fetchExcludedJobs = async () => {
      if (!selectedJobCode || !billingType || jobs.length === 0) {
        setExcludedJobIds([]);
        return;
      }

      try {
        // Map billingType to database values
        const billingTypeMap = {
          "Service": "Service",
          "Service & Reimbursement": "Service_Reimbursement",
          "Reimbursement": "Reimbursement",
        };
        const dbBillingType = billingTypeMap[billingType];

        // Fetch invoices with invoice_status = 'Active'
        const response = await api.get('/invoices', {
          params: {
            invoice_status: 'Active',
          },
        });

        const activeInvoices = response.data || [];

        // Filter invoices that:
        // 1. Are not canceled (invoice_stage_status != 'Canceled')
        // 2. Match the selected billing_type
        const nonCanceledInvoices = activeInvoices.filter(
          (invoice) =>
            invoice.invoice_stage_status !== 'Canceled' &&
            invoice.billing_type === dbBillingType
        );

        // Collect all job IDs from these invoices
        const excludedIds = new Set();
        nonCanceledInvoices.forEach((invoice) => {
          if (invoice.invoiceSelectedJobs && Array.isArray(invoice.invoiceSelectedJobs)) {
            invoice.invoiceSelectedJobs.forEach((selectedJob) => {
              if (selectedJob.job_id) {
                excludedIds.add(selectedJob.job_id);
              }
            });
          }
        });

        setExcludedJobIds(Array.from(excludedIds));
      } catch (error) {
        console.error('Error fetching invoices for exclusion:', error);
        setExcludedJobIds([]);
      }
    };

    fetchExcludedJobs();
  }, [selectedJobCode, billingType, jobs]);

  // Function to fetch invoice breakdown from API
  const fetchInvoiceBreakdown = async () => {
    // Only fetch if we have selected jobs and billing type
    if (selectedJobIds.length === 0 || !billingType) {
      setInvoiceBreakdown(null);
      return false;
    }

    try {
      setInvoiceBreakdownLoading(true);

      // Call the /invoices/sample API
      // Note: InvoiceService expects billing_type as "Service", "Reimbursement", or "Service & Reimbursement"
      const response = await api.get('/invoices/sample', {
        params: {
          job_ids: selectedJobIds.join(','),
          billing_type: billingType,
          reward_amount: invoiceCalculation.reward_amount || 0,
          discount_amount: invoiceCalculation.discount_amount || 0,
        },
      });

      setInvoiceBreakdown(response.data);
      return true;
    } catch (error) {
      console.error('Error fetching invoice breakdown:', error);
      setInvoiceBreakdown(null);
      alert('Error fetching invoice breakdown. Please try again.');
      return false;
    } finally {
      setInvoiceBreakdownLoading(false);
    }
  };

  // Handle invoice type change - update billing type based on invoice type
  const handleInvoiceTypeChange = (e) => {
    const newInvoiceType = e.target.value;
    setInvoiceType(newInvoiceType);

    // If Partial Invoice is selected, set Billing Type to "Service & Reimbursement" and disable it
    if (newInvoiceType === "Partial Invoice") {
      setBillingType("Service & Reimbursement");
    }

    // Reset search and selected jobs when invoice type changes
    setSearchTerm("");
    setSelectedJobIds([]);
    setJobServiceChargesMap({});
  };

  // Helper function to filter jobs by billing_type based on selected billingType
  const filterJobsByBillingType = (jobList) => {
    if (!billingType) return jobList;

    return jobList.filter((job) => {
      const jobBillingType = job.billing_type;

      switch (billingType) {
        case "Service":
          // Show jobs where billing_type = 'Service' OR 'Service_Reimbursement_Split'
          return (
            jobBillingType === "Service" ||
            jobBillingType === "Service_Reimbursement_Split"
          );
        case "Service & Reimbursement":
          // Show jobs where billing_type = 'Service_Reimbursement'
          return jobBillingType === "Service_Reimbursement";
        case "Reimbursement":
          // Show jobs where billing_type = 'Reimbursement' OR 'Service_Reimbursement_Split'
          return (
            jobBillingType === "Reimbursement" ||
            jobBillingType === "Service_Reimbursement_Split"
          );
        default:
          return true;
      }
    });
  };

  // Filter jobs for Full Invoice (Invoice Type = "full_invoice" and Status = "Closed")
  // Exclude jobs that have active, non-canceled invoices with matching billing_type
  const fullInvoiceJobs = filterJobsByBillingType(
    jobs.filter(
      (job) =>
        job.invoice_type === "full_invoice" &&
        job.status === "Closed" &&
        !excludedJobIds.includes(job.id)
    )
  );

  // Filter jobs for Partial Invoice (Invoice Type = "full_invoice" and Status = "In_process" or "Closed")
  // Exclude jobs that have active, non-canceled invoices with matching billing_type
  const partialInvoiceJobs = filterJobsByBillingType(
    jobs.filter(
      (job) =>
        job.invoice_type === "full_invoice" &&
        (job.status === "In_process" || job.status === "Closed") &&
        !excludedJobIds.includes(job.id)
    )
  );

  // Filter jobs by search term
  const filterJobsBySearch = (jobList) => {
    if (!searchTerm) return jobList;
    const search = searchTerm.toLowerCase();
    return jobList.filter((job) => job.job_no?.toLowerCase().includes(search));
  };

  const filteredFullInvoiceJobs = filterJobsBySearch(fullInvoiceJobs);
  const filteredPartialInvoiceJobs = filterJobsBySearch(partialInvoiceJobs);

  // Check if "All Clients" is selected
  const isAllClientsSelected = selectedClient === "ALL_CLIENTS";

  // Selection helpers
  const toggleJobSelection = (jobId) => {
    // Don't allow selection when "All Clients" is selected
    if (isAllClientsSelected) {
      return;
    }

    if (invoiceType === "Partial Invoice") {
      // For Partial Invoice, only allow one job selection at a time
      setSelectedJobIds((prev) => {
        const newSelection = prev.includes(jobId) ? [] : [jobId];
        // Clear job service charges map when selection changes
        if (newSelection.length === 0) {
          setJobServiceChargesMap({});
        }
        return newSelection;
      });
    } else {
      // For Full Invoice, allow multiple selections with max 100 limit
      setSelectedJobIds((prev) => {
        if (prev.includes(jobId)) {
          // Deselecting - always allowed
          const newSelection = prev.filter((id) => id !== jobId);
          // Remove service charge for deselected job
          setJobServiceChargesMap((prevMap) => {
            const newMap = { ...prevMap };
            delete newMap[jobId];
            return newMap;
          });
          return newSelection;
        } else {
          // Selecting - check if we're at the limit
          if (prev.length >= 100) {
            alert("You can only select 100 jobs at a one time");
            return prev;
          }
          return [...prev, jobId];
        }
      });
    }
  };

  const getSelectionCounts = (jobList) => {
    const total = jobList.length;
    const selected = jobList.filter((job) =>
      selectedJobIds.includes(job.id)
    ).length;
    const unselected = total - selected;
    return { total, selected, unselected };
  };

  const fullCounts = getSelectionCounts(filteredFullInvoiceJobs);
  const partialCounts = getSelectionCounts(filteredPartialInvoiceJobs);

  // Calculate invoice amount based on pricing formulas
  const calculateInvoiceAmount = (job, serviceCharge) => {
    if (!job || !serviceCharge) {
      return {
        quantity: 0,
        amount: 0,
        percentage: 0,
        percentageAmount: 0,
        perShb: 0,
      };
    }

    // Parse values from job and service charge
    // Fetch claim_amount_after_finalization from JobFieldValues table
    const claimAmountValue =
      getFieldValueFromJobFieldValue(
        job.id,
        "claim_amount_after_finalization",
        jobFieldValuesMap
      ) ||
      getFieldValueFromJobFieldValue(
        job.id,
        "Claim Amount after Finalization",
        jobFieldValuesMap
      );
    const claimAmount = parseFloat(claimAmountValue || 0);
    // Fetch quantity from JobFieldValues table
    const quantityValue =
      getFieldValueFromJobFieldValue(job.id, "quantity", jobFieldValuesMap) ||
      getFieldValueFromJobFieldValue(job.id, "Quantity", jobFieldValuesMap);
    const quantity = parseFloat(quantityValue || job.quantity || 0);
    const fixed = parseFloat(serviceCharge.fixed || 0);
    const inPercentage = parseFloat(serviceCharge.in_percentage || 0);
    const min = parseFloat(serviceCharge.min || 0);
    const max = parseFloat(serviceCharge.max || 0);
    const perShb = parseFloat(serviceCharge.per_shb || 0);
    const percentagePerShb = serviceCharge.percentage_per_shb === "Yes";
    const fixedPercentagePerShb =
      serviceCharge.fixed_percentage_per_shb === "Yes";

    // Calculate percentage amount
    const percentageAmount = (claimAmount * inPercentage) / 100;

    // Calculate per unit amount
    const perUnitAmount = quantity * perShb;

    let calculatedAmount = 0;

    // Determine which formula to use based on available fields
    const hasFixed = fixed > 0;
    const hasPercentage = inPercentage > 0;
    const hasMin = min > 0;
    const hasMax = max > 0;
    const hasPerShb = perShb > 0;

    // Formula 1: Fixed Only
    if (hasFixed && !hasPercentage && !hasMin && !hasMax && !hasPerShb) {
      calculatedAmount = fixed;
    }
    // Formula 2: Percent Only
    else if (!hasFixed && hasPercentage && !hasMin && !hasMax && !hasPerShb) {
      calculatedAmount = percentageAmount;
    }
    // Formula 3: Minimum or Percentage (whichever is higher)
    else if (!hasFixed && hasPercentage && hasMin && !hasMax && !hasPerShb) {
      calculatedAmount = Math.max(percentageAmount, min);
    }
    // Formula 4: Percentage or Maximum (whichever is lower)
    else if (!hasFixed && hasPercentage && !hasMin && hasMax && !hasPerShb) {
      calculatedAmount = Math.min(percentageAmount, max);
    }
    // Formula 5: Percentage or min but not more than max
    else if (!hasFixed && hasPercentage && hasMin && hasMax && !hasPerShb) {
      calculatedAmount = Math.max(min, Math.min(percentageAmount, max));
    }
    // Formula 6: Per Unit Pricing
    else if (!hasFixed && !hasPercentage && !hasMin && !hasMax && hasPerShb) {
      calculatedAmount = perUnitAmount;
    }
    // Formula 7: Fixed + Percentage
    else if (hasFixed && hasPercentage && !hasMin && !hasMax && !hasPerShb) {
      calculatedAmount = fixed + percentageAmount;
    }
    // Formula 8: Fixed + (Percentage or Minimum whichever is higher)
    else if (hasFixed && hasPercentage && hasMin && !hasMax && !hasPerShb) {
      calculatedAmount = fixed + Math.max(percentageAmount, min);
    }
    // Formula 9: Fixed + (Percentage or Maximum whichever is lower)
    else if (hasFixed && hasPercentage && !hasMin && hasMax && !hasPerShb) {
      calculatedAmount = fixed + Math.min(percentageAmount, max);
    }
    // Formula 10: Fixed + Percentage (within Min-Max range)
    else if (hasFixed && hasPercentage && hasMin && hasMax && !hasPerShb) {
      const boundedPercentage = Math.max(min, Math.min(percentageAmount, max));
      calculatedAmount = fixed + boundedPercentage;
    }
    // Formula 11: Percentage OR Per Unit (whichever is higher) OR (if percentage_per_shb = Yes: Percentage + Per Unit)
    else if (!hasFixed && hasPercentage && !hasMin && !hasMax && hasPerShb) {
      if (percentagePerShb) {
        calculatedAmount = percentageAmount + perUnitAmount;
      } else {
        calculatedAmount = Math.max(percentageAmount, perUnitAmount);
      }
    }
    // Formula 12: Fixed + (Percentage OR Per Unit whichever is higher) OR (if fixed_percentage_per_shb = Yes: Fixed + Percentage + Per Unit)
    else if (hasFixed && hasPercentage && !hasMin && !hasMax && hasPerShb) {
      if (fixedPercentagePerShb) {
        calculatedAmount = fixed + percentageAmount + perUnitAmount;
      } else {
        calculatedAmount = fixed + Math.max(percentageAmount, perUnitAmount);
      }
    }
    // Default: Use fixed if available, otherwise 0
    else {
      calculatedAmount = hasFixed ? fixed : 0;
    }

    return {
      quantity: quantity,
      amount: parseFloat(calculatedAmount.toFixed(2)),
      percentage: inPercentage,
      percentageAmount: parseFloat(percentageAmount.toFixed(2)),
      perShb: perShb,
    };
  };

  // Fetch job service charges for selected jobs
  useEffect(() => {
    const fetchJobServiceCharges = async () => {
      if (selectedJobIds.length === 0) {
        setJobServiceChargesMap({});
        return;
      }

      try {
        const chargesMap = {};

        // Fetch service charges for each selected job
        await Promise.all(
          selectedJobIds.map(async (jobId) => {
            try {
              const response = await api.get(`/jobs/${jobId}/service-charges`);
              const charges = response.data || [];

              // Get the first active service charge (status = 'Active')
              const activeCharge =
                charges.find((charge) => charge.status === "Active") ||
                charges[0] ||
                null;

              if (activeCharge) {
                chargesMap[jobId] = activeCharge;
                // Debug: Log remi fields to verify data structure
                console.log(`[fetchJobServiceCharges] Job ${jobId} service charge remi fields:`, {
                  remi_one_desc: activeCharge.remi_one_desc || activeCharge.remiOneDesc,
                  remi_one_charges: activeCharge.remi_one_charges || activeCharge.remiOneCharges,
                  remi_two_desc: activeCharge.remi_two_desc || activeCharge.remiTwoDesc,
                  remi_two_charges: activeCharge.remi_two_charges || activeCharge.remiTwoCharges,
                  remi_three_desc: activeCharge.remi_three_desc || activeCharge.remiThreeDesc,
                  remi_three_charges: activeCharge.remi_three_charges || activeCharge.remiThreeCharges,
                  remi_four_desc: activeCharge.remi_four_desc || activeCharge.remiFourDesc,
                  remi_four_charges: activeCharge.remi_four_charges || activeCharge.remiFourCharges,
                  remi_five_desc: activeCharge.remi_five_desc || activeCharge.remiFiveDesc,
                  remi_five_charges: activeCharge.remi_five_charges || activeCharge.remiFiveCharges,
                });
              }
            } catch (error) {
              console.error(
                `Error fetching service charges for job ${jobId}:`,
                error
              );
            }
          })
        );

        setJobServiceChargesMap(chargesMap);
      } catch (error) {
        console.error("Error fetching job service charges:", error);
        setJobServiceChargesMap({});
      }
    };

    fetchJobServiceCharges();
  }, [selectedJobIds]);

  // Calculate aggregated values for selected jobs - uses client-side calculation
  const calculateAggregatedInvoiceAmount = () => {
    if (selectedJobIds.length === 0) {
      return {
        quantity: "",
        amount: "",
        percentage: "0.00",
        perShb: "0",
      };
    }

    // Get selected jobs
    const selectedJobs = jobs.filter((job) => selectedJobIds.includes(job.id));

    if (selectedJobs.length === 0) {
      return {
        quantity: "",
        amount: "",
        percentage: "0.00",
        perShb: "0",
      };
    }

    // Calculate for each job and aggregate
    let totalQuantity = 0;
    let totalAmount = 0;
    let totalPercentageAmount = 0;
    let allPerShb = [];

    selectedJobs.forEach((job) => {
      // Get job service charge for this job
      const jobServiceCharge = jobServiceChargesMap[job.id];

      if (jobServiceCharge) {
        const calculation = calculateInvoiceAmount(job, jobServiceCharge);
        totalQuantity += calculation.quantity;
        totalAmount += calculation.amount;
        totalPercentageAmount += calculation.percentageAmount;

        // Collect per_shb values (we'll use the first one or average if needed)
        if (calculation.perShb > 0) {
          allPerShb.push(calculation.perShb);
        }
      }
    });

    // For perShb, use the first non-zero value found, or 0
    const perShb = allPerShb.length > 0 ? allPerShb[0] : 0;

    return {
      quantity: totalQuantity.toString(),
      amount: totalAmount.toFixed(2),
      percentage: totalPercentageAmount.toFixed(2), // Display percentage amount, not percentage value
      perShb: perShb.toString(),
    };
  };

  // Convert job codes to options format
  const jobCodeOptions = jobCodes.map((jobCode) => ({
    value: jobCode.id,
    label: jobCode.job_code || jobCode.job_title || `Job Code ${jobCode.id}`,
  }));

  // Convert client service charges to options format
  // Format: "Client-id - Client Name - BU Div" (e.g., "LE00006 – EMERSON – Hadapsar")
  const clientOptions = [];

  // Add "All Clients" option at the beginning
  clientOptions.push({
    value: "ALL_CLIENTS",
    label: "All Clients",
    isAllClients: true,
  });

  // Add client service charge options with formatted labels based on selected job code
  clientServiceCharges.forEach((charge) => {
    if (charge.clientInfo && charge.clientBu && charge.group_id) {
      const clientId = charge.group_id || ""; // Client-id (e.g., LE00006)
      const clientName = charge.clientInfo.client_name || ""; // Client Name (e.g., EMERSON)
      const buDiv = charge.clientBu.bu_name || ""; // BU Div (e.g., Hadapsar)
      // Format: Client-id – Client Name – BU Div
      const label = `${clientId} – ${clientName} – ${buDiv}`;

      // Use a composite key: group_id-client_info_id-client_bu_id
      const compositeKey = `${charge.group_id}-${charge.clientInfo.id}-${charge.clientBu.id}`;

      clientOptions.push({
        value: compositeKey,
        label: label,
        chargeId: charge.id,
        clientInfoId: charge.client_info_id,
        clientBuId: charge.client_bu_id,
        accountId: charge.account_id,
        groupId: charge.group_id,
        clientName: clientName,
        buName: buDiv,
      });
    }
  });

  // Debug: Log client options
  console.log("Client options generated:", {
    clientServiceChargesCount: clientServiceCharges.length,
    clientOptionsCount: clientOptions.length,
    clientOptions: clientOptions,
  });

  // Billing type options
  const billingTypeOptions = [
    { value: "Service & Reimbursement", label: "Service & Reimbursement" },
    { value: "Service", label: "Service" },
    { value: "Reimbursement", label: "Reimbursement" },
  ];

  // Invoice type options
  const invoiceTypeOptions = [
    { value: "Full Invoice", label: "Full Invoice" },
    { value: "Partial Invoice", label: "Partial Invoice" },
  ];

  // Handle Reward/Discount Amount change
  const handleRewardDiscountAmountChange = (e) => {
    const inputValue = e.target.value;
    const fieldName = rewardDiscountType === "reward"
      ? "reward_amount"
      : "discount_amount";

    // Allow empty string for free typing
    if (inputValue === "") {
      setInvoiceCalculation((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
      setRewardDiscountErrors((prev) => ({
        ...prev,
        amount: "",
      }));
      return;
    }

    // Allow only numbers and one decimal point (up to 2 decimal places)
    const validPattern = /^\d*\.?\d{0,2}$/;
    if (!validPattern.test(inputValue)) {
      return; // Don't update if invalid
    }

    // Allow partial input (e.g., "5.", "10.5")
    // Store the raw input value for free typing
    setInvoiceCalculation((prev) => ({
      ...prev,
      [fieldName]: inputValue,
    }));

    // Clear error while typing
    setRewardDiscountErrors((prev) => ({
      ...prev,
      amount: "",
    }));
  };

  // Update invoiceCalculation.amount from API response when available
  useEffect(() => {
    if (invoiceBreakdown) {
      setInvoiceCalculation((prev) => ({
        ...prev,
        amount: (invoiceBreakdown.professionalCharges || 0).toFixed(2),
      }));
    }
  }, [invoiceBreakdown]);


  // Final amount - uses API response for sample invoice, client-side for partial invoice breakdown
  const finalAmount = useMemo(() => {
    // Use API response if available (for sample invoice)
    if (invoiceBreakdown?.serviceSubtotal !== undefined) {
      return invoiceBreakdown.serviceSubtotal.toFixed(2);
    }
    
    // Fallback to client-side calculation (for partial invoice breakdown)
    const baseAmount = parseFloat(invoiceCalculation.amount) || 0;
    const rewardAmount = parseFloat(invoiceCalculation.reward_amount || 0) || 0;
    const discountAmount = parseFloat(invoiceCalculation.discount_amount || 0) || 0;
    const calculatedFinalAmount = baseAmount + rewardAmount - discountAmount;
    return calculatedFinalAmount.toFixed(2);
  }, [invoiceBreakdown, invoiceCalculation.amount, invoiceCalculation.reward_amount, invoiceCalculation.discount_amount]);

  // Calculate service subtotal (base amount + registration + CA + CE charges) for sample invoice
  // This excludes reward/discount amounts
  const calculateServiceSubtotal = () => {
    const baseAmount = parseFloat(sampleInvoiceData.finalAmount || sampleInvoiceData.amount || 0);
    const registrationCharges = parseFloat(sampleInvoiceData.registrationCharges || 0);
    const caCharges = parseFloat(sampleInvoiceData.caCharges || 0);
    const ceCharges = parseFloat(sampleInvoiceData.ceCharges || 0);
    const rewardAmount = parseFloat(sampleInvoiceData.reward_amount || 0);
    const discountAmount = parseFloat(sampleInvoiceData.discount_amount || 0);

    return (baseAmount + registrationCharges + caCharges + ceCharges + rewardAmount) - discountAmount ;
  };

  // Helper function to convert number to words (Indian currency format)
  const numberToWords = (num) => {
    if (num === 0) return "Zero";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const convertHundreds = (n) => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one > 0 ? " " + ones[one] : "");
      }
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      return (
        ones[hundred] +
        " Hundred" +
        (remainder > 0 ? " " + convertHundreds(remainder) : "")
      );
    };

    const convert = (n) => {
      if (n === 0) return "";
      if (n < 100) return convertHundreds(n);
      if (n < 1000) {
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;
        return (
          convertHundreds(hundred) +
          " Hundred" +
          (remainder > 0 ? " " + convertHundreds(remainder) : "")
        );
      }
      if (n < 100000) {
        const thousand = Math.floor(n / 1000);
        const remainder = n % 1000;
        return (
          convertHundreds(thousand) +
          " Thousand" +
          (remainder > 0 ? " " + convert(remainder) : "")
        );
      }
      if (n < 10000000) {
        const lakh = Math.floor(n / 100000);
        const remainder = n % 100000;
        return (
          convertHundreds(lakh) +
          " Lakh" +
          (remainder > 0 ? " " + convert(remainder) : "")
        );
      }
      const crore = Math.floor(n / 10000000);
      const remainder = n % 10000000;
      return (
        convertHundreds(crore) +
        " Crore" +
        (remainder > 0 ? " " + convert(remainder) : "")
      );
    };

    const parts = parseFloat(num).toFixed(2).split(".");
    const rupees = parseInt(parts[0]);
    const paise = parseInt(parts[1] || 0);

    let result = convert(rupees);
    if (paise > 0) {
      result += " and " + convertHundreds(paise) + " Paise";
    }
    return result + " Only";
  };

  // Combined application fees - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const combinedApplicationFees = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.applicationFees !== undefined) {
      return invoiceBreakdown.applicationFees;
    }
    
    // Client-side calculation for partial invoice breakdown
    if (selectedJobIds.length === 0) return 0;
    return selectedJobIds.reduce((total, jobId) => {
      const fieldValue =
        getFieldValueFromJobFieldValue(
          jobId,
          "appl_fee_duty_paid",
          jobFieldValuesMap
        ) ||
        getFieldValueFromJobFieldValue(
          jobId,
          "Appl Fees Paid",
          jobFieldValuesMap
        ) ||
        getFieldValueFromJobFieldValue(
          jobId,
          "appl_fees_paid",
          jobFieldValuesMap
        ) ||
        getFieldValueFromJobFieldValue(
          jobId,
          "application_fees",
          jobFieldValuesMap
        );
      if (fieldValue) {
        return total + parseFloat(fieldValue || 0);
      }
      return total;
    }, 0);
  }, [invoiceBreakdown, selectedJobIds, jobFieldValuesMap]);

  // Get selected job code name from job_register table
  // Join with job_register table using job_register_id to fetch job_code
  const selectedJobCodeName = useMemo(() => {
    if (!selectedJobCode) return "NA";
    // Find the job_register record by id (job_register_id)
    const jobRegister = jobCodes.find(
      (jc) => jc.id.toString() === selectedJobCode.toString()
    );
    // Return job_code from job_register table
    return jobRegister?.job_code || "NA";
  }, [jobCodes, selectedJobCode]);

  // Get SAC No. based on job_register.gst_rate_id -> gst_rates.sac_no relationship
  const selectedSacNo = useMemo(() => {
    if (!selectedJobCode) return "NA";
    // Find the job_register record by id
    const jobRegister = jobCodes.find(
      (jc) => jc.id.toString() === selectedJobCode.toString()
    );
    // Check if job_register has gstRate relation with sac_no
    // The relationship: job_register.gst_rate_id -> gst_rates.id -> gst_rates.sac_no
    if (jobRegister?.gstRate?.sac_no) {
      // Return sac_no from gst_rates table when gst_rate relationship is valid
      return jobRegister.gstRate.sac_no;
    }
    return "NA";
  }, [jobCodes, selectedJobCode]);

  // Get GST rates from selected job code's gstRate relation
  const selectedGstRates = useMemo(() => {
    if (!selectedJobCode) {
      return {
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
      };
    }
    // Find the job_register record by id
    const jobRegister = jobCodes.find(
      (jc) => jc.id.toString() === selectedJobCode.toString()
    );
    // Get GST rates from gstRate relation
    if (jobRegister?.gstRate) {
      return {
        cgstRate: parseFloat(jobRegister.gstRate.cgst || 0),
        sgstRate: parseFloat(jobRegister.gstRate.sgst || 0),
        igstRate: parseFloat(jobRegister.gstRate.igst || 0),
      };
    }
    // Default values if no GST rate is found
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
    };
  }, [jobCodes, selectedJobCode]);

  // Get selected client name
  const selectedClientName = useMemo(() => {
    if (selectedClient === "ALL_CLIENTS") return "All Clients";
    const charge = clientServiceCharges.find((c) => {
      const compositeKey = `${c.group_id}-${c.clientInfo?.id}-${c.clientBu?.id}`;
      return compositeKey === selectedClient;
    });
    if (charge) {
      return `${charge.group_id || ""} – ${
        charge.clientInfo?.client_name || ""
      } – ${charge.clientBu?.bu_name || ""}`;
    }
    return "NA";
  }, [selectedClient, clientServiceCharges]);

  // Get first selected job number
  const selectedJobNo = useMemo(() => {
    if (selectedJobIds.length > 0) {
      const job = jobs.find((j) => j.id === selectedJobIds[0]);
      return job?.job_no || "NA";
    }
    return "NA";
  }, [selectedJobIds, jobs]);

  // Get first selected job for displaying billing field values
  const firstSelectedJob = useMemo(() => {
    if (selectedJobIds.length > 0) {
      return jobs.find((j) => j.id === selectedJobIds[0]) || null;
    }
    return null;
  }, [selectedJobIds, jobs]);

  // Combined CA CERT count - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const combinedCaCertCount = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.caCertCount !== undefined) {
      return invoiceBreakdown.caCertCount;
    }
    
    // Client-side calculation for partial invoice breakdown
    if (selectedJobIds.length === 0) return 0;
    return selectedJobIds.reduce((total, jobId) => {
      const fieldValue =
        getFieldValueFromJobFieldValue(jobId, "no_of_cac", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "No of CAC", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "noofcac", jobFieldValuesMap);
      return total + (parseInt(fieldValue) || 0);
    }, 0);
  }, [invoiceBreakdown, selectedJobIds, jobFieldValuesMap]);

  // Combined CE CERT count - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const combinedCeCertCount = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.ceCertCount !== undefined) {
      return invoiceBreakdown.ceCertCount;
    }
    
    // Client-side calculation for partial invoice breakdown
    if (selectedJobIds.length === 0) return 0;
    return selectedJobIds.reduce((total, jobId) => {
      const fieldValue =
        getFieldValueFromJobFieldValue(jobId, "no_of_cec", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "No of CEC", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "noofcec", jobFieldValuesMap);
      return total + (parseInt(fieldValue) || 0);
    }, 0);
  }, [invoiceBreakdown, selectedJobIds, jobFieldValuesMap]);

  // Combined registration charges - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const combinedRegistrationCharges = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.registrationCharges !== undefined) {
      return invoiceBreakdown.registrationCharges;
    }
    
    // Client-side calculation for partial invoice breakdown
    if (selectedJobIds.length === 0) return 0;
    return selectedJobIds.reduce((total, jobId) => {
      const jobServiceCharge = jobServiceChargesMap[jobId];
      if (jobServiceCharge && jobServiceCharge.registration_other_charges) {
        return (
          total + parseFloat(jobServiceCharge.registration_other_charges || 0)
        );
      }
      return total;
    }, 0);
  }, [invoiceBreakdown, selectedJobIds, jobServiceChargesMap]);

  // Combined CA charges - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const combinedCaCharges = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.caCharges !== undefined) {
      return invoiceBreakdown.caCharges;
    }
    
    // Client-side calculation for partial invoice breakdown
    if (selectedJobIds.length === 0) return 0;
    return selectedJobIds.reduce((total, jobId) => {
      const jobServiceCharge = jobServiceChargesMap[jobId];
      const noOfCacValue =
        getFieldValueFromJobFieldValue(jobId, "no_of_cac", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "No of CAC", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "noofcac", jobFieldValuesMap);

      if (jobServiceCharge && noOfCacValue) {
        const noOfCac = parseFloat(noOfCacValue || 0);
        const caCharges = parseFloat(jobServiceCharge.ca_charges || 0);
        const jobCaCharge = noOfCac * caCharges;
        return total + jobCaCharge;
      }
      return total;
    }, 0);
  }, [invoiceBreakdown, selectedJobIds, jobServiceChargesMap, jobFieldValuesMap]);

  // Combined CE charges - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const combinedCeCharges = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.ceCharges !== undefined) {
      return invoiceBreakdown.ceCharges;
    }
    
    // Client-side calculation for partial invoice breakdown
    if (selectedJobIds.length === 0) return 0;
    return selectedJobIds.reduce((total, jobId) => {
      const jobServiceCharge = jobServiceChargesMap[jobId];
      const noOfCecValue =
        getFieldValueFromJobFieldValue(jobId, "no_of_cec", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "No of CEC", jobFieldValuesMap) ||
        getFieldValueFromJobFieldValue(jobId, "noofcec", jobFieldValuesMap);

      if (jobServiceCharge && noOfCecValue) {
        const noOfCec = parseFloat(noOfCecValue || 0);
        const ceCharges = parseFloat(jobServiceCharge.ce_charges || 0);
        const jobCeCharge = noOfCec * ceCharges;
        return total + jobCeCharge;
      }
      return total;
    }, 0);
  }, [invoiceBreakdown, selectedJobIds, jobServiceChargesMap, jobFieldValuesMap]);

  // Get remi fields - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const remiFields = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.remiFields && invoiceBreakdown.remiFields.length > 0) {
      return invoiceBreakdown.remiFields;
    }
    
    // Client-side calculation for partial invoice breakdown
    if (selectedJobIds.length === 0) return [];

    const firstJobId = selectedJobIds[0];
    const jobServiceCharge = jobServiceChargesMap[firstJobId];

    if (!jobServiceCharge) {
      return [];
    }

    const remiFieldsArray = [];
    const remiFieldsConfig = [
      { 
        desc: "remi_one_desc", 
        descCamel: "remiOneDesc",
        charges: "remi_one_charges",
        chargesCamel: "remiOneCharges"
      },
      { 
        desc: "remi_two_desc", 
        descCamel: "remiTwoDesc",
        charges: "remi_two_charges",
        chargesCamel: "remiTwoCharges"
      },
      { 
        desc: "remi_three_desc", 
        descCamel: "remiThreeDesc",
        charges: "remi_three_charges",
        chargesCamel: "remiThreeCharges"
      },
      { 
        desc: "remi_four_desc", 
        descCamel: "remiFourDesc",
        charges: "remi_four_charges",
        chargesCamel: "remiFourCharges"
      },
      { 
        desc: "remi_five_desc", 
        descCamel: "remiFiveDesc",
        charges: "remi_five_charges",
        chargesCamel: "remiFiveCharges"
      },
    ];

    remiFieldsConfig.forEach((field) => {
      const description = jobServiceCharge[field.desc] || jobServiceCharge[field.descCamel];
      const charges = jobServiceCharge[field.charges] || jobServiceCharge[field.chargesCamel];

      if (description && description !== null && description !== undefined && String(description).trim() !== "" && String(description).toUpperCase() !== "NULL") {
        let parsedCharges = 0;
        const chargesStr = charges !== null && charges !== undefined ? String(charges).trim() : "";
        const isChargesEmpty = chargesStr === "" || chargesStr.toUpperCase() === "NULL" || chargesStr === "null";
        
        if (!isChargesEmpty) {
          let numValue = parseFloat(chargesStr);
          if (isNaN(numValue) || !isFinite(numValue)) {
            const cleanedStr = chargesStr.replace(/[^\d.-]/g, '');
            numValue = parseFloat(cleanedStr);
          }
          parsedCharges = (isNaN(numValue) || !isFinite(numValue)) ? 0 : numValue;
        }

        remiFieldsArray.push({
          description: String(description).trim(),
          charges: parsedCharges,
          fieldName: field.charges,
        });
      }
    });

    return remiFieldsArray;
  }, [invoiceBreakdown, selectedJobIds, jobServiceChargesMap]);

  // Combined remi charges - uses client-side calculation for partial invoice breakdown, API for sample invoice
  const combinedRemiCharges = useMemo(() => {
    // Use API response if available (for sample invoice), otherwise use client-side calculation
    if (invoiceBreakdown?.remiCharges) {
      return Object.values(invoiceBreakdown.remiCharges).reduce((total, val) => {
        return total + parseFloat(val || 0);
      }, 0);
    }
    
    // Client-side calculation for partial invoice breakdown
    return remiFields.reduce((total, remiField) => {
      return total + remiField.charges;
    }, 0);
  }, [invoiceBreakdown, remiFields]);

  // Get GST type from first selected job's service charge
  const selectedGstType = useMemo(() => {
    if (selectedJobIds.length === 0) return null;

    const firstJobId = selectedJobIds[0];
    const jobServiceCharge = jobServiceChargesMap[firstJobId];

    return jobServiceCharge?.gst_type || null;
  }, [selectedJobIds, jobServiceChargesMap]);

  // Calculate tax amounts and totals for sample invoice - now uses API response
  const invoiceCalculations = useMemo(() => {
    if (invoiceBreakdown) {
      // Use API response for all calculations
      const gst = invoiceBreakdown.gst || {};
      const total = invoiceBreakdown.finalAmount || 0;

      return {
        baseAmount: invoiceBreakdown.professionalCharges || 0,
        subtotal: invoiceBreakdown.serviceSubtotal || 0,
        // Display rates: Always show the base rates from gst_rates table (based on SAC No)
        cgstRate: gst.cgstRate || 0,
        sgstRate: gst.sgstRate || 0,
        igstRate: gst.igstRate || 0,
        // Calculated amounts: Based on gst_type
        cgstAmount: gst.cgstAmount || 0,
        sgstAmount: gst.sgstAmount || 0,
        igstAmount: gst.igstAmount || 0,
        applicationFees: invoiceBreakdown.applicationFees || 0,
        remiCharges: Object.values(invoiceBreakdown.remiCharges || {}).reduce((sum, val) => sum + parseFloat(val || 0), 0),
        total,
        totalInWords: numberToWords(total),
      };
    }

    // Fallback to client-side calculation if API response not available
    const baseAmount = parseFloat(finalAmount) || 0;
    const registrationCharges = parseFloat(combinedRegistrationCharges) || 0;
    const caCharges = parseFloat(combinedCaCharges) || 0;
    const ceCharges = parseFloat(combinedCeCharges) || 0;
    const rewardAmount = parseFloat(invoiceCalculation.reward_amount || 0) || 0;
    const discountAmount = parseFloat(invoiceCalculation.discount_amount || 0) || 0;

    const subtotal =
      baseAmount +
      registrationCharges +
      caCharges +
      ceCharges +
      rewardAmount -
      discountAmount;

    const baseCgstRate = selectedGstRates.cgstRate || 0;
    const baseSgstRate = selectedGstRates.sgstRate || 0;
    const baseIgstRate = selectedGstRates.igstRate || 0;

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (selectedGstType === "SC") {
      cgstRate = baseCgstRate;
      sgstRate = baseSgstRate;
      igstRate = 0;
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstAmount = (subtotal * sgstRate) / 100;
      igstAmount = 0;
    } else if (selectedGstType === "I") {
      cgstRate = 0;
      sgstRate = 0;
      igstRate = baseIgstRate;
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = (subtotal * igstRate) / 100;
    } else if (selectedGstType === "EXEMPTED") {
      cgstRate = 0;
      sgstRate = 0;
      igstRate = 0;
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = 0;
    } else {
      cgstRate = baseCgstRate;
      sgstRate = baseSgstRate;
      igstRate = baseIgstRate;
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstAmount = (subtotal * sgstRate) / 100;
      igstAmount =
        cgstRate > 0 || sgstRate > 0 ? 0 : (subtotal * igstRate) / 100;
    }

    const applicationFees = combinedApplicationFees;
    const remiCharges = combinedRemiCharges;

    const total =
      subtotal +
      cgstAmount +
      sgstAmount +
      igstAmount +
      applicationFees +
      remiCharges;

    return {
      baseAmount,
      subtotal,
      cgstRate: baseCgstRate,
      sgstRate: baseSgstRate,
      igstRate: baseIgstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      applicationFees,
      remiCharges,
      total,
      totalInWords: numberToWords(total),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    invoiceBreakdown,
    finalAmount,
    combinedApplicationFees,
    combinedRegistrationCharges,
    combinedCaCharges,
    combinedCeCharges,
    combinedRemiCharges,
    invoiceCalculation.reward_amount,
    invoiceCalculation.discount_amount,
    selectedGstRates,
    selectedGstType,
  ]);

  // Calculate invoice amounts based on Pay Amt values from partial invoice breakdown
  const partialInvoiceCalculations = useMemo(() => {
    // Use Pay Amt values instead of full amounts
    const baseAmount = parseFloat(partialInvoiceBreakdown.professionalCharges.payAmt || 0);
    const registrationCharges = parseFloat(partialInvoiceBreakdown.registrationCharges.payAmt || 0);
    const caCharges = parseFloat(partialInvoiceBreakdown.caCert.payAmt || 0);
    const ceCharges = parseFloat(partialInvoiceBreakdown.ceCert.payAmt || 0);
    const rewardAmount = parseFloat(invoiceCalculation.reward_amount || 0) || 0;
    const discountAmount = parseFloat(invoiceCalculation.discount_amount || 0) || 0;

    // Calculate subtotal: baseAmount + all charges + reward - discount
    const subtotal =
      baseAmount +
      registrationCharges +
      caCharges +
      ceCharges +
      rewardAmount -
      discountAmount;

    // Get GST rates from selected job code's gstRate relation (from gst_rates table based on SAC No)
    const baseCgstRate = selectedGstRates.cgstRate || 0;
    const baseSgstRate = selectedGstRates.sgstRate || 0;
    const baseIgstRate = selectedGstRates.igstRate || 0;

    // Apply GST based on gst_type from job_service_charges
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (selectedGstType === "SC") {
      // State/Central GST: Apply CGST and SGST, IGST = 0
      cgstRate = baseCgstRate;
      sgstRate = baseSgstRate;
      igstRate = 0;
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstAmount = (subtotal * sgstRate) / 100;
      igstAmount = 0;
    } else if (selectedGstType === "I") {
      // Interstate GST: Apply only IGST, CGST = 0, SGST = 0
      cgstRate = 0;
      sgstRate = 0;
      igstRate = baseIgstRate;
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = (subtotal * igstRate) / 100;
    } else if (selectedGstType === "EXEMPTED") {
      // Exempted: No GST applied, all rates = 0
      cgstRate = 0;
      sgstRate = 0;
      igstRate = 0;
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = 0;
    } else {
      // Default: If gst_type is not set or null, use the rates from gst_rates table
      // Apply CGST and SGST if available, otherwise IGST
      cgstRate = baseCgstRate;
      sgstRate = baseSgstRate;
      igstRate = baseIgstRate;
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstAmount = (subtotal * sgstRate) / 100;
      // If both CGST and SGST are present, IGST should be 0, otherwise use IGST
      igstAmount =
        cgstRate > 0 || sgstRate > 0 ? 0 : (subtotal * igstRate) / 100;
    }

    // Application fees (reimbursement) - use Pay Amt value
    const applicationFees = parseFloat(partialInvoiceBreakdown.applicationFees.payAmt || 0);

    // Remi charges (reimbursement) - sum of Pay Amt values from all remi fields
    const remiCharges = 
      parseFloat(partialInvoiceBreakdown.remiOne.payAmt || 0) +
      parseFloat(partialInvoiceBreakdown.remiTwo.payAmt || 0) +
      parseFloat(partialInvoiceBreakdown.remiThree.payAmt || 0) +
      parseFloat(partialInvoiceBreakdown.remiFour.payAmt || 0) +
      parseFloat(partialInvoiceBreakdown.remiFive.payAmt || 0);

    const total =
      subtotal +
      cgstAmount +
      sgstAmount +
      igstAmount +
      applicationFees +
      remiCharges;

    return {
      baseAmount,
      subtotal,
      // Display rates: Always show the base rates from gst_rates table (based on SAC No)
      cgstRate: baseCgstRate,
      sgstRate: baseSgstRate,
      igstRate: baseIgstRate,
      // Calculated amounts: Based on gst_type
      cgstAmount,
      sgstAmount,
      igstAmount,
      applicationFees,
      remiCharges,
      total,
      totalInWords: numberToWords(total),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    partialInvoiceBreakdown,
    invoiceCalculation.reward_amount,
    invoiceCalculation.discount_amount,
    selectedGstRates,
    selectedGstType,
  ]);

  // Get current date
  const currentDate = useMemo(() => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  // Function to show sample invoice inline - fetches API data first
  const handleShowSampleInvoice = async () => {
    // Fetch invoice breakdown from API first
    const success = await fetchInvoiceBreakdown();
    
    if (success) {
      // Close the calculation modal and show sample invoice
      setShowInvoiceModal(false);
      setShowSampleInvoice(true);
    }
  };

  // Function to save invoice to database
  const handleSaveInvoice = async () => {
    try {
      // Validate required fields
      if (!selectedJobCode) {
        alert("Please select a Job Code");
        return;
      }

      if (!selectedClient) {
        alert("Please select a Client");
        return;
      }

      if (selectedJobIds.length === 0) {
        alert("Please select at least one job");
        return;
      }

      if (!billingType) {
        alert("Please select a Billing Type");
        return;
      }

      if (!invoiceType) {
        alert("Please select an Invoice Type");
        return;
      }

      // Derive account id for draft_view_id generation
      const effectiveAccountId =
        sessionAccount && sessionAccount.id !== "all"
          ? sessionAccount.id
          : selectedClientServiceCharge?.account_id || null;

      // Use Pay Amt values if they exist (for partial invoices), otherwise use full amounts
      // This ensures the saved amounts match what's displayed in the invoice
      const professionalCharges = hasPayAmtValues
        ? parseFloat(partialInvoiceBreakdown.professionalCharges.payAmt || 0)
        : parseFloat(finalAmount || 0);
      const registrationCharges = hasPayAmtValues
        ? parseFloat(partialInvoiceBreakdown.registrationCharges.payAmt || 0)
        : parseFloat(combinedRegistrationCharges || 0);
      const caCharges = hasPayAmtValues
        ? parseFloat(partialInvoiceBreakdown.caCert.payAmt || 0)
        : parseFloat(combinedCaCharges || 0);
      const ceCharges = hasPayAmtValues
        ? parseFloat(partialInvoiceBreakdown.ceCert.payAmt || 0)
        : parseFloat(combinedCeCharges || 0);
      const applicationFees = hasPayAmtValues
        ? parseFloat(partialInvoiceBreakdown.applicationFees.payAmt || 0)
        : parseFloat(combinedApplicationFees || 0);

      // Create a map of remi charges by field name for efficient lookup
      // Use Pay Amt values if available, otherwise use charges from job service charges
      const remiChargesMap = {};
      remiFields.forEach((field, index) => {
        const remiKey = `remi${index === 0 ? 'One' : index === 1 ? 'Two' : index === 2 ? 'Three' : index === 3 ? 'Four' : 'Five'}`;
        
        // Check if Pay Amt exists for this remi field
        if (hasPayAmtValues && partialInvoiceBreakdown[remiKey]?.payAmt !== undefined && partialInvoiceBreakdown[remiKey]?.payAmt !== null) {
          remiChargesMap[field.fieldName] = parseFloat(partialInvoiceBreakdown[remiKey].payAmt || 0);
        } else {
          remiChargesMap[field.fieldName] = field.charges;
        }
      });

      // Calculate final total amount for pay_amount field
      // IMPORTANT: This must match what's displayed in the Sample Invoice
      const calculations = hasPayAmtValues ? partialInvoiceCalculations : invoiceCalculations;
      let finalTotalAmount = 0;
      
      if (billingType === "Reimbursement") {
        // For Reimbursement: Application Fees + Remi Charges + (negative discount if any)
        finalTotalAmount = (
          parseFloat(applicationFees || 0) +
          parseFloat(remiChargesMap["remi_one_charges"] || 0) +
          parseFloat(remiChargesMap["remi_two_charges"] || 0) +
          parseFloat(remiChargesMap["remi_three_charges"] || 0) +
          parseFloat(remiChargesMap["remi_four_charges"] || 0) +
          parseFloat(remiChargesMap["remi_five_charges"] || 0) +
          -parseFloat(invoiceCalculation.discount_amount || 0)
        );
      } else if (billingType === "Service") {
        // For Service: Only Service section fields (Subtotal + GST)
        // Do NOT include application fees or remi charges (they're not displayed)
        const serviceSubtotal = (
          parseFloat(professionalCharges || 0) +
          parseFloat(registrationCharges || 0) +
          parseFloat(caCharges || 0) +
          parseFloat(ceCharges || 0) +
          parseFloat(invoiceCalculation.reward_amount || 0) -
          parseFloat(invoiceCalculation.discount_amount || 0)
        );
        // Add GST amounts
        const gstTotal = (calculations?.cgstAmount || 0) + (calculations?.sgstAmount || 0) + (calculations?.igstAmount || 0);
        finalTotalAmount = serviceSubtotal + gstTotal;
      } else {
        // For Service & Reimbursement: Subtotal + GST + Application Fees + Remi Charges
        finalTotalAmount = calculations?.total || 0;
      }

      // Prepare invoice data
      // IMPORTANT: Only store fields that are displayed in the invoice UI
      // For "Service": Don't store application_fees or remi charges (not displayed)
      // For "Reimbursement": Don't store service charges (not displayed)
      // For "Service & Reimbursement": Store all fields (all displayed)
      
      const invoiceData = {
        account_id: effectiveAccountId ? parseInt(effectiveAccountId) : null, // Account ID for draft_view_id generation
        job_register_id: parseInt(selectedJobCode),
        billing_type: billingType,
        invoice_type: invoiceType,
        pay_amount: finalTotalAmount.toFixed(2), // Use calculated total amount
        // Service charges - only store if displayed (Service or Service & Reimbursement)
        amount: billingType === "Reimbursement" 
          ? null 
          : (invoiceCalculation.amount || professionalCharges.toFixed(2)),
        professional_charges: billingType === "Reimbursement" ? 0 : professionalCharges,
        registration_other_charges: billingType === "Reimbursement" ? 0 : registrationCharges,
        ca_charges: billingType === "Reimbursement" ? 0 : caCharges,
        ce_charges: billingType === "Reimbursement" ? 0 : ceCharges,
        ca_cert_count: billingType === "Reimbursement" ? 0 : (combinedCaCertCount || 0),
        ce_cert_count: billingType === "Reimbursement" ? 0 : (combinedCeCertCount || 0),
        // Reimbursement charges - only store if displayed (Reimbursement or Service & Reimbursement)
        application_fees: billingType === "Service" ? 0 : applicationFees,
        // Map remi charges based on their field name, using Pay Amt if available
        // Only store if displayed (Reimbursement or Service & Reimbursement)
        remi_one_charges: billingType === "Service" 
          ? 0 
          : (remiChargesMap["remi_one_charges"]
              ? parseFloat(remiChargesMap["remi_one_charges"])
              : 0),
        remi_two_charges: billingType === "Service"
          ? 0
          : (remiChargesMap["remi_two_charges"]
              ? parseFloat(remiChargesMap["remi_two_charges"])
              : 0),
        remi_three_charges: billingType === "Service"
          ? 0
          : (remiChargesMap["remi_three_charges"]
              ? parseFloat(remiChargesMap["remi_three_charges"])
              : 0),
        remi_four_charges: billingType === "Service"
          ? 0
          : (remiChargesMap["remi_four_charges"]
              ? parseFloat(remiChargesMap["remi_four_charges"])
              : 0),
        remi_five_charges: billingType === "Service"
          ? null
          : (remiChargesMap["remi_five_charges"]
              ? String(remiChargesMap["remi_five_charges"])
              : null),
        // Reward/Discount - only store if displayed (Service or Service & Reimbursement)
        reward_amount: billingType === "Reimbursement"
          ? 0
          : (parseFloat(invoiceCalculation.reward_amount || 0) || 0),
        discount_amount: billingType === "Reimbursement"
          ? 0
          : (parseFloat(invoiceCalculation.discount_amount || 0) || 0),
        note: sampleInvoiceData.note || null,
        po_no: sampleInvoiceData.poNo || null,
        irn_no: sampleInvoiceData.irnNo || null,
        job_ids: selectedJobIds, // Array of job IDs for InvoiceSelectedJob table
      };

      // Show loading state
      setLoading(true);

      // Log the data being sent for debugging
      console.log("Sending invoice data:", invoiceData);

      // Make API call to save invoice
      const response = await api.post("/invoices", invoiceData);

      if (response.data) {
        alert("Invoice saved successfully!");
        // Optionally close the sample invoice modal
        setShowSampleInvoice(false);
        // Redirect to invoices page with draft type filter
        router.push("/dashboard/invoice/invoices?type=draft");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error details:", error.response?.data?.details);

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

  // Check if any Pay Amt values are set (indicating partial invoice)
  const hasPayAmtValues = useMemo(() => {
    return (
      parseFloat(partialInvoiceBreakdown.professionalCharges.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.registrationCharges.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.caCert.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.ceCert.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.applicationFees.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.remiOne.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.remiTwo.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.remiThree.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.remiFour.payAmt || 0) > 0 ||
      parseFloat(partialInvoiceBreakdown.remiFive.payAmt || 0) > 0
    );
  }, [partialInvoiceBreakdown]);

  // Prepare invoice data for sample invoice
  const sampleInvoiceData = useMemo(() => {
    // Use Pay Amt values if they exist, otherwise use base amount (without reward/discount)
    const professionalCharges = hasPayAmtValues
      ? parseFloat(partialInvoiceBreakdown.professionalCharges.payAmt || 0)
      : parseFloat(invoiceCalculation.amount || 0);
    const registrationCharges = hasPayAmtValues
      ? parseFloat(partialInvoiceBreakdown.registrationCharges.payAmt || 0)
      : parseFloat(combinedRegistrationCharges || 0);
    const caCharges = hasPayAmtValues
      ? parseFloat(partialInvoiceBreakdown.caCert.payAmt || 0)
      : parseFloat(combinedCaCharges || 0);
    const ceCharges = hasPayAmtValues
      ? parseFloat(partialInvoiceBreakdown.ceCert.payAmt || 0)
      : parseFloat(combinedCeCharges || 0);
    const applicationFees = hasPayAmtValues
      ? parseFloat(partialInvoiceBreakdown.applicationFees.payAmt || 0)
      : parseFloat(combinedApplicationFees || 0);

    // Use API response for reward/discount amounts if available, otherwise use client-side values
    const rewardAmount = invoiceBreakdown?.rewardAmount !== undefined
      ? invoiceBreakdown.rewardAmount
      : parseFloat(invoiceCalculation.reward_amount || 0);
    const discountAmount = invoiceBreakdown?.discountAmount !== undefined
      ? invoiceBreakdown.discountAmount
      : parseFloat(invoiceCalculation.discount_amount || 0);

    return {
      account: sessionAccount,
      invoiceNo: "NA",
      date: currentDate,
      jobNo: selectedJobNo,
      customerId:
        selectedClient !== "ALL_CLIENTS"
          ? selectedClientServiceCharge?.group_id || "NA"
          : "NA",
      poNo: "NA",
      irnNo: "NA",
      billedTo: selectedClientName,
      billedToAddress: selectedClientServiceCharge?.clientInfo?.address || "NA",
      serviceDetails: selectedJobCodeName,
      chargesAsUnder: "NA",
      amount: invoiceCalculation.amount || "0",
      finalAmount: professionalCharges,
      reward_amount: rewardAmount,
      discount_amount: discountAmount,
      registrationCharges: registrationCharges.toFixed(2),
      caCertCount: 0,
      ceCertCount: 0,
      caCharges: caCharges.toFixed(2),
      ceCharges: ceCharges.toFixed(2),
      applicationFees: applicationFees.toFixed(2),
      kindAttn: "NA",
      emails: "NA",
      sacNo: selectedSacNo,
      note: null,
    };
  }, [
    sessionAccount,
    currentDate,
    selectedJobNo,
    selectedClient,
    selectedClientServiceCharge,
    selectedClientName,
    selectedJobCodeName,
    selectedSacNo,
    invoiceCalculation.amount,
    finalAmount,
    invoiceCalculation.reward_amount,
    invoiceCalculation.discount_amount,
    combinedRegistrationCharges,
    combinedCaCharges,
    combinedCeCharges,
    combinedApplicationFees,
    partialInvoiceBreakdown,
    hasPayAmtValues,
    invoiceBreakdown,
  ]);

  return (
    <div className="space-y-3">
      {/* Page Header */}
      {/* <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Creation</h1>
      </div> */}

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Select Job Code */}
          <div>
            <SelectBox
              name="job_code"
              value={selectedJobCode}
              onChange={(e) => {
                setSelectedJobCode(e.target.value);
                setSelectedClient(""); // Reset client when job code changes
                setSelectedAccount(""); // Reset account when job code changes
                setSelectedClientServiceCharge(null); // Reset service charge when job code changes
                setJobs([]); // Reset jobs when job code changes
                setSearchTerm(""); // Reset search when job code changes
              }}
              options={jobCodeOptions}
              placeholder="Select Job Code"
              isClearable={true}
              isSearchable={true}
              isLoading={loading}
              className="mb-0"
            />
          </div>

          {/* Select Client */}
          <div>
            <SelectBox
              name="client"
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setSelectedClientServiceCharge(null); // Reset service charge selection
                setJobs([]); // Reset jobs when client changes
                setSearchTerm(""); // Reset search when client changes
              }}
              options={clientOptions}
              placeholder={
                !sessionAccount || sessionAccount.id === "all"
                  ? "Please select an Specific Account first"
                  : "Select Client"
              }
              isClearable={true}
              isSearchable={true}
              isDisabled={
                !selectedJobCode ||
                !sessionAccount ||
                sessionAccount.id === "all"
              }
              isLoading={clientsLoading}
              className="mb-0"
              formatOptionLabel={({ label }, { context }) => {
                // For both input/selected value and dropdown options, just show the label
                return label;
              }}
            />
          </div>

          {/* Billing Type */}
          <div>
            <SelectBox
              name="billing_type"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value)}
              options={billingTypeOptions}
              placeholder="Select Billing Type"
              isClearable={false}
              isSearchable={false}
              // isDisabled={invoiceType === "Partial Invoice"}
              className="mb-0"
            />
          </div>

          {/* Invoice Type */}
          <div>
            <SelectBox
              name="invoice_type"
              value={invoiceType}
              onChange={handleInvoiceTypeChange}
              options={invoiceTypeOptions}
              placeholder="Select Invoice Type"
              isClearable={false}
              isSearchable={false}
              className="mb-0"
            />
          </div>
        </div>
      </div>

      {/* Jobs Display Section */}
      {selectedJobCode && selectedClient && (
        <div className="space-y-4">
          {/* Show Full Invoice Section only when Full Invoice is selected */}
          {invoiceType === "Full Invoice" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Full Invoice
                </h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Total Jobs: {fullCounts.total}</span>
                    <span>Selected Job: {fullCounts.selected}</span>
                    <span>UnSelected Job: {fullCounts.unselected}</span>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Job No..."
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              {jobsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading jobs...
                </div>
              ) : filteredFullInvoiceJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No jobs available for Full Invoice
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  {isAllClientsSelected && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      All Clients selected: Jobs are displayed for viewing only.
                      Please select a specific client to select jobs.
                    </div>
                  )}
                  <div
                    className={`flex flex-wrap items-center gap-6 ${
                      filteredFullInvoiceJobs.length > 50
                        ? "max-h-[600px] overflow-y-auto pr-2"
                        : ""
                    }`}
                    style={
                      filteredFullInvoiceJobs.length > 50
                        ? { maxHeight: "600px" }
                        : {}
                    }
                  >
                    {filteredFullInvoiceJobs.map((job) => (
                      <div key={job.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`full-${job.id}`}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          checked={selectedJobIds.includes(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          disabled={isAllClientsSelected}
                        />
                        <label
                          htmlFor={`full-${job.id}`}
                          className={`text-sm ${
                            isAllClientsSelected
                              ? "text-gray-500 cursor-not-allowed"
                              : "text-gray-900 cursor-pointer"
                          }`}
                        >
                          {job.job_no || `Job ${job.id}`}
                        </label>
                      </div>
                    ))}
                  </div>
                  {/* Create Invoice Button - Show when at least 1 job is selected */}
                  {selectedJobIds.length > 0 && (
                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-300">
                      <button
                        onClick={() => {
                          // Calculate and set invoice calculation values before showing modal
                          const calculated = calculateAggregatedInvoiceAmount();
                          setInvoiceCalculation((prev) => ({
                            ...prev,
                            quantity: calculated.quantity,
                            amount: calculated.amount,
                            percentage: calculated.percentage,
                            perShb: calculated.perShb,
                          }));
                          // If invoiceType is "Partial Invoice", show partial invoice modal
                          if (invoiceType === "Partial Invoice") {
                            setShowPartialInvoiceModal(true);
                          }
                          // If billingType is "Reimbursement", directly show sample invoice
                          // Otherwise, show the calculation modal
                          else if (billingType === "Reimbursement") {
                            handleShowSampleInvoice();
                          } else {
                            setShowInvoiceModal(true);
                          }
                        }}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                      >
                        Create Invoice
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show Partial Invoice Section only when Partial Invoice is selected */}
          {invoiceType === "Partial Invoice" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Partial Invoice
                </h2>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Total Jobs: {partialCounts.total}</span>
                    <span>Selected Job: {partialCounts.selected}</span>
                    <span>UnSelected Job: {partialCounts.unselected}</span>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Job No..."
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              {jobsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading jobs...
                </div>
              ) : filteredPartialInvoiceJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No jobs available for Partial Invoice
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  {isAllClientsSelected && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                      All Clients selected: Jobs are displayed for viewing only.
                      Please select a specific client to select jobs.
                    </div>
                  )}
                  <div
                    className={`flex flex-wrap items-center gap-6 ${
                      filteredPartialInvoiceJobs.length > 50
                        ? "max-h-[600px] overflow-y-auto pr-2"
                        : ""
                    }`}
                    style={
                      filteredPartialInvoiceJobs.length > 50
                        ? { maxHeight: "600px" }
                        : {}
                    }
                  >
                    {filteredPartialInvoiceJobs.map((job) => (
                      <div key={job.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`partial-${job.id}`}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          checked={selectedJobIds.includes(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          disabled={isAllClientsSelected}
                        />
                        <label
                          htmlFor={`partial-${job.id}`}
                          className={`text-sm ${
                            isAllClientsSelected
                              ? "text-gray-500 cursor-not-allowed"
                              : "text-gray-900 cursor-pointer"
                          }`}
                        >
                          {job.job_no || `Job ${job.id}`}
                        </label>
                      </div>
                    ))}
                  </div>
                  {/* Create Invoice Button - Show when at least 1 job is selected */}
                  {selectedJobIds.length > 0 && (
                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-300">
                      <button
                        onClick={() => {
                          // Calculate and set invoice calculation values before showing modal
                          const calculated = calculateAggregatedInvoiceAmount();
                          setInvoiceCalculation((prev) => ({
                            ...prev,
                            quantity: calculated.quantity,
                            amount: calculated.amount,
                            percentage: calculated.percentage,
                            perShb: calculated.perShb,
                          }));
                          // If invoiceType is "Partial Invoice", show partial invoice modal
                          if (invoiceType === "Partial Invoice") {
                            setShowPartialInvoiceModal(true);
                          }
                          // If billingType is "Reimbursement", directly show sample invoice
                          // Otherwise, show the calculation modal
                          else if (billingType === "Reimbursement") {
                            handleShowSampleInvoice();
                          } else {
                            setShowInvoiceModal(true);
                          }
                        }}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                      >
                        Create Invoice
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invoice Amount Calculation Modal - Hidden for Reimbursement billing type */}
      {showInvoiceModal && billingType !== "Reimbursement" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Invoice Amount Calculation
              </h2>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
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

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Calculation Grid */}
              <div>
                <div className="grid grid-cols-4 gap-4">
                  {/* Quantity Column */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={invoiceCalculation.quantity}
                      onChange={(e) =>
                        setInvoiceCalculation((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      placeholder="0"
                      disabled
                    />
                  </div>

                  {/* Amount Column */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={parseFloat(invoiceCalculation.amount || 0).toFixed(
                        2
                      )}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      placeholder="0.00"
                      disabled
                    />
                  </div>

                  {/* % Column - Display percentage amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Percentage
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceCalculation.percentage}
                      onChange={(e) =>
                        setInvoiceCalculation((prev) => ({
                          ...prev,
                          percentage: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      placeholder="0.00"
                      disabled
                    />
                  </div>

                  {/* Per SHB Column */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Per SHB
                    </label>
                    <input
                      type="number"
                      value={invoiceCalculation.perShb}
                      onChange={(e) =>
                        setInvoiceCalculation((prev) => ({
                          ...prev,
                          perShb: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                      placeholder="0"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Reward/Discount Toggle */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="rewardDiscountType"
                      value="reward"
                      checked={rewardDiscountType === "reward"}
                      onChange={(e) => {
                        setRewardDiscountType(e.target.value);
                        // Clear the other type's values when switching
                        if (e.target.value === "reward") {
                          setInvoiceCalculation((prev) => ({
                            ...prev,
                            discount_amount: "",
                          }));
                        } else {
                          setInvoiceCalculation((prev) => ({
                            ...prev,
                            reward_amount: "",
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Reward</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="rewardDiscountType"
                      value="discount"
                      checked={rewardDiscountType === "discount"}
                      onChange={(e) => {
                        setRewardDiscountType(e.target.value);
                        // Clear the other type's values when switching
                        if (e.target.value === "reward") {
                          setInvoiceCalculation((prev) => ({
                            ...prev,
                            discount_amount: "",
                          }));
                        } else {
                          setInvoiceCalculation((prev) => ({
                            ...prev,
                            reward_amount: "",
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Discount</span>
                  </label>
                </div>
              </div>

              {/* Reward/Discount Section */}
              {rewardDiscountType === "reward" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reward Amount
                  </label>
                  <input
                    ref={rewardDiscountAmountInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={invoiceCalculation.reward_amount || ""}
                    onChange={handleRewardDiscountAmountChange}
                    onBlur={(e) => {
                      isTypingRewardDiscountRef.current = false;
                      const value = e.target.value.trim();
                      if (value === "" || value === ".") {
                        setInvoiceCalculation((prev) => ({
                          ...prev,
                          reward_amount: "",
                        }));
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: "",
                        }));
                        return;
                      }

                      let numericValue = parseFloat(value);
                      if (isNaN(numericValue) || numericValue < 0) {
                        setInvoiceCalculation((prev) => ({
                          ...prev,
                          reward_amount: "",
                        }));
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: "Please enter a valid amount (>= 0)",
                        }));
                        return;
                      }

                      // Ensure non-negative and round to 2 decimal places
                      numericValue = Math.max(0, Math.round(numericValue * 100) / 100);
                      const baseAmount = parseFloat(invoiceCalculation.amount) || 0;
                      
                      if (baseAmount > 0 && numericValue > baseAmount) {
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: `Amount cannot exceed base amount of ${baseAmount.toFixed(2)}`,
                        }));
                        numericValue = baseAmount;
                      } else {
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: "",
                        }));
                      }

                      setInvoiceCalculation((prev) => ({
                        ...prev,
                        reward_amount: numericValue.toFixed(2),
                      }));
                    }}
                    onWheel={(e) => e.target.blur()}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      rewardDiscountErrors.amount
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-300 focus:border-primary-500"
                    }`}
                    placeholder="0.00"
                  />
                  {rewardDiscountErrors.amount ? (
                    <p className="text-xs text-red-500 mt-1">
                      {rewardDiscountErrors.amount}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      2 decimal places only | Cannot exceed base amount
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Amount
                  </label>
                  <input
                    ref={rewardDiscountAmountInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={invoiceCalculation.discount_amount || ""}
                    onChange={handleRewardDiscountAmountChange}
                    onBlur={(e) => {
                      isTypingRewardDiscountRef.current = false;
                      const value = e.target.value.trim();
                      if (value === "" || value === ".") {
                        setInvoiceCalculation((prev) => ({
                          ...prev,
                          discount_amount: "",
                        }));
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: "",
                        }));
                        return;
                      }

                      let numericValue = parseFloat(value);
                      if (isNaN(numericValue) || numericValue < 0) {
                        setInvoiceCalculation((prev) => ({
                          ...prev,
                          discount_amount: "",
                        }));
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: "Please enter a valid amount (>= 0)",
                        }));
                        return;
                      }

                      // Ensure non-negative and round to 2 decimal places
                      numericValue = Math.max(0, Math.round(numericValue * 100) / 100);
                      const baseAmount = parseFloat(invoiceCalculation.amount) || 0;
                      
                      if (baseAmount > 0 && numericValue > baseAmount) {
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: `Amount cannot exceed base amount of ${baseAmount.toFixed(2)}`,
                        }));
                        numericValue = baseAmount;
                      } else {
                        setRewardDiscountErrors((prev) => ({
                          ...prev,
                          amount: "",
                        }));
                      }

                      setInvoiceCalculation((prev) => ({
                        ...prev,
                        discount_amount: numericValue.toFixed(2),
                      }));
                    }}
                    onWheel={(e) => e.target.blur()}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      rewardDiscountErrors.amount
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-300 focus:border-primary-500"
                    }`}
                    placeholder="0.00"
                  />
                  {rewardDiscountErrors.amount ? (
                    <p className="text-xs text-red-500 mt-1">
                      {rewardDiscountErrors.amount}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      2 decimal places only | Cannot exceed base amount
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={handleShowSampleInvoice}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
              >
                Show Sample Invoice
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Partial Invoice Details Modal */}
      {showPartialInvoiceModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowPartialInvoiceModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                Invoice Details
              </h2>
              <button
                onClick={() => setShowPartialInvoiceModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded p-1"
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
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

            {/* Modal Body */}
            <div className="p-6">
              {/* Service Charges Breakdown */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Service Charges Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          Description
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                          Amount (₹)
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                          Opening Amt
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                          Pay Amt
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                          Remaining Amt
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Professional Charges */}
                      {parseFloat(finalAmount || 0) > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          Professional Charges
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {parseFloat(finalAmount || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.professionalCharges.openingAmt || ""}
                            placeholder="0"
                            readOnly
                            className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.professionalCharges.payAmt || ""}
                            placeholder="0"
                            max={parseFloat(finalAmount || 0) - partialInvoiceBreakdown.professionalCharges.openingAmt}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const maxPayAmt = parseFloat(finalAmount || 0) - partialInvoiceBreakdown.professionalCharges.openingAmt;
                              const finalValue = value > maxPayAmt ? maxPayAmt : value;
                              setPartialInvoiceBreakdown((prev) => ({
                                ...prev,
                                professionalCharges: {
                                  ...prev.professionalCharges,
                                  payAmt: finalValue >= 0 ? finalValue : 0,
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {(
                            parseFloat(finalAmount || 0) -
                            partialInvoiceBreakdown.professionalCharges.openingAmt -
                            partialInvoiceBreakdown.professionalCharges.payAmt
                          ).toFixed(2)}
                        </td>
                      </tr>
                      )}

                      {/* Registration/Other Charges */}
                      {parseFloat(combinedRegistrationCharges || 0) > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          Registration/Other Charges
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {parseFloat(combinedRegistrationCharges || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.registrationCharges.openingAmt || ""}
                            placeholder="0"
                            readOnly
                            className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.registrationCharges.payAmt || ""}
                            placeholder="0"
                            max={parseFloat(combinedRegistrationCharges || 0) - partialInvoiceBreakdown.registrationCharges.openingAmt}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const maxPayAmt = parseFloat(combinedRegistrationCharges || 0) - partialInvoiceBreakdown.registrationCharges.openingAmt;
                              const finalValue = value > maxPayAmt ? maxPayAmt : value;
                              setPartialInvoiceBreakdown((prev) => ({
                                ...prev,
                                registrationCharges: {
                                  ...prev.registrationCharges,
                                  payAmt: finalValue >= 0 ? finalValue : 0,
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {(
                            parseFloat(combinedRegistrationCharges || 0) -
                            partialInvoiceBreakdown.registrationCharges.openingAmt -
                            partialInvoiceBreakdown.registrationCharges.payAmt
                          ).toFixed(2)}
                        </td>
                      </tr>
                      )}

                      {/* Arrangement of CA CERT */}
                      {parseFloat(combinedCaCharges || 0) > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          Arrangement of CA CERT. ({combinedCaCertCount} Nos)
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {parseFloat(combinedCaCharges || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.caCert.openingAmt || ""}
                            placeholder="0"
                            readOnly
                            className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.caCert.payAmt || ""}
                            placeholder="0"
                            max={parseFloat(combinedCaCharges || 0) - partialInvoiceBreakdown.caCert.openingAmt}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const maxPayAmt = parseFloat(combinedCaCharges || 0) - partialInvoiceBreakdown.caCert.openingAmt;
                              const finalValue = value > maxPayAmt ? maxPayAmt : value;
                              setPartialInvoiceBreakdown((prev) => ({
                                ...prev,
                                caCert: {
                                  ...prev.caCert,
                                  payAmt: finalValue >= 0 ? finalValue : 0,
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {(
                            parseFloat(combinedCaCharges || 0) -
                            partialInvoiceBreakdown.caCert.openingAmt -
                            partialInvoiceBreakdown.caCert.payAmt
                          ).toFixed(2)}
                        </td>
                      </tr>
                      )}

                      {/* Arrangement of CE CERT */}
                      {parseFloat(combinedCeCharges || 0) > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          Arrangement of CE CERT. ({combinedCeCertCount} Nos)
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {parseFloat(combinedCeCharges || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.ceCert.openingAmt || ""}
                            placeholder="0"
                            readOnly
                            className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.ceCert.payAmt || ""}
                            placeholder="0"
                            max={parseFloat(combinedCeCharges || 0) - partialInvoiceBreakdown.ceCert.openingAmt}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const maxPayAmt = parseFloat(combinedCeCharges || 0) - partialInvoiceBreakdown.ceCert.openingAmt;
                              const finalValue = value > maxPayAmt ? maxPayAmt : value;
                              setPartialInvoiceBreakdown((prev) => ({
                                ...prev,
                                ceCert: {
                                  ...prev.ceCert,
                                  payAmt: finalValue >= 0 ? finalValue : 0,
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {(
                            parseFloat(combinedCeCharges || 0) -
                            partialInvoiceBreakdown.ceCert.openingAmt -
                            partialInvoiceBreakdown.ceCert.payAmt
                          ).toFixed(2)}
                        </td>
                      </tr>
                      )}

                      {/* Application Fees */}
                      {parseFloat(combinedApplicationFees || 0) > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          Application Fees
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {parseFloat(combinedApplicationFees || 0).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.applicationFees.openingAmt || ""}
                            placeholder="0"
                            readOnly
                            className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={partialInvoiceBreakdown.applicationFees.payAmt || ""}
                            placeholder="0"
                            max={parseFloat(combinedApplicationFees || 0) - partialInvoiceBreakdown.applicationFees.openingAmt}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              const maxPayAmt = parseFloat(combinedApplicationFees || 0) - partialInvoiceBreakdown.applicationFees.openingAmt;
                              const finalValue = value > maxPayAmt ? maxPayAmt : value;
                              setPartialInvoiceBreakdown((prev) => ({
                                ...prev,
                                applicationFees: {
                                  ...prev.applicationFees,
                                  payAmt: finalValue >= 0 ? finalValue : 0,
                                },
                              }));
                            }}
                            className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-transparent"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {(
                            parseFloat(combinedApplicationFees || 0) -
                            partialInvoiceBreakdown.applicationFees.openingAmt -
                            partialInvoiceBreakdown.applicationFees.payAmt
                          ).toFixed(2)}
                        </td>
                      </tr>
                      )}

                      {/* R1-R5 (Remi Charges) */}
                      {remiFields.map((remiField, index) => {
                        const remiKey = `remi${index === 0 ? 'One' : index === 1 ? 'Two' : index === 2 ? 'Three' : index === 3 ? 'Four' : 'Five'}`;
                        const remiAmount = parseFloat(remiField.charges || 0);
                        const breakdown = partialInvoiceBreakdown[remiKey] || { openingAmt: 0, payAmt: 0 };
                        
                        // Only show if amount is greater than 0
                        if (remiAmount <= 0) return null;
                        
                        return (
                          <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                              {remiField.description || `R${index + 1}`}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                              {remiAmount.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={breakdown.openingAmt || ""}
                                placeholder="0"
                                readOnly
                                className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 cursor-not-allowed"
                              />
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={breakdown.payAmt || ""}
                                placeholder="0"
                                max={remiAmount - breakdown.openingAmt}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  const maxPayAmt = remiAmount - breakdown.openingAmt;
                                  const finalValue = value > maxPayAmt ? maxPayAmt : value;
                                  setPartialInvoiceBreakdown((prev) => ({
                                    ...prev,
                                    [remiKey]: {
                                      ...(prev[remiKey] || { openingAmt: 0, payAmt: 0 }),
                                      payAmt: finalValue >= 0 ? finalValue : 0,
                                    },
                                  }));
                                }}
                                className="w-full px-2 py-1 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-transparent"
                              />
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                              {(remiAmount - breakdown.openingAmt - breakdown.payAmt).toFixed(2)}
                            </td>
                          </tr>
                        );
                      }).filter(Boolean)}

                      {/* Fill empty R rows if less than 5 remi fields - Hidden as they have 0.00 amount */}

                      {/* Total Service Charges */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          Total Service Charges
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900">
                          {(
                            parseFloat(finalAmount || 0) +
                            parseFloat(combinedRegistrationCharges || 0) +
                            parseFloat(combinedCaCharges || 0) +
                            parseFloat(combinedCeCharges || 0) +
                            parseFloat(combinedApplicationFees || 0) +
                            parseFloat(combinedRemiCharges || 0)
                          ).toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={(
                              partialInvoiceBreakdown.professionalCharges.openingAmt +
                              partialInvoiceBreakdown.registrationCharges.openingAmt +
                              partialInvoiceBreakdown.caCert.openingAmt +
                              partialInvoiceBreakdown.ceCert.openingAmt +
                              partialInvoiceBreakdown.applicationFees.openingAmt +
                              partialInvoiceBreakdown.remiOne.openingAmt +
                              partialInvoiceBreakdown.remiTwo.openingAmt +
                              partialInvoiceBreakdown.remiThree.openingAmt +
                              partialInvoiceBreakdown.remiFour.openingAmt +
                              partialInvoiceBreakdown.remiFive.openingAmt
                            ).toFixed(2)}
                            readOnly
                            className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 font-semibold cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={(
                              partialInvoiceBreakdown.professionalCharges.payAmt +
                              partialInvoiceBreakdown.registrationCharges.payAmt +
                              partialInvoiceBreakdown.caCert.payAmt +
                              partialInvoiceBreakdown.ceCert.payAmt +
                              partialInvoiceBreakdown.applicationFees.payAmt +
                              partialInvoiceBreakdown.remiOne.payAmt +
                              partialInvoiceBreakdown.remiTwo.payAmt +
                              partialInvoiceBreakdown.remiThree.payAmt +
                              partialInvoiceBreakdown.remiFour.payAmt +
                              partialInvoiceBreakdown.remiFive.payAmt
                            ).toFixed(2)}
                            readOnly
                            className="w-full px-2 py-1 text-sm text-right border-0 bg-gray-50 font-semibold cursor-not-allowed"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-900 font-semibold">
                          {(
                            parseFloat(finalAmount || 0) +
                            parseFloat(combinedRegistrationCharges || 0) +
                            parseFloat(combinedCaCharges || 0) +
                            parseFloat(combinedCeCharges || 0) +
                            parseFloat(combinedApplicationFees || 0) +
                            parseFloat(combinedRemiCharges || 0) -
                            (
                              partialInvoiceBreakdown.professionalCharges.openingAmt +
                              partialInvoiceBreakdown.registrationCharges.openingAmt +
                              partialInvoiceBreakdown.caCert.openingAmt +
                              partialInvoiceBreakdown.ceCert.openingAmt +
                              partialInvoiceBreakdown.applicationFees.openingAmt +
                              partialInvoiceBreakdown.remiOne.openingAmt +
                              partialInvoiceBreakdown.remiTwo.openingAmt +
                              partialInvoiceBreakdown.remiThree.openingAmt +
                              partialInvoiceBreakdown.remiFour.openingAmt +
                              partialInvoiceBreakdown.remiFive.openingAmt
                            ) -
                            (
                              partialInvoiceBreakdown.professionalCharges.payAmt +
                              partialInvoiceBreakdown.registrationCharges.payAmt +
                              partialInvoiceBreakdown.caCert.payAmt +
                              partialInvoiceBreakdown.ceCert.payAmt +
                              partialInvoiceBreakdown.applicationFees.payAmt +
                              partialInvoiceBreakdown.remiOne.payAmt +
                              partialInvoiceBreakdown.remiTwo.payAmt +
                              partialInvoiceBreakdown.remiThree.payAmt +
                              partialInvoiceBreakdown.remiFour.payAmt +
                              partialInvoiceBreakdown.remiFive.payAmt
                            )
                          ).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Amount Summary */}
              <div className="mt-6 pt-4 border-t border-gray-300">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block mb-1">Total Amount</span>
                    <span className="text-base text-gray-900 font-medium">
                      {(
                        parseFloat(finalAmount || 0) +
                        parseFloat(combinedRegistrationCharges || 0) +
                        parseFloat(combinedCaCharges || 0) +
                        parseFloat(combinedCeCharges || 0) +
                        parseFloat(combinedApplicationFees || 0) +
                        parseFloat(combinedRemiCharges || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block mb-1">Pay Amount</span>
                    <span className="text-base text-gray-900 font-medium">
                      {(
                        partialInvoiceBreakdown.professionalCharges.payAmt +
                        partialInvoiceBreakdown.registrationCharges.payAmt +
                        partialInvoiceBreakdown.caCert.payAmt +
                        partialInvoiceBreakdown.ceCert.payAmt +
                        partialInvoiceBreakdown.applicationFees.payAmt +
                        partialInvoiceBreakdown.remiOne.payAmt +
                        partialInvoiceBreakdown.remiTwo.payAmt +
                        partialInvoiceBreakdown.remiThree.payAmt +
                        partialInvoiceBreakdown.remiFour.payAmt +
                        partialInvoiceBreakdown.remiFive.payAmt
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-700 block mb-1">Remaining</span>
                    <span className="text-base text-gray-900 font-medium">
                      {(
                        parseFloat(finalAmount || 0) +
                        parseFloat(combinedRegistrationCharges || 0) +
                        parseFloat(combinedCaCharges || 0) +
                        parseFloat(combinedCeCharges || 0) +
                        parseFloat(combinedApplicationFees || 0) +
                        parseFloat(combinedRemiCharges || 0) -
                        (
                          partialInvoiceBreakdown.professionalCharges.openingAmt +
                          partialInvoiceBreakdown.registrationCharges.openingAmt +
                          partialInvoiceBreakdown.caCert.openingAmt +
                          partialInvoiceBreakdown.ceCert.openingAmt +
                          partialInvoiceBreakdown.applicationFees.openingAmt +
                          partialInvoiceBreakdown.remiOne.openingAmt +
                          partialInvoiceBreakdown.remiTwo.openingAmt +
                          partialInvoiceBreakdown.remiThree.openingAmt +
                          partialInvoiceBreakdown.remiFour.openingAmt +
                          partialInvoiceBreakdown.remiFive.openingAmt
                        ) -
                        (
                          partialInvoiceBreakdown.professionalCharges.payAmt +
                          partialInvoiceBreakdown.registrationCharges.payAmt +
                          partialInvoiceBreakdown.caCert.payAmt +
                          partialInvoiceBreakdown.ceCert.payAmt +
                          partialInvoiceBreakdown.applicationFees.payAmt +
                          partialInvoiceBreakdown.remiOne.payAmt +
                          partialInvoiceBreakdown.remiTwo.payAmt +
                          partialInvoiceBreakdown.remiThree.payAmt +
                          partialInvoiceBreakdown.remiFour.payAmt +
                          partialInvoiceBreakdown.remiFive.payAmt
                        )
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleShowSampleInvoice}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                  >
                    Show Sample INV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Invoice Modal */}
      {showSampleInvoice && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto print:bg-white">
          {/* Action Buttons - Hidden on Print */}
          <div className="bg-white border-b border-gray-200 p-2 flex justify-between items-center print:hidden sticky top-0 z-50 shadow-sm">
            <button
              onClick={() => setShowSampleInvoice(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Back
            </button>
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Sample Invoice
              </h1>
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isPrintingRef.current) {
                    isPrintingRef.current = true;
                    window.print();
                    // Reset after a short delay to allow print dialog to open
                    setTimeout(() => {
                      isPrintingRef.current = false;
                    }, 1000);
                  }
                }}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
              >
                Print Invoice
              </button>
            </div>
          </div>

          {/* Invoice Container - Paper-like appearance */}
          <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-full">
            {(() => {
              // Use partial invoice calculations if Pay Amt values are set, otherwise use regular calculations
              const calculations = hasPayAmtValues ? partialInvoiceCalculations : invoiceCalculations;
              
              // Get remi field descriptions from job service charges for Pay Amt display
              const getRemiDescription = (remiKey) => {
                if (selectedJobIds.length === 0) return "";
                const firstJobId = selectedJobIds[0];
                const jobServiceCharge = jobServiceChargesMap[firstJobId];
                if (!jobServiceCharge) return "";
                
                const remiDescMap = {
                  remiOne: "remi_one_desc",
                  remiTwo: "remi_two_desc",
                  remiThree: "remi_three_desc",
                  remiFour: "remi_four_desc",
                  remiFive: "remi_five_desc",
                };
                
                return jobServiceCharge[remiDescMap[remiKey]] || "";
              };
              
              return (
            <div
              className="bg-white shadow-2xl print:shadow-none p-8 print:p-8 print:pt-4"
              style={{ minHeight: "29.7cm" }}
            >
              {/* Top Section: Company Info (Left) and Invoice Details (Right) */}
              <div className="grid grid-cols-12 gap-4 mb-4">
                {/* Left: Company Info */}
                <div className="col-span-7">
                  <div className="flex items-start mb-1">
                    <div className="w-20 h-20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {!logoError ? (
                        <Image
                          src={logoImage}
                          alt="Lucrative Logo"
                          width={100}
                          height={100}
                          className="w-full h-full object-contain"
                          onError={() => setLogoError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-5 h-5"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 mt-4">
                      <div className="font-bold text-base mb-1">
                        {sessionAccount?.account_name || "NA"}
                      </div>
                    </div>
                  </div>
                  {/* Billed To Section */}
                  <div className="mb-4">
                    <div className="font-semibold text-xs mb-1">
                      Billed To :{" "}
                      {selectedJobIds.length > 0 &&
                      jobServiceChargesMap[selectedJobIds[0]]
                        ? jobServiceChargesMap[selectedJobIds[0]].client_name ||
                          "NA"
                        : "Client Name"}
                    </div>
                    {selectedJobIds.length > 0 &&
                      jobServiceChargesMap[selectedJobIds[0]] &&
                      jobServiceChargesMap[selectedJobIds[0]]
                        .client_address && (
                        <div className="text-xs mb-1 ms-5">
                          {
                            jobServiceChargesMap[selectedJobIds[0]]
                              .client_address
                          }
                        </div>
                      )}
                  </div>
                  <div className="font-semibold text-xs mb-1">
                    GSTN No :{" "}
                    <span>
                      {" "}
                      {selectedJobIds.length > 0 &&
                      jobServiceChargesMap[selectedJobIds[0]]
                        ? jobServiceChargesMap[selectedJobIds[0]].gst_no || "NA"
                        : "GSTN No"}
                    </span>
                  </div>
                  <div className="font-semibold text-xs mb-1">
                    Kind Attn :{" "}
                    <span>
                      {" "}
                      {selectedJobIds.length > 0 &&
                      jobServiceChargesMap[selectedJobIds[0]]
                        ? jobServiceChargesMap[selectedJobIds[0]]
                            .concern_person || "NA"
                        : "Concern Person"}
                    </span>
                  </div>
                  <div className="text-xs mb-1">
                    <span className="font-semibold">Emails : </span>
                    <span>
                      {selectedJobIds.length > 0 &&
                      jobServiceChargesMap[selectedJobIds[0]]
                        ? jobServiceChargesMap[selectedJobIds[0]]
                            .concern_email_id || "NA"
                        : "Concern Email ID"}
                    </span>
                  </div>
                </div>
                <div className="col-span-1"></div>
                {/* Right: Invoice Details Box */}
                <div className="col-span-4">
                  <div className="p-3">
                    <div className="font-bold text-base mb-1 text-start">
                      {billingType === "Reimbursement" ? "Reimbursement/Debit Note" : "GST Invoice"}
                    </div>
                    <div className="text-xs grid grid-cols-12">
                      <div className="col-span-5">
                        <div>Invoice No. :</div>
                        <div>Date :</div>
                        <div>Job No :</div>
                        <div>Customer ID :</div>
                        <div>PO No :</div>
                        <div>IRN No. :</div>
                      </div>
                      <div className="col-span-7">
                        <div>{sampleInvoiceData.invoiceNo || "NA"}</div>
                        <div>{sampleInvoiceData.date || "NA"}</div>
                        <div>
                          {selectedJobIds.length > 1
                            ? "As Per Annexure"
                            : sampleInvoiceData.jobNo || "NA"}
                        </div>
                        <div>{sampleInvoiceData.customerId || "NA"}</div>
                        <div>{sampleInvoiceData.poNo || "NA"}</div>
                        <div className="break-all">
                          {sampleInvoiceData.irnNo || "NA"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Service Charges Section */}
              <div className="mb-4">
                <div className="bg-black text-white px-3 mb-2 py-2 flex justify-between items-center">
                  <span className="font-bold text-xs">
                    {billingType === "Reimbursement" ? "PARTICULARS" : "PROFESSIONAL SERVICE CHARGES REGARDING"}
                  </span>
                  <span className="font-bold text-xs">AMOUNT</span>
                </div>
                <div className="p-0">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-9 mb-2">
                      <div className="font-semibold text-xs mb-1">
                        <span className="font-bold">DETAILS:</span>{" "}
                        {sampleInvoiceData.serviceDetails || "NA"}
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-1 text-right md:text-right mt-2 md:mt-0 md:flex md:items-start md:justify-end text-xs">
                      ₹
                    </div>
                    <div className="col-span-12 md:col-span-2 text-right md:text-right mt-2 md:mt-0 md:flex md:items-start md:justify-end text-xs">
                      {" "}
                      {billingType === "Reimbursement" && calculations
                        ? (
                            parseFloat(calculations.applicationFees || 0) +
                            parseFloat(calculations.remiCharges || 0)
                          ).toFixed(2)
                        : parseFloat(
                            sampleInvoiceData.finalAmount ||
                              sampleInvoiceData.amount ||
                              0
                          ).toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-10 mb-2">
                      {billingFieldNames.length > 0 && firstSelectedJob ? (
                        <div className="space-y-1">
                          {billingFieldNames.map((fieldName, index) => {
                            // Get field value from JobFieldValue table
                            const fieldValue =
                              selectedJobIds.length > 0
                                ? getFieldValueFromJobFieldValue(
                                    selectedJobIds[0],
                                    fieldName,
                                    jobFieldValuesMap
                                  ) || "NA"
                                : "NA";
                            return (
                              <div
                                key={index}
                                className="grid grid-cols-10 gap-4 text-xs"
                              >
                                <div className="col-span-6">
                                  <span className="text-xs">{fieldName}</span>
                                </div>
                                <div className="col-span-4 text-start">
                                  <span>
                                    {selectedJobIds.length > 1
                                      ? "As Per Annexure"
                                      : fieldValue}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : billingFieldNames.length > 0 ? (
                        <div className="space-y-1">
                          {billingFieldNames.map((fieldName, index) => (
                            <div key={index} className="font-semibold text-xs">
                              {fieldName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="font-semibold text-xs mb-1"></div>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-2"></div>
                  </div>

                  <div className="p-0 mt-4 text-xs">
                    <span className="font-semibold">CHARGES AS UNDER:</span>{" "}
                    {/* {sampleInvoiceData.chargesAsUnder || "NA"} */}
                    {selectedJobIds.length > 0 &&
                      jobServiceChargesMap[selectedJobIds[0]] &&
                      jobServiceChargesMap[selectedJobIds[0]]
                        .invoice_description && (
                        <div className="text-xs mb-1">
                          {
                            jobServiceChargesMap[selectedJobIds[0]]
                              .invoice_description
                          }
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Note Section */}
              <div className="p-3 mb-4 ps-0 border-t border-b border-black">
                <div className="text-xs">
                  <span className="font-semibold">NOTE :</span>{" "}
                  {sampleInvoiceData?.note || ""}
                </div>
              </div>

              {/* Bottom Section: Bank Details (Left) and Charges/Taxes (Right) */}
              <div className="grid grid-cols-2 gap-4 mb-1">
                {/* Left: Bank Details */}
                <div className="">
                  <div className="p-0">
                    <div className="font-bold text-xs pb-1">BANK Details</div>
                    <div className="text-xs">
                      <div> {sessionAccount?.bank_name || "NA"}</div>
                      <div>
                        <span className="text-xs">Branch - </span>{" "}
                        {sessionAccount?.bank_address || "NA"}
                      </div>
                      <div>
                        <span className="text-xs">A/C No.</span>{" "}
                        {sessionAccount?.account_no || "NA"}
                      </div>
                      <div>
                        <span className="text-xs">IFSC Code - </span>{" "}
                        {sessionAccount?.ifsc_no || "NA"}
                      </div>
                    </div>
                  </div>
                  <div className="p-0 pt-5">
                    <div className="text-xs">
                      <div>
                        <span className="font-semibold">SAC No. :</span>{" "}
                        {sampleInvoiceData.sacNo || "NA"}
                      </div>
                      <div>
                        <span className="font-semibold">GST Detail :</span>{" "}
                        {sessionAccount?.gst_no || "NA"}
                      </div>
                      <div>
                        <span className="font-semibold">PAN No. :</span>{" "}
                        {sessionAccount?.pan_no || "NA"}
                      </div>
                      <div>
                        <span className="font-semibold">
                          MSME Registration No. :
                        </span>{" "}
                        {sessionAccount?.msme_details || "NA"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Charges and Taxes */}
                <div className="p-1">
                  <div className="text-xs grid grid-cols-12">
                    {billingType !== "Reimbursement" && (
                      <>
                        {parseFloat(sampleInvoiceData.reward_amount || 0) >
                          0 && (
                          <>
                            <div className="col-span-9">Reward </div>
                            <div className="col-span-1">₹</div>
                            <div className="col-span-2 text-right">
                              {parseFloat(
                                sampleInvoiceData.reward_amount || 0
                              ).toFixed(2)}
                            </div>
                          </>
                        )}
                        {parseFloat(sampleInvoiceData.discount_amount || 0) >
                          0 && (
                          <>
                            <div className="col-span-9">Discount </div>
                            <div className="col-span-1">₹</div>
                            <div className="col-span-2 text-right">
                              {parseFloat(
                                sampleInvoiceData.discount_amount || 0
                              ).toFixed(2)}
                            </div>
                          </>
                        )}
                        {parseFloat(sampleInvoiceData.registrationCharges || 0) >
                          0 && (
                          <>
                            <div className="col-span-9">
                              Registration/Other Charges{" "}
                            </div>
                            <div className="col-span-1">₹</div>
                            <div className="col-span-2 text-right">
                              {parseFloat(
                                sampleInvoiceData.registrationCharges || 0
                              ).toFixed(2)}
                            </div>
                          </>
                        )}
                        {parseFloat(sampleInvoiceData.caCharges || 0) > 0 && (
                          <>
                            <div className="col-span-9">
                              Arrangement of CA CERT. ({combinedCaCertCount} Nos)
                            </div>
                            <div className="col-span-1">₹</div>
                            <div className="col-span-2 text-right">
                              {parseFloat(sampleInvoiceData.caCharges || 0).toFixed(
                                2
                              )}
                            </div>
                          </>
                        )}
                        {parseFloat(sampleInvoiceData.ceCharges || 0) > 0 && (
                          <>
                            <div className="col-span-9">
                              Arrangement of CE CERT. ({combinedCeCertCount} Nos)
                            </div>
                            <div className="col-span-1">₹</div>
                            <div className="col-span-2 text-right">
                              {parseFloat(sampleInvoiceData.ceCharges || 0).toFixed(
                                2
                              )}
                            </div>
                          </>
                        )}
                        <div className="col-span-9 font-semibold">Subtotal </div>
                        <div className="col-span-1 font-semibold">₹</div>
                        <div className="col-span-2 text-right font-semibold">
                          {calculateServiceSubtotal().toFixed(2)}
                        </div>
                        {calculations && (
                          <>
                            {/* {calculations.cgstAmount > 0 && ( */}
                              <>
                                <div className="col-span-9">
                                  C GST: {calculations.cgstRate}%{" "}
                                </div>
                                <div className="col-span-1">₹</div>
                                <div className="col-span-2 text-right">
                                  {calculations.cgstAmount.toFixed(2)}
                                </div>
                              </>
                            {/* )} */}
                            {/* {calculations.sgstAmount > 0 && ( */}
                              <>
                                <div className="col-span-9">
                                  S GST: {calculations.sgstRate}%{" "}
                                </div>
                                <div className="col-span-1">₹</div>
                                <div className="col-span-2 text-right">
                                  {calculations.sgstAmount.toFixed(2)}
                                </div>
                              </>
                            {/* )} */}
                            {/* {calculations.igstAmount > 0 && ( */}
                              <>
                                <div className="col-span-9">
                                  I GST: {calculations.igstRate}%{" "}
                                </div>
                                <div className="col-span-1">₹</div>
                                <div className="col-span-2 text-right">
                                  {calculations.igstAmount.toFixed(2)}
                                </div>
                              </>
                            {/* )} */}
                          </>
                        )}
                      </>
                    )}
                    {calculations && (
                      <>
                        {billingType !== "Service" && (
                          <>
                            <div className="col-span-12 pt-1 mt-1">
                              <div className="font-semibold">Reimbursements</div>
                            </div>
                            {parseFloat(sampleInvoiceData.applicationFees || 0) > 0 && (
                              <>
                                <div className="col-span-9">Application Fees </div>
                                <div className="col-span-1">₹</div>
                                <div className="col-span-2 text-right">
                                  {calculations.applicationFees.toFixed(2)}
                                </div>
                              </>
                            )}
                            {/* Display remi fields dynamically - show remi fields with remi_charges > 0, matching view page display */}
                            {/* 
                              remiFields are fetched from 'job_service_charges' database table according to selected job_id
                              The data is fetched via API endpoint /jobs/:id/service-charges which queries job_service_charges table filtered by job_id
                              Each remiField contains remi_desc (description) and remi_charges from the job_service_charges table
                              Display remi_desc with remi_charges according to remi_charges values
                            */}
                            {remiFields.length > 0 &&
                              remiFields
                                .filter((remiField) => remiField.charges > 0)
                                .map((remiField, index) => (
                                  <Fragment key={index}>
                                    <div className="col-span-9">{remiField.description}</div>
                                    <div className="col-span-1">₹</div>
                                    <div className="col-span-2 text-right">
                                      {remiField.charges.toFixed(2)}
                                    </div>
                                  </Fragment>
                                ))}
                          </>
                        )}
                        
                        <div className="col-span-12 border-t border-black"></div>
                        <div className="col-span-7 font-bold text-base mt-2">
                          TOTAL{" "}
                        </div>
                        <div className="col-span-1 font-bold text-base mt-2 text-right">
                          ₹
                        </div>
                        <div className="col-span-4 font-bold text-base mt-2 text-right">
                          {(() => {
                            if (billingType === "Reimbursement") {
                              // For Reimbursement: Application Fees + Remi Charges + (negative discount if any)
                              return (
                                parseFloat(calculations.applicationFees || 0) +
                                parseFloat(calculations.remiCharges || 0)
                              ).toFixed(2);
                            } else if (billingType === "Service") {
                              // For Service: Only Service section fields (Subtotal + GST)
                              // Calculate subtotal from displayed Service fields
                              const serviceSubtotal = calculateServiceSubtotal();
                              // Add GST amounts
                              const gstTotal = (calculations?.cgstAmount || 0) + (calculations?.sgstAmount || 0) + (calculations?.igstAmount || 0);
                              return (serviceSubtotal + gstTotal).toFixed(2);
                            } else {
                              // For Service & Reimbursement: Calculate total from displayed values
                              // Calculate displayed subtotal (same as shown on screen)
                              const displayedSubtotal = calculateServiceSubtotal();
                              
                              // Add GST amounts (as displayed)
                              const gstTotal = (calculations?.cgstAmount || 0) + (calculations?.sgstAmount || 0) + (calculations?.igstAmount || 0);
                              
                              // Add Application Fees (if displayed)
                              const displayedApplicationFees = parseFloat(sampleInvoiceData.applicationFees || 0) > 0 
                                ? (calculations?.applicationFees || 0) 
                                : 0;
                              
                              // Calculate displayed remi charges (only include remi fields that are actually shown)
                              let displayedRemiCharges = 0;
                              if (remiFields.length > 0) {
                                displayedRemiCharges = remiFields
                                  .filter((remiField) => remiField.charges > 0)
                                  .reduce((sum, remiField) => {
                                    return sum + parseFloat(remiField.charges || 0);
                                  }, 0);
                              }
                              
                              // Calculate total from displayed values
                              const total = displayedSubtotal + gstTotal + displayedApplicationFees + displayedRemiCharges;
                              
                              return total.toFixed(2);
                            }
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Amount in Words */}
              {calculations && (
                <div className="p-3 mb-4 ps-0 border-t border-b border-black">
                  <div className="text-xs">
                    <span className="font-semibold">Rs. </span>{" "}
                    {(() => {
                      let totalAmount = 0;
                      
                      if (billingType === "Reimbursement") {
                        // For Reimbursement: Application Fees + Remi Charges + (negative discount if any)
                        totalAmount =
                          parseFloat(calculations.applicationFees || 0) +
                          parseFloat(calculations.remiCharges || 0);
                      } else if (billingType === "Service") {
                        // For Service: Only Service section fields (Subtotal + GST)
                        // Calculate subtotal from displayed Service fields
                        const serviceSubtotal = calculateServiceSubtotal();
                        // Add GST amounts
                        const gstTotal = (calculations?.cgstAmount || 0) + (calculations?.sgstAmount || 0) + (calculations?.igstAmount || 0);
                        totalAmount = serviceSubtotal + gstTotal;
                      } else {
                        // For Service & Reimbursement: Calculate total from displayed values
                        // Calculate displayed subtotal (same as shown on screen)
                        const displayedSubtotal = calculateServiceSubtotal();
                        
                        // Add GST amounts (as displayed)
                        const gstTotal = (calculations?.cgstAmount || 0) + (calculations?.sgstAmount || 0) + (calculations?.igstAmount || 0);
                        
                        // Add Application Fees (if displayed)
                        const displayedApplicationFees = parseFloat(sampleInvoiceData.applicationFees || 0) > 0 
                          ? (calculations?.applicationFees || 0) 
                          : 0;
                        
                        // Calculate displayed remi charges (only include remi fields that are actually shown)
                        let displayedRemiCharges = 0;
                        if (remiFields.length > 0) {
                          displayedRemiCharges = remiFields
                            .filter((remiField) => remiField.charges > 0)
                            .reduce((sum, remiField) => {
                              return sum + parseFloat(remiField.charges || 0);
                            }, 0);
                        }
                        
                        // Calculate total from displayed values
                        totalAmount = displayedSubtotal + gstTotal + displayedApplicationFees + displayedRemiCharges;
                      }
                      
                      return numberToWords(totalAmount);
                    })()}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-3 mb-2">
                <div className="text-center mb-1">
                  <span className="font-semibold text-xs">
                    Thank You For Business.
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-semibold text-sm">
                  For {sessionAccount?.account_name || "NA"}
                </span>
              </div>
              <div className="px-3 mb-2">
                <div className="text-center">
                  <span className="text-xs">
                    Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK
                    Market, Bibwewadi, Pune, Ph:+91 20 3511 3202, Website:
                    www.lucrative.co.in As Per Rule 46(q) of GST act 2017 said
                    Invoice is digitally signed
                  </span>
                </div>
              </div>
            </div>
            );
            })()}
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
                overflow: hidden !important;
                font-family: "Times New Roman", Times, serif !important;
              }
              html {
                overflow: hidden !important;
              }
              * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-family: "Times New Roman", Times, serif !important;
              }
              *::-webkit-scrollbar {
                display: none !important;
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
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
