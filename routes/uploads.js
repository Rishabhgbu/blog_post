const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const IMAGE_MIME = ['image/png','image/jpeg','image/jpg','image/gif','image/webp','image/bmp','image/svg+xml'];
const VIDEO_MIME = ['video/mp4','video/webm','video/ogg','video/quicktime'];

const fileFilterImage = (req, file, cb) => {
  if (IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid image type'));
};

const fileFilterVideo = (req, file, cb) => {
  if (VIDEO_MIME.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid video type'));
};

const uploadImage = multer({ storage, fileFilter: fileFilterImage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const uploadVideo = multer({ storage, fileFilter: fileFilterVideo, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

const buildFileResponse = (req, file) => {
  const relative = `/uploads/${file.filename}`;
  const absolute = `${req.protocol}://${req.get('host')}${relative}`;
  return {
    filename: file.originalname,
    storedAs: file.filename,
    url: absolute,
    path: relative,
    size: file.size,
    mimetype: file.mimetype,
  };
};

// POST /api/uploads/image
router.post('/image', auth, uploadImage.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No image uploaded' });
    return res.json(buildFileResponse(req, req.file));
  } catch (e) {
    return res.status(500).json({ msg: 'Upload error', error: e.message });
  }
});

// POST /api/uploads/video
router.post('/video', auth, uploadVideo.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No video uploaded' });
    return res.json(buildFileResponse(req, req.file));
  } catch (e) {
    return res.status(500).json({ msg: 'Upload error', error: e.message });
  }
});

module.exports = router;
