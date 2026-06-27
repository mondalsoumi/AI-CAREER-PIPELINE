const express = require('express')
const router = express.Router()

const { resumeMatch } = require('../controllers/resumeMatchController')
const { analyzeNotes } = require('../controllers/analyzeNotesController')
const { generateFollowUp } = require('../controllers/followUpController')
const { getCareerInsights } = require('../controllers/careerInsightsController')

// POST /ai/resume-match
router.post('/resume-match', resumeMatch)

// POST /ai/analyze-notes
router.post('/analyze-notes', analyzeNotes)

// POST /ai/follow-up
router.post('/follow-up', generateFollowUp)

// POST /ai/career-insights
router.post('/career-insights', getCareerInsights)

module.exports = router