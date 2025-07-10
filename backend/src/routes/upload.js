const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticate, anyAuthenticatedUser } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  ValidationError 
} = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  FILE_TYPES,
  MAX_FILE_SIZE 
} = require('../../shared/types/index');

const router = express.Router();

// Ensure upload directory exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create year/month subdirectories for better organization
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const uploadDir = path.join(uploadPath, year.toString(), month);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and UUID
    const timestamp = Date.now();
    const uuid = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `screenshot_${timestamp}_${uuid}${ext}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = Object.values(FILE_TYPES);
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new ValidationError('Invalid file type. Only JPEG, PNG, and GIF files are allowed.'), false);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return cb(new ValidationError('File too large. Maximum size is 5MB.'), false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow one file at a time
  }
});

// POST /api/upload/screenshot - Upload screenshot
router.post('/screenshot', authenticate, anyAuthenticatedUser, upload.single('screenshot'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  // Additional security checks
  const file = req.file;
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    // Remove uploaded file
    fs.unlinkSync(file.path);
    throw new ValidationError('Invalid file extension. Only .jpg, .jpeg, .png, and .gif files are allowed.');
  }

  // Check if file is actually an image by reading first few bytes
  const buffer = fs.readFileSync(file.path);
  const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;

  if (!isJPEG && !isPNG && !isGIF) {
    // Remove uploaded file
    fs.unlinkSync(file.path);
    throw new ValidationError('File is not a valid image.');
  }

  // Generate relative path for database storage
  const relativePath = path.relative(uploadPath, file.path).replace(/\\/g, '/');

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Screenshot uploaded successfully',
    data: {
      filename: file.filename,
      originalName: file.originalname,
      path: relativePath,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString()
    }
  });
}));

// GET /api/upload/screenshot/:filename - Serve screenshot file
router.get('/screenshot/:filename', authenticate, anyAuthenticatedUser, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { year, month } = req.query;

  // Validate filename
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new ValidationError('Invalid filename');
  }

  // Construct file path
  let filePath;
  if (year && month) {
    filePath = path.join(uploadPath, year, month, filename);
  } else {
    // Search for file in all subdirectories
    filePath = await findFileInUploads(filename);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new ValidationError('File not found');
  }

  // Check if file is within upload directory (security check)
  const resolvedPath = path.resolve(filePath);
  const uploadDir = path.resolve(uploadPath);
  
  if (!resolvedPath.startsWith(uploadDir)) {
    throw new ValidationError('Access denied');
  }

  // Get file stats
  const stats = fs.statSync(filePath);
  const ext = path.extname(filename).toLowerCase();

  // Set appropriate content type
  let contentType = 'application/octet-stream';
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.gif':
      contentType = 'image/gif';
      break;
  }

  // Set headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stats.size);
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

  // Stream file
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}));

// Helper function to find file in uploads directory
const findFileInUploads = async (filename) => {
  const searchInDirectory = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          const found = searchInDirectory(filePath);
          if (found) return found;
        } else if (file === filename) {
          return filePath;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      return null;
    }
    return null;
  };

  return searchInDirectory(uploadPath);
};

// DELETE /api/upload/screenshot/:filename - Delete screenshot (admin only)
router.delete('/screenshot/:filename', authenticate, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { year, month } = req.query;

  // Validate filename
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new ValidationError('Invalid filename');
  }

  // Construct file path
  let filePath;
  if (year && month) {
    filePath = path.join(uploadPath, year, month, filename);
  } else {
    filePath = await findFileInUploads(filename);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    throw new ValidationError('File not found');
  }

  // Check if file is within upload directory (security check)
  const resolvedPath = path.resolve(filePath);
  const uploadDir = path.resolve(uploadPath);
  
  if (!resolvedPath.startsWith(uploadDir)) {
    throw new ValidationError('Access denied');
  }

  // Delete file
  fs.unlinkSync(filePath);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Screenshot deleted successfully'
  });
}));

// GET /api/upload/stats - Get upload statistics (admin only)
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const getDirectorySize = (dir) => {
    let size = 0;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    return size;
  };

  const getFileCount = (dir) => {
    let count = 0;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          count += getFileCount(filePath);
        } else {
          count++;
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    return count;
  };

  const totalSize = getDirectorySize(uploadPath);
  const totalFiles = getFileCount(uploadPath);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      totalSize,
      totalFiles,
      uploadPath,
      maxFileSize: MAX_FILE_SIZE,
      allowedTypes: Object.values(FILE_TYPES)
    }
  });
}));

module.exports = router; 