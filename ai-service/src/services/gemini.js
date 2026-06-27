const { GoogleGenerativeAI } = require('@google/generative-ai')
const config = require('../config')

const genAI = new GoogleGenerativeAI(config.geminiApiKey)

const MODEL_PRIORITY = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
]

const DEBUG = process.env.NODE_ENV !== 'production'

async function askGemini(prompt, retries = 2) {
    let lastError

    for (const modelName of MODEL_PRIORITY) {

        for (let attempt = 0; attempt <= retries; attempt++) {

            try {

                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.8,
                        maxOutputTokens: 4096,
                    },
                })

                const result = await model.generateContent(prompt)

                if (DEBUG) {
                    console.log(`[Gemini] Model: ${modelName}`)
                    console.log(
                        `[Gemini] Finish Reason:`,
                        result.response.candidates?.[0]?.finishReason
                    )
                }

                const text = result.response.text()

                if (DEBUG) {
                    console.log("\n========== GEMINI RAW RESPONSE ==========\n")
                    console.log(text)
                    console.log("\n=========================================\n")
                }

                const cleaned = text
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/```\s*$/i, '')
                    .trim()

                const start = cleaned.indexOf('{')
                const end = cleaned.lastIndexOf('}')

                if (start === -1 || end === -1) {
                    throw new Error('Gemini did not return valid JSON.')
                }

                const jsonString = cleaned.slice(start, end + 1)

                try {
                    return JSON.parse(jsonString)
                } catch (parseError) {

                    if (DEBUG) {
                        console.error("[Gemini] JSON Parse Failed")
                        console.error(jsonString)
                    }

                    if (attempt < retries) {
                        console.warn(
                            `[Gemini] Invalid JSON from ${modelName}, retrying... (${attempt + 1}/${retries})`
                        )
                        continue
                    }

                    throw new Error('Gemini returned malformed JSON.')
                }

            } catch (err) {

                lastError = err

                const message = err.message || ''

                const is404 =
                    message.includes('404') ||
                    message.toLowerCase().includes('not found')

                const is503 =
                    message.includes('503') ||
                    message.includes('Service Unavailable') ||
                    message.toLowerCase().includes('high demand')

                const is429 =
                    message.includes('429') ||
                    message.includes('Too Many Requests') ||
                    message.toLowerCase().includes('quota')

                if (is404) {
                    console.warn(
                        `[Gemini] ${modelName} unavailable. Trying next model...`
                    )
                    break
                }

                if (is503) {

                    if (attempt < retries) {

                        const waitMs = (attempt + 1) * 2000

                        console.warn(
                            `[Gemini] ${modelName} overloaded. Retrying in ${waitMs / 1000}s`
                        )

                        await new Promise(resolve => setTimeout(resolve, waitMs))
                        continue
                    }

                    console.warn(
                        `[Gemini] ${modelName} still overloaded. Trying next model...`
                    )

                    break
                }

                if (is429) {

                    const retryMatch = message.match(/retry in\s+([\d.]+)/i)

                    const waitMs = retryMatch
                        ? Math.ceil(parseFloat(retryMatch[1]) * 1000)
                        : 35000

                    if (attempt < retries) {

                        console.warn(
                            `[Gemini] Rate limited on ${modelName}. Waiting ${waitMs / 1000}s`
                        )

                        await new Promise(resolve => setTimeout(resolve, waitMs))
                        continue
                    }

                    console.warn(
                        `[Gemini] Quota exhausted on ${modelName}. Trying next model...`
                    )

                    break
                }

                throw err
            }
        }
    }

    throw new Error(
        `All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`
    )
}

module.exports = { askGemini }