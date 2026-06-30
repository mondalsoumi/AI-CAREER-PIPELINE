

const express = require('express')
const router = express.Router()

const { memoryUpload } = require('../middleware/upload') // already exists from resume work

const {
    createApplication, getApplications, getApplicationById,
    updateApplication, updateStage, deleteApplication,
} = require('../controllers/applicationController')

// CHANGED: added memoryUpload.single('resume') — file is optional,
// multer simply leaves req.file undefined if no file is sent
router.post('/', memoryUpload.single('resume'), createApplication)

router.get('/', getApplications)
router.get('/:id', getApplicationById)
router.put('/:id', updateApplication)
router.patch('/:id/stage', updateStage)
router.delete('/:id', deleteApplication)

module.exports = router