"use client";

/**
 * AnnexureTable Component
 * Displays detailed annexure table for invoices with multiple jobs
 * Used in both invoice creation and invoice view pages
 */
export default function AnnexureTable({
  invoiceNo = "NA",
  invoiceDate = "NA",
  accountName = "NA",
  selectedJobIds = [],
  jobs = [],
  jobServiceChargesMap = {},
  jobFieldValuesMap = {},
  getFieldValueFromJobFieldValue,
  calculateInvoiceAmount,
  billingFieldNames = [],
}) {
  // Format date helper
  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr === "NA" || dateStr === null || dateStr === undefined) return "NA";
    try {
      // Check if date is in YYYY-MM-DD format
      const dateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${day}-${month}-${year}`;
      }
      // If already in different format, try to parse as Date
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      return String(dateStr); // Return as-is if can't parse
    } catch (e) {
      return String(dateStr); // Return as-is if error
    }
  };

  // Get remi fields for a job
  const getRemiFieldsForJob = (jobId) => {
    const jobServiceCharge = jobServiceChargesMap[jobId];
    if (!jobServiceCharge) return [];

    const remiFieldsArray = [];
    const remiFieldsConfig = [
      { desc: "remi_one_desc", descCamel: "remiOneDesc", charges: "remi_one_charges", chargesCamel: "remiOneCharges", key: "R1" },
      { desc: "remi_two_desc", descCamel: "remiTwoDesc", charges: "remi_two_charges", chargesCamel: "remiTwoCharges", key: "R2" },
      { desc: "remi_three_desc", descCamel: "remiThreeDesc", charges: "remi_three_charges", chargesCamel: "remiThreeCharges", key: "R3" },
      { desc: "remi_four_desc", descCamel: "remiFourDesc", charges: "remi_four_charges", chargesCamel: "remiFourCharges", key: "R4" },
      { desc: "remi_five_desc", descCamel: "remiFiveDesc", charges: "remi_five_charges", chargesCamel: "remiFiveCharges", key: "R5" },
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
          key: field.key,
          description: String(description).trim(),
          charges: parsedCharges,
        });
      }
    });

    return remiFieldsArray;
  };

  // Helper function to get dynamic amount fields
  const getDynamicAmountFields = (jobId, job, jobFieldValuesMap) => {
    const fields = [
      {
        name: "Exem Amt",
        keys: [
          "exempted_amount",
          "Exempted Amount",
          "exemptedamount",
          "exempted_amt",
          "Exempted Amt"
        ],
        jobKeys: ["exempted_amount"]
      },
      {
        name: "Duty Cre Amt",
        keys: [
          "duty_credit_amount",
          "Duty Credit Amount",
          "dutycreditamount",
          "duty_credit_amt",
          "Duty Credit Amt"
        ],
        jobKeys: ["duty_credit_amount"]
      },
      {
        name: "Act Duty Cre Amt",
        keys: [
          "actual_duty_credit_amount",
          "Actual Duty Credit Amount",
          "actualdutycreditamount",
          "actual_duty_credit_amt",
          "Actual Duty Credit Amt"
        ],
        jobKeys: ["actual_duty_credit_amount"]
      },
      {
        name: "Lic Amt",
        keys: [
          "license_amount",
          "License Amount",
          "licenseamount",
          "license_amt",
          "License Amt"
        ],
        jobKeys: ["license_amount"]
      },
      {
        name: "Ref Amt",
        keys: [
          "refund_amount",
          "Refund Amount",
          "refundamount",
          "refund_amt",
          "Refund Amt",
          "duty_credit_refund_sanctioned_exempted_amount",
          "Duty Credit Refund Sanctioned Exempted Amount"
        ],
        jobKeys: ["refund_amount", "duty_credit_refund_sanctioned_exempted_amount"]
      },
      {
        name: "Act Ref Amt",
        keys: [
          "actual_refund_amount",
          "Actual Refund Amount",
          "actualrefundamount",
          "actual_refund_amt",
          "Actual Refund Amt"
        ],
        jobKeys: ["actual_refund_amount"]
      },
      {
        name: "San Amt",
        keys: [
          "sanctioned_amount",
          "Sanctioned Amount",
          "sanctionedamount",
          "sanctioned_amt",
          "Sanctioned Amt"
        ],
        jobKeys: ["sanctioned_amount"]
      },
      {
        name: "Act Sanc Amt",
        keys: [
          "actual_sanctioned_amount",
          "Actual Sanctioned Amount",
          "actualsanctionedamount",
          "actual_sanctioned_amt",
          "Actual Sanctioned Amt",
          "actual_duty_credit_refund_sanctioned_amount",
          "Actual Duty Credit Refund Sanctioned Amount"
        ],
        jobKeys: ["actual_sanctioned_amount", "actual_duty_credit_refund_sanctioned_amount"]
      }
    ];

    const availableFields = [];

    fields.forEach(field => {
      let value = null;

      // Try to get value from jobFieldValuesMap first
      for (const key of field.keys) {
        const fieldValue = getFieldValueFromJobFieldValue(
          jobId,
          key,
          jobFieldValuesMap
        );
        if (fieldValue && fieldValue !== "NA" && fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== "") {
          value = fieldValue;
          break;
        }
      }

      // If not found in jobFieldValuesMap, try job object
      if (!value || value === "NA") {
        for (const jobKey of field.jobKeys) {
          if (job[jobKey] && job[jobKey] !== "NA" && job[jobKey] !== null && job[jobKey] !== undefined && String(job[jobKey]).trim() !== "") {
            value = job[jobKey];
            break;
          }
        }
      }

      // If value exists and is not "NA", add to available fields
      if (value && value !== "NA" && value !== null && value !== undefined && String(value).trim() !== "") {
        availableFields.push({
          name: field.name,
          value: value
        });
      }
    });

    return availableFields;
  };

  // Helper function to get dynamic combined field pairs (No & Date)
  const getDynamicCombinedFields = (jobId, job, jobFieldValuesMap) => {
    const formatDateToDDMMYYYYLocal = (dateStr) => {
      if (!dateStr || dateStr === "NA" || dateStr === null || dateStr === undefined) {
        return "NA";
      }
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        }
        return String(dateStr);
      } catch (e) {
        return String(dateStr);
      }
    };

    const fieldPairs = [
      {
        header: "Aut No & Date",
        noField: {
          keys: [
            "authorisation_no",
            "Authorisation No",
            "authorisationno",
            "auth_no",
            "Auth No"
          ],
          jobKeys: ["authorisation_no"]
        },
        dateField: {
          keys: [
            "sanction___approval_date",
            "Sanction Approval Date",
            "authorisation_date",
            "Authorisation Date",
            "auth_date",
            "Auth Date"
          ],
          jobKeys: ["sanction___approval_date", "authorisation_date"]
        }
      },
      {
        header: "Duty Credit No & Date",
        noField: {
          keys: [
            "duty_credit_scrip_no",
            "Duty Credit Scrip No",
            "dutycreditscripno",
            "duty_credit_no",
            "Duty Credit No"
          ],
          jobKeys: ["duty_credit_scrip_no"]
        },
        dateField: {
          keys: [
            "duty_credit_scrip_date",
            "Duty Credit Scrip Date",
            "dutycreditscripdate",
            "duty_credit_date",
            "Duty Credit Date"
          ],
          jobKeys: ["duty_credit_scrip_date"]
        }
      },
      {
        header: "Lic No & Date",
        noField: {
          keys: [
            "license_no",
            "License No",
            "licenseno",
            "lic_no",
            "Lic No"
          ],
          jobKeys: ["license_no"]
        },
        dateField: {
          keys: [
            "license_date",
            "License Date",
            "licensedate",
            "lic_date",
            "Lic Date"
          ],
          jobKeys: ["license_date"]
        }
      },
      {
        header: "Cert No & Date",
        noField: {
          keys: [
            "certificate_no",
            "Certificate No",
            "certificateno",
            "cert_no",
            "Cert No"
          ],
          jobKeys: ["certificate_no"]
        },
        dateField: {
          keys: [
            "certificate_date",
            "Certificate Date",
            "certificatedate",
            "cert_date",
            "Cert Date"
          ],
          jobKeys: ["certificate_date"]
        }
      },
      {
        header: "Refund No & Date",
        noField: {
          keys: [
            "refund_sanction_order_no",
            "Refund Sanction Order No",
            "refundsanctionorderno",
            "refund_no",
            "Refund No"
          ],
          jobKeys: ["refund_sanction_order_no"]
        },
        dateField: {
          keys: [
            "refund_sanction_order_date",
            "Refund Sanction Order Date",
            "refundsanctionorderdate",
            "refund_date",
            "Refund Date"
          ],
          jobKeys: ["refund_sanction_order_date"]
        }
      },
      {
        header: "Sanc Ord No & Date",
        noField: {
          keys: [
            "sanction_order_no",
            "Sanction Order No",
            "sanctionorderno",
            "sanc_ord_no",
            "Sanc Ord No"
          ],
          jobKeys: ["sanction_order_no"]
        },
        dateField: {
          keys: [
            "sanction_order_date",
            "Sanction Order Date",
            "sanctionorderdate",
            "sanc_ord_date",
            "Sanc Ord Date"
          ],
          jobKeys: ["sanction_order_date"]
        }
      },
      {
        header: "Brand Rate Lett No & Date",
        noField: {
          keys: [
            "brand_rate_letter_no",
            "Brand Rate Letter No",
            "brandrateletterno",
            "brand_rate_lett_no",
            "Brand Rate Lett No"
          ],
          jobKeys: ["brand_rate_letter_no"]
        },
        dateField: {
          keys: [
            "brand_rate_letter_date",
            "Brand Rate Letter Date",
            "brandrateletterdate",
            "brand_rate_lett_date",
            "Brand Rate Lett Date"
          ],
          jobKeys: ["brand_rate_letter_date"]
        }
      }
    ];

    const availableFields = [];

    fieldPairs.forEach(pair => {
      let noValue = null;
      let dateValue = null;

      // Try to get No value from jobFieldValuesMap first
      for (const key of pair.noField.keys) {
        const fieldValue = getFieldValueFromJobFieldValue(
          jobId,
          key,
          jobFieldValuesMap
        );
        if (fieldValue && fieldValue !== "NA" && fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== "") {
          noValue = fieldValue;
          break;
        }
      }

      // If not found in jobFieldValuesMap, try job object
      if (!noValue || noValue === "NA") {
        for (const jobKey of pair.noField.jobKeys) {
          if (job[jobKey] && job[jobKey] !== "NA" && job[jobKey] !== null && job[jobKey] !== undefined && String(job[jobKey]).trim() !== "") {
            noValue = job[jobKey];
            break;
          }
        }
      }

      // Try to get Date value from jobFieldValuesMap first
      for (const key of pair.dateField.keys) {
        const fieldValue = getFieldValueFromJobFieldValue(
          jobId,
          key,
          jobFieldValuesMap
        );
        if (fieldValue && fieldValue !== "NA" && fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== "") {
          dateValue = fieldValue;
          break;
        }
      }

      // If not found in jobFieldValuesMap, try job object
      if (!dateValue || dateValue === "NA") {
        for (const jobKey of pair.dateField.jobKeys) {
          if (job[jobKey] && job[jobKey] !== "NA" && job[jobKey] !== null && job[jobKey] !== undefined && String(job[jobKey]).trim() !== "") {
            dateValue = job[jobKey];
            break;
          }
        }
      }

      // If at least one value exists and is not "NA", add to available fields
      if ((noValue && noValue !== "NA" && noValue !== null && noValue !== undefined && String(noValue).trim() !== "") ||
          (dateValue && dateValue !== "NA" && dateValue !== null && dateValue !== undefined && String(dateValue).trim() !== "")) {
        // Format the no value (add D- prefix if it's duty credit scrip and doesn't start with D-)
        let formattedNo = noValue && noValue !== "NA" ? String(noValue) : "NA";
        if (pair.header === "Duty Credit No & Date" && formattedNo !== "NA" && typeof formattedNo === 'string' && !formattedNo.startsWith('D-')) {
          formattedNo = `D-${formattedNo}`;
        }

        // Format the date value
        const formattedDate = dateValue && dateValue !== "NA" ? formatDateToDDMMYYYYLocal(dateValue) : "NA";

        // Combine both values
        let combinedValue = "";
        if (formattedNo !== "NA" && formattedDate !== "NA") {
          combinedValue = `${formattedNo} / ${formattedDate}`;
        } else if (formattedNo !== "NA") {
          combinedValue = formattedNo;
        } else if (formattedDate !== "NA") {
          combinedValue = formattedDate;
        } else {
          combinedValue = "NA";
        }

        availableFields.push({
          header: pair.header,
          noValue: formattedNo,
          dateValue: formattedDate,
          combinedValue: combinedValue
        });
      }
    });

    return availableFields;
  };

  // Don't render if no jobs selected
  if (!selectedJobIds || selectedJobIds.length === 0) {
    return null;
  }

  // Calculate totals across all jobs first
  const totals = {
    charges: 0,
    caCharges: 0,
    ceCharges: 0,
    regiOther: 0,
    applFee: 0,
    remiFields: [0, 0, 0, 0, 0], // R1-R5 totals
  };

  // Get remi field descriptions from first job (for total row header)
  // Note: This will be updated later with allUsedRemiFieldsArray
  let totalRemiDescriptions = ["R1", "R2", "R3", "R4", "R5"];
  let totalDynamicAmountFieldsCount = 0;
  let totalDynamicCombinedFieldsCount = 0;
  if (selectedJobIds.length > 0) {
    const firstJobId = selectedJobIds[0];
    const firstJob = jobs.find((j) => j.id === firstJobId);
    
    // Get dynamic amount fields count for first job (for total row colspan)
    if (firstJob) {
      const firstJobDynamicFields = getDynamicAmountFields(firstJobId, firstJob, jobFieldValuesMap);
      totalDynamicAmountFieldsCount = firstJobDynamicFields.length;
      
      // Get dynamic combined fields count for first job (for total row colspan)
      const firstJobCombinedFields = getDynamicCombinedFields(firstJobId, firstJob, jobFieldValuesMap);
      totalDynamicCombinedFieldsCount = firstJobCombinedFields.length;
    }
  }

  // Calculate totals
  selectedJobIds.forEach((jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    const jobServiceCharge = jobServiceChargesMap[jobId];
    if (!job) return;

    // Calculate charges for this job
    const jobCharges = jobServiceCharge
      ? calculateInvoiceAmount(job, jobServiceCharge)
      : { amount: 0 };
    totals.charges += jobCharges.amount;

    // Get registration/other charges
    const regiOther = jobServiceCharge
      ? parseFloat(jobServiceCharge.registration_other_charges || 0)
      : 0;
    totals.regiOther += regiOther;

    // Get CA cert count for this job
    const caCertCount = 
      getFieldValueFromJobFieldValue(jobId, "no_of_cac", jobFieldValuesMap) ||
      getFieldValueFromJobFieldValue(jobId, "No of CAC", jobFieldValuesMap) ||
      getFieldValueFromJobFieldValue(jobId, "noofcac", jobFieldValuesMap) ||
      job.no_of_cac;
    const caCertCountValue = parseInt(caCertCount) || 0;

    // Get CE cert count for this job
    const ceCertCount = 
      getFieldValueFromJobFieldValue(jobId, "no_of_cec", jobFieldValuesMap) ||
      getFieldValueFromJobFieldValue(jobId, "No of CEC", jobFieldValuesMap) ||
      getFieldValueFromJobFieldValue(jobId, "noofcec", jobFieldValuesMap) ||
      job.no_of_cec;
    const ceCertCountValue = parseInt(ceCertCount) || 0;

    // Get CA charges and multiply by cert count
    const caChargesBase = jobServiceCharge
      ? parseFloat(jobServiceCharge.ca_charges || 0)
      : 0;
    const caCharges = caChargesBase * caCertCountValue;
    totals.caCharges += caCharges;

    // Get CE charges and multiply by cert count
    const ceChargesBase = jobServiceCharge
      ? parseFloat(jobServiceCharge.ce_charges || 0)
      : 0;
    const ceCharges = ceChargesBase * ceCertCountValue;
    totals.ceCharges += ceCharges;

    // Get application fees
    let applFeeValue = 0;
    const applFeeFieldValue =
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
    
    if (applFeeFieldValue) {
      applFeeValue = parseFloat(applFeeFieldValue || 0);
    } else if (jobServiceCharge) {
      applFeeValue = parseFloat(jobServiceCharge.application_fees || 0);
    }
    totals.applFee += applFeeValue;

    // Get remi fields for this job and add to totals
    const jobRemiFields = getRemiFieldsForJob(jobId);
    jobRemiFields.forEach((rf) => {
      const index = parseInt(rf.key.replace('R', '')) - 1;
      if (index >= 0 && index < 5) {
        totals.remiFields[index] += rf.charges;
      }
    });
  });

  // Collect all REMI fields that are used by ANY selected job
  // This will be used to determine which REMI columns to show in the header
  const allUsedRemiFieldsMap = new Map(); // key -> { key, description, charges }
  selectedJobIds.forEach((jobId) => {
    const jobRemiFields = getRemiFieldsForJob(jobId);
    jobRemiFields.forEach((rf) => {
      // Only add if not already present (use first job's description for each key)
      if (!allUsedRemiFieldsMap.has(rf.key)) {
        allUsedRemiFieldsMap.set(rf.key, {
          key: rf.key,
          description: rf.description,
          charges: 0, // Will be calculated per job
        });
      }
    });
  });
  
  // Convert map to array sorted by key (R1, R2, R3, R4, R5)
  const allUsedRemiFieldsArray = Array.from(allUsedRemiFieldsMap.values())
    .sort((a, b) => {
      const aNum = parseInt(a.key.replace('R', ''));
      const bNum = parseInt(b.key.replace('R', ''));
      return aNum - bNum;
    });
  
  // Update totalRemiDescriptions to use the filtered list
  totalRemiDescriptions = allUsedRemiFieldsArray.map(rf => rf.description);

  // Helper function to check if a field exists in any selected job
  // Returns true if the field key exists in any job (even if value is empty/null)
  const checkFieldExistsInAnyJob = (fieldKeys, jobKeys) => {
    for (const jobId of selectedJobIds) {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) continue;

      // Check in jobFieldValuesMap - check if the key exists in the map structure
      if (jobFieldValuesMap[jobId]) {
        const jobFields = jobFieldValuesMap[jobId];
        for (const key of fieldKeys) {
          // Check if any field in jobFields matches our key (case-insensitive)
          const fieldExists = Object.keys(jobFields).some(
            fieldKey => fieldKey.toLowerCase() === key.toLowerCase()
          );
          if (fieldExists) {
            return true;
          }
        }
      }

      // Check in job object - check if the key exists as a property
      for (const jobKey of jobKeys) {
        if (jobKey in job) {
          return true;
        }
      }
    }
    return false;
  };


  return (
    <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-full print:page-break-before-always">
      <div
        className="bg-white shadow-2xl print:shadow-none p-8 print:p-8 print:pt-4"
        style={{ minHeight: "29.7cm" }}
      >
        {/* Annexure Header */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          <div className="col-span-7">
            <div className="font-bold text-sm">
              Annexure to Inv No. {invoiceNo} Date {formatDateToDDMMYYYY(invoiceDate)}
            </div>
          </div>
          <div className="col-span-5 text-right">
            <div className="font-bold text-sm">
              {accountName}
            </div>
          </div>
        </div>

        {selectedJobIds.map((jobId, sectionIndex) => {
          const job = jobs.find((j) => j.id === jobId);
          const jobServiceCharge = jobServiceChargesMap[jobId];
          
          if (!job) return null;

          // Get administrative information
          const jobNo = job.job_no || "NA";
          const applicationDateRaw = getFieldValueFromJobFieldValue(
            jobId,
            "application_ref_date",
            jobFieldValuesMap
          ) || getFieldValueFromJobFieldValue(
            jobId,
            "Application Ref Date",
            jobFieldValuesMap
          ) || getFieldValueFromJobFieldValue(
            jobId,
            "application_date",
            jobFieldValuesMap
          ) || job.application_date || "NA";

          const authorisationDateRaw = getFieldValueFromJobFieldValue(
            jobId,
            "sanction___approval_date",
            jobFieldValuesMap
          ) || getFieldValueFromJobFieldValue(
            jobId,
            "Sanction Approval Date",
            jobFieldValuesMap
          ) || job.sanction___approval_date || "NA";
          const authorisationDate = formatDateToDDMMYYYY(authorisationDateRaw);


          const authorisationNo = getFieldValueFromJobFieldValue(
            jobId,
            "authorisation_no",
            jobFieldValuesMap
          ) || getFieldValueFromJobFieldValue(
            jobId,
            "Authorisation No",
            jobFieldValuesMap
          ) || job.authorisation_no || "NA";


          // Get claim and refund information
          const claimNo = getFieldValueFromJobFieldValue(
            jobId,
            "claim_no",
            jobFieldValuesMap
          ) || getFieldValueFromJobFieldValue(
            jobId,
            "Claim No",
            jobFieldValuesMap
          ) || job.claim_no || "NA";

          const claimDateRaw = getFieldValueFromJobFieldValue(
            jobId,
            "dbk_claim_date",
            jobFieldValuesMap
          ) || getFieldValueFromJobFieldValue(
            jobId,
            "DBK Claim Date",
            jobFieldValuesMap
          ) || job.dbk_claim_date || applicationDateRaw;
          const claimDate = formatDateToDDMMYYYY(claimDateRaw);

          // Get dynamic combined fields (No & Date pairs) for this job
          const dynamicCombinedFields = getDynamicCombinedFields(jobId, job, jobFieldValuesMap);

          // Get dynamic amount fields for this job
          const dynamicAmountFields = getDynamicAmountFields(jobId, job, jobFieldValuesMap);

          // Calculate charges for this job
          const jobCharges = jobServiceCharge
            ? calculateInvoiceAmount(job, jobServiceCharge)
            : { amount: 0 };

          // Get registration/other charges
          const regiOther = jobServiceCharge
            ? parseFloat(jobServiceCharge.registration_other_charges || 0)
            : 0;

          // Get CA cert count for this job
          const caCertCount = 
            getFieldValueFromJobFieldValue(jobId, "no_of_cac", jobFieldValuesMap) ||
            getFieldValueFromJobFieldValue(jobId, "No of CAC", jobFieldValuesMap) ||
            getFieldValueFromJobFieldValue(jobId, "noofcac", jobFieldValuesMap) ||
            job.no_of_cac;
          const caCertCountValue = parseInt(caCertCount) || 0;

          // Get CE cert count for this job
          const ceCertCount = 
            getFieldValueFromJobFieldValue(jobId, "no_of_cec", jobFieldValuesMap) ||
            getFieldValueFromJobFieldValue(jobId, "No of CEC", jobFieldValuesMap) ||
            getFieldValueFromJobFieldValue(jobId, "noofcec", jobFieldValuesMap) ||
            job.no_of_cec;
          const ceCertCountValue = parseInt(ceCertCount) || 0;

          // Get CA charges and multiply by cert count
          const caChargesBase = jobServiceCharge
            ? parseFloat(jobServiceCharge.ca_charges || 0)
            : 0;
          const caCharges = caChargesBase * caCertCountValue;

          // Get CE charges and multiply by cert count
          const ceChargesBase = jobServiceCharge
            ? parseFloat(jobServiceCharge.ce_charges || 0)
            : 0;
          const ceCharges = ceChargesBase * ceCertCountValue;

          // Get application fees
          let applFeeValue = 0;
          const applFeeFieldValue =
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
          
          if (applFeeFieldValue) {
            applFeeValue = parseFloat(applFeeFieldValue || 0);
          } else if (jobServiceCharge) {
            applFeeValue = parseFloat(jobServiceCharge.application_fees || 0);
          }

          // Get remi fields for this job
          const jobRemiFields = getRemiFieldsForJob(jobId);
          
          // Create a map of job's remi fields by key for quick lookup
          const jobRemiFieldsMap = new Map();
          jobRemiFields.forEach((rf) => {
            jobRemiFieldsMap.set(rf.key, rf);
          });
          
          // Create remi fields array based on allUsedRemiFieldsArray
          // Only include fields that are used by at least one job
          const remiFieldsArray = allUsedRemiFieldsArray.map((usedField) => {
            // Check if this job has this remi field
            const jobRemiField = jobRemiFieldsMap.get(usedField.key);
            if (jobRemiField) {
              return {
                key: jobRemiField.key,
                description: jobRemiField.description,
                charges: jobRemiField.charges,
              };
            } else {
              // Job doesn't have this field, show 0
              return {
                key: usedField.key,
                description: usedField.description,
                charges: 0,
              };
            }
          });

          // Get descriptive text from job.remark
          const descriptiveText = job.remark || "";

          return (
            <div key={jobId} className={`mb-8 ${sectionIndex > 0 ? 'print:page-break-before-always' : ''}`}>
              {/* Administrative Information Section */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                  <div className="flex items-center">
                    <span className="font-bold min-w-[130px]">Sr No :</span>
                    <span className="font-bold">{sectionIndex + 1}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-bold min-w-[130px]">Job No :</span>
                    <span className="font-bold">{jobNo || 'NA'}</span>
                  </div>
                </div>
                
                {/* Billing Fields Section */}
                {billingFieldNames.length > 0 && (
                  <div className="mt-2">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                      {billingFieldNames.map((fieldName, index) => {
                        // Get field value from JobFieldValue table for this job
                        const fieldValue = getFieldValueFromJobFieldValue(
                          jobId,
                          fieldName,
                          jobFieldValuesMap
                        ) || "NA";
                        return (
                          <div key={index} className="flex items-center">
                            <span className=" min-w-[130px]">{fieldName} :</span>
                            <span>{fieldValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Table Section */}
              <div className="invoice-table-container mb-4 max-w-[210mm] mx-auto" style={{ width: '100%', maxWidth: '210mm' }}>
                <table className="w-full border-collapse border border-black text-[10px] print:text-[9px]" style={{ tableLayout: 'auto', width: '100%' }}>
                  <thead>
                    <tr className="bg-white text-black">
                      <th className="border border-black px-1 py-1.5 text-left font-bold align-top">Claim No</th>
                      {dynamicCombinedFields.map((field, index) => (
                        <th key={index} className="border border-black px-1 py-1.5 text-left font-bold align-top">
                          {field.header}
                        </th>
                      ))}
                      {dynamicAmountFields.map((field, index) => (
                        <th key={index} className="border border-black px-1 py-1.5 text-left font-bold align-top">
                          {field.name}
                        </th>
                      ))}
                      <th className="border border-black px-1 py-1.5 text-left font-bold whitespace-nowrap align-top">Charges</th>
                      <th className="border border-black px-1 py-1.5 text-left font-bold whitespace-nowrap align-top">CA Charges</th>
                      <th className="border border-black px-1 py-1.5 text-left font-bold whitespace-nowrap align-top">CE Charges</th>
                      <th className="border border-black px-1 py-1.5 text-left font-bold whitespace-nowrap align-top">Regi/Oth</th>
                      <th className="border border-black px-1 py-1.5 text-left font-bold whitespace-nowrap align-top">Appl Fee</th>
                      {remiFieldsArray.map((remiField, index) => (
                        <th key={index} className="border border-black px-1 py-1.5 text-left font-bold align-top">
                          {remiField.description}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-1 py-1.5 align-top">
                        {claimNo}
                      </td>
                      {dynamicCombinedFields.map((field, index) => (
                        <td key={index} className="border border-black px-1 py-1.5 align-top">
                          {field.combinedValue}
                        </td>
                      ))}
                      {dynamicAmountFields.map((field, index) => (
                        <td key={index} className="border border-black px-1 py-1.5 align-top">
                          {field.value !== "NA" 
                            ? (typeof field.value === 'string' && field.value.startsWith('R-') 
                                ? field.value 
                                : (typeof field.value === 'string' && field.value.startsWith('D-')
                                    ? field.value
                                    : (typeof field.value === 'number' || !isNaN(parseFloat(field.value)))
                                      ? parseFloat(field.value).toFixed(2)
                                      : field.value))
                            : "NA"}
                        </td>
                      ))}
                      <td className="border border-black px-1 py-1.5 text-right whitespace-nowrap align-top">{jobCharges.amount.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1.5 text-right whitespace-nowrap align-top">{caCharges.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1.5 text-right whitespace-nowrap align-top">{ceCharges.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1.5 text-right whitespace-nowrap align-top">{regiOther.toFixed(2)}</td>
                      <td className="border border-black px-1 py-1.5 text-right whitespace-nowrap align-top">{applFeeValue.toFixed(2)}</td>
                      {remiFieldsArray.map((remiField, index) => (
                        <td key={index} className="border border-black px-1 py-1.5 text-right whitespace-nowrap align-top">
                          {remiField.charges.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Descriptive Text Section */}
              {descriptiveText && (
                <div className="text-xs mb-4">
                  descriptive : {descriptiveText}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Total Row Section */}
        <div className="mt-8">
          <div className="invoice-table-container max-w-[210mm] mx-auto" style={{ width: '100%', maxWidth: '210mm' }}>
            <table className="w-full border-collapse border border-black text-[10px] print:text-[9px]" style={{ tableLayout: 'auto', width: '100%' }}>
              <thead>
                <tr>
                  <th 
                    colSpan={1 + totalDynamicCombinedFieldsCount + totalDynamicAmountFieldsCount}
                    className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black whitespace-nowrap align-top"
                  >
                    {/* Empty header for label column */}
                  </th>
                  <th className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    Charges
                  </th>
                  <th className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    CA Charges
                  </th>
                  <th className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    CE Charges
                  </th>
                  <th className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    Regi/Oth
                  </th>
                  <th className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    Appl Fee
                  </th>
                  {allUsedRemiFieldsArray.map((usedField, index) => (
                    <th 
                      key={index}
                      className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black align-top"
                    >
                      {usedField.description}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td 
                    colSpan={1 + totalDynamicCombinedFieldsCount + totalDynamicAmountFieldsCount}
                    className="px-1 py-1.5 text-center font-bold text-black bg-white border border-black whitespace-nowrap align-top"
                  >
                    TOTAL
                  </td>
                  <td className="px-1 py-1.5 text-right font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    {totals.charges.toFixed(2)}
                  </td>
                  <td className="px-1 py-1.5 text-right font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    {totals.caCharges.toFixed(2)}
                  </td>
                  <td className="px-1 py-1.5 text-right font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    {totals.ceCharges.toFixed(2)}
                  </td>
                  <td className="px-1 py-1.5 text-right font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    {totals.regiOther.toFixed(2)}
                  </td>
                  <td className="px-1 py-1.5 text-right font-bold text-black bg-white border border-black whitespace-nowrap align-top">
                    {totals.applFee.toFixed(2)}
                  </td>
                  {allUsedRemiFieldsArray.map((usedField, index) => {
                    // Get the total for this REMI field by finding its index
                    const remiIndex = parseInt(usedField.key.replace('R', '')) - 1;
                    const remiTotal = (remiIndex >= 0 && remiIndex < 5) ? totals.remiFields[remiIndex] : 0;
                    return (
                    <td 
                      key={index}
                      className="px-1 py-1.5 text-right font-bold text-black bg-white border border-black whitespace-nowrap align-top"
                    >
                      {remiTotal.toFixed(2)}
                    </td>
                  )})}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
