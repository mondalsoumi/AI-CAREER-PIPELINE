// upload.js
// Both endpoints now use memory storage because:
// - uploadResume sends buffer to MinIO (no local disk needed)
// - extractResumeText sends buffer to pdfreader (no local disk needed)
// The Docker volume (./uploads) is no longer used for resume PDFs.

const multer = require('multer')

const pdfOnly = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true)
    } else {
        cb(new Error('Only PDF files are allowed'), false)
    }
}

const memoryUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: pdfOnly,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// Export both names for backward compatibility with resumeRoutes.js
module.exports = { diskUpload: memoryUpload, memoryUpload }