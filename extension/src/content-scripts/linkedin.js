// linkedin.js — content script for LinkedIn job pages
// Runs on: linkedin.com/jobs/view/*

// LinkedIn is a React SPA — the DOM may not be ready immediately.
// We wait for the key element to appear before extracting.

function extractJobData() {
    const getText = (selector) => {
        const el = document.querySelector(selector)
        return el ? el.innerText.trim() : ''
    }

    const company = getText([
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name',
        '.topcard__org-name-link',
    ].join(','))

    const jobTitle = getText([
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title',
        '.topcard__title',
    ].join(','))

    const location = getText([
        '.job-details-jobs-unified-top-card__bullet',
        '.jobs-unified-top-card__bullet',
        '.topcard__flavor--bullet',
    ].join(','))

    return {
        company,
        jobTitle,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'LinkedIn',
    }
}

function sendData() {
    const data = extractJobData()
    // Only send if we actually got a job title — avoids sending empty data
    // if the script fires before the page has loaded the job content
    if (!data.jobTitle && !data.company) return

    chrome.runtime.sendMessage({ type: 'JOB_DATA', payload: data })
}

// Try immediately — works if page was already loaded (e.g. direct URL)
sendData()

// Also observe DOM mutations — LinkedIn loads content dynamically via React
const observer = new MutationObserver(() => {
    const titleEl = document.querySelector(
        '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title'
    )
    if (titleEl) {
        sendData()
        observer.disconnect() // stop watching once we have the data
    }
})

observer.observe(document.body, { childList: true, subtree: true })