// background.js
// Minimal service worker — just keeps the extension alive
// All extraction logic is now in the popup via scripting.executeScript

chrome.runtime.onInstalled.addListener(() => {
    console.log('[AI Career Pipeline] Extension installed/updated')
})