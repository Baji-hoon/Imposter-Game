const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MOBILE_DIR = path.resolve(__dirname, '../apps/mobile');
const DIST_DIR = path.resolve(MOBILE_DIR, 'dist');
const SHARED_SRC_DIR = path.resolve(__dirname, '../packages/shared/src');
const OUTPUT_FILE = path.resolve(SHARED_SRC_DIR, 'webAssets.ts');

console.log('=== Building & Packaging Web Client Assets ===');

// 1. Export the web bundle using Expo CLI
console.log('1. Running "npx expo export --platform web" in apps/mobile...');
execSync('npx expo export --platform web', {
  cwd: MOBILE_DIR,
  stdio: 'inherit',
});

if (!fs.existsSync(DIST_DIR)) {
  console.error('Error: dist directory was not created!');
  process.exit(1);
}

// 2. Enhance index.html with iPhone Safari meta tags and styles if missing
const indexPath = path.join(DIST_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  // Ensure viewport has viewport-fit=cover and user-scalable=no
  if (!html.includes('viewport-fit=cover')) {
    html = html.replace(
      /<meta name="viewport"[^>]*>/i,
      '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no" />'
    );
  }

  // Ensure Apple mobile web app tags
  if (!html.includes('apple-mobile-web-app-capable')) {
    const appleTags = [
      '    <meta name="apple-mobile-web-app-capable" content="yes" />',
      '    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
      '    <meta name="apple-mobile-web-app-title" content="Imposter" />',
      '    <link rel="apple-touch-icon" href="/favicon.ico" />',
    ].join('\n');
    html = html.replace('</head>', `${appleTags}\n  </head>`);
  }

  // Preload Neo-Brutalist Google Fonts if not already in index.html
  if (!html.includes('Abril+Fatface')) {
    const fontLinks = [
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
      '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />',
      '    <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Archivo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />',
    ].join('\n');
    html = html.replace('</head>', `${fontLinks}\n  </head>`);
  }

  // Ensure 100dvh & touch prevention CSS styles
  if (!html.includes('100dvh')) {
    const safariCss = `
    <style id="safari-touch-reset">
      html, body {
        height: 100%;
        height: 100dvh;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
        background-color: #F4F1EA;
        color: #111111;
        font-family: 'Archivo_500Medium', 'Archivo', system-ui, -apple-system, sans-serif;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        -webkit-user-select: none;
        user-select: none;
      }
      #root {
        display: flex;
        height: 100%;
        min-height: 100dvh;
        width: 100%;
        flex: 1;
        background-color: #F4F1EA;
      }
    </style>`;
    html = html.replace('</head>', `${safariCss}\n  </head>`);
  }

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✓ Injected iPhone Safari meta tags, fonts, and CSS reset into index.html');
}

// 3. Scan dist directory recursively and collect all assets
function getFilesRecursively(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, baseDir));
    } else {
      const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

const allFiles = getFilesRecursively(DIST_DIR);
console.log(`Found ${allFiles.length} files in dist/`);

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function isTextMime(mime) {
  return (
    mime.startsWith('text/') ||
    mime.includes('javascript') ||
    mime.includes('json') ||
    mime.includes('svg')
  );
}

// 4. Generate TypeScript module
const assetsRecord = {};

for (const { fullPath, relPath } of allFiles) {
  const mime = getMimeType(fullPath);
  const isText = isTextMime(mime);

  if (isText) {
    const content = fs.readFileSync(fullPath, 'utf8');
    assetsRecord[relPath] = {
      contentType: mime,
      data: content,
      isBase64: false,
    };
  } else {
    const buffer = fs.readFileSync(fullPath);
    assetsRecord[relPath] = {
      contentType: mime,
      data: buffer.toString('base64'),
      isBase64: true,
    };
  }
}

// Aliases
if (assetsRecord['/index.html'] && !assetsRecord['/']) {
  assetsRecord['/'] = assetsRecord['/index.html'];
}

const tsContent = `// AUTO-GENERATED by scripts/build-web-assets.js - DO NOT EDIT DIRECTLY
// Generated: ${new Date().toISOString()}

export interface WebAsset {
  contentType: string;
  data: string;
  isBase64?: boolean;
}

export const EMBEDDED_WEB_ASSETS: Record<string, WebAsset> = ${JSON.stringify(assetsRecord, null, 2)};

/**
 * Resolves an embedded asset from an incoming HTTP request URL path.
 * Normalizes leading slashes and queries.
 */
export function getEmbeddedWebAsset(urlPath: string): WebAsset | undefined {
  if (!urlPath) return EMBEDDED_WEB_ASSETS['/index.html'] || EMBEDDED_WEB_ASSETS['/'];
  const clean = urlPath.split('?')[0].split('#')[0];
  if (clean === '' || clean === '/') {
    return EMBEDDED_WEB_ASSETS['/index.html'] || EMBEDDED_WEB_ASSETS['/'];
  }
  const key = clean.startsWith('/') ? clean : '/' + clean;
  return EMBEDDED_WEB_ASSETS[key];
}
`;

fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf8');
console.log(`✓ Successfully generated ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB)`);
console.log('Done!');
