const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Serve job attachment files
// Route: GET /api/job-attachments-files/:jobCode/:jobNo/:filename
router.get('/:jobCode/:jobNo/:filename', async (req, res) => {
  try {
    let { jobCode, jobNo, filename } = req.params;
    
    // Decode URL-encoded parameters
    jobCode = decodeURIComponent(jobCode);
    jobNo = decodeURIComponent(jobNo);
    filename = decodeURIComponent(filename);
    
    // Sanitize parameters to prevent directory traversal
    const sanitizedJobCode = path.basename(jobCode);
    const sanitizedJobNo = path.basename(jobNo);
    const sanitizedFilename = path.basename(filename);
    
    // Construct file path
    const filePath = path.join(
      __dirname,
      '../../web/src/assets/images/job_attachments',
      sanitizedJobCode,
      sanitizedJobNo,
      sanitizedFilename
    );
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if it's actually a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving job attachment file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

module.exports = router;

