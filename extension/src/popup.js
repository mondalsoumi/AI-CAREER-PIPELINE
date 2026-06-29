// popup.js
// Architecture change from v1:
// Instead of content scripts pushing data to storage (which has timing issues
// with SPAs), the popup now PULLS data from the active tab the moment it opens
// using chrome.scripting.executeScript with the extractors.js functions.
// This runs AFTER the user opens the popup, so the SPA has already rendered.

const API_BASE = 'http://localhost:8000'

const SOURCE_PLATFORMS = [
    'LinkedIn', 'Naukri', 'Wellfound', 'Indeed',
    'Glassdoor', 'Instahyre', 'Company Website', 'Referral', 'Manual', 'Other',
]

const SUPPORTED_SITES = [
    'linkedin.com',
    'wellfound.com',
    'indeed.com',
    'instahyre.com',
]

// ─── Storage helpers ──────────────────────────────────────────────────────────
const getStorage = (keys) => new Promise((res) => chrome.storage.local.get(keys, res))
const setStorage = (data) => new Promise((res) => chrome.storage.local.set(data, res))
const removeStorage = (keys) => new Promise((res) => chrome.storage.local.remove(keys, res))

// ─── DOM helpers ──────────────────────────────────────────────────────────────
function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag)
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') node.className = v
        else if (k.startsWith('on') && typeof v === 'function')
            node.addEventListener(k.slice(2).toLowerCase(), v)
        else node.setAttribute(k, v)
    })
    children.flat().forEach((child) => {
        if (child == null) return
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
    })
    return node
}

// ─── Extract job data from active tab ────────────────────────────────────────
// This is the key architectural change — we inject the extractor at popup-open time
// so it runs after the SPA has fully rendered the job content
async function extractFromActiveTab() {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id) return null

        const url = tab.url || ''

        // Check if we're on a supported job site
        const isSupportedSite = SUPPORTED_SITES.some((site) => url.includes(site))
        if (!isSupportedSite) return null

        // Inject and execute the extractor script
        // The extractor reads from the live DOM at this exact moment
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/extractors.js'],
        })

        const result = results?.[0]?.result
        if (!result) return null

        // Only return if we got at least a job title or company
        if (!result.jobTitle && !result.company) return null

        return result
    } catch (err) {
        console.error('[Popup] Extraction failed:', err.message)
        return null
    }
}

// ─── Header ───────────────────────────────────────────────────────────────────
function renderHeader(showSignOut, onSignOut) {
    return el('div', { className: 'header' },
        el('div', {},
            el('div', { className: 'header-brand' }, 'AI Career Pipeline'),
            el('div', { className: 'header-title' }, 'Job Tracker'),
        ),
        showSignOut
            ? el('button', { className: 'btn-signout', onClick: onSignOut }, 'Sign out')
            : el('span', {}),
    )
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function renderAlert(message, type = 'error') {
    return el('div', { className: `alert alert-${type}` }, message)
}

// ─── Login view ───────────────────────────────────────────────────────────────
function renderLoginView(root) {
    const emailInput = el('input', { className: 'input', type: 'email', placeholder: 'you@example.com', id: 'login-email' })
    const passwordInput = el('input', { className: 'input', type: 'password', placeholder: '••••••••', id: 'login-password' })
    const submitBtn = el('button', { className: 'btn-primary', id: 'login-submit' }, 'Sign in')
    const alertBox = el('div', {})

    const handleSubmit = async () => {
        const email = emailInput.value.trim()
        const password = passwordInput.value.trim()

        alertBox.innerHTML = ''
        if (!email || !password) {
            alertBox.appendChild(renderAlert('Email and password are required.'))
            return
        }

        submitBtn.disabled = true
        submitBtn.innerHTML = '<span class="spinner"></span>'

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()

            if (!res.ok) {
                alertBox.appendChild(renderAlert(data.error || 'Login failed.'))
                return
            }

            const token = data.token ?? data.data?.token
            if (!token) {
                alertBox.appendChild(renderAlert('No token returned from server.'))
                return
            }

            await setStorage({ token })
            root.innerHTML = ''
            await renderJobView(root)
        } catch {
            alertBox.appendChild(renderAlert('Cannot reach the API. Is the gateway running on port 8000?'))
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = 'Sign in'
        }
    }

    submitBtn.addEventListener('click', handleSubmit)
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit() })
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit() })

    root.appendChild(renderHeader(false))
    root.appendChild(
        el('div', { className: 'body' },
            el('div', { className: 'login-title' }, 'Sign in'),
            el('div', { className: 'login-sub' }, 'Access your career pipeline'),
            alertBox,
            el('div', { className: 'field' },
                el('label', { className: 'label', for: 'login-email' }, 'Email'),
                emailInput,
            ),
            el('div', { className: 'field' },
                el('label', { className: 'label', for: 'login-password' }, 'Password'),
                passwordInput,
            ),
            submitBtn,
        )
    )
}

