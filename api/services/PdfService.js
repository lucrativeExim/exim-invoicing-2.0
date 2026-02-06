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
      
      // Verify annexure is present if needed and calculate page numbers
      let annexurePageCount = 0;
      if (jobIds.length > 1) {
        const annexureExists = await page.evaluate(() => {
          return document.querySelector('.annexure-page') !== null;
        });
        if (!annexureExists) {
          console.warn('Annexure page not found in HTML');
        } else {
          // Calculate annexure pages by checking content height
          annexurePageCount = await page.evaluate(() => {
            const annexureElement = document.querySelector('.annexure-page');
            if (!annexureElement) return 0;
            // A4 page height in pixels at 96 DPI: ~1123px (297mm)
            // Account for margins: ~1000px usable height per page
            const pageHeight = 1000; // Approximate usable height per page
            const contentHeight = annexureElement.scrollHeight;
            return Math.max(1, Math.ceil(contentHeight / pageHeight));
          });
          
          // Update page numbers in annexure header
          await page.evaluate((totalPages) => {
            const pageNumberElements = document.querySelectorAll('.annexure-page-number, .annexure-current-page');
            pageNumberElements.forEach(el => {
              if (el.classList.contains('annexure-current-page')) {
                el.textContent = '1'; // Will be updated per page
              } else if (el.textContent.includes('of')) {
                el.textContent = el.textContent.replace(/of \d+/, `of ${totalPages}`);
              }
            });
          }, annexurePageCount);
        }
      }
      
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '0.0cm',
          right: '0.0cm',
          bottom: '2.0cm',
          left: '0.0cm'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        headerTemplate: '<div></div>',
        footerTemplate: '<div></div>'
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
        const quantityValue = getFieldValue(jobId, fieldName);
        
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

    // Number to words function
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
      return "Rupees " + result + " Only";
    };

    const totalInWords = numberToWords(invoiceData.finalAmount || 0);
    const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;" />` : '<div class="logo-placeholder">LOGO</div>';

    // Create watermark CSS with logo
    const watermarkStyle = `
      @page {
        size: A4 portrait;
        margin: 1.0cm;
      }
    `;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${watermarkStyle}
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
      position: relative !important;
    }
    /* Ensure watermark appears on all pages including blank pages - using html element */
    html::before {
      content: "";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: -1;
      width: 500px;
      height: 500px;
      background-image: url('${logoBase64 || ''}');
      background-repeat: no-repeat;
      background-position: center center;
      background-size: contain;
      opacity: 0.20;
      filter: grayscale(100%) brightness(1.0);
      pointer-events: none;
      display: ${logoBase64 ? 'block' : 'none'};
      /* Ensure it appears on every page */
      page-break-inside: avoid;
      page-break-after: avoid;
      page-break-before: avoid;
    }
    body::before {
      content: "";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: -1;
      width: 500px;
      height: 500px;
      background-image: url('${logoBase64 || ''}');
      background-repeat: no-repeat;
      background-position: center center;
      background-size: contain;
      opacity: 0.20;
      filter: grayscale(100%) brightness(1.0);
      pointer-events: none;
      display: ${logoBase64 ? 'block' : 'none'};
      /* Ensure it appears on every page */
      page-break-inside: avoid;
      page-break-after: avoid;
      page-break-before: avoid;
    }
    body * {
      font-family: "Times New Roman", "Times", serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .invoice-container {
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .invoice-page {
      background: white !important;
      padding: 0px !important;
      margin: 0px !important;
      page-break-after: auto !important;
      page-break-inside: avoid !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
      height: auto !important;
      display: block !important;
      box-sizing: border-box !important;
      position: relative !important;
    }
    .header-section {
      display: grid;
      grid-template-columns: 7fr 1fr 4fr;
      gap: 16px;
      margin-bottom: 1px;
    }
    .company-info {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1px;
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
    .company-name-wrapper {
      flex: 1;
      margin-top: 16px;
    }
    .company-name {
      font-weight: bold !important;
      font-size: 16px !important;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .billed-to-section {
      margin-bottom: 8px;
    }
    .billed-to {
      font-weight: 600 !important;
      font-size: 12px !important;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .billed-to-label {
      font-weight: 600 !important;
    }
    .billed-to-value {
      font-weight: normal !important;
    }
    .client-address {
      font-size: 12px !important;
      font-weight: normal !important;
      margin-left: 20px;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .invoice-details-box {
      padding: 2px;
    }
    .invoice-title {
      font-weight: bold !important;
      font-size: 16px !important;
      margin-bottom: 4px;
      text-align: left;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 5fr 7fr;
      gap: 0;
      font-size: 12px !important;
    }
    .detail-label {
      font-weight: normal !important;
    }
    .charges-section {
      margin-bottom: 10px;
    }
    .charges-header {
      background: #374151 !important;
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
      padding: 8px 0;
      border-top: 1px solid #000 !important;
      border-bottom: 1px solid #000 !important;
      margin-bottom: 8px;
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
      margin-bottom: 8px;
      font-size: 11px !important;
    }
    .footer {
      text-align: center;
      font-size: 11px !important;
      margin-bottom: 10px;
    }
    .signature {
      text-align: right;
      font-weight: 600 !important;
      font-size: 12px !important;
      margin-top: 25px;
      padding-top: 25px;
    }
    .footer-note {
      text-align: center;
      font-size: 10px !important;
      margin-bottom: 8px;
    }
    .annexure-page {
      page-break-before: always !important;
      background: white !important;
      padding: 0px !important;
      margin: 0px !important;
      display: block !important;
      visibility: visible !important;
      page-break-after: auto !important;
      page-break-inside: avoid !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
      height: auto !important;
      box-sizing: border-box !important;
      position: relative !important;
    }
    .annexure-header {
      display: grid;
      grid-template-columns: 7fr 5fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    @media print {
      .annexure-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: white;
        z-index: 1000;
        padding: 8px 0px;
        border-bottom: 1px solid #e5e7eb;
        page-break-inside: avoid;
        margin-bottom: 0;
      }
      .annexure-content-start {
        padding-top: 10px;
      }
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
    /* Watermark styling - appears on every page, centered, big and faint */
    /* Using fixed positioning ensures it appears on every printed page in PDFs */
    .watermark {
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: -1 !important;
      pointer-events: none !important;
      width: 500px !important;
      height: 500px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      /* Ensure watermark appears on every page */
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
      page-break-before: avoid !important;
    }
    .watermark img {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      opacity: 0.10 !important;
      filter: grayscale(100%) brightness(1.0) !important;
    }
    /* Ensure watermark appears on every printed page */
    @media print {
      .watermark {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: -1 !important;
        pointer-events: none !important;
        width: 500px !important;
        height: 500px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        /* Critical: ensure watermark repeats on every page */
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
      }
      .watermark img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        opacity: 0.06 !important;
        filter: grayscale(100%) brightness(1.0) !important;
      }
    }
    /* Add watermark to each page container - ensures it appears on every page with content */
    .invoice-page, .annexure-page {
      position: relative !important;
      width: 100%;
      /* A4 page dimensions: 210mm x 297mm */
    }
    .page-watermark {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      z-index: 0;
      width: 500px;
      height: 500px;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Ensure watermark is centered on A4 page (210mm x 297mm) */
      margin: 0 !important;
      padding: 0 !important;
      /* Ensure watermark appears on every printed page */
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    /* For PDF rendering with Puppeteer, use fixed positioning to ensure it appears on each page */
    @media print {
      .page-watermark {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        /* Fixed positioning ensures watermark appears on each printed page */
      }
    }
    .page-watermark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0.06;
      filter: grayscale(100%) brightness(1.0);
    }
    /* Ensure content appears above watermark */
    .invoice-page > *:not(.page-watermark), 
    .annexure-page > *:not(.page-watermark) {
      position: relative;
      z-index: 1;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; height: auto; background: white; position: relative;">
  ${logoBase64 ? `<div class="watermark" style="position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; z-index: -1 !important; pointer-events: none !important; width: 500px !important; height: 500px !important; display: flex !important; align-items: center !important; justify-content: center !important;"><img src="${logoBase64}" alt="Watermark" style="width: 100%; height: 100%; object-fit: contain; opacity: 0.20; filter: grayscale(100%) brightness(1.0);" /></div>` : ''}
  <div class="invoice-container">
    ${this.generateInvoicePageHtml(invoiceData, account, invoiceNo, invoiceDate, jobIds, billingType, jobs, jobServiceChargesMap, billingFieldNames, firstJob, clientInfo, jobCodeName, sacNo, jobFieldValuesMap, getFieldValue, serviceSubtotal, gst, remiFields, totalInWords, logoImg, logoBase64)}
    ${jobIds.length > 1 ? this.generateAnnexureHtml(invoiceNo, invoiceDate, account?.account_name || "NA", jobIds, jobs, jobServiceChargesMap, jobFieldValuesMap, getFieldValue, billingFieldNames, invoiceData, logoBase64) : ''}
  </div>
</body>
</html>
    `;
  }

  static generateInvoicePageHtml(invoiceData, account, invoiceNo, invoiceDate, jobIds, billingType, jobs, jobServiceChargesMap, billingFieldNames, firstJob, clientInfo, jobCodeName, sacNo, jobFieldValuesMap, getFieldValue, serviceSubtotal, gst, remiFields, totalInWords, logoImg, logoBase64) {
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
        const quantityValue = getFieldValue(jobId, fieldName);
        
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

    return `
    <div class="invoice-page">
      ${logoBase64 ? `<div class="page-watermark"><img src="${logoBase64}" alt="Watermark" /></div>` : ''}
      <div class="header-section">
        <div>
          <div class="company-info">
            <div class="logo-container">
              ${logoImg}
            </div>
            <div class="company-name-wrapper">
              <div class="company-name">${this.escapeHtml(account?.account_name || "NA")}</div>
            </div>
          </div>
          <div class="billed-to-section">
            <div class="billed-to">Billed To : ${this.escapeHtml(clientInfo?.client_name || "NA")}</div>
            ${clientInfo?.client_address ? `<div class="client-address">${this.escapeHtml(clientInfo.client_address)}</div>` : ''}
            <div class="billed-to">
              <span class="billed-to-label">GSTN No : </span>
              <span class="billed-to-value">${this.escapeHtml(clientInfo?.gst_no || "NA")}</span>
            </div>
            <div class="billed-to">
              <span class="billed-to-label">Kind Attn : </span>
              <span class="billed-to-value">${this.escapeHtml(clientInfo?.concern_person || "NA")}</span>
            </div>
            <div style="font-size: 12px !important; margin-bottom: 2px;">
              <span class="billed-to-label">Emails : </span>
              <span class="billed-to-value">${this.escapeHtml(clientInfo?.concern_email_id || "NA")}</span>
            </div>
          </div>
        </div>
        <div></div>
        <div class="invoice-details-box">
          <div class="invoice-title">${billingType === "Reimbursement" ? "Reimbursement/Debit Note" : "GST Invoice"}</div>
          <div class="detail-grid">
            <div class="detail-label">Invoice No. :</div>
            <div>${this.escapeHtml((invoiceNo && invoiceNo.trim() !== "") ? invoiceNo : "NA")}</div>
            <div class="detail-label">Date :</div>
            <div>${this.escapeHtml((invoiceDate && invoiceDate.trim() !== "") ? invoiceDate : "NA")}</div>
            <div class="detail-label">Job No :</div>
            <div>${jobIds.length > 1 ? "As Per Annexure" : this.escapeHtml(firstJob?.job_no || "NA")}</div>
            <div class="detail-label">Customer ID :</div>
            <div>${this.escapeHtml(clientInfo?.group_id || "NA")}</div>
            <div class="detail-label">PO No :</div>
            <div>${this.escapeHtml(invoiceData.po_no || "NA")}</div>
            <div class="detail-label">IRN No. :</div>
            <div style="word-break: break-all;">${this.escapeHtml(invoiceData.irn_no || "NA")}</div>
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
                
                // For Quantity field with multiple jobs, calculate total
                let displayValue = fieldValue || "NA";
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
                }
                
                return `
                <div class="field-row">
                  <div>${this.escapeHtml(fieldName)}</div>
                  <div>${this.escapeHtml(String(displayValue))}</div>
                </div>
                `;
              }).join('')}
              ${jobIds.length === 1 ? (() => {
                const remarkValue = 
                  getFieldValue(jobIds[0], "remark") ||
                  getFieldValue(jobIds[0], "Remark") ||
                  (firstJob?.remark) ||
                  null;
                
                if (remarkValue && remarkValue.trim() !== "") {
                  return `
                  <div class="field-row" style="margin-top: 1px; grid-template-columns: 2fr 8fr;">
                    <div>Remark</div>
                    <div style="text-align: left;">${this.escapeHtml(remarkValue)}</div>
                  </div>
                  `;
                }
                return '';
              })() : ''}
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
        <span style="font-weight: 600;">NOTE :</span>${invoiceData.note && invoiceData.note.trim() !== "" ? ` ${this.escapeHtml(invoiceData.note)}` : ''}
      </div>
    

      <div class="bottom-section">
        <div class="bank-details">
          <div style="padding: 0; margin-bottom: 4px;">
            <div class="bank-title">BANK Details</div>
            <div style="font-size: 11px !important;">
              <div>${this.escapeHtml(account?.bank_name || "NA")}</div>
              <div>
                <span style="font-size: 11px !important;">Branch - </span>
                ${this.escapeHtml(account?.bank_address || "NA")}
              </div>
              <div>
                <span style="font-size: 11px !important;">A/C No.</span> ${this.escapeHtml(account?.account_no || "NA")}
              </div>
              <div>
                <span style="font-size: 11px !important;">IFSC Code - </span>
                ${this.escapeHtml(account?.ifsc_no || "NA")}
              </div>
            </div>
          </div>
          <div style="padding: 0; position: relative;">
            <div style="border-top: 1px solid #000 !important;"></div>
            <div style="font-size: 11px !important; padding-top: 8px; padding-bottom: 4px;">
              <div>
                <span style="font-weight: 600;">SAC No. :</span> ${this.escapeHtml(sacNo)}
              </div>
              <div>
                <span style="font-weight: 600;">GST Detail :</span> ${this.escapeHtml(account?.gst_no || "NA")}
              </div>
              <div>
                <span style="font-weight: 600;">PAN No. :</span> ${this.escapeHtml(account?.pan_no || "NA")}
              </div>
              <div>
                <span style="font-weight: 600;">MSME Registration No. :</span> ${this.escapeHtml(account?.msme_details || "NA")}
              </div>
            </div>
            <div style="border-top: 1px solid #000 !important;"></div>
            ${invoiceData.finalAmount ? `
            <div style="font-size: 11px !important; padding-top: 8px; padding-bottom: 4px;">
              <span style="font-weight: 600;">Amount in Words : </span>
              <span style="font-weight: 600;">₹. </span>
              ${totalInWords}
            </div>
            ` : ''}
          </div>
        </div>
        <div class="charges-breakdown">
          <div style="font-size: 11px !important; display: grid; grid-template-columns: 9fr 1fr 2fr; gap: 0;">
            ${billingType !== "Reimbursement" ? `
              ${parseFloat(invoiceData.rewardAmount || 0) > 0 ? `
              <div>Reward</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.rewardAmount || 0).toFixed(2)}</div>
              ` : ''}
              ${parseFloat(invoiceData.discountAmount || 0) > 0 ? `
              <div>Discount</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.discountAmount || 0).toFixed(2)}</div>
              ` : ''}
              ${parseFloat(invoiceData.registrationCharges || 0) > 0 ? `
              <div>Registration/Other Charges</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.registrationCharges || 0).toFixed(2)}</div>
              ` : ''}
              ${parseFloat(invoiceData.caCharges || 0) > 0 ? `
              <div>Arrangement of CA CERT. (${invoiceData.caCertCount || 0} Nos)</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.caCharges || 0).toFixed(2)}</div>
              ` : ''}
              ${parseFloat(invoiceData.ceCharges || 0) > 0 ? `
              <div>Arrangement of CE CERT. (${invoiceData.ceCertCount || 0} Nos)</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.ceCharges || 0).toFixed(2)}</div>
              ` : ''}
              <div style="font-weight: 600;">Subtotal</div>
              <div style="font-weight: 600;">₹</div>
              <div style="text-align: right; font-weight: 600;">${serviceSubtotal.toFixed(2)}</div>
              ${gst.cgstRate > 0 ? `
              <div>C GST: ${gst.cgstRate}%</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(gst.cgstAmount || 0).toFixed(2)}</div>
              ` : ''}
              ${gst.sgstRate > 0 ? `
              <div>S GST: ${gst.sgstRate}%</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(gst.sgstAmount || 0).toFixed(2)}</div>
              ` : ''}
              ${gst.igstRate > 0 ? `
              <div>I GST: ${gst.igstRate}%</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(gst.igstAmount || 0).toFixed(2)}</div>
              ` : ''}
            ` : ''}
            ${billingType !== "Service" ? `
              <div style="grid-column: 1 / -1; padding-top: 4px; margin-top: 4px;">
                <div style="font-weight: 600;">Reimbursements</div>
              </div>
              ${parseFloat(invoiceData.applicationFees || 0) > 0 ? `
              <div>Application Fees</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(invoiceData.applicationFees || 0).toFixed(2)}</div>
              ` : ''}
              ${remiFields.map(remiField => `
              <div>${this.escapeHtml(remiField.description)}</div>
              <div>₹</div>
              <div style="text-align: right;">${parseFloat(remiField.charges || 0).toFixed(2)}</div>
              `).join('')}
            ` : ''}
            <div style="grid-column: 1 / -1; border-top: 1px solid #000 !important; margin-top: 8px;"></div>
            <div style="font-weight: bold; font-size: 14px !important; margin-top: 4px;">TOTAL</div>
            <div style="font-weight: bold; font-size: 14px !important; margin-top: 4px; text-align: right;">₹</div>
            <div style="font-weight: bold; font-size: 14px !important; margin-top: 4px; text-align: right;">${parseFloat(invoiceData.finalAmount || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>
      <div style="border-top: 1px solid #000 !important;"></div>

      <div class="footer">
        <div style="font-weight: 600; margin-bottom: 20px; margin-top: 1px;">Thank You For Business.</div>
      </div>
      <div class="signature padding-top: 25px; margin-top: 40px;">
        For ${this.escapeHtml(account?.account_name || "NA")}
      </div>
      <div style="text-align: center; margin-top: 6px !important; padding-top: 2px !important;">
        <span style="font-size: 12px; display: block;">
          As Per Rule 46(q) of GST act 2017 said Invoice is digitally signed
        </span>
        <span style="font-size: 12px; display: block;">
          Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK Market, Bibwewadi, Pune,
        </span>
        <span style="font-size: 12px; display: block;">
          Ph:+91 20 3511 3202 : www.lucrative.co.in
        </span>
      </div>
    </div>
    `;
  }

  static generateAnnexureHtml(invoiceNo, invoiceDate, accountName, jobIds, jobs, jobServiceChargesMap, jobFieldValuesMap, getFieldValue, billingFieldNames, invoiceData, logoBase64) {
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

    // Format field value - if it's a date in YYYY-MM-DD format, convert to dd-mm-yyyy
    // Otherwise return the value as-is
    const formatFieldValue = (value) => {
      if (!value || value === "NA" || value === null || value === undefined) {
        return value;
      }
      
      const strValue = String(value).trim();
      
      // Check if value matches YYYY-MM-DD format (e.g., 2026-01-31)
      const dateMatch = strValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${day}-${month}-${year}`;
      }
      
      // Try parsing as date to catch other date formats
      try {
        const date = new Date(strValue);
        if (!isNaN(date.getTime())) {
          // Check if the parsed date matches the input string (to avoid false positives)
          const dateStr = date.toISOString().split('T')[0];
          if (dateStr === strValue || strValue.includes('-')) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
          }
        }
      } catch (e) {
        // Not a date, return as-is
      }
      
      return value;
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
          header: "Auth No & Date",
          noField: {
            keys: ["authorisation_no", "Authorisation No", "authorisationno", "auth_no", "Auth No"],
            jobKeys: ["authorisation_no"]
          },
          dateField: {
            keys: ["sanction___approval_date", "Sanction Approval Date", "authorisation_date", "Authorisation Date", "auth_date", "Auth Date"],
            jobKeys: ["sanction___approval_date", "authorisation_date"]
          }
        },
        {
          header: "Duty Credit No & Date",
          noField: {
            keys: ["duty_credit_scrip_no", "Duty Credit Scrip No", "dutycreditscripno", "duty_credit_no", "Duty Credit No"],
            jobKeys: ["duty_credit_scrip_no"]
          },
          dateField: {
            keys: ["duty_credit_scrip_date", "Duty Credit Scrip Date", "dutycreditscripdate", "duty_credit_date", "Duty Credit Date"],
            jobKeys: ["duty_credit_scrip_date"]
          }
        },
        {
          header: "Lic No & Date",
          noField: {
            keys: ["license_no", "License No", "licenseno", "lic_no", "Lic No"],
            jobKeys: ["license_no"]
          },
          dateField: {
            keys: ["license_date", "License Date", "licensedate", "lic_date", "Lic Date"],
            jobKeys: ["license_date"]
          }
        },
        {
          header: "Cert No & Date",
          noField: {
            keys: ["certificate_no", "Certificate No", "certificateno", "cert_no", "Cert No"],
            jobKeys: ["certificate_no"]
          },
          dateField: {
            keys: ["certificate_date", "Certificate Date", "certificatedate", "cert_date", "Cert Date"],
            jobKeys: ["certificate_date"]
          }
        },
        {
          header: "Refund No & Date",
          noField: {
            keys: ["refund_sanction_order_no", "Refund Sanction Order No", "refundsanctionorderno", "refund_no", "Refund No"],
            jobKeys: ["refund_sanction_order_no"]
          },
          dateField: {
            keys: ["refund_sanction_order_date", "Refund Sanction Order Date", "refundsanctionorderdate", "refund_date", "Refund Date"],
            jobKeys: ["refund_sanction_order_date"]
          }
        },
        {
          header: "Sanc Ord No & Date",
          noField: {
            keys: ["sanction_order_no", "Sanction Order No", "sanctionorderno", "sanc_ord_no", "Sanc Ord No"],
            jobKeys: ["sanction_order_no"]
          },
          dateField: {
            keys: ["sanction_order_date", "Sanction Order Date", "sanctionorderdate", "sanc_ord_date", "Sanc Ord Date"],
            jobKeys: ["sanction_order_date"]
          }
        },
        {
          header: "Brand Rate Lett No & Date",
          noField: {
            keys: ["brand_rate_letter_no", "Brand Rate Letter No", "brandrateletterno", "brand_rate_lett_no", "Brand Rate Lett No"],
            jobKeys: ["brand_rate_letter_no"]
          },
          dateField: {
            keys: ["brand_rate_letter_date", "Brand Rate Letter Date", "brandrateletterdate", "brand_rate_lett_date", "Brand Rate Lett Date"],
            jobKeys: ["brand_rate_letter_date"]
          }
        }
      ];

      const availableFields = [];
      fieldPairs.forEach(pair => {
        let noValue = null;
        let dateValue = null;

        // Try to get No value
        for (const key of pair.noField.keys) {
          const value = getFieldValueMulti(jobId, [key], pair.noField.jobKeys);
          if (value && value !== "NA" && value !== null && value !== undefined && String(value).trim() !== "") {
            noValue = value;
            break;
          }
        }

        // Try to get Date value
        for (const key of pair.dateField.keys) {
          const value = getFieldValueMulti(jobId, [key], pair.dateField.jobKeys);
          if (value && value !== "NA" && value !== null && value !== undefined && String(value).trim() !== "") {
            dateValue = value;
            break;
          }
        }

        // If at least one value exists, add to available fields
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

    // Get dynamic amount fields
    const getDynamicAmountFields = (jobId) => {
      const fields = [
        {
          name: "Exemp Amt",
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
            "Actual Refund Amount"
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
          const fieldValue = getFieldValueMulti(jobId, [key], field.jobKeys);
          if (fieldValue && fieldValue !== "NA" && fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== "") {
            value = fieldValue;
            break;
          }
        }

        // If value exists and is not "NA", add to available fields
        if (value && value !== "NA" && value !== null && value !== undefined && String(value).trim() !== "") {
          // Format the value - check if it's a number or string starting with R- or D-
          let displayValue = value;
          if (typeof value === 'string' && (value.startsWith('R-') || value.startsWith('D-'))) {
            displayValue = value;
          } else {
            const numValue = parseFloat(value);
            displayValue = (isNaN(numValue) || !isFinite(numValue)) ? value : numValue;
          }
          availableFields.push({ name: field.name, value: displayValue });
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

    // Ensure jobIds is an array (declare early so we can use it for page calculation)
    const jobIdsArray = Array.isArray(jobIds) ? jobIds : [];

    // Calculate totals
    const totals = {
      charges: 0,
      caCharges: 0,
      ceCharges: 0,
      regiOther: 0,
      applFee: 0,
      remiFields: [0, 0, 0, 0, 0]
    };

    // Calculate estimated total pages for annexure
    // Each job typically takes ~1 page, plus header and totals (~1 page)
    const estimatedTotalPages = Math.max(1, Math.ceil(jobIdsArray.length * 1.0) + 1);
    
    let annexureHtml = `
    <div class="annexure-page" style="display: block !important; visibility: visible !important; position: relative;">
      ${logoBase64 ? `<div class="page-watermark"><img src="${logoBase64}" alt="Watermark" /></div>` : ''}
      <div class="annexure-header">
        <div class="annexure-title">
          ${this.escapeHtml(accountName)}<br />
          Annexure to Inv No. ${this.escapeHtml(invoiceNo)} Date ${formatDate(invoiceDate)}
        </div>
        <div class="annexure-title annexure-page-number" style="text-align: right;">
          <span style="font-size: 10px; font-family: 'Times New Roman', Times, serif;">Page <span class="annexure-current-page">1</span> of ${estimatedTotalPages}</span>
        </div>
      </div>
      <div class="annexure-content-start">
    `;
    
    if (jobIdsArray.length === 0) {
      return annexureHtml + `</div></div>`;
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

      // Build job section
      annexureHtml += `
      <div style="margin-bottom: 20px;">
        <!-- Administrative Information -->
        <div style="margin-bottom: 6px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap-x: 32px; gap-y: 4px; font-size: 11px;">
            <div style="display: flex; align-items: center;">
              <span style="font-weight: bold; min-width: 150px;">Sr No :</span>
              <span style="font-weight: bold;">${sectionIndex + 1}</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="font-weight: bold; min-width: 150px;">Job No :</span>
              <span style="font-weight: bold;">${this.escapeHtml(jobNo)}</span>
            </div>
          </div>
          
          ${billingFieldNames && billingFieldNames.length > 0 ? `
          <div style="margin-top: 3px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap-x: 32px; gap-y: 4px; font-size: 11px;">
              ${billingFieldNames.map((fieldName) => {
                const fieldValue = getFieldValueMulti(jobId, [fieldName], []) || "NA";
                const formattedValue = formatFieldValue(fieldValue);
                return `
                <div style="display: flex; align-items: center;">
                  <span style="min-width: 150px;">${this.escapeHtml(fieldName)} :</span>
                  <span>${this.escapeHtml(String(formattedValue))}</span>
                </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Charges Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000 !important; font-size: 10px; margin-bottom: 2px !important; padding-bottom: 0px !important;">
          <thead>
            <tr style="background: #f0f0f0 !important;">
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">Claim No</th>
              ${dynamicCombinedFields.map(field => {
                // Split header if it contains "& Date" to display on next line
                const headerParts = field.header.split(" & Date");
                const headerText = headerParts.length > 1 
                  ? `${this.escapeHtml(headerParts[0])}<br />& Date`
                  : this.escapeHtml(field.header);
                return `<th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">${headerText}</th>`;
              }).join('')}
              ${dynamicAmountFields.map(field => `
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">${this.escapeHtml(field.name)}</th>
              `).join('')}
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">Service<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">CA Cert<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">CE Cert<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">Regi/Othr<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">Appli<br />Fees</th>
              ${remiFieldsArray.map(rf => `
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: left; vertical-align: top;">${this.escapeHtml(rf.description)}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; vertical-align: top;">${this.escapeHtml(String(claimNo))}</td>
              ${dynamicCombinedFields.map(field => {
                // Display noValue and dateValue on separate lines if both exist
                let cellContent = "NA";
                if (field.noValue !== "NA" && field.dateValue !== "NA") {
                  cellContent = `${this.escapeHtml(field.noValue)}<br />${this.escapeHtml(field.dateValue)}`;
                } else if (field.noValue !== "NA") {
                  cellContent = this.escapeHtml(field.noValue);
                } else if (field.dateValue !== "NA") {
                  cellContent = this.escapeHtml(field.dateValue);
                }
                return `<td style="border: 1px solid #000 !important; padding: 4px 6px; vertical-align: top;">${cellContent}</td>`;
              }).join('')}
              ${dynamicAmountFields.map(field => {
                const val = field.value;
                let displayVal = "NA";
                if (val !== "NA" && val !== null && val !== undefined) {
                  if (typeof val === 'string' && val.startsWith('R-')) {
                    displayVal = val;
                  } else if (typeof val === 'string' && val.startsWith('D-')) {
                    displayVal = val;
                  } else if (typeof val === 'number' || !isNaN(parseFloat(val))) {
                    displayVal = parseFloat(val).toFixed(2);
                  } else {
                    displayVal = String(val);
                  }
                }
                return `<td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right; vertical-align: top;">${this.escapeHtml(displayVal)}</td>`;
              }).join('')}
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(professionalCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(caCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(ceCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(regiOther).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(applFeeValue).toFixed(2)}</td>
              ${remiFieldsArray.map(rf => `
              <td style="border: 1px solid #000 !important; padding: 4px 6px; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(rf.charges).toFixed(2)}</td>
              `).join('')}
            </tr>
          </tbody>
        </table>
        
        ${job.remark && job.remark.trim() !== "" ? `
        <!-- Remark Text Section -->
        <div style="font-size: 11px; margin-top: 0px !important; padding-top: 0px !important; margin-bottom: 10px;">
          Remark : ${this.escapeHtml(job.remark)}
        </div>
        ` : ''}
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
          <tbody>
            <tr>
              <td rowspan="2" colspan="${1 + totalDynamicCombinedFieldsCount + totalDynamicAmountFieldsCount}" style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center !important; vertical-align: middle !important; display: table-cell;">TOTAL</td>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center; vertical-align: top;">Service<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center; vertical-align: top;">CA Cert<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center; vertical-align: top;">CE Cert<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center; vertical-align: top;">Regi/Othr<br />Charges</th>
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center; vertical-align: top;">Appli<br />Fees</th>
              ${allUsedRemiFieldsArray.map(rf => `
              <th style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: center; vertical-align: top;">${this.escapeHtml(rf.description)}</th>
              `).join('')}
            </tr>
            <tr>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(totals.charges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(totals.caCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(totals.ceCharges).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(totals.regiOther).toFixed(2)}</td>
              <td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(totals.applFee).toFixed(2)}</td>
              ${allUsedRemiFieldsArray.map(rf => {
                const remiIndex = parseInt(rf.key.replace('R', '')) - 1;
                const remiTotal = (remiIndex >= 0 && remiIndex < 5) ? totals.remiFields[remiIndex] : 0;
                return `<td style="border: 1px solid #000 !important; padding: 4px 6px; font-weight: bold !important; text-align: right; vertical-align: top; white-space: nowrap;">${parseFloat(remiTotal).toFixed(2)}</td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Section -->
      <div style="text-align: right; padding-top: 25px; margin-top: 40px; margin-bottom: 2px;">
        <span style="font-weight: 600; font-size: 14px;">For ${this.escapeHtml(accountName || "NA")}</span>
      </div>
      <div style="padding: 0 12px; margin-top: 6px !important; padding-top: 2px !important; margin-bottom: 1px;">
        <div style="text-align: center; margin-top: 2px;">
          <span style="font-size: 12px; display: block;">
            As Per Rule 46(q) of GST act 2017 said Invoice is digitally signed
          </span>
          <span style="font-size: 12px; display: block;">
            Unit No. 65(P), 66, 67, 68(P), Wing - A, 4th Floor, KK Market, Bibwewadi, Pune,
          </span>
          <span style="font-size: 12px; display: block;">
            Ph:+91 20 3511 3202 : www.lucrative.co.in
          </span>
        </div>
      </div>
      </div>
      <!-- End Content Wrapper -->
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
