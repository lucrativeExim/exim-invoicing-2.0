const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const InvoiceService = require('./InvoiceService');

class PdfService {
  /**
   * Get logo as base64 from API images directory
   */
  static getLogoBase64() {
    try {
      // Logo is in api/images/invoice-logo.png
      const logoPath = path.join(__dirname, '../images/invoice-logo.png');
      
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        return `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
      
      console.warn('Logo not found at:', logoPath);
      return null;
    } catch (error) {
      console.error('Error loading logo:', error);
      return null;
    }
  }

  /**
   * Generate PDF from invoice data
   * @param {Object} invoiceData - Invoice data from InvoiceService.calculateInvoiceBreakdown
   * @param {Object} account - Account data
   * @param {string} invoiceNo - Invoice number
   * @param {string} invoiceDate - Invoice date
   * @param {Array} jobIds - Array of job IDs
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generateInvoicePdf(invoiceData, account, invoiceNo, invoiceDate, jobIds, logoBase64 = null) {
    // Use provided logo or get from file system
    const logo = logoBase64 || this.getLogoBase64();
    const html = this.generateInvoiceHtml(invoiceData, account, invoiceNo, invoiceDate, jobIds, logo);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      // Set viewport to match A4 dimensions (210mm x 297mm)
      // At 96 DPI: 210mm = 794px, 297mm = 1123px
      // Using higher resolution for better quality: 1240 x 1754 (1.5x scale)
      await page.setViewport({ 
        width: 1240, 
        height: 1754,
        deviceScaleFactor: 1.5
      });
      
      // Set content and wait for everything to load
      await page.setContent(html, { 
        waitUntil: ['load', 'networkidle0'],
        timeout: 30000
      });
      
      // Wait for fonts to be ready
      await page.evaluate(async () => {
        await document.fonts.ready;
        // Force style recalculation
        document.body.offsetHeight;
        return true;
      });
      
      // Additional wait to ensure styles are applied and content is rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify annexure is present if needed
      if (jobIds.length > 1) {
        const annexureExists = await page.evaluate(() => {
          return document.querySelector('.annexure-page') !== null;
        });
        if (!annexureExists) {
          console.warn('Annexure page not found in HTML');
        }
      }
      
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false
      });
      
      return pdf;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate HTML for invoice
   */
  static generateInvoiceHtml(invoiceData, account, invoiceNo, invoiceDate, jobIds, logoBase64) {
    const billingType = invoiceData.billingType || invoiceData.billing_type;
    const jobs = invoiceData.jobs || [];
    const jobServiceChargesMap = invoiceData.jobServiceChargesMap || {};
    const billingFieldNames = invoiceData.billingFieldNames || [];
    const firstJob = jobs.length > 0 ? jobs[0] : null;
    const clientInfo = jobIds.length > 0 ? jobServiceChargesMap[jobIds[0]] : null;
    const jobRegister = invoiceData.jobRegister || null;
    const jobCodeName = jobRegister?.job_code || "NA";
    const sacNo = jobRegister?.gstRate?.sac_no || "NA";

    // Build jobFieldValuesMap
    const jobFieldValuesMap = {};
    jobs.forEach((job) => {
      if (job.id && job.jobFieldValues) {
        jobFieldValuesMap[job.id] = {};
        job.jobFieldValues.forEach((fv) => {
          jobFieldValuesMap[job.id][fv.field_name] = fv.field_value;
        });
      }
    });

    // Helper to get field value
    const getFieldValue = (jobId, fieldName) => {
      if (!jobId || !fieldName || !jobFieldValuesMap[jobId]) return null;
      const fieldMap = jobFieldValuesMap[jobId];
      if (fieldMap[fieldName]) return fieldMap[fieldName];
      const lowerFieldName = fieldName.toLowerCase();
      for (const key in fieldMap) {
        if (key.toLowerCase() === lowerFieldName) {
          return fieldMap[key];
        }
      }
      return null;
    };

    // Calculate service subtotal
    const calculateServiceSubtotal = () => {
      let subtotal = parseFloat(invoiceData.professionalCharges || 0);
      subtotal += parseFloat(invoiceData.registrationCharges || 0);
      subtotal += parseFloat(invoiceData.caCharges || 0);
      subtotal += parseFloat(invoiceData.ceCharges || 0);
      if (billingType !== "Reimbursement") {
        subtotal -= parseFloat(invoiceData.rewardAmount || 0);
        subtotal -= parseFloat(invoiceData.discountAmount || 0);
      }
      return subtotal;
    };

    const serviceSubtotal = calculateServiceSubtotal();
    const gst = invoiceData.gst || {};
    const remiFields = invoiceData.remiFields || [];

    // Number to words function (simplified)
    const numberToWords = (num) => {
      // Simplified version - you can enhance this
      return `Rupees ${num.toFixed(2)} Only`;
    };

    const totalInWords = numberToWords(invoiceData.finalAmount || 0);
    const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;" />` : '<div class="logo-placeholder">LOGO</div>';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      font-family: "Times New Roman", "Times", serif !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
      color: #000 !important;
      background: white !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
    }
    body * {
      font-family: "Times New Roman", "Times", serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .invoice-container {
      max-width: 100%;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    .invoice-page {
      background: white !important;
      padding: 0px !important;
      margin: 0px !important;
      page-break-after: auto;
      page-break-inside: auto;
      width: 100% !important;
      min-height: auto;
      display: block !important;
    }
    .header-section {
      display: grid;
      grid-template-columns: 7fr 1fr 4fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .company-info {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .logo-container {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .logo-placeholder {
      width: 80px;
      height: 80px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      border: 1px solid #ddd;
    }
    .company-name {
      font-weight: bold !important;
      font-size: 14px !important;
      margin-top: 16px;
      line-height: 1.2;
    }
    .billed-to {
      font-weight: bold !important;
      font-size: 11px !important;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .client-address {
      font-size: 11px !important;
      font-weight: normal !important;
      margin-left: 20px;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .invoice-details-box {
      padding: 12px;
    }
    .invoice-title {
      font-weight: bold !important;
      font-size: 14px !important;
      margin-bottom: 4px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 5fr 7fr;
      gap: 4px;
      font-size: 11px !important;
    }
    .detail-label {
      font-weight: 600 !important;
    }
    .charges-section {
      margin-bottom: 16px;
    }
    .charges-header {
      background: #000 !important;
      color: #fff !important;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      font-weight: bold !important;
      font-size: 11px !important;
      margin-bottom: 8px;
    }
    .charges-content {
      padding: 0;
    }
    .charges-row {
      display: grid;
      grid-template-columns: 9fr 1fr 2fr;
      gap: 16px;
      margin-bottom: 8px;
      font-size: 11px !important;
    }
    .field-row {
      display: grid;
      grid-template-columns: 6fr 4fr;
      gap: 16px;
      font-size: 11px !important;
      margin-bottom: 4px;
    }
    .note-section {
      padding: 12px 0;
      border-top: 1px solid #000 !important;
      border-bottom: 1px solid #000 !important;
      margin-bottom: 16px;
      font-size: 11px !important;
    }
    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 8px;
    }
    .bank-details {
      font-size: 11px !important;
    }
    .bank-title {
      font-weight: bold !important;
      font-size: 11px !important;
      margin-bottom: 4px;
    }
    .charges-breakdown {
      font-size: 11px !important;
    }
    .breakdown-row {
      display: grid;
      grid-template-columns: 9fr 1fr 2fr;
      gap: 4px;
      margin-bottom: 4px;
      font-size: 11px !important;
    }
    .breakdown-row.total {
      border-top: 1px solid #000 !important;
      margin-top: 8px;
      padding-top: 8px;
      font-weight: bold !important;
      font-size: 14px !important;
    }
    .total-words {
      padding: 12px 0;
      border-top: 1px solid #000 !important;
      border-bottom: 1px solid #000 !important;
      margin-bottom: 16px;
      font-size: 11px !important;
    }
    .footer {
      text-align: center;
      font-size: 11px !important;
      margin-bottom: 8px;
    }
    .signature {
      text-align: right;
      font-weight: 600 !important;
      font-size: 12px !important;
      margin-bottom: 8px;
    }
    .footer-note {
      text-align: center;
      font-size: 10px !important;
      margin-bottom: 8px;
    }
    .annexure-page {
      page-break-before: always !important;
      background: white !important;
      padding: 20px;
      display: block !important;
      visibility: visible !important;
      page-break-after: auto;
      page-break-inside: auto;
      width: 100% !important;
      min-height: auto;
    }
    .annexure-header {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .annexure-title {
      font-weight: bold !important;
      font-size: 12px !important;
    }
    table {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse !important;
      font-size: 10px !important;
      margin-bottom: 16px !important;
      display: table !important;
      visibility: visible !important;
      border: 1px solid #000 !important;
      table-layout: auto !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }
    table th, table td {
      border: 1px solid #000 !important;
      padding: 6px !important;
      text-align: left !important;
      display: table-cell !important;
      visibility: visible !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      max-width: 0 !important;
    }
    table th {
      background: #f0f0f0 !important;
      font-weight: bold !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    table tbody {
      display: table-row-group !important;
    }
    table thead {
      display: table-header-group !important;
    }
    table tr {
      display: table-row !important;
      page-break-inside: avoid !important;
    }
    table tfoot {
      display: table-footer-group !important;
    }
    /* Prevent content overflow */
    img, svg {
      max-width: 100% !important;
      height: auto !important;
    }
    /* Ensure proper page breaks */
    .invoice-page, .annexure-page {
      overflow: visible !important;
    }
    /* Prevent breaking critical sections */
    .charges-section, .bottom-section, .total-words {
      page-break-inside: avoid !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; height: auto; background: white;">
  <div class="invoice-container">
    ${this.generateInvoicePageHtml(invoiceData, account, invoiceNo, invoiceDate, jobIds, billingType, jobs, jobServiceChargesMap, billingFieldNames, firstJob, clientInfo, jobCodeName, sacNo, jobFieldValuesMap, getFieldValue, serviceSubtotal, gst, remiFields, totalInWords, logoImg)}
    ${jobIds.length > 1 ? this.generateAnnexureHtml(invoiceNo, invoiceDate, account?.account_name || "NA", jobIds, jobs, jobServiceChargesMap, jobFieldValuesMap, getFieldValue, billingFieldNames, invoiceData) : ''}
  </div>
</body>
</html>
    `;
  }

  static generateInvoicePageHtml(invoiceData, account, invoiceNo, invoiceDate, jobIds, billingType, jobs, jobServiceChargesMap, billingFieldNames, firstJob, clientInfo, jobCodeName, sacNo, jobFieldValuesMap, getFieldValue, serviceSubtotal, gst, remiFields, totalInWords, logoImg) {
    return `
    <div class="invoice-page">
      <div class="header-section">
        <div class="company-info">
          <div class="logo-container">
            ${logoImg}
          </div>
          <div style="flex: 1;">
            <div class="company-name">${this.escapeHtml(account?.account_name || "NA")}</div>
            <div style="margin-top: 8px;">
              <div class="billed-to">Billed To : ${this.escapeHtml(clientInfo?.client_name || "NA")}</div>
              ${clientInfo?.client_address ? `<div class="client-address">${this.escapeHtml(clientInfo.client_address)}</div>` : ''}
              <div class="billed-to">GSTN No : ${this.escapeHtml(clientInfo?.gst_no || "NA")}</div>
              <div class="billed-to">Kind Attn : ${this.escapeHtml(clientInfo?.concern_person || "NA")}</div>
              <div class="billed-to">Emails : ${this.escapeHtml(clientInfo?.concern_email_id || "NA")}</div>
            </div>
          </div>
        </div>
        <div></div>
        <div class="invoice-details-box">
          <div class="invoice-title">${billingType === "Reimbursement" ? "Reimbursement/Debit Note" : "GST Invoice"}</div>
          <div class="detail-grid">
            <div class="detail-label">Invoice No. :</div>
            <div>${this.escapeHtml(invoiceNo)}</div>
            <div class="detail-label">Date :</div>
            <div>${this.escapeHtml(invoiceDate)}</div>
            <div class="detail-label">Job No :</div>
            <div>${jobIds.length > 1 ? "As Per Annexure" : this.escapeHtml(firstJob?.job_no || "NA")}</div>
            <div class="detail-label">Customer ID :</div>
            <div>${this.escapeHtml(clientInfo?.group_id || "NA")}</div>
            <div class="detail-label">PO No :</div>
            <div>${this.escapeHtml(invoiceData.po_no || "NA")}</div>
            <div class="detail-label">IRN No. :</div>
            <div>${this.escapeHtml(invoiceData.irn_no || "NA")}</div>
          </div>
        </div>
      </div>

      <div class="charges-section">
        <div class="charges-header">
          <span>${billingType === "Reimbursement" ? "PARTICULARS" : "PROFESSIONAL SERVICE CHARGES REGARDING"}</span>
          <span>AMOUNT</span>
        </div>
        <div class="charges-content">
          <div class="charges-row">
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">DETAILS: ${this.escapeHtml(jobCodeName)}</div>
              ${billingFieldNames.map(fieldName => {
                const fieldValue = jobIds.length > 0 ? getFieldValue(jobIds[0], fieldName) : null;
                return `
                <div class="field-row">
                  <div>${this.escapeHtml(fieldName)}</div>
                  <div>${jobIds.length > 1 ? "As Per Annexure" : this.escapeHtml(fieldValue || "NA")}</div>
                </div>
                `;
              }).join('')}
              <div style="margin-top: 8px; font-weight: 600;">CHARGES AS UNDER:</div>
              ${clientInfo?.invoice_description ? `<div style="font-size: 11px; margin-top: 4px;">${this.escapeHtml(clientInfo.invoice_description)}</div>` : ''}
            </div>
            <div style="text-align: right;">₹</div>
            <div style="text-align: right;">
              ${billingType === "Reimbursement" && invoiceData.applicationFees && invoiceData.remiCharges
                ? (parseFloat(invoiceData.applicationFees || 0) + parseFloat(invoiceData.remiCharges || 0)).toFixed(2)
                : parseFloat(invoiceData.professionalCharges || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
                <div class="note-section">
        <span style="font-weight: 600;">NOTE :</span>   ${invoiceData.note && invoiceData.note.trim() !== "" ? `
      
     ${this.escapeHtml(invoiceData.note)} ` : ''} 
      </div>
    

      <div class="bottom-section">
        <div class="bank-details">
          <div class="bank-title">BANK Details</div>
          <div>${this.escapeHtml(account?.bank_name || "NA")}</div>
          <div>Branch - ${this.escapeHtml(account?.bank_address || "NA")}</div>
          <div>A/C No. ${this.escapeHtml(account?.account_no || "NA")}</div>
          <div>IFSC Code - ${this.escapeHtml(account?.ifsc_no || "NA")}</div>
          <div style="margin-top: 20px;">
            <div>SAC No. : ${this.escapeHtml(sacNo)}</div>
            <div>GST Detail : ${this.escapeHtml(account?.gst_no || "NA")}</div>
            <div>PAN No. : ${this.escapeHtml(account?.pan_no || "NA")}</div>
            <div>MSME Registration No. : ${this.escapeHtml(account?.msme_details || "NA")}</div>
          </div>
        </div>
        <div class="charges-breakdown">
          ${billingType !== "Reimbursement" ? `
            ${parseFloat(invoiceData.rewardAmount || 0) > 0 ? `
            <div class="breakdown-row">
              <div>Reward</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.rewardAmount || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            ${parseFloat(invoiceData.discountAmount || 0) > 0 ? `
            <div class="breakdown-row">
              <div>Discount</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.discountAmount || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            ${parseFloat(invoiceData.registrationCharges || 0) > 0 ? `
            <div class="breakdown-row">
              <div>Registration/Other Charges</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.registrationCharges || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            ${parseFloat(invoiceData.caCharges || 0) > 0 ? `
            <div class="breakdown-row">
              <div>Arrangement of CA CERT. (${invoiceData.caCertCount || 0} Nos)</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.caCharges || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            ${parseFloat(invoiceData.ceCharges || 0) > 0 ? `
            <div class="breakdown-row">
              <div>Arrangement of CE CERT. (${invoiceData.ceCertCount || 0} Nos)</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.ceCharges || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            <div class="breakdown-row">
              <div style="font-weight: 600;">Subtotal</div>
              <div style="font-weight: 600;">₹</div>
              <div style="text-align: right; font-weight: 600;">${serviceSubtotal.toFixed(2)}</div>
            </div>
            ${gst.cgstRate > 0 ? `
            <div class="breakdown-row">
              <div>C GST: ${gst.cgstRate}%</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(gst.cgstAmount || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            ${gst.sgstRate > 0 ? `
            <div class="breakdown-row">
              <div>S GST: ${gst.sgstRate}%</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(gst.sgstAmount || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            ${gst.igstRate > 0 ? `
            <div class="breakdown-row">
              <div>I GST: ${gst.igstRate}%</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(gst.igstAmount || 0).toFixed(2)}</div>
            </div>
            ` : ''}
          ` : ''}
          ${billingType !== "Service" ? `
            <div style="margin-top: 8px; font-weight: 600;">Reimbursements</div>
            ${parseFloat(invoiceData.applicationFees || 0) > 0 ? `
            <div class="breakdown-row">
              <div>Application Fees</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.applicationFees || 0).toFixed(2)}</div>
            </div>
            ` : ''}
            ${remiFields.map(remiField => `
            <div class="breakdown-row">
              <div>${this.escapeHtml(remiField.description)}</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(remiField.charges || 0).toFixed(2)}</div>
            </div>
            `).join('')}
          ` : ''}
          <div class="breakdown-row total">
            <div>TOTAL</div>
            <div>₹</div>
            <div style="text-align: right;">${parseFloat(invoiceData.finalAmount || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div class="total-words">
        <span style="font-weight: 600;">Rs. </span>${totalInWords}
      </div>

      <div class="footer">
        <div style="font-weight: 600; margin-bottom: 2px;">Thank You For Business.</div>
      </div>
      <div class="signature margin-bottom: 5px;">
        For ${this.escapeHtml(account?.account_name || "NA")}
      </div>
      <div class="footer-note margin-top: 15px;">
        Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK Market, Bibwewadi, Pune, Ph:+91 20 3511 3202, Website: www.lucrative.co.in As Per Rule 46(q) of GST act 2017 said Invoice is digitally signed
      </div>
    </div>
    `;
  }

  static generateAnnexureHtml(invoiceNo, invoiceDate, accountName, jobIds, jobs, jobServiceChargesMap, jobFieldValuesMap, getFieldValue, billingFieldNames, invoiceData) {
    // Format date helper
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === "NA" || dateStr === null || dateStr === undefined) return "NA";
      try {
        const dateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          return `${day}-${month}-${year}`;
        }
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}-${month}-${year}`;
        }
        return String(dateStr);
      } catch {
        return String(dateStr);
      }
    };

    // Helper to get field value with multiple key variations
    const getFieldValueMulti = (jobId, keys, jobKeys = []) => {
      for (const key of keys) {
        const value = getFieldValue(jobId, key);
        if (value && value !== "NA" && value !== null && value !== undefined && String(value).trim() !== "") {
          return value;
        }
      }
      const job = jobs.find((j) => {
        const jId = parseInt(j.id);
        const compareId = parseInt(jobId);
        return jId === compareId || String(j.id) === String(jobId);
      });
      if (job) {
        for (const jobKey of jobKeys) {
          if (job[jobKey] && job[jobKey] !== "NA" && job[jobKey] !== null && job[jobKey] !== undefined) {
            return job[jobKey];
          }
        }
      }
      return null;
    };

    // Get dynamic combined fields (No & Date pairs)
    const getDynamicCombinedFields = (jobId) => {
      const fieldPairs = [
        {
          header: "Lic No & Date",
          noField: { keys: ["license_no", "License No", "licenseno", "lic_no", "Lic No"], jobKeys: ["license_no"] },
          dateField: { keys: ["license_date", "License Date", "licensedate", "lic_date", "Lic Date"], jobKeys: ["license_date"] }
        },
        {
          header: "Aut No & Date",
          noField: { keys: ["authorisation_no", "Authorisation No", "authorisationno", "auth_no", "Auth No"], jobKeys: ["authorisation_no"] },
          dateField: { keys: ["sanction___approval_date", "Sanction Approval Date", "authorisation_date", "Authorisation Date"], jobKeys: ["sanction___approval_date", "authorisation_date"] }
        }
      ];

      const availableFields = [];
      fieldPairs.forEach(pair => {
        const noValue = getFieldValueMulti(jobId, pair.noField.keys, pair.noField.jobKeys);
        const dateValue = getFieldValueMulti(jobId, pair.dateField.keys, pair.dateField.jobKeys);
        if (noValue || dateValue) {
          const noStr = noValue ? String(noValue).trim() : "";
          const dateStr = dateValue ? formatDate(dateValue) : "";
          const combined = noStr && dateStr ? `${noStr} / ${dateStr}` : (noStr || dateStr || "NA");
          availableFields.push({ header: pair.header, combinedValue: combined });
        }
      });
      return availableFields;
    };

    // Get dynamic amount fields
    const getDynamicAmountFields = (jobId) => {
      const fields = [
        { name: "Lic Amt", keys: ["license_amount", "License Amount", "licenseamount", "license_amt", "License Amt"], jobKeys: ["license_amount"] }
      ];
      const availableFields = [];
      fields.forEach(field => {
        const value = getFieldValueMulti(jobId, field.keys, field.jobKeys);
        if (value && value !== "NA") {
          const numValue = parseFloat(value);
          availableFields.push({ name: field.name, value: isNaN(numValue) ? value : numValue });
        }
      });
      return availableFields;
    };

    // Get remi fields for a job
    const getRemiFieldsForJob = (jobId) => {
      const jobServiceCharge = jobServiceChargesMap[jobId];
      if (!jobServiceCharge) return [];
      const remiFieldsArray = [];
      const remiFieldsConfig = [
        { desc: "remi_one_desc", charges: "remi_one_charges", key: "R1" },
        { desc: "remi_two_desc", charges: "remi_two_charges", key: "R2" },
        { desc: "remi_three_desc", charges: "remi_three_charges", key: "R3" },
        { desc: "remi_four_desc", charges: "remi_four_charges", key: "R4" },
        { desc: "remi_five_desc", charges: "remi_five_charges", key: "R5" },
      ];
      remiFieldsConfig.forEach((field) => {
        const description = jobServiceCharge[field.desc];
        const charges = jobServiceCharge[field.charges];
        if (description && String(description).trim() !== "" && String(description).toUpperCase() !== "NULL") {
          const parsedCharges = parseFloat(charges) || 0;
          remiFieldsArray.push({ key: field.key, description: String(description).trim(), charges: parsedCharges });
        }
      });
      return remiFieldsArray;
    };

    // Collect all used remi fields across all jobs
    const allUsedRemiFieldsMap = new Map();
    jobIds.forEach((jobId) => {
      const jobRemiFields = getRemiFieldsForJob(jobId);
      jobRemiFields.forEach((rf) => {
        if (!allUsedRemiFieldsMap.has(rf.key)) {
          allUsedRemiFieldsMap.set(rf.key, rf);
        }
      });
    });
    const allUsedRemiFieldsArray = Array.from(allUsedRemiFieldsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    // Calculate totals
    const totals = {
      charges: 0,
      caCharges: 0,
      ceCharges: 0,
      regiOther: 0,
      applFee: 0,
      remiFields: [0, 0, 0, 0, 0]
    };

    let annexureHtml = `
    <div class="annexure-page" style="display: block !important; visibility: visible !important;">
      <div class="annexure-header">
        <div class="annexure-title">
          Annexure to Inv No. ${this.escapeHtml(invoiceNo)} Date ${formatDate(invoiceDate)}
        </div>
        <div class="annexure-title" style="text-align: right;">
          ${this.escapeHtml(accountName)}
        </div>
      </div>
    `;

    // Ensure jobIds is an array
    const jobIdsArray = Array.isArray(jobIds) ? jobIds : [];
    
    if (jobIdsArray.length === 0) {
      return annexureHtml + `</div>`;
    }

    // Process each job
    jobIdsArray.forEach((jobId, sectionIndex) => {
      const job = jobs.find((j) => {
        const jId = parseInt(j.id);
        const compareId = parseInt(jobId);
        return jId === compareId || String(j.id) === String(jobId);
      });
      
      if (!job) return;

      const jobServiceCharge = jobServiceChargesMap[jobId];
      const jobNo = job.job_no || "NA";
      
      // Get claim number
      const claimNo = getFieldValueMulti(jobId, 
        ["claim_no", "Claim No"], 
        ["claim_no"]
      ) || jobNo;

      // Get dynamic fields
      const dynamicCombinedFields = getDynamicCombinedFields(jobId);
      const dynamicAmountFields = getDynamicAmountFields(jobId);
      const jobRemiFields = getRemiFieldsForJob(jobId);
      const jobRemiFieldsMap = new Map();
      jobRemiFields.forEach((rf) => jobRemiFieldsMap.set(rf.key, rf));
      const remiFieldsArray = allUsedRemiFieldsArray.map((usedField) => {
        const jobRemiField = jobRemiFieldsMap.get(usedField.key);
        return jobRemiField || { key: usedField.key, description: usedField.description, charges: 0 };
      });

      // Calculate charges
      const professionalCharges = invoiceData.jobProfessionalChargesMap?.[jobId] || 
                                   invoiceData.jobProfessionalChargesMap?.[parseInt(jobId)] ||
                                   invoiceData.jobProfessionalChargesMap?.[String(jobId)] ||
                                   0;
      totals.charges += professionalCharges;

      // Get CA/CE charges
      const caCertCount = parseInt(getFieldValueMulti(jobId, ["no_of_cac", "No of CAC", "noofcac"], ["no_of_cac"]) || 0);
      const ceCertCount = parseInt(getFieldValueMulti(jobId, ["no_of_cec", "No of CEC", "noofcec"], ["no_of_cec"]) || 0);
      const caChargesBase = jobServiceCharge ? parseFloat(jobServiceCharge.ca_charges || 0) : 0;
      const ceChargesBase = jobServiceCharge ? parseFloat(jobServiceCharge.ce_charges || 0) : 0;
      const caCharges = caChargesBase * caCertCount;
      const ceCharges = ceChargesBase * ceCertCount;
      totals.caCharges += caCharges;
      totals.ceCharges += ceCharges;

      // Get registration/other charges
      const regiOther = jobServiceCharge ? parseFloat(jobServiceCharge.registration_other_charges || 0) : 0;
      totals.regiOther += regiOther;

      // Get application fees
      let applFeeValue = 0;
      const applFeeFieldValue = getFieldValueMulti(jobId, 
        ["appl_fee_duty_paid", "Appl Fees Paid", "appl_fees_paid", "application_fees"],
        []
      );
      if (applFeeFieldValue) {
        applFeeValue = parseFloat(applFeeFieldValue) || 0;
      } else if (jobServiceCharge) {
        applFeeValue = parseFloat(jobServiceCharge.application_fees || 0) || 0;
      }
      totals.applFee += applFeeValue;

      // Update remi totals
      remiFieldsArray.forEach((rf, idx) => {
        const remiIndex = parseInt(rf.key.replace('R', '')) - 1;
        if (remiIndex >= 0 && remiIndex < 5) {
          totals.remiFields[remiIndex] += rf.charges;
        }
      });

      // Get billing field values for display
      const licenseNo = getFieldValueMulti(jobId, ["license_no", "License No", "licenseno", "lic_no"], ["license_no"]) || "NA";
      const fileNo = getFieldValueMulti(jobId, ["file_no", "File No", "fileno"], []) || "NA";
      const licenseAmount = getFieldValueMulti(jobId, ["license_amount", "License Amount", "licenseamount", "license_amt"], ["license_amount"]) || "NA";

      // Build job section
      annexureHtml += `
      <div style="margin-bottom: 20px;">
        <!-- Administrative Information -->
        <div style="margin-bottom: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px;">
          <div>
            <div style="margin-bottom: 4px;"><span style="font-weight: bold;">Sr No :</span> <span style="font-weight: bold;">${sectionIndex + 1}</span></div>
            <div style="margin-bottom: 4px;"><span style="font-weight: bold;">License No :</span> ${this.escapeHtml(String(licenseNo))}</div>
            <div><span style="font-weight: bold;">File No :</span> ${this.escapeHtml(String(fileNo))}</div>
          </div>
          <div>
            <div style="margin-bottom: 4px;"><span style="font-weight: bold;">Job No :</span> <span style="font-weight: bold;">${this.escapeHtml(jobNo)}</span></div>
            <div><span style="font-weight: bold;">License Amount :</span> ${this.escapeHtml(String(licenseAmount))}</div>
          </div>
        </div>

        <!-- Charges Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #000 !important; font-size: 10px;">
          <thead>
            <tr style="background: #f0f0f0 !important;">
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">Claim No</th>
              ${dynamicCombinedFields.map(field => `
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">${this.escapeHtml(field.header)}</th>
              `).join('')}
              ${dynamicAmountFields.map(field => `
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">${this.escapeHtml(field.name)}</th>
              `).join('')}
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">CA Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">CE Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">Regi/Oth</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">Appl Fee</th>
              ${remiFieldsArray.map(rf => `
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left;">${this.escapeHtml(rf.description)}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000 !important; padding: 4px 6px;">${this.escapeHtml(String(claimNo))}</td>
              ${dynamicCombinedFields.map(field => `
              <td style="border: 1px solid #000 !important; padding: 4px 6px;">${this.escapeHtml(field.combinedValue)}</td>
              `).join('')}
              ${dynamicAmountFields.map(field => {
                const val = field.value;
                const displayVal = typeof val === 'number' ? val.toFixed(2) : (val && !isNaN(parseFloat(val)) ? parseFloat(val).toFixed(2) : String(val));
                return `<td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right;">${this.escapeHtml(displayVal)}</td>`;
              }).join('')}
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right;">${parseFloat(professionalCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right;">${parseFloat(caCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right;">${parseFloat(ceCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right;">${parseFloat(regiOther).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right;">${parseFloat(applFeeValue).toFixed(2)}</td>
              ${remiFieldsArray.map(rf => `
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right;">${parseFloat(rf.charges).toFixed(2)}</td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      `;
    });

    // Add total row
    const totalDynamicCombinedFieldsCount = jobIdsArray.length > 0 ? getDynamicCombinedFields(jobIdsArray[0]).length : 0;
    const totalDynamicAmountFieldsCount = jobIdsArray.length > 0 ? getDynamicAmountFields(jobIdsArray[0]).length : 0;

    annexureHtml += `
      <!-- Total Row -->
      <div style="margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000 !important; font-size: 10px;">
          <thead>
            <tr>
              <th colspan="${1 + totalDynamicCombinedFieldsCount + totalDynamicAmountFieldsCount}" style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;"></th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;">Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;">CA Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;">CE Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;">Regi/Oth</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;">Appl Fee</th>
              ${allUsedRemiFieldsArray.map(rf => `
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;">${this.escapeHtml(rf.description)}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="${1 + totalDynamicCombinedFieldsCount + totalDynamicAmountFieldsCount}" style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center;">TOTAL</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right;">${parseFloat(totals.charges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right;">${parseFloat(totals.caCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right;">${parseFloat(totals.ceCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right;">${parseFloat(totals.regiOther).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right;">${parseFloat(totals.applFee).toFixed(2)}</td>
              ${allUsedRemiFieldsArray.map(rf => {
                const remiIndex = parseInt(rf.key.replace('R', '')) - 1;
                const remiTotal = (remiIndex >= 0 && remiIndex < 5) ? totals.remiFields[remiIndex] : 0;
                return `<td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right;">${parseFloat(remiTotal).toFixed(2)}</td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Section -->
      <div style="text-align: right; margin-top: 15px; margin-bottom: 20px;">
        <span style="font-weight: 600; font-size: 14px;">For ${this.escapeHtml(accountName || "NA")}</span>
      </div>
      <div style="padding: 0 12px; margin-bottom: 8px;">
        <div style="text-align: center; margin-top: 20px;">
          <span style="font-size: 12px;">
            Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK Market, Bibwewadi, Pune,
            Ph:+91 20 3511 3202, Website: www.lucrative.co.in As Per Rule 46(q) of GST act
            2017 said Invoice is digitally signed
          </span>
        </div>
      </div>
    </div>
    `;

    return annexureHtml;
  }

  /**
   * Escape HTML to prevent XSS
   */
  static escapeHtml(text) {
    if (text == null) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = PdfService;
