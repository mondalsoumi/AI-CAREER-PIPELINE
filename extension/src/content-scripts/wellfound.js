// wellfound.js — content script for Wellfound (AngelList) job pages
// Runs on: wellfound.com/jobs/* and wellfound.com/company/*/jobs/*

function extractJobData() {
    const getText = (selector) => {
        const el = document.querySelector(selector)
        return el ? el.innerText.trim() : ''
    }

    // Wellfound uses styled-components so class names are hashed.
    // We rely on semantic selectors and data attributes instead.
    const company = getText([
        '[data-test="StartupName"]',
        'h2.inline',
        '.styles_startupName__I3MTe',
        'a[href*="/company/"] h2',
    ].join(','))

    const jobTitle = getText([
        'h1.font-semibold',
        'h1[class*="title"]',
        '[data-test="JobTitle"]',
        '.styles_title__xpQDw',
    ].join(','))

    const location = getText([
        '[data-test="JobLocations"]',
        '[class*="location"]',
        '.styles_location__O1Spt',
    ].join(','))

    return {
        company,
        jobTitle,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'Wellfound',
    }
}

function sendData() {
    const data = extractJobData()
    if (!data.jobTitle && !data.company) return
    chrome.runtime.sendMessage({ type: 'JOB_DATA', payload: data })
}

sendData()

const observer = new MutationObserver(() => {
    const titleEl = document.querySelector('h1.font-semibold, [data-test="JobTitle"]')
    if (titleEl) {
        sendData()
        observer.disconnect()
    }
})

observer.observe(document.body, { childList: true, subtree: true })