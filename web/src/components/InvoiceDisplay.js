"use client";

import { useMemo, Fragment } from "react";
import Image from "next/image";
import logoImage from "@/assets/images/invoice-logo.png";
import AnnexureTable from "@/components/AnnexureTable";
import { calculateServiceSubtotal as calculateServiceSubtotalUtil } from "@/utils/invoiceUtils";
import { formatFieldValue } from "@/utils/dateUtils";

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

/**
 * Shared Invoice Display Component
 * Used by both preview and view pages
 * 
 * @param {Object} props
 * @param {Object} props.invoiceData - Invoice data from API (either from /invoices/sample or /invoices/:id)
 * @param {Object} props.account - Account data (from sessionAccount or fetched account)
 * @param {string} props.invoiceNo - Invoice number to display
 * @param {string} props.invoiceDate - Invoice date to display
 * @param {Array} props.jobIds - Array of job IDs
 * @param {Function} props.onSaveInvoice - Optional callback for save button (preview page)
 * @param {boolean} props.showSaveButton - Whether to show save button
 * @param {boolean} props.isLoading - Loading state
 * @param {Function} props.onBack - Back button handler
 * @param {Function} props.onPrint - Print button handler
 * @param {Function} props.onEditPO - Optional PO edit handler (view page)
 * @param {Function} props.onEditIRN - Optional IRN edit handler (view page)
 * @param {Function} props.onEditNote - Optional Note edit handler (view page)
 * @param {Function} props.onShiftToProforma - Optional shift to proforma handler (view page)
 * @param {boolean} props.isDraft - Whether invoice is in draft status
 * @param {boolean} props.isProforma - Whether invoice is in proforma status
 */
