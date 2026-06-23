// indeed.js — content script for Indeed job pages
// Runs on: indeed.com/viewjob*

function extractJobData() {
    const getText = (selector) => {
        const el = document.querySelector(selector)
        return el ? el.innerText.trim() : ''
    }

    const company = getText([
        '[data-testid="inlineHeader-companyName"] a',
        '[data-testid="inlineHeader-companyName"]',
        '.jobsearch-InlineCompanyRating-companyName',
        '.icl-u-lg-mr--sm',
    ].join(','))

    const jobTitle = getText([
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobInfoHeader-title',
        'h1.jobTitle',
    ].join(','))

    const location = getText([
        '[data-testid="job-location"]',
        '[data-testid="inlineHeader-companyLocation"]',
        '.jobsearch-JobInfoHeader-subtitle .jobsearch-JobInfoHeader-locationWrapper',
    ].join(','))

    return {
        company,
        jobTitle,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'Indeed',
    }
}

function sendData() {
    const data = extractJobData()
    if (!data.jobTitle && !data.company) return
    chrome.runtime.sendMessage({ type: 'JOB_DATA', payload: data })
}

sendData()

const observer = new MutationObserver(() => {
    const titleEl = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')
    if (titleEl) {
        sendData()
        observer.disconnect()
    }
})

observer.observe(document.body, { childList: true, subtree: true })