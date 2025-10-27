// Popup script for SERP Saver extension

const API_BASE = 'https://app.keywordfoundrypro.com'; // Update with actual domain

let apiKey = null;
let projects = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Check if API key is stored
  const stored = await chrome.storage.local.get(['apiKey']);

  if (stored.apiKey) {
    apiKey = stored.apiKey;
    showMainSection();
    await loadProjects();
  } else {
    showAuthSection();
  }

  // Setup event listeners
  document.getElementById('save-key').addEventListener('click', saveApiKey);
  document.getElementById('save-serp').addEventListener('click', saveSerpSnapshot);
  document.getElementById('logout').addEventListener('click', logout);
});

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
}

function showAuthSection() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('main-section').style.display = 'none';
}

function showMainSection() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('main-section').style.display = 'block';
}

async function saveApiKey() {
  const input = document.getElementById('api-key');
  const key = input.value.trim();

  if (!key) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  // Validate key format (should start with kf_)
  if (!key.startsWith('kf_')) {
    showStatus('Invalid API key format', 'error');
    return;
  }

  // Store the key
  await chrome.storage.local.set({ apiKey: key });
  apiKey = key;

  showStatus('API key saved!', 'success');
  showMainSection();
  await loadProjects();
}

async function loadProjects() {
  const select = document.getElementById('project');
  select.innerHTML = '<option value="">Loading...</option>';

  try {
    const response = await fetch(`${API_BASE}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load projects');
    }

    const data = await response.json();
    projects = data.projects || [];

    if (projects.length === 0) {
      select.innerHTML = '<option value="">No projects found</option>';
      showStatus('No projects found. Create a project first.', 'info');
      return;
    }

    select.innerHTML = '<option value="">Select a project...</option>';
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    select.innerHTML = '<option value="">Error loading projects</option>';
    showStatus('Failed to load projects. Check your API key.', 'error');
  }
}

async function saveSerpSnapshot() {
  const projectId = document.getElementById('project').value;
  const note = document.getElementById('note').value;

  if (!projectId) {
    showStatus('Please select a project', 'error');
    return;
  }

  const button = document.getElementById('save-serp');
  button.disabled = true;
  button.textContent = 'Saving...';

  try {
    // Get SERP data from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeSERP' });

    if (!response.success) {
      throw new Error(response.error || 'Failed to scrape SERP data');
    }

    const serpData = response.data;

    // Send to API
    const apiResponse = await fetch(`${API_BASE}/api/ingest/serp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        project_id: projectId,
        serp_data: serpData,
        note: note || null
      })
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      throw new Error(error.error || 'Failed to save snapshot');
    }

    showStatus('SERP snapshot saved successfully!', 'success');
    document.getElementById('note').value = '';
  } catch (error) {
    console.error('Error saving SERP:', error);
    showStatus(error.message || 'Failed to save snapshot', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Save SERP Snapshot';
  }
}

async function logout() {
  if (confirm('Remove API key from this browser?')) {
    await chrome.storage.local.remove(['apiKey']);
    apiKey = null;
    showAuthSection();
    showStatus('API key removed', 'info');
  }
}
