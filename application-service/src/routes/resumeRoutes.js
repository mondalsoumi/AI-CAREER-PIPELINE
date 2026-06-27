const express = require('express')
const router = express.Router()

const { diskUpload, memoryUpload } = require('../middleware/upload')

const {
    uploadResume,
    extractResumeText,
    getResumes,
    getResumeById,
    deleteResume,
} = require('../controllers/resumeController')

// POST /resumes/extract-text  ← must be defined BEFORE /:id to avoid route conflict
// Uses memoryUpload — file stays in buffer, used by pdf-parse, nothing saved to disk
router.post('/extract-text', memoryUpload.single('resume'), extractResumeText)

// POST /resumes
// Uses diskUpload — file saved permanently to Docker volume
router.post('/', diskUpload.single('resume'), uploadResume)

// GET /resumes
router.get('/', getResumes)

// GET /resumes/:id
router.get('/:id', getResumeById)

// DELETE /resumes/:id
router.delete('/:id', deleteResume)

module.exports = router