// careerInsightsController.js
// GET /ai/career-insights
// Headers: x-user-id
// Body: { applications: Application[] }
// Returns: { patterns, advice, strongestSource, weakestStage, overallHealth }

const { askGemini } = require('../services/gemini')

const getCareerInsights = async (req, res) => {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { applications } = req.body

    if (!applications || !Array.isArray(applications) || applications.length === 0) {
        return res.status(400).json({ error: 'applications array is required and must not be empty' })
    }

    // Build a compact summary to avoid hitting token limits
    // We don't send full application objects — just what's needed for analysis
    const summary = applications.slice(0, 50).map((a) => ({
        company: a.company,
        jobTitle: a.jobTitle,
        stage: a.stage,
        sourcePlatform: a.sourcePlatform,
        appliedAt: a.appliedAt || a.createdAt,
    }))

    // Compute basic stats client-side to give Gemini better context
    const total = summary.length
    const byStage = summary.reduce((acc, a) => { acc[a.stage] = (acc[a.stage] || 0) + 1; return acc }, {})
    const bySource = summary.reduce((acc, a) => { acc[a.sourcePlatform] = (acc[a.sourcePlatform] || 0) + 1; return acc }, {})

    const prompt = `
You are a senior career coach analyzing a job seeker's application data to provide actionable insights.

APPLICATION SUMMARY (${total} total applications):

Stage breakdown: ${JSON.stringify(byStage)}
Source breakdown: ${JSON.stringify(bySource)}

Sample applications:
${JSON.stringify(summary.slice(0, 15), null, 2)}

Analyze this data and return ONLY a valid JSON object. No text outside the JSON. No markdown fences.

Return this exact JSON structure:
{
  "overallHealth": "<one of: Strong, Moderate, Needs Attention>",
  "strongestSource": "<the platform generating the best results>",
  "weakestStage": "<the pipeline stage where most applications stall>",
  "patterns": [<list of 3-4 observed patterns in the data, each as a string>],
  "advice": [<list of 4-5 specific, actionable recommendations, each as a string>],
  "motivationalNote": "<1 encouraging sentence based on their progress>"
}
`.trim()

    try {
        const data = await askGemini(prompt)
        return res.status(200).json({ success: true, data })
    } catch (err) {
        console.error('[getCareerInsights]', err.message)
        return res.status(500).json({ error: err.message || 'AI analysis failed' })
    }
}

module.exports = { getCareerInsights }