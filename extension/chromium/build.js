// Simple esbuild script for Chrome extension

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outdir = path.join(__dirname, 'dist');

// Clean dist folder
if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir, { recursive: true });

// Build content script
esbuild.build({
  entryPoints: ['src/content.ts'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  target: 'chrome100',
}).catch(() => process.exit(1));

// Build background script
esbuild.build({
  entryPoints: ['src/background.ts'],
  bundle: true,
  outfile: 'dist/background.js',
  format: 'iife',
  target: 'chrome100',
}).catch(() => process.exit(1));

// Copy static files
fs.copyFileSync('manifest.json', path.join(outdir, 'manifest.json'));
fs.copyFileSync('src/popup.html', path.join(outdir, 'popup.html'));
fs.copyFileSync('src/popup.js', path.join(outdir, 'popup.js'));

// Create icons directory and placeholder icons
const iconsDir = path.join(outdir, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Create simple placeholder icons (in real implementation, use actual PNG icons)
console.log('Build complete! Extension files in dist/');
console.log('Note: Add actual icon PNG files to dist/icons/ before loading extension');
