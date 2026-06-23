// instahyre.js — content script for Instahyre job pages
// Runs on: instahyre.com/job-*

function extractJobData() {
    const getText = (selector) => {
        const el = document.querySelector(selector)
        return el ? el.innerText.trim() : ''
    }

    const company = getText([
        '.employer-name',
        '.company-name',
        'h2.company',
        '[class*="companyName"]',
    ].join(','))

    const jobTitle = getText([
        'h1.job-title',
        'h1[class*="title"]',
        '.designation',
        '[class*="jobTitle"]',
    ].join(','))

    const location = getText([
        '.location-text',
        '[class*="location"]',
        '.job-location',
    ].join(','))

    return {
        company,
        jobTitle,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'Instahyre',
    }
}

function sendData() {
    const data = extractJobData()
    if (!data.jobTitle && !data.company) return
    chrome.runtime.sendMessage({ type: 'JOB_DATA', payload: data })
}

sendData()

const observer = new MutationObserver(() => {
    const titleEl = document.querySelector('h1.job-title, [class*="jobTitle"]')
    if (titleEl) {
        sendData()
        observer.disconnect()
    }
})

observer.observe(document.body, { childList: true, subtree: true })