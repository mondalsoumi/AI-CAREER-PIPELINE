const express = require('express')
const router = express.Router()
const upload = require('../middleware/upload')
const { uploadResume, getResumes, getResumeById, deleteResume } = require('../controllers/resumeController')

router.post('/', upload.single('resume'), uploadResume)
router.get('/', getResumes)
router.get('/:id', getResumeById)
router.delete('/:id', deleteResume)

module.exports = router
