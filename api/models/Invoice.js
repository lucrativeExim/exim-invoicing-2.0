const prisma = require('../lib/prisma');
const { getISTDateTime } = require('../lib/dateUtils');

class InvoiceModel {
  /**
   * Generate draft_view_id in format: D{account_id}{year_pair}{sequence}
   * Format: D + account_id + (last_2_digits_of_current_year + last_2_digits_of_next_year) + 4-digit sequence
   * Year pair updates on April 1st each year
   * Sequence resets to 0001 on April 1st for each account
   * 
   * Examples:
   * - D225260001 (Account 2, year 2526 (2025-2026), sequence 0001)
   * - D226270001 (Account 2, year 2627 (2026-2027), sequence 0001)
   * - D124250001 (Account 1, year 2425 (2024-2025), sequence 0001)
   */
  async generateDraftViewId(accountId) {
    if (!accountId) {
      throw new Error('account_id is required to generate draft_view_id');
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Year pair: If month >= April (4), use current year + next year
    // Otherwise, use previous year + current year
    // Use only last 2 digits of each year (e.g., 2025 -> 25, 2026 -> 26)
    let yearPair;
    if (currentMonth >= 4) {
      // April onwards: use current year + next year (e.g., 2025 -> 2526)
      const currentYearLastTwo = String(currentYear).slice(-2);
      const nextYearLastTwo = String(currentYear + 1).slice(-2);
      yearPair = `${currentYearLastTwo}${nextYearLastTwo}`;
    } else {
      // January-March: use previous year + current year (e.g., 2025 -> 2425)
      const prevYearLastTwo = String(currentYear - 1).slice(-2);
      const currentYearLastTwo = String(currentYear).slice(-2);
      yearPair = `${prevYearLastTwo}${currentYearLastTwo}`;
    }

    // Find the highest sequence number for this account and year pair
    // Look for invoices with draft_view_id matching pattern: D{account_id}{year_pair}*
    const pattern = `D${accountId}${yearPair}`;
    
    // Query invoices with draft_view_id that might match the pattern
    // We'll filter in JavaScript to ensure we get exact matches
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        draft_view_id: {
          not: null,
        },
        invoice_status: {
          not: 'Delete',
        },
      },
      select: {
        draft_view_id: true,
      },
    });

    // Filter invoices that match the pattern (D + account_id + year_pair)
    const matchingInvoices = existingInvoices.filter((invoice) => {
      return invoice.draft_view_id && invoice.draft_view_id.startsWith(pattern);
    });

    // Extract sequence numbers and find the maximum
    let maxSequence = 0;
    matchingInvoices.forEach((invoice) => {
      if (invoice.draft_view_id) {
        // Extract the last 4 digits (sequence)
        const sequenceStr = invoice.draft_view_id.slice(-4);
        const sequence = parseInt(sequenceStr, 10);
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });

    // Next sequence number
    const nextSequence = maxSequence + 1;
    const sequenceStr = String(nextSequence).padStart(4, '0');

    // Generate draft_view_id: D + account_id + year_pair + sequence
    const draftViewId = `D${accountId}${yearPair}${sequenceStr}`;

    return draftViewId;
  }

  /**
   * Generate proforma_view_id in format: P{account_id}{year_pair}{sequence}
   * Format: P + account_id + (last_2_digits_of_current_year + last_2_digits_of_next_year) + 4-digit sequence
   * Year pair updates on April 1st each year
   * Sequence resets to 0001 on April 1st for each account
   * 
   * Examples:
   * - P225260001 (Account 2, year 2526 (2025-2026), sequence 0001)
   * - P226270001 (Account 2, year 2627 (2026-2027), sequence 0001)
   * - P124250001 (Account 1, year 2425 (2024-2025), sequence 0001)
   */
  async generateProformaViewId(accountId) {
    if (!accountId) {
      throw new Error('account_id is required to generate proforma_view_id');
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Year pair: If month >= April (4), use current year + next year
    // Otherwise, use previous year + current year
    // Use only last 2 digits of each year (e.g., 2025 -> 25, 2026 -> 26)
    let yearPair;
    if (currentMonth >= 4) {
      // April onwards: use current year + next year (e.g., 2025 -> 2526)
      const currentYearLastTwo = String(currentYear).slice(-2);
      const nextYearLastTwo = String(currentYear + 1).slice(-2);
      yearPair = `${currentYearLastTwo}${nextYearLastTwo}`;
    } else {
      // January-March: use previous year + current year (e.g., 2025 -> 2425)
      const prevYearLastTwo = String(currentYear - 1).slice(-2);
      const currentYearLastTwo = String(currentYear).slice(-2);
      yearPair = `${prevYearLastTwo}${currentYearLastTwo}`;
    }

    // Find the highest sequence number for this account and year pair
    // Look for invoices with proforma_view_id matching pattern: P{account_id}{year_pair}*
    const pattern = `P${accountId}${yearPair}`;
    
    // Query invoices with proforma_view_id that might match the pattern
    // We'll filter in JavaScript to ensure we get exact matches
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        proforma_view_id: {
          not: null,
        },
        invoice_status: {
          not: 'Delete',
        },
      },
      select: {
        proforma_view_id: true,
      },
    });

    // Filter invoices that match the pattern (P + account_id + year_pair)
    const matchingInvoices = existingInvoices.filter((invoice) => {
      return invoice.proforma_view_id && invoice.proforma_view_id.startsWith(pattern);
    });

    // Extract sequence numbers and find the maximum
    let maxSequence = 0;
    matchingInvoices.forEach((invoice) => {
      if (invoice.proforma_view_id) {
        // Extract the last 4 digits (sequence)
        const sequenceStr = invoice.proforma_view_id.slice(-4);
        const sequence = parseInt(sequenceStr, 10);
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });

    // Next sequence number
    const nextSequence = maxSequence + 1;
    const sequenceStr = String(nextSequence).padStart(4, '0');

    // Generate proforma_view_id: P + account_id + year_pair + sequence
    const proformaViewId = `P${accountId}${yearPair}${sequenceStr}`;

    return proformaViewId;
  }

  /**
   * Get all invoices
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
    } = options;

    // Build where clause - exclude deleted invoices and filter out empty string invoice_stage_status
    // Empty strings cause Prisma enum validation errors, so we only include valid enum values or null
    const where = {};
    
    if (!includeDeleted) {
      where.invoice_status = { not: 'Delete' };
    }
    
    // Filter out records with empty string invoice_stage_status (causes Prisma enum errors)
    // Include only records with valid enum values or null
    where.OR = [
      { invoice_stage_status: null },
      { invoice_stage_status: { in: ['Draft', 'Proforma', 'Canceled'] } },
    ];

    return await prisma.invoice.findMany({
      where,
      include: {
        jobRegister: {
          include: {
            gstRate: true,
          },
        },
        invoiceSelectedJobs: {
          include: {
            job: {
              include: {
                jobFieldValues: {
                  orderBy: { field_name: 'asc' },
                },
                clientInfo: true,
                clientBu: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get invoice by ID
   */
  async findById(id, options = {}) {
    const {
      includeDeleted = false,
    } = options;

    const where = { id: parseInt(id) };
    if (!includeDeleted) {
      where.invoice_status = { not: 'Delete' };
    }

    return await prisma.invoice.findUnique({
      where,
      include: {
        jobRegister: {
          include: {
            gstRate: true,
          },
        },
        invoiceSelectedJobs: {
          include: {
            job: {
              include: {
                jobFieldValues: {
                  orderBy: { field_name: 'asc' },
                },
                clientInfo: true,
                clientBu: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find invoices by invoice_status and invoice_stage_status
   */
  async findByStatusAndStage(invoiceStatus, invoiceStageStatus, options = {}) {
    const where = {
      invoice_status: invoiceStatus,
      invoice_stage_status: invoiceStageStatus,
    };

    return await prisma.invoice.findMany({
      where,
      include: {
        jobRegister: true,
        invoiceSelectedJobs: {
          include: {
            job: true,
          },
        },
        addedByUser: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Create a new invoice with selected jobs
   */
  async create(data) {
    try {
      const {
      account_id, // Account ID for generating draft_view_id
      job_register_id,
      billing_type,
      invoice_type,
      pay_amount,
      amount,
      professional_charges,
      registration_other_charges,
      ca_charges,
      ce_charges,
      ca_cert_count,
      ce_cert_count,
      application_fees,
      remi_one_charges,
      remi_two_charges,
      remi_three_charges,
      remi_four_charges,
      remi_five_charges,
      reward_amount,
      discount_amount,
      note,
      po_no,
      irn_no,
      job_ids, // Array of job IDs to create InvoiceSelectedJob entries
      added_by,
    } = data;

    // Generate draft_view_id if account_id is provided
    let draftViewId = null;
    if (account_id) {
      try {
        draftViewId = await this.generateDraftViewId(parseInt(account_id));
        console.log(`Generated draft_view_id: ${draftViewId} for account_id: ${account_id}`);
      } catch (error) {
        console.error('Error generating draft_view_id:', error);
        // Continue without draft_view_id if generation fails
      }
    } else {
      console.warn('No account_id provided; draft_view_id will be null');
    }

    // Helper function to convert to Decimal-compatible value
    const toDecimal = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    // Create invoice with selected jobs in a transaction
    return await prisma.$transaction(async (tx) => {
      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          draft_view_id: draftViewId, // Auto-generated draft view ID
          job_register_id: job_register_id ? parseInt(job_register_id) : null,
          billing_type: billing_type || null,
          invoice_type: invoice_type || null,
          pay_amount: pay_amount ? String(pay_amount) : null,
          amount: amount ? String(amount) : null,
          professional_charges: toDecimal(professional_charges),
          registration_other_charges: toDecimal(registration_other_charges),
          ca_charges: toDecimal(ca_charges),
          ce_charges: toDecimal(ce_charges),
          ca_cert_count: ca_cert_count ? parseInt(ca_cert_count) : null,
          ce_cert_count: ce_cert_count ? parseInt(ce_cert_count) : null,
          application_fees: toDecimal(application_fees),
          remi_one_charges: toDecimal(remi_one_charges),
          remi_two_charges: toDecimal(remi_two_charges),
          remi_three_charges: toDecimal(remi_three_charges),
          remi_four_charges: toDecimal(remi_four_charges),
          remi_five_charges: toDecimal(remi_five_charges),
          reward_amount: toDecimal(reward_amount),
          discount_amount: toDecimal(discount_amount),
          note: note || null,
          po_no: po_no || null,
          irn_no: irn_no || null,
          status: 'Open',
          invoice_status: 'Active',
          invoice_stage_status: 'Draft',
          created_at: getISTDateTime(), // Use Indian Standard Time
          added_by: added_by ? parseInt(added_by) : null,
        },
      });

      // Create InvoiceSelectedJob entries for each selected job
      // invoice_id references invoices.id (the invoice we just created)
      if (job_ids && Array.isArray(job_ids) && job_ids.length > 0) {
        console.log(`Creating ${job_ids.length} InvoiceSelectedJob records for invoice_id: ${invoice.id}`);
        
        await Promise.all(
          job_ids.map((job_id) => {
            const parsedJobId = parseInt(job_id);
            if (isNaN(parsedJobId)) {
              throw new Error(`Invalid job_id: ${job_id}`);
            }
            
            // Build data object with relations
            const invoiceSelectedJobData = {
              invoice: {
                connect: { id: invoice.id } // Connect to the invoice using relation
              },
              job: {
                connect: { id: parsedJobId } // Connect to the job using relation
              },
            };

            // Add createdByUser relation if added_by is provided
            if (added_by) {
              invoiceSelectedJobData.createdByUser = {
                connect: { id: parseInt(added_by) }
              };
            }

            // Add created_at with IST time
            invoiceSelectedJobData.created_at = getISTDateTime();

            return tx.invoiceSelectedJob.create({
              data: invoiceSelectedJobData,
            }).catch((error) => {
              console.error(`Error creating InvoiceSelectedJob for job_id ${parsedJobId}:`, error);
              throw error;
            });
          })
        );
        
        console.log(`Successfully created ${job_ids.length} InvoiceSelectedJob records`);
      }

      // Return invoice with selected jobs
      return await tx.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          jobRegister: true,
          invoiceSelectedJobs: {
            include: {
              job: true,
            },
          },
        },
      });
    });
    } catch (error) {
      console.error('Error in Invoice.create:', error);
      console.error('Data received:', JSON.stringify(data, null, 2));
      throw error;
    }
  }

  /**
   * Update invoice
   */
  async update(id, data) {
    const {
      billing_type,
      invoice_type,
      pay_amount,
      amount,
      professional_charges,
      registration_other_charges,
      ca_charges,
      ce_charges,
      ca_cert_count,
      ce_cert_count,
      application_fees,
      remi_one_charges,
      remi_two_charges,
      remi_three_charges,
      remi_four_charges,
      remi_five_charges,
      reward_amount,
      discount_amount,
      note,
      po_no,
      irn_no,
      status,
      invoice_status,
      invoice_stage_status,
      proforma_created_by,
    } = data;

    // If shifting to Proforma, generate proforma_view_id
    let proformaViewId = null;
    if (invoice_stage_status === 'Proforma') {
      // First, fetch the invoice to get account_id from jobs
      const existingInvoice = await prisma.invoice.findUnique({
        where: { id: parseInt(id) },
        include: {
          invoiceSelectedJobs: {
            include: {
              job: {
                include: {
                  clientInfo: true,
                },
              },
            },
          },
        },
      });

      if (existingInvoice) {
        // Get account_id from first job's clientInfo
        let accountId = null;
        if (existingInvoice.invoiceSelectedJobs && existingInvoice.invoiceSelectedJobs.length > 0) {
          const firstJob = existingInvoice.invoiceSelectedJobs[0].job;
          if (firstJob && firstJob.clientInfo && firstJob.clientInfo.account_id) {
            accountId = firstJob.clientInfo.account_id;
          }
        }

        // Only generate proforma_view_id if account_id is found and proforma_view_id doesn't exist
        if (accountId && !existingInvoice.proforma_view_id) {
          try {
            proformaViewId = await this.generateProformaViewId(parseInt(accountId));
            console.log(`Generated proforma_view_id: ${proformaViewId} for account_id: ${accountId}`);
          } catch (error) {
            console.error('Error generating proforma_view_id:', error);
            // Continue without proforma_view_id if generation fails
          }
        } else if (existingInvoice.proforma_view_id) {
          // If proforma_view_id already exists, keep it
          proformaViewId = existingInvoice.proforma_view_id;
        }
      }
    }

    // Build update data
    const updateData = {
      ...(billing_type !== undefined && { billing_type }),
      ...(invoice_type !== undefined && { invoice_type }),
      ...(pay_amount !== undefined && { pay_amount }),
      ...(amount !== undefined && { amount }),
      ...(professional_charges !== undefined && { professional_charges: parseFloat(professional_charges) }),
      ...(registration_other_charges !== undefined && { registration_other_charges: parseFloat(registration_other_charges) }),
      ...(ca_charges !== undefined && { ca_charges: parseFloat(ca_charges) }),
      ...(ce_charges !== undefined && { ce_charges: parseFloat(ce_charges) }),
      ...(ca_cert_count !== undefined && { ca_cert_count: ca_cert_count ? parseInt(ca_cert_count) : null }),
      ...(ce_cert_count !== undefined && { ce_cert_count: ce_cert_count ? parseInt(ce_cert_count) : null }),
      ...(application_fees !== undefined && { application_fees: parseFloat(application_fees) }),
      ...(remi_one_charges !== undefined && { remi_one_charges: parseFloat(remi_one_charges) }),
      ...(remi_two_charges !== undefined && { remi_two_charges: parseFloat(remi_two_charges) }),
      ...(remi_three_charges !== undefined && { remi_three_charges: parseFloat(remi_three_charges) }),
      ...(remi_four_charges !== undefined && { remi_four_charges: parseFloat(remi_four_charges) }),
      ...(remi_five_charges !== undefined && { remi_five_charges }),
      ...(reward_amount !== undefined && { reward_amount: parseFloat(reward_amount) }),
      ...(discount_amount !== undefined && { discount_amount: parseFloat(discount_amount) }),
      ...(note !== undefined && { note }),
      ...(po_no !== undefined && { po_no }),
      ...(irn_no !== undefined && { irn_no }),
      ...(status !== undefined && { status }),
      ...(invoice_status !== undefined && { invoice_status }),
      ...(invoice_stage_status !== undefined && { invoice_stage_status }),
    };

    // Add proforma_view_id if generated
    if (proformaViewId !== null) {
      updateData.proforma_view_id = proformaViewId;
    }

    // Set proforma_created_at and proforma_created_by when shifting to Proforma
    if (invoice_stage_status === 'Proforma') {
      updateData.proforma_created_at = getISTDateTime();
      if (proforma_created_by !== undefined) {
        updateData.proforma_created_by = proforma_created_by ? parseInt(proforma_created_by) : null;
      }
    }

    return await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        jobRegister: true,
        invoiceSelectedJobs: {
          include: {
            job: true,
          },
        },
      },
    });
  }

  /**
   * Delete invoice (soft delete)
   */
  async delete(id, deleted_by) {
    return await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: {
        invoice_status: 'Delete',
        canceled_at: new Date(),
        canceled_by: deleted_by || null,
      },
    });
  }
}

module.exports = new InvoiceModel();

