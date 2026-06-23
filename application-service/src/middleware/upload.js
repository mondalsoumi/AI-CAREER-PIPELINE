const multer = require('multer')
const path = require('path')
const fs = require('fs')
const config = require('../config')

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadsDir)) {
    fs.mkdirSync(config.uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadsDir),
    filename: (req, file, cb) => {
        const userId = req.headers['x-user-id'] || 'unknown'
        const ext = path.extname(file.originalname)
        const timestamp = Date.now()
        cb(null, `resume_${userId}_${timestamp}${ext}`)
    },
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true)
    } else {
        cb(new Error('Only PDF files are allowed'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
})

module.exports = upload
