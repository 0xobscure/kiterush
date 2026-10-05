// Release gate: run before archiving for the App Store.  Usage: cd native && npm run preflight
// Exits 1 if anything that must be filled in (or must not ship) is still present.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const problems = [], warnings = [];
const need = (ok, msg) => { if (!ok) problems.push(msg); };

for (const f of ['privacy.html', 'terms.html']) need(!/\{\{[A-Z_]+\}\}/.test(read(f)), `${f}: unfilled {{PLACEHOLDER}} values`);

const game = read('index.html');
const cfg = (game.match(/const KR_CONFIG = window\.KR_CONFIG \|\| \{[\s\S]*?\n\};/) || [''])[0];
const iosAds = ['iosRewarded', 'iosInterstitial'].filter(k => new RegExp(k + ":'ca-app-pub-\\d+/\\d+'").test(cfg));
if (iosAds.length < 2) warnings.push('KR_CONFIG.admob iOS ad unit IDs are empty: the app ships ad-free (fine if intentional)');
if (/ca-app-pub-3940256099942544/.test(cfg)) problems.push('KR_CONFIG contains Google TEST ad unit IDs');
const pu = (cfg.match(/privacyUrl:'([^']*)'/) || [])[1] || '';
if (!/^https:\/\//.test(pu)) warnings.push(`KR_CONFIG.privacyUrl is "${pu}" (relative): App Store Connect still needs a public https privacy URL`);

const plist = fs.readFileSync(path.join(root, 'native/ios/App/App/Info.plist'), 'utf8');
const gad = (plist.match(/GADApplicationIdentifier<\/key>\s*<string>([^<]*)/) || [])[1] || '';
if (iosAds.length === 2) need(!gad.startsWith('ca-app-pub-3940256099942544'), 'Info.plist GADApplicationIdentifier is still Google\'s TEST app ID while real ad units are set');
else if (gad.startsWith('ca-app-pub-3940256099942544')) warnings.push('Info.plist GADApplicationIdentifier is Google\'s test app ID (OK while ads are off; replace before enabling ads)');

const pbx = fs.readFileSync(path.join(root, 'native/ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
need(/PRODUCT_BUNDLE_IDENTIFIER = app\.kiterush\.game;/.test(pbx), 'bundle id is not app.kiterush.game');
need(!/Release[\s\S]{0,40}CAPACITOR_DEBUG/.test(pbx), 'Release config sets CAPACITOR_DEBUG');
need(fs.existsSync(path.join(root, 'native/ios/App/App/PrivacyInfo.xcprivacy')), 'PrivacyInfo.xcprivacy missing');
need(fs.existsSync(path.join(root, 'native/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')), '1024px App Icon missing');

warnings.forEach(w => console.log('  ! ' + w));
problems.forEach(p => console.log('  ✗ ' + p));
console.log(problems.length ? `\n${problems.length} blocking problem(s)` : '\nPreflight OK');
process.exit(problems.length ? 1 : 0);
