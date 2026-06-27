// analyzeNotesController.js
// POST /ai/analyze-notes
// Body: { notes: string, jobTitle: string, company: string }
// Returns: { summary, topicsCovered, weakAreas, revisionTopics, overallSentiment }

const { askGemini } = require('../services/gemini')

const analyzeNotes = async (req, res) => {
    const userId = req.headers['x-user-id']
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { notes, jobTitle, company } = req.body

    if (!notes || !notes.trim()) {
        return res.status(400).json({ error: 'notes is required' })
    }

    const role = jobTitle || 'Software Engineer'
    const company_ = company || 'the company'
    const trimmed = notes.trim().slice(0, 3000)

    const prompt = `
You are a senior engineering mentor helping a candidate reflect on their interview experience.

The candidate just completed an interview for the role of "${role}" at "${company_}".
These are their raw notes from the interview:

INTERVIEW NOTES:
${trimmed}

Analyze these notes and return ONLY a valid JSON object. No text outside the JSON. No markdown fences.

Return this exact JSON structure:
{
  "summary": "<3-4 sentence summary of how the interview went overall>",
  "topicsCovered": [<list of technical/behavioural topics that were discussed>],
  "weakAreas": [<topics or questions where the candidate struggled or was uncertain>],
  "revisionTopics": [<specific topics to study before the next round, max 6>],
  "overallSentiment": "<one of: Positive, Neutral, Needs Improvement>",
  "nextStepAdvice": "<1-2 sentences of concrete advice for the next round>"
}
`.trim()

    try {
        const data = await askGemini(prompt)
        return res.status(200).json({ success: true, data })
    } catch (err) {
        console.error('[analyzeNotes]', err.message)
        return res.status(500).json({ error: err.message || 'AI analysis failed' })
    }
}

module.exports = { analyzeNotes }