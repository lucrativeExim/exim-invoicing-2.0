"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/services/api";
import { useAccount } from "@/context/AccountContext";
import logoImage from "@/assets/images/invoice-logo.png";
import Modal from "@/components/Modal";
import { Button } from "@/components/formComponents";
import AnnexureTable from "@/components/AnnexureTable";
import { calculateServiceSubtotal as calculateServiceSubtotalUtil } from "@/utils/invoiceUtils";

// Helper function to convert field name to database column name
const getFieldKey = (fieldName) => {
  return fieldName.toLowerCase().replace(/\//g, '_').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

// Helper function to get field value from JobFieldValue table
// Supports multiple field name variations (case-insensitive, with/without underscores/spaces)
const getFieldValueFromJobFieldValue = (jobId, fieldName, jobFieldValuesMap) => {
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
    fieldName.replace(/_/g, ' '),
    fieldName.replace(/\s+/g, '_'),
    fieldName.replace(/_/g, '').toLowerCase(),
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

// Helper function to calculate professional charges from job service charge
const calculateProfessionalCharges = (jobServiceCharge, jobId, jobFieldValuesMap) => {
  if (!jobServiceCharge) return 0;

  const min = parseFloat(jobServiceCharge.min || 0);
  const max = parseFloat(jobServiceCharge.max || 0);
  const inPercentage = parseFloat(jobServiceCharge.in_percentage || 0);
  const fixed = parseFloat(jobServiceCharge.fixed || 0);
  const perShb = parseFloat(jobServiceCharge.per_shb || 0);

  // Get per_shb value from JobFieldValue
  const perShbValue = getFieldValueFromJobFieldValue(jobId, 'per_shb', jobFieldValuesMap) ||
                      getFieldValueFromJobFieldValue(jobId, 'Per SHB', jobFieldValuesMap) || '0';
  const perShbNum = parseFloat(perShbValue) || 0;

  let professionalCharges = 0;

  // Calculate based on in_percentage if available
  if (inPercentage > 0 && perShbNum > 0) {
    professionalCharges = (perShbNum * inPercentage) / 100;
  } else if (fixed > 0) {
    professionalCharges = fixed;
  } else if (perShb > 0 && perShbNum > 0) {
    professionalCharges = perShb * perShbNum;
  }

  // Apply min/max constraints
  if (min > 0 && professionalCharges < min) {
    professionalCharges = min;
  }
  if (max > 0 && professionalCharges > max) {
    professionalCharges = max;
  }

  return professionalCharges;
};

// Helper function to calculate charges from job data for Full Invoice + Draft
const calculateChargesFromJobs = (invoiceSelectedJobs, jobServiceChargesMap, jobFieldValuesMap) => {
  if (!invoiceSelectedJobs || invoiceSelectedJobs.length === 0) {
    return {
      professionalCharges: 0,
      registrationCharges: 0,
      caCharges: 0,
      ceCharges: 0,
      applicationFees: 0,
      caCertCount: 0,
      ceCertCount: 0,
    };
  }

  let totalProfessionalCharges = 0;
  let totalRegistrationCharges = 0;
  let totalCaCharges = 0;
  let totalCeCharges = 0;
  let totalApplicationFees = 0;
  let totalCaCertCount = 0;
  let totalCeCertCount = 0;

  invoiceSelectedJobs.forEach((invoiceJob) => {
    const job = invoiceJob.job;
    const jobId = job?.id;
    if (!jobId) return;

    const jobServiceCharge = jobServiceChargesMap[jobId];

    // Calculate professional charges
    if (jobServiceCharge) {
      totalProfessionalCharges += calculateProfessionalCharges(jobServiceCharge, jobId, jobFieldValuesMap);
      totalRegistrationCharges += parseFloat(jobServiceCharge.registration_other_charges || 0);

      // Calculate CA charges: no_of_cac * ca_charges
      const noOfCacValue = getFieldValueFromJobFieldValue(jobId, "no_of_cac", jobFieldValuesMap) ||
                           getFieldValueFromJobFieldValue(jobId, "No of CAC", jobFieldValuesMap) ||
                           getFieldValueFromJobFieldValue(jobId, "noofcac", jobFieldValuesMap) || '0';
      const noOfCac = parseFloat(noOfCacValue) || 0;
      const caCharges = parseFloat(jobServiceCharge.ca_charges || 0);
      totalCaCharges += noOfCac * caCharges;
      totalCaCertCount += parseInt(noOfCacValue) || 0;

      // Calculate CE charges: no_of_cec * ce_charges
      const noOfCecValue = getFieldValueFromJobFieldValue(jobId, "no_of_cec", jobFieldValuesMap) ||
                           getFieldValueFromJobFieldValue(jobId, "No of CEC", jobFieldValuesMap) ||
                           getFieldValueFromJobFieldValue(jobId, "noofcec", jobFieldValuesMap) || '0';
      const noOfCec = parseFloat(noOfCecValue) || 0;
      const ceCharges = parseFloat(jobServiceCharge.ce_charges || 0);
      totalCeCharges += noOfCec * ceCharges;
      totalCeCertCount += parseInt(noOfCecValue) || 0;
    }

    // Calculate application fees
    const applFeeValue = getFieldValueFromJobFieldValue(jobId, "appl_fee_duty_paid", jobFieldValuesMap) ||
                         getFieldValueFromJobFieldValue(jobId, "Appl Fees Paid", jobFieldValuesMap) ||
                         getFieldValueFromJobFieldValue(jobId, "appl_fees_paid", jobFieldValuesMap) ||
                         getFieldValueFromJobFieldValue(jobId, "application_fees", jobFieldValuesMap) || '0';
    totalApplicationFees += parseFloat(applFeeValue) || 0;
  });

  return {
    professionalCharges: totalProfessionalCharges,
    registrationCharges: totalRegistrationCharges,
    caCharges: totalCaCharges,
    ceCharges: totalCeCharges,
    applicationFees: totalApplicationFees,
    caCertCount: totalCaCertCount,
    ceCertCount: totalCeCertCount,
  };
};

// Helper function to convert number to words (Indian currency format)
const numberToWords = (num) => {
  if (num === 0) return "Zero";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
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

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id;
  const { selectedAccount: sessionAccount } = useAccount();
  
  const [invoice, setInvoice] = useState(null);
  const [account, setAccount] = useState(null);
  const [billingFieldNames, setBillingFieldNames] = useState([]);
  const [jobServiceChargesMap, setJobServiceChargesMap] = useState({});
  const [jobFieldValuesMap, setJobFieldValuesMap] = useState({}); // Map of job_id -> { field_name: field_value }
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

  // Lock body scroll when invoice is displayed (Draft/Proforma Invoice)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) return;

      try {
        setLoading(true);
        const response = await api.get(`/invoices/${invoiceId}`);
        const invoiceData = response.data;
        setInvoice(invoiceData);

        // Check invoice type and stage status
        const invoiceType = invoiceData.invoice_type;
        const invoiceStageStatus = invoiceData.invoice_stage_status;
        const isFullInvoiceDraft = 
          (invoiceType === "full_invoice" || invoiceType === "Full_Invoice") && 
          invoiceStageStatus === "Draft";
        const isPartialInvoiceDraft = 
          (invoiceType === "partial_invoice" || invoiceType === "Partial_Invoice") && 
          invoiceStageStatus === "Draft";

        // For Full_Invoice + Draft: Fetch data from job, job_field_values, job_service_charges
        // For Partial_Invoice + Draft: Use invoice table data directly
        if (isFullInvoiceDraft) {
          // Build jobFieldValuesMap from invoice data
          const fieldValuesMap = {};
          if (invoiceData.invoiceSelectedJobs && invoiceData.invoiceSelectedJobs.length > 0) {
            invoiceData.invoiceSelectedJobs.forEach((invoiceJob) => {
              const job = invoiceJob.job;
              if (job && job.jobFieldValues && Array.isArray(job.jobFieldValues)) {
                fieldValuesMap[job.id] = {};
                job.jobFieldValues.forEach((fv) => {
                  fieldValuesMap[job.id][fv.field_name] = fv.field_value;
                });
              }
            });
          }
          setJobFieldValuesMap(fieldValuesMap);

          // Fetch job service charges for each selected job
          if (invoiceData.invoiceSelectedJobs && invoiceData.invoiceSelectedJobs.length > 0) {
            const chargesMap = {};
            await Promise.all(
              invoiceData.invoiceSelectedJobs.map(async (invoiceJob) => {
                const jobId = invoiceJob.job?.id;
                if (jobId) {
                  try {
                    const chargesResponse = await api.get(`/jobs/${jobId}/service-charges`);
                    const charges = chargesResponse.data || [];
                    const activeCharge = charges.find((charge) => charge.status === "Active") || charges[0] || null;
                    if (activeCharge) {
                      chargesMap[jobId] = activeCharge;
                    }
                  } catch (error) {
                    console.error(`Error fetching service charges for job ${jobId}:`, error);
                  }
                }
              })
            );
            setJobServiceChargesMap(chargesMap);
          }
        } else if (isPartialInvoiceDraft) {
          // For Partial_Invoice + Draft: Use invoice table data directly
          // No need to fetch job service charges or build jobFieldValuesMap
          // The invoice table already contains all the necessary data
          setJobFieldValuesMap({});
          setJobServiceChargesMap({});
        } else {
          // For other cases (Proforma, etc.), use existing logic
          // Build jobFieldValuesMap from invoice data
          const fieldValuesMap = {};
          if (invoiceData.invoiceSelectedJobs && invoiceData.invoiceSelectedJobs.length > 0) {
            invoiceData.invoiceSelectedJobs.forEach((invoiceJob) => {
              const job = invoiceJob.job;
              if (job && job.jobFieldValues && Array.isArray(job.jobFieldValues)) {
                fieldValuesMap[job.id] = {};
                job.jobFieldValues.forEach((fv) => {
                  fieldValuesMap[job.id][fv.field_name] = fv.field_value;
                });
              }
            });
          }
          setJobFieldValuesMap(fieldValuesMap);

          // Fetch job service charges for each selected job
          if (invoiceData.invoiceSelectedJobs && invoiceData.invoiceSelectedJobs.length > 0) {
            const chargesMap = {};
            await Promise.all(
              invoiceData.invoiceSelectedJobs.map(async (invoiceJob) => {
                const jobId = invoiceJob.job?.id;
                if (jobId) {
                  try {
                    const chargesResponse = await api.get(`/jobs/${jobId}/service-charges`);
                    const charges = chargesResponse.data || [];
                    const activeCharge = charges.find((charge) => charge.status === "Active") || charges[0] || null;
                    if (activeCharge) {
                      chargesMap[jobId] = activeCharge;
                    }
                  } catch (error) {
                    console.error(`Error fetching service charges for job ${jobId}:`, error);
                  }
                }
              })
            );
            setJobServiceChargesMap(chargesMap);
          }
        }

        // Fetch account if we have account_id from invoice or from first job
        let accountId = null;
        if (invoiceData.invoiceSelectedJobs && invoiceData.invoiceSelectedJobs.length > 0) {
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

        // Fetch billing field names from job register
        if (invoiceData.job_register_id) {
          try {
            console.log(`[fetchInvoiceData] Fetching fields for job register ID: ${invoiceData.job_register_id}`);
            const fieldsResponse = await api.get(
              `/job-register-fields/job-register/${invoiceData.job_register_id}/active`
            );
            const fieldsData = fieldsResponse.data;
            if (fieldsData && fieldsData.form_fields_json) {
              let fields = fieldsData.form_fields_json;
              if (typeof fields === "string") {
                fields = JSON.parse(fields);
              }
              const billingFields = Array.isArray(fields)
                ? fields
                    .filter((field) => field.billing === true)
                    .map((field) => field.name)
                : [];
              setBillingFieldNames(billingFields);
            }
          } catch (error) {
            console.error("Error fetching billing field names:", error);
            console.error("Error details:", {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              url: error.config?.url,
              job_register_id: invoiceData.job_register_id
            });
            
            // If 404, it means no active field exists - this is acceptable
            if (error.response?.status === 404) {
              console.log(`No active job register field found for job register ID: ${invoiceData.job_register_id}`);
            }
          }
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

  // Get first selected job for displaying billing field values
  const firstSelectedJob = useMemo(() => {
    if (invoice && invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      return invoice.invoiceSelectedJobs[0].job || null;
    }
    return null;
  }, [invoice]);

  // Check if this is Full_Invoice + Draft (calculate from job/client data, not invoice table)
  const isFullInvoiceDraft = useMemo(() => {
    if (!invoice) return false;
    const invoiceType = invoice.invoice_type;
    const invoiceStageStatus = invoice.invoice_stage_status;
    return (
      (invoiceType === "full_invoice" || invoiceType === "Full_Invoice") && 
      invoiceStageStatus === "Draft"
    );
  }, [invoice]);

  // Check if this is Partial_Invoice + Draft (use invoice table data directly)
  const isPartialInvoiceDraft = useMemo(() => {
    if (!invoice) return false;
    const invoiceType = invoice.invoice_type;
    const invoiceStageStatus = invoice.invoice_stage_status;
    return (
      (invoiceType === "partial_invoice" || invoiceType === "Partial_Invoice") && 
      invoiceStageStatus === "Draft"
    );
  }, [invoice]);

  // Get remi fields - charges come from API response (invoice table), descriptions from job service charges
  const remiFields = useMemo(() => {
    if (!invoice) return [];
    
    // Get charges from API response (invoice table)
    const remiFieldsArray = [];
    const remiFieldsConfig = [
      { desc: 'remi_one_desc', charges: 'remi_one_charges' },
      { desc: 'remi_two_desc', charges: 'remi_two_charges' },
      { desc: 'remi_three_desc', charges: 'remi_three_charges' },
      { desc: 'remi_four_desc', charges: 'remi_four_charges' },
      { desc: 'remi_five_desc', charges: 'remi_five_charges' },
    ];
    
    // Get job service charge for description mapping
    let jobServiceCharge = null;
    if (invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      const firstJobId = invoice.invoiceSelectedJobs[0].job?.id;
      if (firstJobId) {
        jobServiceCharge = jobServiceChargesMap[firstJobId];
      }
    }
    
    remiFieldsConfig.forEach((field) => {
      // Get charges from API response (invoice table) - these come as strings
      const chargesValue = invoice[field.charges];
      const charges = parseFloat(chargesValue || 0);
      
      // Only include fields where charges > 0
      if (charges > 0) {
        // Get description from job service charges, fallback to generic description
        let description = null;
        if (jobServiceCharge && jobServiceCharge[field.desc] && jobServiceCharge[field.desc].trim() !== '') {
          description = jobServiceCharge[field.desc].trim();
        } else {
          // Use generic descriptions as fallback
          const descriptions = [
            'Reimbursement One',
            'Reimbursement Two',
            'Reimbursement Three',
            'Reimbursement Four',
            'Reimbursement Five',
          ];
          const index = remiFieldsConfig.indexOf(field);
          description = descriptions[index] || `Reimbursement ${index + 1}`;
        }
        
        remiFieldsArray.push({
          description: description,
          charges: charges,
        });
      }
    });
    
    return remiFieldsArray;
  }, [invoice, jobServiceChargesMap]);

  // Get GST rates from job register
  const gstRates = useMemo(() => {
    if (!invoice || !invoice.jobRegister || !invoice.jobRegister.gstRate) {
      return { cgstRate: 0, sgstRate: 0, igstRate: 0 };
    }
    return {
      cgstRate: parseFloat(invoice.jobRegister.gstRate.cgst || 0),
      sgstRate: parseFloat(invoice.jobRegister.gstRate.sgst || 0),
      igstRate: parseFloat(invoice.jobRegister.gstRate.igst || 0),
    };
  }, [invoice]);

  // Get GST type from first job's service charge (for Full_Invoice) or from invoice (for Partial_Invoice)
  const gstType = useMemo(() => {
    if (!invoice) return null;
    
    // For Partial_Invoice + Draft, we might need to get GST type from invoice or job service charges
    // For now, try to get from job service charges if available, otherwise return null
    if (invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      const firstJobId = invoice.invoiceSelectedJobs[0].job?.id;
      if (firstJobId && jobServiceChargesMap[firstJobId]) {
        return jobServiceChargesMap[firstJobId]?.gst_type || null;
      }
    }
    return null;
  }, [invoice, jobServiceChargesMap]);

  // Calculate CA CERT count from JobFieldValue table (for Full_Invoice) or from invoice table (for Partial_Invoice)
  const caCertCount = useMemo(() => {
    if (!invoice) return 0;
    
    // For Full_Invoice + Draft, calculate from JobFieldValue table (not invoice table)
    if (isFullInvoiceDraft) {
      if (invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
        // Sum up CA CERT count from JobFieldValue table for all selected jobs
        // Try multiple field name variations: "no_of_cac", "No of CAC", "noofcac", etc.
        return invoice.invoiceSelectedJobs.reduce((total, invoiceJob) => {
          const jobId = invoiceJob.job?.id;
          if (!jobId) return total;
          const fieldValue = getFieldValueFromJobFieldValue(jobId, "no_of_cac", jobFieldValuesMap) ||
                            getFieldValueFromJobFieldValue(jobId, "No of CAC", jobFieldValuesMap) ||
                            getFieldValueFromJobFieldValue(jobId, "noofcac", jobFieldValuesMap);
          return total + (parseInt(fieldValue) || 0);
        }, 0);
      }
      return 0;
    }
    
    // For Partial_Invoice + Draft, use invoice table data directly
    if (isPartialInvoiceDraft) {
      return parseInt(invoice.ca_cert_count || 0);
    }
    
    // For Proforma, calculate from JobFieldValue table
    if (invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      return invoice.invoiceSelectedJobs.reduce((total, invoiceJob) => {
        const jobId = invoiceJob.job?.id;
        if (!jobId) return total;
        const fieldValue = getFieldValueFromJobFieldValue(jobId, "no_of_cac", jobFieldValuesMap) ||
                          getFieldValueFromJobFieldValue(jobId, "No of CAC", jobFieldValuesMap) ||
                          getFieldValueFromJobFieldValue(jobId, "noofcac", jobFieldValuesMap);
        return total + (parseInt(fieldValue) || 0);
      }, 0);
    }
    return 0;
  }, [invoice, jobFieldValuesMap, isFullInvoiceDraft, isPartialInvoiceDraft]);

  // Calculate CE CERT count from JobFieldValue table (for Full_Invoice) or from invoice table (for Partial_Invoice)
  const ceCertCount = useMemo(() => {
    if (!invoice) return 0;
    
    // For Full_Invoice + Draft, calculate from JobFieldValue table (not invoice table)
    if (isFullInvoiceDraft) {
      if (invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
        // Sum up CE CERT count from JobFieldValue table for all selected jobs
        // Try multiple field name variations: "no_of_cec", "No of CEC", "noofcec", etc.
        return invoice.invoiceSelectedJobs.reduce((total, invoiceJob) => {
          const jobId = invoiceJob.job?.id;
          if (!jobId) return total;
          const fieldValue = getFieldValueFromJobFieldValue(jobId, "no_of_cec", jobFieldValuesMap) ||
                            getFieldValueFromJobFieldValue(jobId, "No of CEC", jobFieldValuesMap) ||
                            getFieldValueFromJobFieldValue(jobId, "noofcec", jobFieldValuesMap);
          return total + (parseInt(fieldValue) || 0);
        }, 0);
      }
      return 0;
    }
    
    // For Partial_Invoice + Draft, use invoice table data directly
    if (isPartialInvoiceDraft) {
      return parseInt(invoice.ce_cert_count || 0);
    }
    
    // For Proforma, calculate from JobFieldValue table
    if (invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      return invoice.invoiceSelectedJobs.reduce((total, invoiceJob) => {
        const jobId = invoiceJob.job?.id;
        if (!jobId) return total;
        const fieldValue = getFieldValueFromJobFieldValue(jobId, "no_of_cec", jobFieldValuesMap) ||
                          getFieldValueFromJobFieldValue(jobId, "No of CEC", jobFieldValuesMap) ||
                          getFieldValueFromJobFieldValue(jobId, "noofcec", jobFieldValuesMap);
        return total + (parseInt(fieldValue) || 0);
      }, 0);
    }
    return 0;
  }, [invoice, jobFieldValuesMap, isFullInvoiceDraft, isPartialInvoiceDraft]);

  // Calculate invoice totals
  const invoiceCalculations = useMemo(() => {
    if (!invoice) return null;

    // For Full Invoice + Draft: Calculate from job/client data
    // For Partial Invoice + Draft or Proforma: Use invoice table data
    let baseAmount, registrationCharges, caCharges, ceCharges, applicationFees, caCertCount, ceCertCount;
    let rewardAmount, discountAmount;

    if (isFullInvoiceDraft) {
      // Calculate charges from job data
      const calculatedCharges = calculateChargesFromJobs(
        invoice.invoiceSelectedJobs,
        jobServiceChargesMap,
        jobFieldValuesMap
      );
      baseAmount = calculatedCharges.professionalCharges;
      registrationCharges = calculatedCharges.registrationCharges;
      caCharges = calculatedCharges.caCharges;
      ceCharges = calculatedCharges.ceCharges;
      applicationFees = calculatedCharges.applicationFees;
      caCertCount = calculatedCharges.caCertCount;
      ceCertCount = calculatedCharges.ceCertCount;
      
      // Reward and discount amounts might still be stored in invoice table
      // If not stored, they would be 0
      rewardAmount = parseFloat(invoice.reward_amount || 0);
      discountAmount = parseFloat(invoice.discount_amount || 0);
    } else {
      // Use invoice table data for Partial Invoice + Draft or Proforma
      baseAmount = parseFloat(invoice.professional_charges || 0);
      registrationCharges = parseFloat(invoice.registration_other_charges || 0);
      caCharges = parseFloat(invoice.ca_charges || 0);
      ceCharges = parseFloat(invoice.ce_charges || 0);
      rewardAmount = parseFloat(invoice.reward_amount || 0);
      discountAmount = parseFloat(invoice.discount_amount || 0);
      // applicationFees will be calculated below for non-Full Invoice cases
      applicationFees = 0;
    }
    
    // Use common utility function to calculate subtotal (matches invoice creation page)
    const subtotal = calculateServiceSubtotalUtil({
      invoiceData: invoice,
      baseAmount,
      registrationCharges,
      caCharges,
      ceCharges,
      rewardAmount,
      discountAmount,
    });
    
    const baseCgstRate = gstRates.cgstRate || 0;
    const baseSgstRate = gstRates.sgstRate || 0;
    const baseIgstRate = gstRates.igstRate || 0;

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (gstType === 'SC') {
      cgstRate = baseCgstRate;
      sgstRate = baseSgstRate;
      igstRate = 0;
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstAmount = (subtotal * sgstRate) / 100;
      igstAmount = 0;
    } else if (gstType === 'I') {
      cgstRate = 0;
      sgstRate = 0;
      igstRate = baseIgstRate;
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = (subtotal * igstRate) / 100;
    } else if (gstType === 'EXEMPTED') {
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
      igstAmount = (cgstRate > 0 || sgstRate > 0) ? 0 : (subtotal * igstRate) / 100;
    }

    // Application fees: Already calculated above for Full Invoice + Draft
    // For Partial Invoice + Draft or Proforma, calculate from invoice table
    if (!isFullInvoiceDraft) {
      if (isPartialInvoiceDraft) {
        // For Partial_Invoice + Draft, use invoice table data directly
        applicationFees = parseFloat(invoice.application_fees || 0);
      } else {
        // For Proforma, calculate from JobFieldValue table
        if (invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
          applicationFees = invoice.invoiceSelectedJobs.reduce((total, invoiceJob) => {
            const jobId = invoiceJob.job?.id;
            if (!jobId) return total;
            const fieldValue = getFieldValueFromJobFieldValue(jobId, "appl_fee_duty_paid", jobFieldValuesMap) ||
                              getFieldValueFromJobFieldValue(jobId, "Appl Fees Paid", jobFieldValuesMap) ||
                              getFieldValueFromJobFieldValue(jobId, "appl_fees_paid", jobFieldValuesMap) ||
                              getFieldValueFromJobFieldValue(jobId, "application_fees", jobFieldValuesMap);
            if (fieldValue) {
              return total + parseFloat(fieldValue || 0);
            }
            return total;
          }, 0);
        }
      }
    }
    const remiCharges = remiFields.reduce((total, remiField) => total + remiField.charges, 0);

    const total = subtotal + cgstAmount + sgstAmount + igstAmount + applicationFees + remiCharges;

    return {
      baseAmount,
      registrationCharges,
      caCharges,
      ceCharges,
      rewardAmount,
      discountAmount,
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
  }, [invoice, gstRates, gstType, remiFields, jobFieldValuesMap, jobServiceChargesMap, isFullInvoiceDraft, isPartialInvoiceDraft]);

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

  // Calculate invoice amount wrapper function for AnnexureTable component
  // This matches the signature expected by AnnexureTable
  const calculateInvoiceAmount = (job, serviceCharge) => {
    if (!job || !serviceCharge) {
      return { amount: 0 };
    }
    // Use the existing calculateProfessionalCharges function
    const amount = calculateProfessionalCharges(serviceCharge, job.id, jobFieldValuesMap);
    return { amount: parseFloat(amount.toFixed(2)) };
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

  // Get first job number
  const firstJobNo = useMemo(() => {
    if (invoice && invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      return invoice.invoiceSelectedJobs[0].job?.job_no || "NA";
    }
    return "NA";
  }, [invoice]);

  // Get customer ID from first job's client info
  const customerId = useMemo(() => {
    if (invoice && invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      const firstJob = invoice.invoiceSelectedJobs[0].job;
      if (firstJob && firstJob.clientInfo) {
        // Try to get group_id from client service charge
        const firstJobId = firstJob.id;
        const jobServiceCharge = jobServiceChargesMap[firstJobId];
        return jobServiceCharge?.group_id || "NA";
      }
    }
    return "NA";
  }, [invoice, jobServiceChargesMap]);

  // Get client details from first job's service charge (for Full_Invoice) or from job clientInfo (for Partial_Invoice)
  const clientDetails = useMemo(() => {
    if (invoice && invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0) {
      const firstJob = invoice.invoiceSelectedJobs[0].job;
      const firstJobId = firstJob?.id;
      
      if (firstJobId) {
        // Try to get from job service charges first (for Full_Invoice)
        const jobServiceCharge = jobServiceChargesMap[firstJobId];
        if (jobServiceCharge) {
          return {
            name: jobServiceCharge.client_name || "NA",
            address: jobServiceCharge.client_address || null,
            gstNo: jobServiceCharge.gst_no || "NA",
            concernPerson: jobServiceCharge.concern_person || "NA",
            concernEmail: jobServiceCharge.concern_email_id || "NA",
            invoiceDescription: jobServiceCharge.invoice_description || null,
          };
        }
        
        // For Partial_Invoice, try to get from job's clientInfo as fallback
        if (isPartialInvoiceDraft && firstJob?.clientInfo) {
          const clientInfo = firstJob.clientInfo;
          return {
            name: clientInfo.client_name || "NA",
            address: clientInfo.address || null,
            gstNo: clientInfo.gst_no || "NA",
            concernPerson: clientInfo.concern_person || "NA",
            concernEmail: clientInfo.concern_email_id || "NA",
            invoiceDescription: null, // Not available in clientInfo
          };
        }
      }
    }
    return {
      name: "NA",
      address: null,
      gstNo: "NA",
      concernPerson: "NA",
      concernEmail: "NA",
      invoiceDescription: null,
    };
  }, [invoice, jobServiceChargesMap, isPartialInvoiceDraft]);

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
            onClick={() => window.print()}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice Container - Paper-like appearance */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-full">
        <div
          className="bg-white shadow-2xl print:shadow-none p-8 print:p-8 print:pt-2"
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
                    {displayAccount?.account_name || "NA"}
                  </div>
                </div>
              </div>
              {/* Billed To Section */}
              <div className="mb-4">
                <div className="font-semibold text-xs mb-1">
                  Billed To : {clientDetails.name}
                </div>
                {clientDetails.address && (
                  <div className="text-xs mb-1 ms-5">
                    {clientDetails.address}
                  </div>
                )}
              </div>
              <div className="font-semibold text-xs mb-1">
                GSTN No : <span>{clientDetails.gstNo}</span>
              </div>
              <div className="font-semibold text-xs mb-1">
                Kind Attn : <span>{clientDetails.concernPerson}</span>
              </div>
              <div className="text-xs mb-1">
                <span className="font-semibold">Emails : </span>
                <span>{clientDetails.concernEmail}</span>
              </div>
            </div>
            <div className="col-span-1"></div>
            {/* Right: Invoice Details Box */}
            <div className="col-span-4">
              <div className="p-3">
                <div className="font-bold text-base mb-1 text-start">
                  {invoice?.billing_type === "Reimbursement" ? "Reimbursement/Debit Note" : "GST Invoice"}
                </div>
                <div className="text-xs grid grid-cols-12">
                  <div className="col-span-5">
                    <div>Invoice No. :</div>
                    <div>Date :</div>
                    <div>Job No :</div>
                    <div>Customer ID :</div>
                    <div className="print:hidden">
                      <button
                        onClick={handleOpenPOModal}
                        className="text-left hover:text-primary-600 transition-colors cursor-pointer"
                      >
                        PO No : 
                      </button>
                    </div>
                    <div className="hidden print:block">PO No :</div>
                    {invoice?.invoice_stage_status === "Proforma" ? (
                      <>
                        <div className="print:hidden">
                          <button
                            onClick={handleOpenIRNModal}
                            className="text-left hover:text-primary-600 transition-colors cursor-pointer"
                          >
                            IRN No. :
                          </button>
                        </div>
                        <div className="hidden print:block">IRN No. :</div>
                      </>
                    ) : (
                      <div>IRN No. :</div>
                    )}
                  </div>
                  <div className="col-span-7">
                    <div>{invoiceNumber}</div>
                    <div>{invoiceDate}</div>
                    <div>
                      {invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 1
                        ? "As Per Annexure"
                        : firstJobNo}
                    </div>
                    <div>{customerId}</div>
                    <div>{invoice.po_no || "NA"}</div>
                    <div className="break-all">{invoice.irn_no || "NA"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Service Charges Section */}
          <div className="mb-4">
            <div className="bg-black text-white px-3 mb-2 py-2 flex justify-between items-center">
              <span className="font-bold text-xs">
                {invoice?.billing_type === "Reimbursement" ? "PARTICULARS" : "PROFESSIONAL SERVICE CHARGES REGARDING"}
              </span>
              <span className="font-bold text-xs">AMOUNT</span>
            </div>
            <div className="p-0">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-9 mb-2">
                  <div className="font-semibold text-xs mb-1">
                    <span className="font-bold">DETAILS:</span>{" "}
                    {invoice.jobRegister?.job_code || "NA"}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-1 text-right md:text-right mt-2 md:mt-0 md:flex md:items-start md:justify-end text-xs">
                  ₹
                </div>
                <div className="col-span-12 md:col-span-2 text-right md:text-right mt-2 md:mt-0 md:flex md:items-start md:justify-end text-xs">
                  {invoice.billing_type === "Reimbursement" && invoiceCalculations ? (
                    (
                      parseFloat(invoiceCalculations.applicationFees || 0) +
                      parseFloat(invoiceCalculations.remiCharges || 0) -
                      parseFloat(invoiceCalculations.discountAmount || 0)
                    ).toFixed(2)
                  ) : invoiceCalculations ? (
                    // For Full Invoice + Draft, use calculated baseAmount; otherwise use invoice table amount
                    parseFloat(invoiceCalculations.baseAmount || 0).toFixed(2)
                  ) : (
                    parseFloat(invoice.amount || 0).toFixed(2)
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-10 mb-2">
                  {billingFieldNames.length > 0 && firstSelectedJob ? (
                    <div className="space-y-1">
                      {billingFieldNames.map((fieldName, index) => {
                        // Get field value from JobFieldValue table
                        const firstJobId = invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 0 
                          ? invoice.invoiceSelectedJobs[0].job?.id 
                          : null;
                        const fieldValue = firstJobId 
                          ? getFieldValueFromJobFieldValue(firstJobId, fieldName, jobFieldValuesMap) || "NA"
                          : "NA";
                        return (
                          <div key={index} className="grid grid-cols-10 gap-4 text-xs">
                            <div className="col-span-6">
                              <span className="text-xs">{fieldName}</span>
                            </div>
                            <div className="col-span-4 text-start">
                              <span>
                                {invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 1
                                  ? "As Per Annexure"
                                  : fieldValue}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="col-span-12 md:col-span-2"></div>
              </div>

              <div className="p-0 mt-4 text-xs">
                <span className="font-semibold">CHARGES AS UNDER:</span>{" "}
                {clientDetails.invoiceDescription && (
                  <div className="text-xs mb-1">{clientDetails.invoiceDescription}</div>
                )}
              </div>
            </div>
          </div>

          {/* Note Section */}
              <div className="p-3 mb-4 ps-0 border-t border-b border-black">
                <div className="text-xs">
                  <span className="font-semibold print:hidden">
                    <button
                      onClick={handleOpenNoteModal}
                      className="text-left hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      NOTE :
                    </button>
                  </span>
                  <span className="font-semibold hidden print:inline">NOTE :</span>{" "}
                  {invoice?.note && invoice.note.trim() !== "" ? (
                    <span>{invoice.note}</span>
                  ) : null}
                </div>
              </div>

          {/* Bottom Section: Bank Details (Left) and Charges/Taxes (Right) */}
          <div className="grid grid-cols-2 gap-4 mb-1">
            {/* Left: Bank Details */}
            <div className="">
              <div className="p-0">
                <div className="font-bold text-xs pb-1">BANK Details</div>
                <div className="text-xs">
                  <div>{displayAccount?.bank_name || "NA"}</div>
                  <div>
                    <span className="text-xs">Branch - </span>{" "}
                    {displayAccount?.bank_address || "NA"}
                  </div>
                  <div>
                    <span className="text-xs">A/C No.</span>{" "}
                    {displayAccount?.account_no || "NA"}
                  </div>
                  <div>
                    <span className="text-xs">IFSC Code - </span>{" "}
                    {displayAccount?.ifsc_no || "NA"}
                  </div>
                </div>
              </div>
              <div className="p-0 pt-5">
                <div className="text-xs">
                  <div>
                    <span className="font-semibold">SAC No. :</span>{" "}
                    {invoice.jobRegister?.gstRate?.sac_no || "NA"}
                  </div>
                  <div>
                    <span className="font-semibold">GST Detail :</span>{" "}
                    {displayAccount?.gst_no || "NA"}
                  </div>
                  <div>
                    <span className="font-semibold">PAN No. :</span>{" "}
                    {displayAccount?.pan_no || "NA"}
                  </div>
                  <div>
                    <span className="font-semibold">MSME Registration No. :</span>{" "}
                    {displayAccount?.msme_details || "NA"}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Charges and Taxes */}
            <div className="p-1">
              <div className="text-xs grid grid-cols-12">
                {invoice.billing_type !== "Reimbursement" && invoiceCalculations && (
                  <>
                    {parseFloat(invoiceCalculations.rewardAmount || 0) > 0 && (
                      <>
                        <div className="col-span-9">Reward </div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {parseFloat(invoiceCalculations.rewardAmount || 0).toFixed(2)}
                        </div>
                      </>
                    )}
                    {parseFloat(invoiceCalculations.discountAmount || 0) > 0 && (
                      <>
                        <div className="col-span-9">Discount </div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {parseFloat(invoiceCalculations.discountAmount || 0).toFixed(2)}
                        </div>
                      </>
                    )}
                    {parseFloat(invoiceCalculations.registrationCharges || 0) > 0 && (
                      <>
                    <div className="col-span-9">Registration/Other Charges </div>
                    <div className="col-span-1">₹</div>
                    <div className="col-span-2 text-right">
                      {parseFloat(invoiceCalculations.registrationCharges || 0).toFixed(2)}
                    </div>
                    </>
                    )}
                    {parseFloat(invoiceCalculations.caCharges || 0) > 0 && (
                      <>
                    <div className="col-span-9">
                      Arrangement of CA CERT. ({caCertCount} Nos)
                    </div>
                    <div className="col-span-1">₹</div>
                    <div className="col-span-2 text-right">
                      {parseFloat(invoiceCalculations.caCharges || 0).toFixed(2)}
                    </div>
                    </>
                    )}
                    {parseFloat(invoiceCalculations.ceCharges || 0) > 0 && (
                      <>
                    <div className="col-span-9">
                      Arrangement of CE CERT. ({ceCertCount} Nos)
                    </div>
                    <div className="col-span-1">₹</div>
                    <div className="col-span-2 text-right">
                      {parseFloat(invoiceCalculations.ceCharges || 0).toFixed(2)}
                    </div>
                    </>
                    )}
                    <div className="col-span-9 font-semibold">Subtotal </div>
                    <div className="col-span-1 font-semibold">₹</div>
                    <div className="col-span-2 text-right font-semibold">
                      {invoiceCalculations.subtotal.toFixed(2)}
                    </div>
                    {invoiceCalculations && (
                      <>
                        <div className="col-span-9">C GST: {invoiceCalculations.cgstRate}% </div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {invoiceCalculations.cgstAmount.toFixed(2)}
                        </div>
                        <div className="col-span-9">S GST: {invoiceCalculations.sgstRate}% </div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {invoiceCalculations.sgstAmount.toFixed(2)}
                        </div>
                        <div className="col-span-9">I GST: {invoiceCalculations.igstRate}% </div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {invoiceCalculations.igstAmount.toFixed(2)}
                        </div>
                      </>
                    )}
                  </>
                )}
                {invoiceCalculations && (
                  <>
                    {invoice.billing_type !== "Service" && (
                      <>
                        <div className="col-span-12 pt-1 mt-1">
                          <div className="font-semibold">Reimbursements</div>
                        </div>
                        {parseFloat(invoiceCalculations.applicationFees || 0) > 0 && (
                          <>
                            <div className="col-span-9">Application Fees </div>
                            <div className="col-span-1">₹</div>
                            <div className="col-span-2 text-right">
                              {invoiceCalculations.applicationFees.toFixed(2)}
                            </div>
                          </>
                        )}
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
                    <div className="col-span-7 font-bold text-base mt-2">TOTAL </div>
                    <div className="col-span-1 font-bold text-base mt-2 text-right">₹</div>
                    <div className="col-span-4 font-bold text-base mt-2 text-right">
                      {(() => {
                        if (invoice.billing_type === "Reimbursement") {
                          // For Reimbursement: Application Fees + Remi Charges - Discount
                          return (
                            parseFloat(invoiceCalculations.applicationFees || 0) +
                            parseFloat(invoiceCalculations.remiCharges || 0) -
                            parseFloat(invoice.discount_amount || 0)
                          ).toFixed(2);
                        } else if (invoice.billing_type === "Service") {
                          // For Service: Only Service section fields (Subtotal + GST)
                          // Use calculated values from invoiceCalculations for Full Invoice + Draft
                          const serviceSubtotal = invoiceCalculations ? invoiceCalculations.subtotal : (
                            parseFloat(invoice.professional_charges || 0) +
                            parseFloat(invoice.registration_other_charges || 0) +
                            parseFloat(invoice.ca_charges || 0) +
                            parseFloat(invoice.ce_charges || 0) +
                            parseFloat(invoice.reward_amount || 0) -
                            parseFloat(invoice.discount_amount || 0)
                          );
                          // Add GST amounts
                          const gstTotal = (invoiceCalculations?.cgstAmount || 0) + (invoiceCalculations?.sgstAmount || 0) + (invoiceCalculations?.igstAmount || 0);
                          return (serviceSubtotal + gstTotal).toFixed(2);
                        } else {
                          // For Service & Reimbursement: Subtotal + GST + Application Fees + Remi Charges
                          return invoiceCalculations.total.toFixed(2);
                        }
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
            
          </div>

          {/* Total Amount in Words */}
          {invoiceCalculations && (
            <div className="p-3 mb-4 ps-0 border-t border-b border-black">
              <div className="text-xs">
                <span className="font-semibold">Rs. </span>{" "}
                {(() => {
                  let totalAmount = 0;
                  
                  if (invoice.billing_type === "Reimbursement") {
                    // For Reimbursement: Application Fees + Remi Charges - Discount
                    totalAmount =
                      parseFloat(invoiceCalculations.applicationFees || 0) +
                      parseFloat(invoiceCalculations.remiCharges || 0) -
                      parseFloat(invoiceCalculations.discountAmount || 0);
                  } else if (invoice.billing_type === "Service") {
                    // For Service: Only Service section fields (Subtotal + GST)
                    // Use calculated values from invoiceCalculations for Full Invoice + Draft
                    const serviceSubtotal = invoiceCalculations.subtotal;
                    // Add GST amounts
                    const gstTotal = (invoiceCalculations?.cgstAmount || 0) + (invoiceCalculations?.sgstAmount || 0) + (invoiceCalculations?.igstAmount || 0);
                    totalAmount = serviceSubtotal + gstTotal;
                  } else {
                    // For Service & Reimbursement: Subtotal + GST + Application Fees + Remi Charges
                    totalAmount = invoiceCalculations.total;
                  }
                  
                  return numberToWords(totalAmount);
                })()}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 mb-2">
            <div className="text-center mb-1">
              <span className="font-semibold text-xs">Thank You For Business.</span>
            </div>
          </div>

          <div className="text-right">
            <span className="font-semibold text-sm">
              For {displayAccount?.account_name || "NA"}
            </span>
          </div>
          <div className="px-3 mb-2">
            <div className="text-center">
              <span className="text-xs">
                Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK Market, Bibwewadi, Pune, Ph:+91 20 3511 3202, Website: www.lucrative.co.in As Per Rule 46(q) of GST act 2017 said Invoice is digitally signed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Annexure Table - Show when invoice has more than 1 job */}
      {invoice && invoice.invoiceSelectedJobs && invoice.invoiceSelectedJobs.length > 1 && (
        <AnnexureTable
          invoiceNo={invoiceNumber}
          invoiceDate={invoiceDate}
          accountName={displayAccount?.account_name || sessionAccount?.account_name || "NA"}
          selectedJobIds={invoice.invoiceSelectedJobs.map((invoiceJob) => invoiceJob.job?.id).filter(Boolean)}
          jobs={invoice.invoiceSelectedJobs.map((invoiceJob) => invoiceJob.job).filter(Boolean)}
          jobServiceChargesMap={jobServiceChargesMap}
          jobFieldValuesMap={jobFieldValuesMap}
          getFieldValueFromJobFieldValue={getFieldValueFromJobFieldValue}
          calculateInvoiceAmount={calculateInvoiceAmount}
          billingFieldNames={billingFieldNames}
        />
      )}

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
  );
}

