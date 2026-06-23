// background.js — service worker
// Acts as the message relay between content scripts and the popup.
// Content scripts cannot talk to the popup directly — they go through here.

// When a content script sends JOB_DATA, store it in chrome.storage.session
// so the popup can read it the moment it opens.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'JOB_DATA') {
        chrome.storage.session.set({ lastJobData: message.payload }, () => {
            sendResponse({ ok: true })
        })
        return true // keeps the message channel open for async sendResponse
    }
})