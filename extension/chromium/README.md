# Keyword Foundry Pro - SERP Saver Extension

Chrome/Edge extension to save Google SERP snapshots directly to your Keyword Foundry Pro projects.

## Features

- **One-click SERP capture**: Save search results with a single click
- **Automatic data extraction**: Query, results, PAA, shopping presence
- **Project integration**: Choose which project to save the snapshot to
- **Secure authentication**: Uses your API key (never embedded in extension)

## Installation

### Development Build

1. Install dependencies (if using esbuild):
   ```bash
   npm install esbuild
   ```

2. Build the extension:
   ```bash
   node build.js
   ```

3. Load in Chrome/Edge:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Production

1. Download from Chrome Web Store (when published)

## Setup

1. Get your API key from Keyword Foundry Pro:
   - Go to https://app.keywordfoundrypro.com/account/api-keys
   - Click "Create API Key"
   - Copy the key (starts with `kf_`)

2. Open the extension popup and enter your API key

3. The extension will load your projects

## Usage

1. Perform a Google search
2. Click the Keyword Foundry Pro extension icon
3. Select a project from the dropdown
4. (Optional) Add a note
5. Click "Save SERP Snapshot"

The snapshot will be saved with:
- Query text
- Organic results (titles, URLs, snippets)
- People Also Ask (if present)
- Shopping results presence
- Country and language
- Timestamp

## Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] API key can be saved and persisted
- [ ] Projects load correctly
- [ ] SERP data extraction works on Google.com
- [ ] Snapshot saves successfully
- [ ] PAA detection works when present
- [ ] Shopping detection works when present
- [ ] Multi-language queries work
- [ ] Country/location parameters preserved
- [ ] Note field is optional
- [ ] Logout clears API key

## Security

- API keys are stored locally in browser storage
- No secrets are embedded in the extension bundle
- All communication uses HTTPS
- API key is sent via Authorization header

## Troubleshooting

**Extension not loading:**
- Check console for errors
- Verify manifest.json is valid
- Ensure all files are present in dist/

**Can't scrape SERP:**
- Verify you're on a Google search results page
- Check if Google's HTML structure has changed
- Open DevTools and check console

**API errors:**
- Verify API key is valid
- Check network tab for response details
- Ensure you have projects created

## File Structure

```
extension/chromium/
├── manifest.json         # Extension manifest
├── src/
│   ├── content.ts       # SERP scraping logic
│   ├── popup.html       # Popup UI
│   ├── popup.js         # Popup logic
│   └── background.ts    # Background service worker
├── build.js             # Build script
├── dist/                # Built extension (generated)
└── README.md            # This file
```

## Development

To modify the extension:

1. Edit files in `src/`
2. Run `node build.js`
3. Reload extension in Chrome

## Limitations

- Only works on Google.com SERP pages
- Captures top 10-20 organic results
- Requires active internet connection
- API key must be valid and not revoked

## Support

For issues or questions, visit https://keywordfoundrypro.com/support
