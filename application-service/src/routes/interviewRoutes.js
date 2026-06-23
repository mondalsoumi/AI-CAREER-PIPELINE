const express = require('express')
const router = express.Router()
const { createInterview, getInterviews, updateInterview, deleteInterview } = require('../controllers/interviewController')

router.post('/', createInterview)
router.get('/', getInterviews)
router.put('/:id', updateInterview)
router.delete('/:id', deleteInterview)

module.exports = router
