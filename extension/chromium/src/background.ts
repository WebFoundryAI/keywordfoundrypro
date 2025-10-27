// Background service worker for SERP Saver extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('[KF SERP Saver] Extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (handled automatically by manifest)
  console.log('[KF SERP Saver] Extension icon clicked');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || null });
    });
    return true;
  }

  if (request.action === 'log') {
    console.log('[KF SERP Saver]', request.message);
  }
});

export {};
