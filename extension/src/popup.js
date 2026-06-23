// popup.js — runs inside the extension popup window
// NOTE: Chrome extensions use chrome.storage.local, NOT localStorage.
// The popup is destroyed and recreated every time the user opens/closes it,
// so all state is read from chrome.storage on every open.

const API_BASE = 'http://localhost:8000'

const SOURCE_PLATFORMS = [
    'LinkedIn', 'Naukri', 'Wellfound', 'Indeed',
    'Glassdoor', 'Instahyre', 'Company Website', 'Referral', 'Manual', 'Other',
]

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve))
}

function setStorage(data) {
    return new Promise((resolve) => chrome.storage.local.set(data, resolve))
}

function removeStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.remove(keys, resolve))
}

function getSession(keys) {
    return new Promise((resolve) => chrome.storage.session.get(keys, resolve))
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag)
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') node.className = v
        else if (k === 'style') Object.assign(node.style, v)
        else if (k.startsWith('on') && typeof v === 'function')
            node.addEventListener(k.slice(2).toLowerCase(), v)
        else node.setAttribute(k, v)
    })
    children.forEach((child) => {
        if (child == null) return
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
    })
    return node
}

// ─── Header ───────────────────────────────────────────────────────────────────

function renderHeader(showSignOut = false, onSignOut) {
    const right = showSignOut
        ? el('button', { className: 'btn-signout', onClick: onSignOut }, 'Sign out')
        : el('span', {})

    return el(
        'div', { className: 'header' },
        el('div', {},
            el('div', { className: 'header-brand' }, 'AI Career Pipeline'),
            el('div', { className: 'header-title' }, 'Job Tracker'),
        ),
        right,
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

    const form = el(
        'div', { className: 'body' },
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

    submitBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim()
        const password = passwordInput.value.trim()

        if (!email || !password) {
            alertBox.innerHTML = ''
            alertBox.appendChild(renderAlert('Email and password are required.'))
            return
        }

        submitBtn.disabled = true
        submitBtn.textContent = 'Signing in…'
        alertBox.innerHTML = ''

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

            // Save token to chrome.storage.local — NOT localStorage
            await setStorage({ token })

            // Re-render as the job save view
            root.innerHTML = ''
            await renderJobView(root)
        } catch {
            alertBox.appendChild(renderAlert('Cannot reach the API gateway. Make sure it is running on port 8000.'))
        } finally {
            submitBtn.disabled = false
            submitBtn.textContent = 'Sign in'
        }
    })

    root.appendChild(renderHeader(false))
    root.appendChild(form)
}

// ─── Job save view ────────────────────────────────────────────────────────────

async function renderJobView(root) {
    // Read token and last detected job data in parallel
    const [{ token }, { lastJobData }] = await Promise.all([
        getStorage(['token']),
        getSession(['lastJobData']),
    ])

    const job = lastJobData || {}

    // Build source platform dropdown
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

    // Badge showing job was auto-detected
    const detectedBadge = job.jobTitle
        ? el('div', { className: 'detected-badge' },
            el('span', { className: 'detected-dot' }),
            `Job detected from ${job.sourcePlatform || 'this page'}`,
        )
        : null

    // If no job data found, show a hint
    const noJobHint = !job.jobTitle && !job.company
        ? el('div', { className: 'no-job' },
            el('div', { className: 'no-job-title' }, 'No job detected'),
            'Open a job posting on LinkedIn, Indeed, Wellfound, or Instahyre, then reopen this popup. Or fill in the details manually below.',
        )
        : null

    const form = el(
        'div', { className: 'body' },
        detectedBadge,
        noJobHint,
        alertBox,
        el('div', { className: 'field' },
            el('label', { className: 'label', for: 'field-company' }, 'Company *'),
            companyInput,
        ),
        el('div', { className: 'field' },
            el('label', { className: 'label', for: 'field-title' }, 'Job title *'),
            titleInput,
        ),
        el('div', { className: 'field' },
            el('label', { className: 'label', for: 'field-platform' }, 'Platform *'),
            platformSelect,
        ),
        el('div', { className: 'field' },
            el('label', { className: 'label', for: 'field-location' }, 'Location'),
            locationInput,
        ),
        el('div', { className: 'field' },
            el('label', { className: 'label', for: 'field-url' }, 'Job URL'),
            urlInput,
        ),
        el('div', { className: 'field' },
            el('label', { className: 'label', for: 'field-notes' }, 'Notes'),
            notesArea,
        ),
        submitBtn,
    )

    // Sign out handler
    const handleSignOut = async () => {
        await removeStorage(['token'])
        root.innerHTML = ''
        renderLoginView(root)
    }

    root.appendChild(renderHeader(true, handleSignOut))
    root.appendChild(form)

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
        submitBtn.textContent = 'Saving…'

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
                // Token expired — force re-login
                await removeStorage(['token'])
                alertBox.appendChild(renderAlert('Session expired. Please sign in again.'))
                setTimeout(() => {
                    root.innerHTML = ''
                    renderLoginView(root)
                }, 1500)
                return
            }

            if (!res.ok) {
                alertBox.appendChild(renderAlert(data.error || 'Failed to save application.'))
                return
            }

            // Success — clear the form and show confirmation
            alertBox.appendChild(renderAlert(`Saved: ${company} — ${jobTitle}`, 'success'))
            companyInput.value = ''
            titleInput.value = ''
            locationInput.value = ''
            urlInput.value = ''
            notesArea.value = ''
            platformSelect.value = ''

            // Clear the stored job data so stale data doesn't persist
            await chrome.storage.session.remove(['lastJobData'])
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