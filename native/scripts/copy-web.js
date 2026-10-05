// Copies the single-file game + assets from the repo root into www/ for Capacitor.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..');
const www = path.resolve(__dirname, '..', 'www');
fs.mkdirSync(www, { recursive: true });
for (const f of ['index.html', 'icon-192.png', 'icon-512.png', 'privacy.html', 'terms.html']) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(www, f)); console.log('copied', f); }
}
