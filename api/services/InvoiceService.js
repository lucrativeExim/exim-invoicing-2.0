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
   */
  static calculateProfessionalCharges(job, jobServiceCharge, jobFieldValues) {
    if (!jobServiceCharge) {
      return 0;
    }

    const min = parseFloat(jobServiceCharge.min || 0);
    const max = parseFloat(jobServiceCharge.max || 0);
    const inPercentage = parseFloat(jobServiceCharge.in_percentage || 0);
    const fixed = parseFloat(jobServiceCharge.fixed || 0);
    const perShb = parseFloat(jobServiceCharge.per_shb || 0);

    // Get per_shb value from JobFieldValue (try multiple field name variations)
    const perShbValue = this.getFieldValueFromJobFieldValue(
      jobFieldValues,
      'per_shb'
    ) || this.getFieldValueFromJobFieldValue(jobFieldValues, 'Per SHB') || '0';
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
    console.log("gstRate", gstRate);
    console.log("gstType", gstType);
    
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
    } else if (billingType === 'Service & Reimbursement') {
      finalAmount =
        serviceSubtotal +
        reimbursementSubtotal +
        gst.cgstAmount +
        gst.sgstAmount +
        gst.igstAmount;
      payAmount = finalAmount;
    }

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
    };
  }
}

module.exports = InvoiceService;

