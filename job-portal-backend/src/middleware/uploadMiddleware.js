import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve relative to the backend project root regardless of where the
// process is started from, and let RESUME_UPLOAD_PATH override it.
const uploadDir = path.isAbsolute(process.env.RESUME_UPLOAD_PATH || '')
  ? process.env.RESUME_UPLOAD_PATH
  : path.join(__dirname, '../../', process.env.RESUME_UPLOAD_PATH || './uploads/resumes');

// Ensure the upload directory exists before multer ever tries to write to it —
// covers a fresh checkout where /uploads has never been created.
export const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`[${new Date().toISOString()}] Created resume upload directory: ${uploadDir}`);
  }
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, _file, cb) => {
    // req.user is populated by the `protect` auth middleware, which always
    // runs before this multer middleware in the route chain.
    const userId = req.user._id;
    const timestamp = Date.now();
    cb(null, `${userId}_${timestamp}.pdf`);
  },
});

const fileFilter = (_req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
  if (isPdfMime && isPdfExt) {
    cb(null, true);
  } else {
    // Passing an Error here (rather than just cb(null, false)) lets our
    // route-level error handler return a clear 400 instead of a silent
    // "no file was uploaded" failure.
    cb(new Error('Only PDF files are allowed'));
  }
};

const MAX_RESUME_SIZE = Number(process.env.MAX_RESUME_SIZE) || 5 * 1024 * 1024; // 5MB default

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_RESUME_SIZE },
});

// Wraps multer's single-file middleware so upload errors (wrong type, too
// large, no file at all) come back as clean, consistent JSON responses
// instead of multer's raw error shape or an uncaught exception.
export const uploadSingle = (fieldName) => (req, res, next) => {
  const handler = upload.single(fieldName);
  handler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message: `Resume file is too large. Maximum size is ${(MAX_RESUME_SIZE / (1024 * 1024)).toFixed(0)}MB.`,
        });
      }
      return res.status(400).json({ message: `Upload failed: ${err.message}` });
    }
    if (err) {
      // Our custom fileFilter error (wrong file type)
      return res.status(400).json({ message: err.message || 'Only PDF files are allowed.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please select a PDF resume to upload.' });
    }
    next();
  });
};

export default { uploadSingle, ensureUploadDir };
