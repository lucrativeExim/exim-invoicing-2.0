const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/accessControl');

// All routes require authentication
router.use(authenticate);

// Configure multer for file uploads
// We'll configure storage dynamically based on job_code and job_no
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // This will be set dynamically in the route handler
    cb(null, req.uploadPath || 'uploads/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename: originalname-timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept all file types
    cb(null, true);
  }
});

// GET all attachments for a job
router.get('/', requireRole(['Super_Admin', 'Admin']), async (req, res) => {
  try {
    const { jobId } = req.query;
    
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const jobIdInt = parseInt(jobId);
    if (isNaN(jobIdInt) || jobIdInt <= 0) {
      return res.status(400).json({ error: 'Invalid jobId provided' });
    }

    // Fetch attachments for this job
    const attachments = await prisma.jobAttachment.findMany({
      where: {
        job_id: jobIdInt,
        deleted_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json(attachments);
  } catch (error) {
    console.error('Error fetching job attachments:', error);
    res.status(500).json({ error: 'Failed to fetch job attachments' });
  }
});

// POST - Upload attachments for a job
// Skip body parsing for this route - multer will handle multipart/form-data
router.post('/:jobId', 
  // Skip body parsing middleware for multipart requests
  (req, res, next) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      // Don't parse body - let multer handle it
      return next();
    }
    next();
  },
  requireRole(['Super_Admin', 'Admin']), 
  async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const jobIdInt = parseInt(jobId);
    
    if (isNaN(jobIdInt) || jobIdInt <= 0) {
      return res.status(400).json({ error: 'Invalid jobId provided' });
    }

    // Fetch job with jobRegister to get job_code and job_no
    const job = await prisma.job.findUnique({
      where: { id: jobIdInt },
      include: {
        jobRegister: {
          select: {
            job_code: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get job_code and job_no
    const jobCode = job.jobRegister?.job_code || 'UNKNOWN';
    const jobNo = job.job_no || 'UNKNOWN';

    // Create directory structure: web/src/assets/images/job_attachments/{job_code}/{job_no}/
    // Using src/assets as requested by user
    const baseDir = path.join(__dirname, '../../web/src/assets/images/job_attachments');
    const jobCodeDir = path.join(baseDir, jobCode);
    const jobNoDir = path.join(jobCodeDir, jobNo);

    // Create directories if they don't exist
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(jobCodeDir)) {
      fs.mkdirSync(jobCodeDir, { recursive: true });
    }
    if (!fs.existsSync(jobNoDir)) {
      fs.mkdirSync(jobNoDir, { recursive: true });
    }

    // Configure multer storage with the correct destination
    const dynamicStorage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, jobNoDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        // Sanitize filename
        const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
      }
    });

    const dynamicUpload = multer({ 
      storage: dynamicStorage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      },
      fileFilter: function (req, file, cb) {
        cb(null, true);
      }
    });

    // Handle file upload - expecting multiple files with field name 'attachments'
    // Format: attachments[0][file], attachments[0][attachmentType], etc.
    // Use any() to accept all files regardless of field name
    console.log('=== BEFORE MULTER ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    const uploadMiddleware = dynamicUpload.any();
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size exceeds 10MB limit' });
          }
          return res.status(400).json({ error: 'Multer error: ' + err.code });
        }
        return res.status(400).json({ error: 'File upload error: ' + err.message });
      }
      
      // Process the upload asynchronously
      (async () => {
        try {
          // Debug: Log what we received
          console.log('=== AFTER MULTER - DEBUG: Job Attachments Upload ===');
          console.log('Content-Type:', req.headers['content-type']);
          console.log('req.files:', req.files);
          console.log('Files received:', req.files?.length || 0);
          console.log('req.files type:', typeof req.files);
          console.log('req.files is array:', Array.isArray(req.files));
          console.log('Body keys:', Object.keys(req.body));
          console.log('Full body:', JSON.stringify(req.body, null, 2));
        
        // Handle different multer response formats
        let files = [];
        if (req.files) {
          if (Array.isArray(req.files)) {
            files = req.files;
          } else if (typeof req.files === 'object') {
            // If it's an object, flatten it
            files = Object.values(req.files).flat();
          }
        }
        
        console.log('Processed files:', files.length);
        console.log('Files details:', files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname, path: f.path })));

        // Parse attachments from form data
        // The frontend sends: attachments[0][attachmentType] and attachments[0][file]
        // files is already processed above
        const attachmentTypes = {};

        // Extract attachment types from form fields
        // Format: attachments[0][attachmentType] = "Type Name"
        // Handle different parsing formats
        if (req.body.attachments && Array.isArray(req.body.attachments)) {
          // If parsed as array
          req.body.attachments.forEach((item, index) => {
            if (item && typeof item === 'object' && item.attachmentType) {
              attachmentTypes[index] = item.attachmentType;
            }
          });
        } else if (req.body.attachments && typeof req.body.attachments === 'object') {
          // If parsed as object with numeric keys
          Object.keys(req.body.attachments).forEach(key => {
            const index = parseInt(key);
            if (!isNaN(index) && req.body.attachments[key] && req.body.attachments[key].attachmentType) {
              attachmentTypes[index] = req.body.attachments[key].attachmentType;
            }
          });
        } else {
          // If parsed as flat keys: attachments[0][attachmentType]
          Object.keys(req.body).forEach(key => {
            const match = key.match(/^attachments\[(\d+)\]\[attachmentType\]$/);
            if (match) {
              const index = parseInt(match[1]);
              attachmentTypes[index] = req.body[key];
            }
          });
        }

        console.log('Attachment types extracted:', attachmentTypes);

        if (files.length === 0) {
          console.error('No files found in request');
          return res.status(400).json({ error: 'No files uploaded' });
        }

        // Match files with their attachment types
        // Files come with fieldname like "attachments[0][file]"
        const fileMap = {};
        
        // First, try to match by fieldname
        files.forEach((file) => {
          console.log('Processing file with fieldname:', file.fieldname);
          
          // Try exact match: attachments[0][file]
          let match = file.fieldname.match(/^attachments\[(\d+)\]\[file\]$/);
          if (!match) {
            // Try alternative: attachments[0]
            match = file.fieldname.match(/attachments\[(\d+)\]/);
          }
          
          if (match) {
            const index = parseInt(match[1]);
            fileMap[index] = file;
            console.log(`Matched file at index ${index}:`, file.originalname);
          }
        });
        
        // If we still have unmatched files, match by array order as fallback
        // This handles cases where fieldnames don't match exactly
        const matchedIndices = Object.keys(fileMap).map(Number);
        const unmatchedFiles = files.filter(file => 
          !Object.values(fileMap).some(f => f.path === file.path)
        );
        const availableTypeIndices = Object.keys(attachmentTypes)
          .map(Number)
          .filter(idx => !matchedIndices.includes(idx))
          .sort((a, b) => a - b);
        
        // Match unmatched files to available type indices by order
        unmatchedFiles.forEach((file, fileIndex) => {
          if (fileIndex < availableTypeIndices.length) {
            const index = availableTypeIndices[fileIndex];
            fileMap[index] = file;
            console.log(`Matched file by order at index ${index}:`, file.originalname);
          } else {
            console.warn(`Could not match file: ${file.fieldname}, ${file.originalname} - no available type index`);
          }
        });
        
        // Final fallback: if we have same number of files and types, match by array order
        if (Object.keys(fileMap).length === 0 && files.length === Object.keys(attachmentTypes).length) {
          console.log('Using fallback: matching files to types by array order');
          const typeIndices = Object.keys(attachmentTypes).map(Number).sort((a, b) => a - b);
          files.forEach((file, fileIndex) => {
            if (fileIndex < typeIndices.length) {
              fileMap[typeIndices[fileIndex]] = file;
              console.log(`Fallback matched file at index ${typeIndices[fileIndex]}:`, file.originalname);
            }
          });
        }

        console.log('File map:', Object.keys(fileMap).map(k => ({ index: k, file: fileMap[k].originalname })));

        // Save each attachment to database
        const savedAttachments = [];
        const userId = req.user?.id ? parseInt(req.user.id) : null;

        // Process files in order
        const sortedIndices = Object.keys(fileMap).map(Number).sort((a, b) => a - b);
        
        console.log('Processing indices:', sortedIndices);
        
        for (const index of sortedIndices) {
          const file = fileMap[index];
          const attachmentType = attachmentTypes[index] || null;

          console.log(`Processing index ${index}:`, {
            file: file.originalname,
            attachmentType: attachmentType,
            filePath: file.path
          });

          if (!attachmentType) {
            console.warn(`No attachment type for index ${index}, deleting file`);
            // Delete the uploaded file if no attachment type
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (unlinkErr) {
              console.error('Error deleting file:', unlinkErr);
            }
            continue;
          }

          // Verify file was saved
          if (!fs.existsSync(file.path)) {
            console.error(`File not found at path: ${file.path}`);
            continue;
          }

          // Create relative path for database storage
          // Path relative to web/src/assets/images/job_attachments/
          const relativePath = path.join(jobCode, jobNo, file.filename);
          // Store the full relative path that can be used to construct the URL
          // Format: job_attachments/{job_code}/{job_no}/{filename}
          const filePath = `job_attachments/${relativePath.replace(/\\/g, '/')}`;

          console.log(`Saving to database:`, {
            job_id: jobIdInt,
            attachment_type: attachmentType,
            file_name: file.originalname,
            file_path: filePath
          });

          // Save to database
          const attachment = await prisma.jobAttachment.create({
            data: {
              job_id: jobIdInt,
              attachment_type: attachmentType,
              file_name: file.originalname,
              file_path: filePath,
              status: 'Active',
              added_by: userId,
            },
          });

          console.log('Saved attachment:', attachment.id);
          savedAttachments.push(attachment);
        }

        if (savedAttachments.length === 0) {
          return res.status(400).json({ error: 'No valid attachments saved. Please ensure attachment type is provided for each file.' });
        }

        res.status(201).json({
          message: 'Attachments saved successfully',
          attachments: savedAttachments,
          count: savedAttachments.length,
        });
      } catch (dbError) {
        console.error('Error saving attachments to database:', dbError);
        
        // Clean up uploaded files if database save fails
        if (req.files) {
          req.files.forEach(file => {
            try {
              if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            } catch (unlinkErr) {
              console.error('Error cleaning up file:', unlinkErr);
            }
          });
        }

        res.status(500).json({ error: 'Failed to save attachments to database' });
        }
      })(); // Close async IIFE and call it
    }); // Close uploadMiddleware callback
  } catch (error) {
    console.error('Error in job attachments upload:', error);
    res.status(500).json({ error: 'Failed to process attachment upload' });
  }
});

module.exports = router;

