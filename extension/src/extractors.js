// extractors.js
// These functions are injected into the active tab by the popup
// using chrome.scripting.executeScript — NOT as content scripts.
// This means they run AFTER the user opens the popup, at which point
// the SPA has already loaded all content. No timing issues.

// ─── Helper used by all extractors ───────────────────────────────────────────
function getText(...selectors) {
    for (const sel of selectors) {
        try {
            const el = document.querySelector(sel)
            if (el) {
                const text = (el.innerText || el.textContent || '').trim()
                if (text) return text
            }
        } catch { }
    }
    return ''
}

// ─── LinkedIn extractor ───────────────────────────────────────────────────────
function extractLinkedIn() {
    const jobTitle = getText(
        // Current 2026 selectors
        '.job-details-jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title',
        // Fallback selectors
        '.jobs-unified-top-card__job-title h1',
        '.jobs-unified-top-card__job-title',
        '.topcard__title',
        // Most generic — h1 is always the job title on a job page
        'h1.t-24.t-bold',
        'h1.t-24',
        'h1',
    )

    const company = getText(
        '.job-details-jobs-unified-top-card__company-name a',
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name',
        '.topcard__org-name-link',
        // 2026 variant
        '.job-details-jobs-unified-top-card__primary-description a',
        'a[href*="/company/"]',
    )

    const location = getText(
        '.job-details-jobs-unified-top-card__bullet',
        '.job-details-jobs-unified-top-card__workplace-type',
        '.jobs-unified-top-card__bullet',
        '.topcard__flavor--bullet',
    )

    return {
        jobTitle,
        company,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'LinkedIn',
    }
}

// ─── Wellfound extractor ──────────────────────────────────────────────────────
function extractWellfound() {
    const jobTitle = getText(
        'h1.font-semibold',
        'h1[class*="title"]',
        'h1',
    )

    const company = getText(
        // Wellfound uses hashed class names — target by structure
        'a[href*="/company/"] h2',
        'a[href*="/company/"] span',
        'h2.inline',
        '[data-test="StartupName"]',
        // Try parent of logo
        '.startup-name',
    )

    const location = getText(
        '[class*="location"]',
        '[data-test="JobLocations"]',
        'span[class*="Location"]',
    )

    return {
        jobTitle,
        company,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'Wellfound',
    }
}

// ─── Indeed extractor ─────────────────────────────────────────────────────────
function extractIndeed() {
    const jobTitle = getText(
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobInfoHeader-title',
        'h1.jobTitle',
        'h1',
    )

    const company = getText(
        '[data-testid="inlineHeader-companyName"] a',
        '[data-testid="inlineHeader-companyName"]',
        '.jobsearch-InlineCompanyRating-companyName',
    )

    const location = getText(
        '[data-testid="job-location"]',
        '[data-testid="inlineHeader-companyLocation"]',
    )

    return {
        jobTitle,
        company,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'Indeed',
    }
}

// ─── Instahyre extractor ──────────────────────────────────────────────────────
function extractInstahyre() {
    const jobTitle = getText('h1.job-title', 'h1[class*="title"]', 'h1')
    const company = getText('.employer-name', '.company-name', 'h2.company')
    const location = getText('.location-text', '[class*="location"]')

    return {
        jobTitle,
        company,
        location,
        jobUrl: window.location.href,
        sourcePlatform: 'Instahyre',
    }
}

// ─── Router — detect site and call correct extractor ─────────────────────────
function extractJobData() {
    const url = window.location.href

    if (url.includes('linkedin.com')) return extractLinkedIn()
    if (url.includes('wellfound.com')) return extractWellfound()
    if (url.includes('indeed.com')) return extractIndeed()
    if (url.includes('instahyre.com')) return extractInstahyre()

    // Unknown site — try generic extraction
    return {
        jobTitle: document.querySelector('h1')?.innerText?.trim() || '',
        company: '',
        location: '',
        jobUrl: window.location.href,
        sourcePlatform: 'Other',
    }
}

// Return data — scripting.executeScript captures the return value
extractJobData()