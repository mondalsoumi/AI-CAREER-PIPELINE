// resumeMatchController.js
// POST /ai/resume-match
// Body: { resumeText: string, jobDescription: string }
// Returns: { score, missingKeywords, strengths, suggestions }

const { askGemini } = require('../services/gemini')

const resumeMatch = async (req, res) => {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { resumeText, jobDescription } = req.body

    if (!resumeText || !resumeText.trim()) {
        return res.status(400).json({ error: 'resumeText is required' })
    }
    if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({ error: 'jobDescription is required' })
    }

    // Truncate inputs to avoid hitting token limits
    const resume = resumeText.trim().slice(0, 4000)
    const jd = jobDescription.trim().slice(0, 3000)

    const prompt = `
You are an expert technical recruiter and career coach.

Analyze the following resume against the job description and return ONLY a valid JSON object.
Do not include any text outside the JSON. Do not use markdown fences.

RESUME:
${resume}

JOB DESCRIPTION:
${jd}

Return this exact JSON structure:
{
  "score": <integer 0-100 representing how well the resume matches the JD>,
  "missingKeywords": [<list of important keywords/skills from JD missing in resume, max 10>],
  "strengths": [<list of strong matches between resume and JD, max 5>],
  "suggestions": [<list of specific actionable improvements to the resume, max 5>],
  "summary": "<2 sentence overall assessment>"
}
`.trim()

    try {
        const data = await askGemini(prompt)
        return res.status(200).json({ success: true, data })
    } catch (err) {
        console.error('[resumeMatch]', err.message)
        return res.status(500).json({ error: err.message || 'AI analysis failed' })
    }
}

module.exports = { resumeMatch }