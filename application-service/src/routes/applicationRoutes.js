const express = require('express')
const router = express.Router()
const {
    createApplication, getApplications, getApplicationById,
    updateApplication, updateStage, deleteApplication,
} = require('../controllers/applicationController')

router.post('/', createApplication)
router.get('/', getApplications)
router.get('/:id', getApplicationById)
router.put('/:id', updateApplication)
router.patch('/:id/stage', updateStage)
router.delete('/:id', deleteApplication)

module.exports = router
