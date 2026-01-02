const fs = require('fs');
const path = require('path');

// THE GUARD CODE
// This forces Netlify functions and POST requests to bypass the Service Worker
const guardCode = `
/* PATCHED BY BUILD SCRIPT */
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/.netlify/') || event.request.method === 'POST') {
    event.respondWith(fetch(event.request));
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }
  }
});
/* END PATCH */
`;

// List of files to attempt to patch (Theme usually generates sw.min.js)
const targets = ['sw.min.js', 'sw.js'];

let patchedCount = 0;

targets.forEach(file => {
  const filePath = path.join(__dirname, 'public', file);

  if (fs.existsSync(filePath)) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');

      // Avoid double-patching if run multiple times
      if (!originalContent.includes('PATCHED BY BUILD SCRIPT')) {
        const newContent = guardCode + '\n' + originalContent;
        fs.writeFileSync(filePath, newContent);
        console.log(`Successfully patched public/${file}`);
        patchedCount++;
      } else {
        console.log(`public/${file} already patched.`);
      }
    } catch (e) {
      console.error(`Error patching ${file}:`, e);
      process.exit(1);
    }
  }
});

if (patchedCount === 0) {
  console.warn("Warning: No Service Worker files found to patch in public/ folder.");
}
