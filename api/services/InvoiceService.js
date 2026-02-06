const prisma = require('../lib/prisma');
const Job = require('../models/Job');
const JobServiceCharge = require('../models/JobServiceCharge');

class InvoiceService {
  /**
   * Helper function to get field value from JobFieldValue
   * Supports multiple field name variations (case-insensitive, with/without underscores/spaces)
   */
  static getFieldValueFromJobFieldValue(jobFieldValues, fieldName) {
    if (!jobFieldValues || !Array.isArray(jobFieldValues) || !fieldName) {
      return null;
    }

    // Try exact match first
    const exactMatch = jobFieldValues.find(
      (fv) => fv.field_name && fv.field_name.toLowerCase() === fieldName.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.field_value;
    }

    // Try variations: replace underscores with spaces and vice versa
    const variations = [
      fieldName.replace(/_/g, ' '),
      fieldName.replace(/\s+/g, '_'),
      fieldName.replace(/_/g, '').toLowerCase(),
    ];

    for (const variation of variations) {
      const match = jobFieldValues.find(
        (fv) => fv.field_name && fv.field_name.toLowerCase() === variation.toLowerCase()
      );
      if (match) {
        return match.field_value;
      }
    }

    return null;
  }

  /**
   * Calculate professional charges for a job
   * Based on job service charge: min, max, in_percentage, fixed, per_shb
   * Matches the client-side calculation logic with 12 different formulas
   */
  static calculateProfessionalCharges(job, jobServiceCharge, jobFieldValues) {
    if (!job || !jobServiceCharge) {
      return 0;
    }

    // Fetch claim_amount_after_finalization from JobFieldValues table
    const claimAmountValue =
      this.getFieldValueFromJobFieldValue(
        jobFieldValues,
        'claim_amount_after_finalization'
      ) ||
      this.getFieldValueFromJobFieldValue(
        jobFieldValues,
        'Claim Amount after Finalization'
      );
    const claimAmount = parseFloat(claimAmountValue || 0);

    // Fetch quantity from JobFieldValues table
    const quantityValue =
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'quantity') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'Quantity');
    const quantity = parseFloat(quantityValue || job.quantity || 0);

    const fixed = parseFloat(jobServiceCharge.fixed || 0);
    const inPercentage = parseFloat(jobServiceCharge.in_percentage || 0);
    const min = parseFloat(jobServiceCharge.min || 0);
    const max = parseFloat(jobServiceCharge.max || 0);
    const perShb = parseFloat(jobServiceCharge.per_shb || 0);
    const percentagePerShb = jobServiceCharge.percentage_per_shb === 'Yes';
    const fixedPercentagePerShb = jobServiceCharge.fixed_percentage_per_shb === 'Yes';

    // Calculate percentage amount (based on claim_amount_after_finalization)
    const percentageAmount = (claimAmount * inPercentage) / 100;

    // Calculate per unit amount (quantity * per_shb from service charge)
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

    return parseFloat(calculatedAmount.toFixed(2));
  }

  /**
   * Calculate registration charges for a job
   */
  static calculateRegistrationCharges(jobServiceCharge) {
    if (!jobServiceCharge) {
      return 0;
    }
    return parseFloat(jobServiceCharge.registration_other_charges || 0);
  }

  /**
   * Calculate CA charges for a job
   * Formula: no_of_cac from JobFieldValue * job_service_charges.ca_charges
   */
  static calculateCaCharges(jobServiceCharge, jobFieldValues) {
    if (!jobServiceCharge) {
      return 0;
    }

    const noOfCacValue =
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'no_of_cac') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'No of CAC') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'noofcac') ||
      '0';

    const noOfCac = parseFloat(noOfCacValue) || 0;
    const caCharges = parseFloat(jobServiceCharge.ca_charges || 0);

    return noOfCac * caCharges;
  }

  /**
   * Calculate CE charges for a job
   * Formula: no_of_cec from JobFieldValue * job_service_charges.ce_charges
   */
  static calculateCeCharges(jobServiceCharge, jobFieldValues) {
    if (!jobServiceCharge) {
      return 0;
    }

    const noOfCecValue =
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'no_of_cec') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'No of CEC') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'noofcec') ||
      '0';

    const noOfCec = parseFloat(noOfCecValue) || 0;
    const ceCharges = parseFloat(jobServiceCharge.ce_charges || 0);

    return noOfCec * ceCharges;
  }

  /**
   * Calculate application fees for a job
   * From JobFieldValue: appl_fee_duty_paid
   */
  static calculateApplicationFees(jobFieldValues) {
    const applFeeValue =
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'appl_fee_duty_paid') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'Appl Fees Paid') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'appl_fees_paid') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'application_fees') ||
      '0';

    return parseFloat(applFeeValue) || 0;
  }

  /**
   * Get CA cert count for a job
   */
  static getCaCertCount(jobFieldValues) {
    const noOfCacValue =
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'no_of_cac') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'No of CAC') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'noofcac') ||
      '0';

    return parseInt(noOfCacValue) || 0;
  }

  /**
   * Get CE cert count for a job
   */
  static getCeCertCount(jobFieldValues) {
    const noOfCecValue =
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'no_of_cec') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'No of CEC') ||
      this.getFieldValueFromJobFieldValue(jobFieldValues, 'noofcec') ||
      '0';

    return parseInt(noOfCecValue) || 0;
  }

  /**
   * Get remi fields from job service charge
   */
  static getRemiFields(jobServiceCharge) {
    if (!jobServiceCharge) {
      return [];
    }

    const remiFields = [];
    const remiFieldsConfig = [
      { desc: 'remi_one_desc', charges: 'remi_one_charges' },
      { desc: 'remi_two_desc', charges: 'remi_two_charges' },
      { desc: 'remi_three_desc', charges: 'remi_three_charges' },
      { desc: 'remi_four_desc', charges: 'remi_four_charges' },
      { desc: 'remi_five_desc', charges: 'remi_five_charges' },
    ];

    
    remiFieldsConfig.forEach((field) => {
      const description = jobServiceCharge[field.desc];
      const charges = jobServiceCharge[field.charges];

      if (
        description &&
        description !== null &&
        description !== undefined &&
        String(description).trim() !== '' &&
        String(description).toUpperCase() !== 'NULL'
      ) {
        let parsedCharges = 0;
        if (charges !== null && charges !== undefined) {
          const chargesStr = String(charges).trim();
          if (chargesStr !== '' && chargesStr.toUpperCase() !== 'NULL') {
            parsedCharges = parseFloat(chargesStr) || 0;
          }
        }
        remiFields.push({
          description: String(description).trim(),
          charges: parsedCharges,
          fieldName: field.charges,
        });
      }
    });

    return remiFields;
  }

  /**
   * Calculate GST amounts based on gst_type from job_service_charges
   * @param {number} subtotal - The subtotal amount to calculate GST on
   * @param {object} gstRate - The GST rate object with cgst, sgst, igst rates
   * @param {string} gstType - The GST type: 'SC', 'I', or 'EXEMPTED'
   * 
   * Rules:
   * - 'SC' (State + Central): Calculate CGST and SGST, set IGST to 0
   * - 'I' (Interstate): Calculate IGST, set CGST and SGST to 0
   * - 'EXEMPTED': Set all GST amounts to 0
   */
  static calculateGst(subtotal, gstRate, gstType = null) {

    
    if (!gstRate) {
      return {
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
      };
    }

    const cgstRate = parseFloat(gstRate.cgst || 0);
    const sgstRate = parseFloat(gstRate.sgst || 0);
    const igstRate = parseFloat(gstRate.igst || 0);

    // Initialize amounts based on gst_type
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    // Handle GST calculation based on gst_type
    if (gstType === 'SC') {
      // State + Central GST: Calculate CGST and SGST, set IGST to 0
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstAmount = (subtotal * sgstRate) / 100;
      igstAmount = 0;
    } else if (gstType === 'I') {
      // Interstate GST: Calculate IGST, set CGST and SGST to 0
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = (subtotal * igstRate) / 100;
    } else if (gstType === 'EXEMPTED') {
      // Exempted: All GST amounts are 0
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = 0;
    } else {
      // Default behavior (when gstType is null or unknown): Calculate all
      // This maintains backward compatibility
      cgstAmount = (subtotal * cgstRate) / 100;
      sgstAmount = (subtotal * sgstRate) / 100;
      igstAmount = (subtotal * igstRate) / 100;
    }

    return {
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
    };
  }

  /**
   * Calculate invoice breakdown for given jobs
   */
  static async calculateInvoiceBreakdown(jobIds, billingType, rewardAmount = 0, discountAmount = 0) {
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      throw new Error('At least one job ID is required');
    }

    // Fetch all jobs with their service charges and field values
    const jobs = await prisma.job.findMany({
      where: {
        id: { in: jobIds.map((id) => parseInt(id)) },
        job_id_status: { not: 'Delete' },
      },
      include: {
        jobServiceCharges: {
          where: {
            status: { not: 'Delete' },
          },
          take: 1, // Take first active service charge
        },
        jobFieldValues: {
          orderBy: { field_name: 'asc' },
        },
        clientInfo: {
          select: {
            id: true,
            account_id: true,
          },
        },
        jobRegister: {
          include: {
            gstRate: true,
          },
        },
      },
    });

    if (jobs.length === 0) {
      throw new Error('No valid jobs found');
    }

    // Get invoice_type from first job (all jobs should have same invoice_type)
    const invoiceType = jobs[0].invoice_type || null;

    // Get job_register_id from first job
    const jobRegisterId = jobs[0].job_register_id || null;

    // Get account_id from first job's clientInfo
    const accountId = jobs[0].clientInfo?.account_id || null;

    // Get GST rate from first job's jobRegister
    const gstRate = jobs[0].jobRegister?.gstRate || null;

    // Get gst_type from first job's service charge
    const gstType = jobs[0].jobServiceCharges?.[0]?.gst_type || null;

    // Initialize totals
    let totalProfessionalCharges = 0;
    let totalRegistrationCharges = 0;
    let totalCaCharges = 0;
    let totalCeCharges = 0;
    let totalApplicationFees = 0;
    let totalCaCertCount = 0;
    let totalCeCertCount = 0;
    const remiFields = [];
    const remiChargesMap = {
      remi_one_charges: 0,
      remi_two_charges: 0,
      remi_three_charges: 0,
      remi_four_charges: 0,
      remi_five_charges: 0,
    };

    // Calculate charges for each job
    for (const job of jobs) {
      const jobServiceCharge = job.jobServiceCharges?.[0] || null;
      const jobFieldValues = job.jobFieldValues || [];

      // Calculate professional charges
      totalProfessionalCharges += this.calculateProfessionalCharges(
        job,
        jobServiceCharge,
        jobFieldValues
      );
      

      // Calculate registration charges
      totalRegistrationCharges += this.calculateRegistrationCharges(jobServiceCharge);

      // Calculate CA charges
      totalCaCharges += this.calculateCaCharges(jobServiceCharge, jobFieldValues);

      // Calculate CE charges
      totalCeCharges += this.calculateCeCharges(jobServiceCharge, jobFieldValues);

      // Calculate application fees
      totalApplicationFees += this.calculateApplicationFees(jobFieldValues);

      // Get cert counts
      totalCaCertCount += this.getCaCertCount(jobFieldValues);
      totalCeCertCount += this.getCeCertCount(jobFieldValues);

      // Get remi fields and sum charges across all jobs
      if (jobServiceCharge) {
        const jobRemiFields = this.getRemiFields(jobServiceCharge);
        
        // If this is the first job, initialize remiFields array with descriptions
        if (remiFields.length === 0) {
          jobRemiFields.forEach((remiField) => {
            remiFields.push({
              description: remiField.description,
              charges: 0, // Will be summed below
              fieldName: remiField.fieldName,
            });
          });
        }

        // Sum charges for each remi field across all jobs
        jobRemiFields.forEach((remiField) => {
          // Find matching remiField by fieldName and add charges
          const existingRemiField = remiFields.find(
            (rf) => rf.fieldName === remiField.fieldName
          );
          if (existingRemiField) {
            existingRemiField.charges += remiField.charges;
          }else{
            remiFields.push({
              description: remiField.description,
              charges: remiField.charges,
              fieldName: remiField.fieldName,
            });
          }

          // Also populate remi charges map (sum across all jobs)
          if (remiChargesMap[remiField.fieldName] !== undefined) {
            remiChargesMap[remiField.fieldName] += remiField.charges;
          }
        });
      }
    }

    // Calculate base amount (professional charges)
    const baseAmount = totalProfessionalCharges;
    
    // Calculate service subtotal (base + registration + CA + CE + reward - discount)
    const serviceSubtotal =
      baseAmount +
      totalRegistrationCharges +
      totalCaCharges +
      totalCeCharges +
      parseFloat(rewardAmount || 0) -
      parseFloat(discountAmount || 0);

    // Calculate GST (pass gst_type from job_service_charges)
    const gst = this.calculateGst(serviceSubtotal, gstRate, gstType);

    // Calculate reimbursement subtotal (application fees + remi charges)
    const totalRemiCharges = Object.values(remiChargesMap).reduce(
      (sum, val) => sum + parseFloat(val || 0),
      0
    );
    const reimbursementSubtotal = totalApplicationFees + totalRemiCharges;

    // Calculate final amounts based on billing type
    let finalAmount = 0;
    let payAmount = 0;
    if (billingType === 'Service') {
      finalAmount = serviceSubtotal + gst.cgstAmount + gst.sgstAmount + gst.igstAmount;
      payAmount = finalAmount;
    } else if (billingType === 'Reimbursement') {
      finalAmount = reimbursementSubtotal;
      payAmount = finalAmount;
    } else if (billingType === 'Service_Reimbursement') {
      finalAmount =
        serviceSubtotal +
        reimbursementSubtotal +
        gst.cgstAmount +
        gst.sgstAmount +
        gst.igstAmount;
      payAmount = finalAmount;
    }

    // Fetch job register for job code and SAC No
    let jobRegister = null;
    if (jobRegisterId) {
      try {
        jobRegister = await prisma.jobRegister.findUnique({
          where: { id: jobRegisterId },
          include: {
            gstRate: true,
          },
        });
      } catch (error) {
        console.error('Error fetching job register:', error);
      }
    }

    // Fetch billing field names from job register fields
    let billingFieldNames = [];
    if (jobRegisterId) {
      try {
        const jobRegisterField = await prisma.jobRegisterField.findFirst({
          where: {
            job_register_id: jobRegisterId,
            status: 'Active',
          },
        });

        if (jobRegisterField && jobRegisterField.form_fields_json) {
          let fields = jobRegisterField.form_fields_json;
          if (typeof fields === 'string') {
            fields = JSON.parse(fields);
          }
          if (Array.isArray(fields)) {
            billingFieldNames = fields
              .filter((field) => field.billing === true)
              .map((field) => field.name);
          }
        }
      } catch (error) {
        console.error('Error fetching billing field names:', error);
      }
    }

    // Prepare jobs data for display (with all fields needed for AnnexureTable)
    // Also calculate professional charges per job for AnnexureTable
    const jobsData = [];
    const jobServiceChargesMap = {};
    const jobProfessionalChargesMap = {};

    jobs.forEach((job) => {
      const serviceCharge = job.jobServiceCharges?.[0];
      const jobFieldValues = job.jobFieldValues || [];

      // Calculate professional charges for this job
      const professionalCharges = this.calculateProfessionalCharges(
        job,
        serviceCharge,
        jobFieldValues
      );
      jobProfessionalChargesMap[job.id] = professionalCharges;

      // Prepare job data
      jobsData.push({
        id: job.id,
        job_no: job.job_no,
        application_date: job.application_date,
        sanction___approval_date: job.sanction___approval_date,
        authorisation_no: job.authorisation_no,
        claim_no: job.claim_no,
        dbk_claim_date: job.dbk_claim_date,
        no_of_cac: job.no_of_cac,
        no_of_cec: job.no_of_cec,
        remark: job.remark,
        jobFieldValues: jobFieldValues,
      });

      // Prepare job service charges map (for client info)
      if (serviceCharge) {
        jobServiceChargesMap[job.id] = {
          client_name: serviceCharge.client_name,
          client_address: serviceCharge.client_address,
          gst_no: serviceCharge.gst_no,
          concern_person: serviceCharge.concern_person,
          concern_email_id: serviceCharge.concern_email_id,
          group_id: serviceCharge.group_id,
          invoice_description: serviceCharge.invoice_description,
          registration_other_charges: serviceCharge.registration_other_charges,
          ca_charges: serviceCharge.ca_charges,
          ce_charges: serviceCharge.ce_charges,
          application_fees: serviceCharge.application_fees,
          remi_one_desc: serviceCharge.remi_one_desc,
          remi_one_charges: serviceCharge.remi_one_charges,
          remi_two_desc: serviceCharge.remi_two_desc,
          remi_two_charges: serviceCharge.remi_two_charges,
          remi_three_desc: serviceCharge.remi_three_desc,
          remi_three_charges: serviceCharge.remi_three_charges,
          remi_four_desc: serviceCharge.remi_four_desc,
          remi_four_charges: serviceCharge.remi_four_charges,
          remi_five_desc: serviceCharge.remi_five_desc,
          remi_five_charges: serviceCharge.remi_five_charges,
        };
      }
    });

    return {
      // Job info
      jobIds,
      jobRegisterId,
      accountId,
      invoiceType,
      billingType,

      // Base amounts
      amount: baseAmount,
      professionalCharges: totalProfessionalCharges,
      registrationCharges: totalRegistrationCharges,
      caCharges: totalCaCharges,
      ceCharges: totalCeCharges,
      applicationFees: totalApplicationFees,

      // Cert counts
      caCertCount: totalCaCertCount,
      ceCertCount: totalCeCertCount,

      // Remi charges
      remiFields,
      remiCharges: remiChargesMap,
      remiOneCharges: remiChargesMap.remi_one_charges,
      remiTwoCharges: remiChargesMap.remi_two_charges,
      remiThreeCharges: remiChargesMap.remi_three_charges,
      remiFourCharges: remiChargesMap.remi_four_charges,
      remiFiveCharges: remiChargesMap.remi_five_charges,

      // Reward/Discount
      rewardAmount: parseFloat(rewardAmount || 0),
      discountAmount: parseFloat(discountAmount || 0),

      // GST
      gst,

      // Subtotals
      serviceSubtotal,
      reimbursementSubtotal,

      // Final amounts
      finalAmount,
      payAmount,

      // Additional data for display
      jobs: jobsData,
      jobServiceChargesMap,
      jobProfessionalChargesMap, // Per-job professional charges for AnnexureTable
      jobRegister: jobRegister ? {
        job_code: jobRegister.job_code,
        gstRate: jobRegister.gstRate ? {
          sac_no: jobRegister.gstRate.sac_no,
        } : null,
      } : null,
      billingFieldNames,
    };
  }
}

module.exports = InvoiceService;