// ─── Job save view ────────────────────────────────────────────────────────────
async function renderJobView(root) {
    const { token } = await getStorage(['token'])

    // Show loading state while extracting
    root.appendChild(renderHeader(true, async () => {
        await removeStorage(['token'])
        root.innerHTML = ''
        renderLoginView(root)
    }))

    const extractingBadge = el('div', { className: 'extracting-badge' }, 'Detecting job data…')
    const bodyEl = el('div', { className: 'body' }, extractingBadge)
    root.appendChild(bodyEl)

    // Extract from active tab NOW — popup is open so SPA has rendered
    const job = await extractFromActiveTab() || {}

    // Remove extracting badge
    bodyEl.removeChild(extractingBadge)

    // Build platform dropdown
    const platformSelect = el('select', { className: 'select', id: 'field-platform' },
        el('option', { value: '' }, 'Select…'),
        ...SOURCE_PLATFORMS.map((p) =>
            el('option', { value: p, ...(p === job.sourcePlatform ? { selected: '' } : {}) }, p)
        ),
    )

    const companyInput = el('input', { className: 'input', id: 'field-company', placeholder: 'Company name', value: job.company || '' })
    const titleInput = el('input', { className: 'input', id: 'field-title', placeholder: 'Job title', value: job.jobTitle || '' })
    const locationInput = el('input', { className: 'input', id: 'field-location', placeholder: 'City / Remote', value: job.location || '' })
    const urlInput = el('input', { className: 'input', id: 'field-url', placeholder: 'https://…', value: job.jobUrl || '', type: 'url' })
    const notesArea = el('textarea', { className: 'textarea', id: 'field-notes', placeholder: 'Optional notes…', rows: '2' })
    const submitBtn = el('button', { className: 'btn-primary', id: 'save-btn' }, 'Save to Pipeline')
    const alertBox = el('div', {})

    // Show detected badge or no-job hint
    if (job.jobTitle || job.company) {
        const badge = el('div', { className: 'detected-badge' },
            el('span', { className: 'detected-dot' }),
            `Detected from ${job.sourcePlatform || 'this page'}`,
        )
        bodyEl.appendChild(badge)
    } else {
        const hint = el('div', { className: 'no-job' },
            el('div', { className: 'no-job-title' }, 'No job detected'),
            'Open a job posting on LinkedIn, Wellfound, Indeed, or Instahyre. Or fill in the details below manually.',
        )
        bodyEl.appendChild(hint)
    }

    bodyEl.appendChild(alertBox)
    bodyEl.appendChild(
        el('div', { className: 'field' }, el('label', { className: 'label', for: 'field-company' }, 'Company *'), companyInput),
    )
    bodyEl.appendChild(
        el('div', { className: 'field' }, el('label', { className: 'label', for: 'field-title' }, 'Job title *'), titleInput),
    )
    bodyEl.appendChild(
        el('div', { className: 'field' }, el('label', { className: 'label', for: 'field-platform' }, 'Platform *'), platformSelect),
    )
    bodyEl.appendChild(
        el('div', { className: 'field' }, el('label', { className: 'label', for: 'field-location' }, 'Location'), locationInput),
    )
    bodyEl.appendChild(
        el('div', { className: 'field' }, el('label', { className: 'label', for: 'field-url' }, 'Job URL'), urlInput),
    )
    bodyEl.appendChild(
        el('div', { className: 'field' }, el('label', { className: 'label', for: 'field-notes' }, 'Notes'), notesArea),
    )
    bodyEl.appendChild(submitBtn)

    // Save handler
    submitBtn.addEventListener('click', async () => {
        const company = companyInput.value.trim()
        const jobTitle = titleInput.value.trim()
        const sourcePlatform = platformSelect.value

        alertBox.innerHTML = ''

        if (!company || !jobTitle || !sourcePlatform) {
            alertBox.appendChild(renderAlert('Company, job title, and platform are required.'))
            return
        }

        submitBtn.disabled = true
        submitBtn.innerHTML = '<span class="spinner"></span> Saving…'

        try {
            const res = await fetch(`${API_BASE}/api/applications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    company,
                    jobTitle,
                    sourcePlatform,
                    ...(locationInput.value.trim() && { location: locationInput.value.trim() }),
                    ...(urlInput.value.trim() && { jobUrl: urlInput.value.trim() }),
                    ...(notesArea.value.trim() && { notes: notesArea.value.trim() }),
                }),
            })

            const data = await res.json()

            if (res.status === 401) {
                await removeStorage(['token'])
                alertBox.appendChild(renderAlert('Session expired. Please sign in again.'))
                setTimeout(() => { root.innerHTML = ''; renderLoginView(root) }, 1500)
                return
            }

            if (!res.ok) {
                alertBox.appendChild(renderAlert(data.error || 'Failed to save application.'))
                return
            }

            alertBox.appendChild(renderAlert(`Saved: ${company} — ${jobTitle}`, 'success'))
            companyInput.value = ''
            titleInput.value = ''
            locationInput.value = ''
            urlInput.value = ''
            notesArea.value = ''
            platformSelect.value = ''
        } catch {
            alertBox.appendChild(renderAlert('Network error. Is the API gateway running on port 8000?'))
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = 'Save to Pipeline'
        }
    })
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
    const root = document.getElementById('root')
    const { token } = await getStorage(['token'])

    if (!token) {
        renderLoginView(root)
    } else {
        await renderJobView(root)
    }
}

document.addEventListener('DOMContentLoaded', boot)