export default function InvoiceDisplay({
  invoiceData,
  account,
  invoiceNo = "NA",
  invoiceDate,
  jobIds = [],
  onSaveInvoice,
  showSaveButton = false,
  isLoading = false,
  onBack,
  onPrint,
  onEditPO,
  onEditIRN,
  onEditNote,
  onShiftToProforma,
  isDraft = false,
  isProforma = false,
  logoError = false,
  onLogoError,
}) {
  if (!invoiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 text-red-600">
            No invoice data available
          </div>
        </div>
      </div>
    );
  }

  // Extract data from invoiceData (works for both /invoices/sample and /invoices/:id responses)
  const billingType = invoiceData.billingType || invoiceData.billing_type;
  console.log("billingType", billingType, invoiceData);
  const jobs = invoiceData.jobs || [];
  const jobServiceChargesMap = invoiceData.jobServiceChargesMap || {};
  const billingFieldNames = invoiceData.billingFieldNames || [];
  const jobRegister = invoiceData.jobRegister || null;

  // Build jobFieldValuesMap from jobs data
  const jobFieldValuesMap = useMemo(() => {
    if (!jobs) return {};
    const map = {};
    jobs.forEach((job) => {
      if (job.id && job.jobFieldValues) {
        map[job.id] = {};
        job.jobFieldValues.forEach((fv) => {
          map[job.id][fv.field_name] = fv.field_value;
        });
      }
    });
    return map;
  }, [jobs]);

  // Get first job for display
  const firstJob = useMemo(() => {
    return jobs.length > 0 ? jobs[0] : null;
  }, [jobs]);

  // Get job code name
  const jobCodeName = useMemo(() => {
    return jobRegister?.job_code || "NA";
  }, [jobRegister]);

  // Get SAC No
  const sacNo = useMemo(() => {
    return jobRegister?.gstRate?.sac_no || "NA";
  }, [jobRegister]);

  // Get client info from first job's service charge
  const clientInfo = useMemo(() => {
    if (jobIds.length === 0) return null;
    return jobServiceChargesMap[jobIds[0]] || null;
  }, [jobIds, jobServiceChargesMap]);

  // Calculate service subtotal using API response
  const calculateServiceSubtotal = () => {
    return calculateServiceSubtotalUtil({ invoiceBreakdown: invoiceData });
  };

  // Calculate invoice calculations from API response
  const invoiceCalculations = useMemo(() => {
    if (!invoiceData) return null;

    const gst = invoiceData.gst || {};
    const total = invoiceData.finalAmount || 0;
    
    // Calculate remi charges total from remiCharges map or remiFields array
    let remiChargesTotal = 0;
    if (invoiceData.remiCharges && typeof invoiceData.remiCharges === 'object') {
      // If remiCharges is a map object
      remiChargesTotal = Object.values(invoiceData.remiCharges).reduce(
        (sum, val) => sum + parseFloat(val || 0),
        0
      );
    } else if (invoiceData.remiFields && Array.isArray(invoiceData.remiFields)) {
      // If remiFields is an array
      remiChargesTotal = invoiceData.remiFields.reduce(
        (sum, field) => sum + parseFloat(field.charges || 0),
        0
      );
    }

    return {
      baseAmount: invoiceData.professionalCharges || 0,
      subtotal: invoiceData.serviceSubtotal || 0,
      cgstRate: gst.cgstRate || 0,
      sgstRate: gst.sgstRate || 0,
      igstRate: gst.igstRate || 0,
      cgstAmount: gst.cgstAmount || 0,
      sgstAmount: gst.sgstAmount || 0,
      igstAmount: gst.igstAmount || 0,
      applicationFees: invoiceData.applicationFees || 0,
      remiCharges: remiChargesTotal,
      total,
      totalInWords: numberToWords(total),
    };
  }, [invoiceData]);

  // Get remi fields from API response
  const remiFields = useMemo(() => {
    if (!invoiceData?.remiFields) return [];
    return invoiceData.remiFields.filter((field) => field.charges > 0);
  }, [invoiceData]);

  return (
    <>
      {/* Invoice Container */}
      <div className="max-w-4xl mx-auto p-2 print:p-0 print:max-w-full" style={{ maxWidth: "210mm" }}>
        <div
          className="bg-white shadow-2xl print:shadow-none p-8 print:p-8 print:pt-4"
          style={{ minHeight: "29.7cm", width: "100%" }}
        >
          {/* Top Section: Company Info (Left) and Invoice Details (Right) */}
          <div className="grid grid-cols-12 gap-4 mb-2">
            {/* Left: Company Info */}
            <div className="col-span-7">
              <div className="flex items-start mb-0">
                <div className="w-20 h-20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {!logoError ? (
                    <Image
                      src={logoImage}
                      alt="Lucrative Logo"
                      width={100}
                      height={100}
                      className="w-full h-full object-contain"
                      onError={() => onLogoError && onLogoError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-5 h-5"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 mt-4">
                  <div className="font-bold text-base mb-1">
                    {account?.account_name || "NA"}
                  </div>
                </div>
              </div>
              {/* Billed To Section */}
              <div className="mb-4">
                <div className="font-semibold text-xs mb-1">
                  Billed To : {clientInfo?.client_name || "NA"}
                </div>
                {clientInfo?.client_address && (
                  <div className="text-xs mb-1 ms-5">{clientInfo.client_address}</div>
                )}
              </div>
              <div className="font-semibold text-xs mb-1">
                GSTN No : <span>{clientInfo?.gst_no || "NA"}</span>
              </div>
              <div className="font-semibold text-xs mb-1">
                Kind Attn : <span>{clientInfo?.concern_person || "NA"}</span>
              </div>
              <div className="text-xs mb-1">
                <span className="font-semibold">Emails : </span>
                <span>{clientInfo?.concern_email_id || "NA"}</span>
              </div>
            </div>
            <div className="col-span-1"></div>
            {/* Right: Invoice Details Box */}
            <div className="col-span-4">
              <div className="p-2">
                <div className="font-bold text-base mb-1 text-start">
                  {billingType === "Reimbursement" ? "Reimbursement/Debit Note" : "GST Invoice"}
                </div>
                <div className="text-xs grid grid-cols-12">
                  <div className="col-span-5">
                    <div>Invoice No. :</div>
                    <div>Date :</div>
                    <div>Job No :</div>
                    <div>Customer ID :</div>
                    <div className={onEditPO ? "print:hidden" : ""}>
                      {onEditPO ? (
                        <button
                          onClick={onEditPO}
                          className="text-left hover:text-primary-600 transition-colors cursor-pointer"
                        >
                          PO No :
                        </button>
                      ) : (
                        <div>PO No :</div>
                      )}
                    </div>
                    {onEditPO && <div className="hidden print:block">PO No :</div>}
                    {isProforma && onEditIRN ? (
                      <>
                        <div className="print:hidden">
                          <button
                            onClick={onEditIRN}
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
                    <div>{invoiceNo}</div>
                    <div>{invoiceDate}</div>
                    <div>{jobIds.length > 1 ? "As Per Annexure" : firstJob?.job_no || "NA"}</div>
                    <div>{clientInfo?.group_id || "NA"}</div>
                    <div>{invoiceData.po_no || "NA"}</div>
                    <div className="break-all">{invoiceData.irn_no || "NA"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Service Charges Section */}
          <div className="mb-4">
            <div className="bg-gray-700 text-white px-3 mb-2 py-2 flex justify-between items-center">
              <span className="font-bold text-xs">
                {billingType === "Reimbursement"
                  ? "PARTICULARS"
                  : "PROFESSIONAL SERVICE CHARGES REGARDING"}
              </span>
              <span className="font-bold text-xs">AMOUNT</span>
            </div>
            <div className="p-0">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-9 mb-2">
                  <div className="font-semibold text-xs mb-1">
                    <span className="font-bold">DETAILS:</span> {jobCodeName}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-1 text-right md:text-right mt-2 md:mt-0 md:flex md:items-start md:justify-end text-xs">
                  ₹
                </div>
                <div className="col-span-12 md:col-span-2 text-right md:text-right mt-2 md:mt-0 md:flex md:items-start md:justify-end text-xs">
                  {billingType === "Reimbursement" && invoiceCalculations
                    ? (
                        invoiceCalculations.applicationFees + invoiceCalculations.remiCharges
                      ).toFixed(2)
                    : invoiceData.professionalCharges.toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-10 mb-2">
                  {billingFieldNames.length > 0 && firstJob ? (
                    <div className="space-y-1">
                      {billingFieldNames.map((fieldName, index) => {
                        const fieldValue =
                          jobIds.length > 0
                            ? getFieldValueFromJobFieldValue(
                                jobIds[0],
                                fieldName,
                                jobFieldValuesMap
                              ) || "NA"
                            : "NA";
                        
                        // For Quantity field with multiple jobs, calculate total
                        let displayValue = fieldValue;
                        if (jobIds.length > 1 && isQuantityField(fieldName)) {
                          const totalQuantity = calculateTotalQuantity(
                            jobIds,
                            jobFieldValuesMap,
                            fieldName
                          );
                          if (totalQuantity !== null) {
                            displayValue = totalQuantity;
                          } else {
                            displayValue = "As Per Annexure";
                          }
                        } else if (jobIds.length > 1) {
                          displayValue = "As Per Annexure";
                        } else {
                          // Format date values to dd-mm-yyyy format
                          displayValue = formatFieldValue(displayValue);
                        }
                        
                        return (
                          <div key={index} className="grid grid-cols-10 gap-4 text-xs">
                            <div className="col-span-6">
                              <span className="text-xs">{fieldName}</span>
                            </div>
                            <div className="col-span-4 text-start">
                              <span>{displayValue}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="font-semibold text-xs mb-1"></div>
                  )}
                  {/* Display Remark field when only one job is selected */}
                  {jobIds.length === 1 && (() => {
                    const remarkValue = 
                      getFieldValueFromJobFieldValue(
                        jobIds[0],
                        "remark",
                        jobFieldValuesMap
                      ) ||
                      getFieldValueFromJobFieldValue(
                        jobIds[0],
                        "Remark",
                        jobFieldValuesMap
                      ) ||
                      (firstJob?.remark) ||
                      null;
                    
                    if (remarkValue && remarkValue.trim() !== "") {
                      return (
                        <div className="mt-1 grid grid-cols-10 gap-4 text-xs">
                          <div className="col-span-2">
                            <span className="text-xs">Remark</span>
                          </div>
                          <div className="col-span-8 text-start">
                            <span>{remarkValue}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="col-span-12 md:col-span-2"></div>
              </div>

              <div className="p-0 mt-4 text-xs">
                <span className="font-semibold">CHARGES AS UNDER:</span>{" "}
                {clientInfo?.invoice_description && (
                  <div className="text-xs mb-1">{clientInfo.invoice_description}</div>
                )}
              </div>
            </div>
          </div>

          {/* Note Section */}
          <div className="p-3 mb-2 ps-0 border-t border-b border-black">
            <div className="text-xs">
              <span className={onEditNote ? "font-semibold print:hidden" : "font-semibold"}>
                {onEditNote ? (
                  <button
                    onClick={onEditNote}
                    className="text-left hover:text-primary-600 transition-colors cursor-pointer"
                  >
                    NOTE :
                  </button>
                ) : (
                  "NOTE :"
                )}
              </span>
              {onEditNote && <span className="font-semibold hidden print:inline">NOTE :</span>}{" "}
              {invoiceData.note && invoiceData.note.trim() !== "" ? (
                <span>{invoiceData.note}</span>
              ) : null}
            </div>
          </div>

          {/* Bottom Section: Bank Details (Left) and Charges/Taxes (Right) */}
          <div className="grid grid-cols-2 gap-4 pb-1">
            {/* Left: Bank Details */}
            <div className="">
              <div className="p-0 mb-1">
                <div className="font-bold text-xs pb-1">BANK Details</div>
                <div className="text-xs">
                  <div>{account?.bank_name || "NA"}</div>
                  <div>
                    <span className="text-xs">Branch - </span>
                    {account?.bank_address || "NA"}
                  </div>
                  <div>
                    <span className="text-xs">A/C No.</span> {account?.account_no || "NA"}
                  </div>
                  <div>
                    <span className="text-xs">IFSC Code - </span>
                    {account?.ifsc_no || "NA"}
                  </div>
                </div>
              </div>
              <div className="p-0 relative">
                <div className="border-t border-black"></div>
                <div className="text-xs pt-3 pb-1">
                  <div>
                    <span className="font-semibold">SAC No. :</span> {sacNo}
                  </div>
                  <div>
                    <span className="font-semibold">GST Detail :</span> {account?.gst_no || "NA"}
                  </div>
                  <div>
                    <span className="font-semibold">PAN No. :</span> {account?.pan_no || "NA"}
                  </div>
                  <div>
                    <span className="font-semibold">MSME Registration No. :</span>{" "}
                    {account?.msme_details || "NA"}
                  </div>
                </div>
                <div className="border-t border-black"></div>
                {/* Total Amount in Words */}
                {invoiceCalculations && (
                  <div className="text-xs pt-3 pb-1">
                    <span className="font-semibold">Amount in Words : </span>
                    <span className="font-semibold">₹. </span>
                    {invoiceCalculations.totalInWords}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Charges and Taxes */}
            <div className="p-0">
              <div className="text-xs grid grid-cols-12">
                {billingType !== "Reimbursement" && (
                  <>
                    {parseFloat(invoiceData.rewardAmount || 0) > 0 && (
                      <>
                        <div className="col-span-9">Reward</div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {parseFloat(invoiceData.rewardAmount || 0).toFixed(2)}
                        </div>
                      </>
                    )}
                    {parseFloat(invoiceData.discountAmount || 0) > 0 && (
                      <>
                        <div className="col-span-9">Discount</div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {parseFloat(invoiceData.discountAmount || 0).toFixed(2)}
                        </div>
                      </>
                    )}
                    {parseFloat(invoiceData.registrationCharges || 0) > 0 && (
                      <>
                        <div className="col-span-9">Registration/Other Charges</div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {parseFloat(invoiceData.registrationCharges || 0).toFixed(2)}
                        </div>
                      </>
                    )}
                    {parseFloat(invoiceData.caCharges || 0) > 0 && (
                      <>
                        <div className="col-span-9">
                          Arrangement of CA CERT. ({invoiceData.caCertCount || 0} Nos)
                        </div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {parseFloat(invoiceData.caCharges || 0).toFixed(2)}
                        </div>
                      </>
                    )}
                    {parseFloat(invoiceData.ceCharges || 0) > 0 && (
                      <>
                        <div className="col-span-9">
                          Arrangement of CE CERT. ({invoiceData.ceCertCount || 0} Nos)
                        </div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {parseFloat(invoiceData.ceCharges || 0).toFixed(2)}
                        </div>
                      </>
                    )}
                    <div className="col-span-9 font-semibold">Subtotal</div>
                    <div className="col-span-1 font-semibold">₹</div>
                    <div className="col-span-2 text-right font-semibold">
                      {calculateServiceSubtotal().toFixed(2)}
                    </div>
                    {invoiceCalculations && (
                      <>
                        <div className="col-span-9">C GST: {invoiceCalculations.cgstRate}%</div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {invoiceCalculations.cgstAmount.toFixed(2)}
                        </div>
                        <div className="col-span-9">S GST: {invoiceCalculations.sgstRate}%</div>
                        <div className="col-span-1">₹</div>
                        <div className="col-span-2 text-right">
                          {invoiceCalculations.sgstAmount.toFixed(2)}
                        </div>
                        <div className="col-span-9">I GST: {invoiceCalculations.igstRate}%</div>
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
                    {billingType !== "Service" && (
                      <>
                        <div className="col-span-12 pt-1 mt-1">
                          <div className="font-semibold">Reimbursements</div>
                        </div>
                        {parseFloat(invoiceData.applicationFees || 0) > 0 && (
                          <>
                            <div className="col-span-9">Application Fees</div>
                            <div className="col-span-1">₹</div>
                            <div className="col-span-2 text-right">
                              {invoiceCalculations.applicationFees.toFixed(2)}
                            </div>
                          </>
                        )}
                        {remiFields.map((remiField, index) => (
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
                    <div className="col-span-7 font-bold text-base mt-2">TOTAL</div>
                    <div className="col-span-1 font-bold text-base mt-2 text-right">₹</div>
                    <div className="col-span-4 font-bold text-base mt-2 text-right">
                      {invoiceData.finalAmount.toFixed(2)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-black"></div>


          {/* Footer */}
          <div className="px-3 mb-1">
            <div className="text-center mb-1">
              <span className="font-semibold text-xs">Thank You For Business.</span>
            </div>
          </div>

          <div className="text-right mt-5 pt-2">
            <span className="font-semibold text-sm">For {account?.account_name || "NA"}</span>
          </div>
          <div className="px-3 mb-2">
            <div className="mt-1 text-center">
              <span className="text-xs block">
                As Per Rule 46(q) of GST act 2017 said Invoice is digitally signed
              </span>
              <span className="text-xs block">
                Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK Market, Bibwewadi, Pune,
              </span>
              <span className="text-xs block">
                Ph:+91 20 3511 3202 : www.lucrative.co.in
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Annexure Table - Show when more than 1 job */}
      {jobIds.length > 1 && jobs.length > 0 && (
        <AnnexureTable
          invoiceNo={invoiceNo}
          invoiceDate={invoiceDate}
          accountName={account?.account_name || "NA"}
          selectedJobIds={jobIds}
          jobs={jobs}
          jobServiceChargesMap={jobServiceChargesMap}
          jobFieldValuesMap={jobFieldValuesMap}
          getFieldValueFromJobFieldValue={getFieldValueFromJobFieldValue}
          calculateInvoiceAmount={(job, serviceCharge) => {
            // Use pre-calculated professional charges from API response
            if (!invoiceData?.jobProfessionalChargesMap) {
              return { amount: 0 };
            }
            const professionalCharges = invoiceData.jobProfessionalChargesMap[job.id] || 0;
            return {
              quantity: 0,
              amount: professionalCharges,
              percentage: 0,
              percentageAmount: 0,
              perShb: 0,
            };
          }}
          billingFieldNames={billingFieldNames}
        />
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media screen {
          /* Ensure invoice container fits A4 width on screen */
          .max-w-4xl {
            max-width: 210mm !important;
            width: 100% !important;
          }
          .invoice-table-container {
            max-width: 210mm !important;
            width: 100% !important;
            margin: 0 auto !important;
            overflow-x: hidden !important;
          }
          .invoice-table-container table {
            max-width: 100% !important;
            width: 100% !important;
            table-layout: auto !important;
          }
          .invoice-table-container th,
          .invoice-table-container td {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            overflow: visible !important;
            font-family: "Times New Roman", Times, serif !important;
            height: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          html {
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          /* Ensure invoice container fits A4 page */
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Ensure all content is printed */
          body > * {
            display: block !important;
            visibility: visible !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Prevent page breaks in critical sections */
          .invoice-page,
          .annexure-page {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          /* Ensure proper page breaks for annexure */
          .annexure-page {
            page-break-before: always !important;
          }
        }
      `}</style>
    </>
  );
}
