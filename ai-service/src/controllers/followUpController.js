// followUpController.js
// POST /ai/follow-up
// Body: { company, jobTitle, appliedAt, interviewerName? , lastContact? }
// Returns: { subject, body, tone }

const { askGemini } = require('../services/gemini')

const generateFollowUp = async (req, res) => {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { company, jobTitle, appliedAt, interviewerName, lastContact } = req.body

    if (!company || !jobTitle) {
        return res.status(400).json({ error: 'company and jobTitle are required' })
    }

    // Calculate days since application/last contact
    const referenceDate = lastContact || appliedAt
    let daysSince = null
    if (referenceDate) {
        daysSince = Math.floor(
            (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24)
        )
    }

    const interviewer = interviewerName || 'the hiring team'
    const daysContext = daysSince
        ? `It has been ${daysSince} days since the last contact.`
        : 'The exact timeline is not specified.'

    const prompt = `
You are a professional career coach helping a job seeker write a follow-up email.

Context:
- Applied for: ${jobTitle} at ${company}
- Addressing: ${interviewer}
- ${daysContext}

Write a concise, professional follow-up email. The tone should be polite, confident, and not desperate.
Keep the email under 150 words. Do not use generic filler phrases like "I hope this email finds you well."

Return ONLY a valid JSON object. No text outside the JSON. No markdown fences.

Return this exact JSON structure:
{
  "subject": "<email subject line>",
  "body": "<full email body, use \\n for line breaks>",
  "tone": "<one of: Professional, Warm, Concise>"
}
`.trim()

    try {
        const data = await askGemini(prompt)
        return res.status(200).json({ success: true, data })
    } catch (err) {
        console.error('[generateFollowUp]', err.message)
        return res.status(500).json({ error: err.message || 'AI generation failed' })
    }
}

module.exports = { generateFollowUp }