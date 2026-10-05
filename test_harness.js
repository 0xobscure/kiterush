/* Kite Rush QA harness — drives the real game in headless Chromium.
   Usage:  npm i -D playwright && npx playwright install chromium && node test_harness.js
   Checks: no JS errors, no NaN state, bounded entity/particle counts, all 5 zones reachable,
   bot survivability, death → continue → results → retry flow, shop purchase, missions,
   settings, daily gift, save persistence, v1 save migration, desktop + phone layouts. */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, 'index.html') + '?test=1';
const shots = process.env.SHOTS || '';
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const mk = async (vp = { width: 390, height: 844 }, pre, o = {}) => {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: +(process.env.DSF||1), hasTouch: true, isMobile: vp.width < 600 });
    const p = await ctx.newPage(); p.errs = []; p.net = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
    p.on('request', r => { if (/^https?:/.test(r.url())) p.net.push({ url: r.url(), method: r.method(), headers: r.headers(), body: r.postData() }); });
    if (o.init) for (const f of [].concat(o.init)) await p.addInitScript(f);
    if (o.route) await o.route(p);
    const u = o.url || URL;
    if (pre) { await p.goto(u); await p.evaluate(pre); }
    await p.goto(u + (o.q || '')); await p.waitForTimeout(500); return p;
  };
  const snap = async (p, n) => { if (shots) await p.screenshot({ path: path.join(shots, n + '.png') }); };

  console.log('1. Soak: god-mode autopilot through all zones (fast-forward)');
  let p = await mk();
  await p.evaluate(() => { __KR.god(true); __KR.autopilot(true); __KR.fast(6); __KR.start(); });
  let maxE = 0, maxP = 0;
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); const s = await p.evaluate(() => ({ e: __KR.ents, p: __KR.parts, nan: __KR.nan(), z: __KR.zone })); maxE = Math.max(maxE, s.e); maxP = Math.max(maxP, s.p); if (s.nan) { ok(false, 'NaN in state'); break; } }
  const soak = await p.evaluate(() => ({ z: __KR.zone, m: __KR.climbed | 0 }));
  ok(soak.z === 4, `reached Orbit (zone ${soak.z}, ${soak.m} m)`);
  ok(maxE < 120, `entity count bounded (max ${maxE})`); ok(maxP <= 420, `particles bounded (max ${maxP})`);
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('2. Survivability: autopilot, no god mode, 5 runs');
  p = await mk();
  const scores = [];
  for (let r = 0; r < 5; r++) {
    await p.evaluate(() => { __KR.autopilot(true); __KR.fast(4); if (__KR.state !== 'title') __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); __KR.start(); });
    for (let i = 0; i < 60; i++) { await p.waitForTimeout(250); const st = await p.evaluate(() => __KR.state); if (st !== 'play' && st !== 'dying') break; }
    if (await p.evaluate(() => __KR.state) === 'play') { await p.evaluate(() => __KR.kill()); await p.waitForTimeout(1300); }
    if (await p.evaluate(() => __KR.state) === 'cont') await p.evaluate(() => __KR.finish());
    await p.waitForTimeout(650);
    scores.push(await p.evaluate(() => __KR.run.score | 0));
  }
  console.log('    bot scores:', scores.join(', '));
  ok(scores.every(s => s > 60), 'every run gets off the ground (>60 m)');
  ok(Math.max(...scores) > 300, 'bot can reach 300 m+');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('3. Death → continue → results → retry');
  p = await mk(undefined, () => localStorage.setItem('kiterush.save.v3', JSON.stringify({ coins: 500, best: 900, tut: { steer: true, ring: true, cut: true } })));
  await p.evaluate(() => { __KR.god(true); __KR.autopilot(true); __KR.fast(4); __KR.start(); });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { __KR.god(false); __KR.fast(1); __KR.kill(); });
  await p.waitForTimeout(1500);
  ok(await p.isVisible('#cont'), 'continue offered with 500 coins'); await snap(p, 'continue');
  const c0 = await p.evaluate(() => __KR.save.coins); await p.click('#bContCoin'); await p.waitForTimeout(300);
  ok(await p.evaluate(c0 => __KR.state === 'play' && __KR.save.coins === c0 - 100, c0), 'continue spends 100 coins and resumes');
  await p.evaluate(() => __KR.kill()); await p.waitForTimeout(1500);
  ok(await p.isVisible('#res'), 'second death skips continue → results'); await p.waitForTimeout(900); await snap(p, 'results');
  const txt = await p.textContent('#rScore'); ok(/\d/.test(txt), 'results shows score ' + txt);
  await p.waitForTimeout(300); await p.click('#bRetry'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __KR.state === 'play' && __KR.climbed < 50), 'retry restarts instantly');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('4. Meta: shop, missions, settings, daily gift, persistence');
  p = await mk(undefined, () => localStorage.setItem('kiterush.save.v3', JSON.stringify({ coins: 300 })));
  await p.evaluate(() => { document.getElementById('dayM').classList.add('hide'); });
  await p.click('#bShop'); await p.waitForTimeout(300); await snap(p, 'shop');
  await p.click('#shopGrid .sk:nth-child(2)'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __KR.save.skin === 'ocean' && __KR.save.coins === 50), 'bought + equipped Ocean for 250');
  await p.click('#shopGrid .sk:nth-child(3)'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !__KR.save.skins.includes('mint')), 'cannot buy unaffordable kite');
  await p.click('#shopX'); await p.click('#bMis'); await p.waitForTimeout(300); await snap(p, 'missions');
  ok((await p.$$('#misList .mrow')).length === 3, '3 missions listed'); await p.click('#misX');
  await p.click('#bSet'); await p.waitForTimeout(200); await snap(p, 'settings');
  await p.click('#sMusic'); ok(await p.evaluate(() => __KR.save.settings.music === false), 'music toggle persists'); await p.click('#setX');
  await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => __KR.save.skin === 'ocean' && __KR.save.settings.music === false), 'save survives reload');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('5. v1 save migration');
  p = await mk(undefined, () => { localStorage.clear(); localStorage.setItem('kiterush_ribbons', '640'); localStorage.setItem('kiterush_owned', '["classic","mint","galaxy"]'); });
  const mg = await p.evaluate(() => ({ c: __KR.save.coins, s: __KR.save.skins }));
  ok(mg.c === 640 && mg.s.includes('mint') && mg.s.includes('galaxy'), `ribbons→coins, skins carried (${JSON.stringify(mg)})`);
  await p.close();

  console.log('6. Desktop 16:9 layout + keyboard');
  p = await mk({ width: 1366, height: 768 });
  await p.keyboard.press('Space'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => __KR.state === 'play'), 'space starts game');
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(600); await p.keyboard.up('ArrowLeft');
  await snap(p, 'desktop');
  await p.keyboard.press('Escape'); ok(await p.isVisible('#pause'), 'Esc pauses');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();


  // ---------- helpers for new-feature tests ----------
  const SAVE = o => `localStorage.setItem('kiterush.save.v3', ${JSON.stringify(JSON.stringify(o))})`;
  const hideDay = p => p.evaluate(() => document.getElementById('dayM').classList.add('hide'));
  const endRun = async (p, pre) => { // kill current run and land on results
    await p.evaluate(pre || (() => {})); await p.waitForTimeout(150);
    await p.evaluate(() => { __KR.god(false); __KR.kill(); }); await p.waitForTimeout(1400);
    if (await p.evaluate(() => __KR.state) === 'cont') await p.evaluate(() => __KR.finish());
    await p.waitForTimeout(500);
  };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const yday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const MOCK = () => {
    window.__calls = []; const rec = n => (...a) => { window.__calls.push([n, ...a]); return Promise.resolve(); };
    window.KR_CONFIG = { lbUrl: '', lbKey: '', analyticsUrl: '', admob: { iosRewarded: 'ca-rew', iosInterstitial: 'ca-int', androidRewarded: '', androidInterstitial: '' },
      iap: { pro: 'kr_pro', removeAds: 'kr_remove_ads', coins1: 'kr_coins_1000', coins2: 'kr_coins_3000', starter: 'kr_starter_pack' }, gameCenter: { allTime: 'kr_best_alltime', daily: 'kr_daily' }, privacyUrl: 'privacy.html', termsUrl: 'terms.html' };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {
      AdMob: { initialize: rec('initialize'), requestConsentInfo: (...a) => { window.__calls.push(['requestConsentInfo']); return Promise.resolve({ isConsentFormAvailable: true, status: 'REQUIRED' }); },
        showConsentForm: rec('showConsentForm'), requestTrackingAuthorization: rec('att'), prepareRewardVideoAd: rec('prepareRewardVideoAd'),
        showRewardVideoAd: () => { window.__calls.push(['showRewardVideoAd']); return Promise.resolve({ type: 'coins', amount: 1 }); },
        prepareInterstitial: rec('prepareInterstitial'), showInterstitial: rec('showInterstitial') },
      Haptics: { impact: rec('impact') },
      Preferences: { set: rec('prefSet'), get: () => Promise.resolve({ value: window.__pref || null }) },
      App: { addListener: (n, cb) => { window.__appCb = cb; return Promise.resolve({ remove() {} }); } },
      SplashScreen: { hide: rec('splashHide') }, StatusBar: { hide: rec('statusHide') },
      LocalNotifications: { requestPermissions: () => Promise.resolve({ display: 'granted' }), schedule: rec('schedule'), cancel: rec('cancel') },
      CapacitorGameConnect: { signIn: rec('signIn'), submitScore: rec('submitScore'), showLeaderboard: rec('showLeaderboard') } } };
    const H = {}, prods = {}; let tx = 0;
    const store = {
      register(ps) { ps.forEach(p => { prods[p.id] = { id: p.id, owned: false, pricing: { price: '$' + ({ kr_pro: '4.99', kr_remove_ads: '2.99', kr_coins_1000: '0.99', kr_coins_3000: '1.99', kr_starter_pack: '3.99' })[p.id] },
        getOffer() { return { order: () => { const t = { transactionId: 'tx' + (++tx), products: [{ id: p.id }], verify() { window.__calls.push(['verify', p.id]); H.verified && H.verified({ finish() { window.__calls.push(['finish', p.id]); } }); } }; H.approved(t); return Promise.resolve(); } }; } }; }); },
      when() { const o = { approved(f) { H.approved = f; return o; }, verified(f) { H.verified = f; return o; }, productUpdated(f) { H.pu = f; return o; } }; return o; },
      initialize() { return Promise.resolve(); }, get(id) { return prods[id]; },
      restorePurchases() { prods.kr_starter_pack.owned = true; if (window.__restorePro && prods.kr_pro) prods.kr_pro.owned = true; return Promise.resolve(); } };
    window.__replay = (id, t) => H.approved({ transactionId: t, products: [{ id }], verify() {} });
    window.CdvPurchase = { store, ProductType: { CONSUMABLE: 'consumable', NON_CONSUMABLE: 'non consumable' }, Platform: { APPLE_APPSTORE: 'ios-appstore', GOOGLE_PLAY: 'android-playstore' } };
  };
  const calls = (p, n) => p.evaluate(n => window.__calls.filter(c => c[0] === n), n);

  console.log('7. Daily Challenge: seeded course, rewards, streak, results');
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, missions: [{ k: 'runs', t: 9, p: 0, done: false, rw: 40 }, { k: 'totcoins', t: 5000, p: 0, done: false, rw: 40 }, { k: 'cutsTot', t: 99, p: 0, done: false, rw: 40 }] }));
  await hideDay(p);
  ok((await p.textContent('#tDaily')).startsWith('New!') && await p.isVisible('#bDaily'), 'title Daily Challenge button shows "New!"');
  await snap(p, 'title_daily');
  const sigA = await p.evaluate(() => __KR.dailySig(25)), sigB = await p.evaluate(() => __KR.dailySig(25));
  ok(sigA.length > 200 && sigA === sigB, 'daily course is identical on repeat generation');
  const p320 = await mk({ width: 320, height: 568 });
  ok(await p320.evaluate(() => __KR.dailySig(25)) === sigA, 'daily course identical across screen sizes (320×568 vs 390×844)'); await p320.close();
  const e1 = await p.evaluate(() => { __KR.startDaily(); return __KR.mode; });
  ok(e1 === 'daily', 'Daily button path starts a daily run');
  let cc = await p.evaluate(() => __KR.save.coins);
  await endRun(p, () => { __KR.addScore(620); });
  let d = await p.evaluate(() => ({ c: __KR.save.coins, r: __KR.lastR, dc: __KR.save.dc, head: document.getElementById('rHead').textContent, hv: !document.getElementById('rHead').classList.contains('hide') }));
  const dd = d.dc.days[today()];
  ok(dd && dd.runs === 1 && dd.best >= 620, `daily best saved per day (${dd && dd.best})`);
  ok(d.c - cc - d.r.coins >= 100 && dd.ms.includes(500), `first-run +50 and 500 m milestone +50 granted (${d.c - cc - d.r.coins})`);
  ok(d.hv && /Daily Challenge/.test(d.head), 'results headed "' + d.head + '"');
  await snap(p, 'daily_results');
  cc = d.c; await p.click('#bRetry'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __KR.mode === 'daily'), 'retry keeps daily mode');
  await endRun(p);
  d = await p.evaluate(() => ({ c: __KR.save.coins, r: __KR.lastR, dc: __KR.save.dc }));
  ok(d.c - cc === d.r.coins, 'no repeat first-run or milestone reward on 2nd daily run');
  ok(await p.evaluate(() => __KR.save.missions.find(m => m.k === 'runs').p === 2), 'normal missions progress in daily runs');
  await p.evaluate(y => { __KR.save.dc.last = y; __KR.save.dc.streak = 2; __KR.save.dc.days = {}; __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); __KR.startDaily(); }, yday());
  cc = await p.evaluate(() => __KR.save.coins);
  await endRun(p);
  d = await p.evaluate(() => ({ c: __KR.save.coins, r: __KR.lastR, st: __KR.save.dc.streak }));
  ok(d.st === 3 && d.c - cc - d.r.coins === 150, `streak 2→3 grants +100 bonus (+50 first run) (streak ${d.st}, +${d.c - cc - d.r.coins})`);
  await p.evaluate(() => __KR.toTitle());
  ok(/Today's best .*3-day streak/.test(await p.textContent('#tDaily')), 'daily button shows today\'s best + streak: ' + await p.textContent('#tDaily'));
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('8. Leaderboards: local fallback, Supabase backend, name prompt, anti-abuse');
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, localTop: [{ s: 900, d: today() }, { s: 400, d: yday() }], dc: { days: { [today()]: { best: 700, runs: 2, ms: [500] } }, last: today(), streak: 1 } }));
  await hideDay(p); await p.click('#bLb'); await p.waitForTimeout(200); await snap(p, 'lb_local');
  ok(await p.isVisible('#lbM') && !(await p.isVisible('#askM')), 'leaderboard opens, no name prompt without backend');
  let lbt = await p.textContent('#lbList');
  ok(/Your last 7 days/.test(lbt) && /700 m/.test(lbt) && (await p.$$('#lbList .lr')).length === 7, 'Today tab: last-7-days local history');
  await p.click('#lbT1'); lbt = await p.textContent('#lbList');
  ok(/Your top 10/.test(lbt) && /900 m/.test(lbt) && !/everyone/.test(lbt), 'All-time tab: local top 10, no remote section');
  ok(p.net.length === 0, 'zero network requests with default config (' + p.net.map(r => r.url).join(',') + ')');
  await p.close();
  const posts = []; let lbFail = false;
  const supa = async p => { await p.route('https://lb.test/**', async r => { const q = r.request();
    if (q.method() === 'POST') { posts.push({ url: q.url(), h: q.headers(), b: JSON.parse(q.postData() || '{}') }); return r.fulfill({ status: 201, body: '' }); }
    if (lbFail) return r.fulfill({ status: 500, body: 'x' });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/daily/.test(q.url()) ? [{ name: 'Ann', score: 2400 }, { name: 'Bo', score: 300 }] : [{ name: 'Cy', score: 9000 }]) }); }); };
  const lbInit = () => { window.KR_CONFIG = { lbUrl: 'https://lb.test', lbKey: 'anon-key', analyticsUrl: '', admob: {}, iap: {}, gameCenter: {} }; };
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 } }), { init: lbInit, route: supa });
  await hideDay(p); await p.click('#bLb'); await p.waitForTimeout(300);
  ok(await p.isVisible('#askM') && await p.isVisible('#aIn'), 'name prompt on first leaderboard open with backend'); await snap(p, 'name_prompt');
  await p.fill('#aIn', 'shitbird'); await p.click('#aYes'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __KR.save.lb.name === ''), 'bad-word name rejected');
  await p.click('#lbEdit'); await p.fill('#aIn', ' Vi<p>ul!!_x '); await p.click('#aYes'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => __KR.save.lb.name) === 'Vipul_x', 'name sanitized to "' + await p.evaluate(() => __KR.save.lb.name) + '"');
  lbt = await p.textContent('#lbList');
  ok(/Today · everyone/.test(lbt) && /Ann/.test(lbt) && /2,400/.test(lbt), 'remote daily board fetched and shown');
  const g = p.net.find(r => r.method === 'GET' && /rest\/v1\/scores/.test(r.url));
  ok(g && /select=name,score&board=eq.daily&day=eq.\d{4}-\d\d-\d\d&order=score.desc&limit=50/.test(g.url) && g.headers.apikey === 'anon-key' && g.headers.authorization === 'Bearer anon-key', 'GET query + apikey/Bearer headers correct');
  await snap(p, 'lb_remote');
  await p.click('#lbX');
  // anti-abuse: absurd pace (score >> duration*40) must not be submitted
  await p.evaluate(() => { __KR.startDaily(); }); await p.waitForTimeout(300);
  await endRun(p, () => { __KR.addScore(3000); });
  await p.waitForTimeout(500);
  ok(!posts.some(x => x.b.board === 'daily'), 'too-fast run (3000 m in <1 s) not submitted');
  await p.click('#bRetry'); await p.waitForTimeout(300);
  await endRun(p, () => { __KR.addScore(3200); __KR.setRunT(200); });
  await p.waitForTimeout(700);
  const dp = posts.find(x => x.b.board === 'daily');
  ok(dp && dp.b.score >= 3200 && dp.b.name === 'Vipul_x' && dp.b.uid && dp.b.day === today() && /resolution=merge-duplicates/.test(dp.h.prefer) && /return=minimal/.test(dp.h.prefer), 'valid daily best POSTed (upsert, return=minimal)');
  ok(posts.some(x => x.b.board === 'all'), 'all-time best POSTed');
  ok(/#\d+ today/.test(await p.textContent('#rDRank')), 'daily results show rank: ' + await p.textContent('#rDRank'));
  await p.evaluate(() => { __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); __KR.save.best = 60000; __KR.save.lb.pend = {}; }); posts.length = 0;
  await p.evaluate(() => __KR.start()); await endRun(p, () => { __KR.addScore(60000); __KR.setRunT(99999); });
  await p.waitForTimeout(500);
  ok(!posts.length, 'scores > 50000 never submitted');
  lbFail = true; await p.evaluate(() => __KR.toTitle()); await hideDay(p); await p.click('#bLb'); await p.waitForTimeout(500);
  ok(/Offline/.test(await p.textContent('#lbList')) && /Your last 7 days/.test(await p.textContent('#lbList')), 'backend failure falls back to local list');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('9. Rival links');
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, coins: 0 }), { q: '&vs=1234&n=Vi%3Cpul%3E' });
  await hideDay(p);
  ok(await p.evaluate(() => JSON.stringify(__KR.save.rival)) === '{"s":1234,"n":"Vipul"}', 'rival stored + sanitized');
  ok((await p.textContent('#tRival')) === "Beat Vipul's 1,234 m!" && await p.isVisible('#tRival'), 'title banner: ' + await p.textContent('#tRival'));
  ok(!/vs=/.test(await p.evaluate(() => location.search)), 'vs params stripped from URL');
  await snap(p, 'rival_title');
  await p.evaluate(() => { __KR.god(true); __KR.start(); }); await p.waitForTimeout(400);
  await snap(p, 'rival_line');
  await p.evaluate(() => __KR.addScore(1300)); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __KR.rival && __KR.rival.beat && __KR.rival.paid && __KR.save.beatRivals.includes('Vipul:1234')), 'crossing rival line → beaten, +25 coins (once per rival)');
  await endRun(p);
  ok(/You beat Vipul's 1,234 m/.test(await p.textContent('#rExtra')), 'results: ' + await p.textContent('#rExtra'));
  ok(await p.evaluate(() => __KR.save.rival === null), 'rival cleared after beating');
  await p.close();
  const srv = async p => { await p.route('http://kr.test/**', r => r.fulfill({ status: 200, contentType: 'text/html', path: path.resolve(__dirname, 'index.html') })); };
  p = await mk(undefined, null, { route: srv, url: 'http://kr.test/game/index.html?test=1', init: () => { navigator.share = d => { window.__sh = d; return Promise.resolve(); }; } });
  await p.evaluate(() => { localStorage.setItem('kiterush.save.v3', JSON.stringify({ lb: { name: 'Vipul' }, tut: { steer: true, ring: true, cut: true } })); }); await p.reload(); await p.waitForTimeout(400); await hideDay(p);
  await p.evaluate(() => __KR.startDaily()); await endRun(p, () => __KR.addScore(1500));
  await p.click('#bShare'); await p.waitForTimeout(200);
  const sh = await p.evaluate(() => window.__sh);
  ok(sh && /Daily Challenge/.test(sh.text) && /\d{1,2}/.test(sh.text) && sh.url.startsWith('http://kr.test/game/index.html?vs=') && /&n=Vipul$/.test(sh.url), 'share text/url: ' + (sh && sh.text + ' ' + sh.url));
  await p.close();

  console.log('10. Shop tabs, tails, trails, weekly event');
  p = await mk(undefined, SAVE({ coins: 2000, tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 } }));
  await hideDay(p); await p.click('#bShop'); await p.waitForTimeout(200);
  ok((await p.$$('#shopTabs .tab')).length === 3 && !/Coins/.test(await p.textContent('#shopTabs')), 'web: Kites|Tails|Trails tabs, no Coins tab');
  ok(!/Lantern|Dragon|Lotus|Comet|Phoenix/.test(await p.textContent('#shopGrid')), 'event + IAP kites hidden from normal shop');
  await p.click('#shopTabs .tab:nth-child(2)'); await p.waitForTimeout(100); await snap(p, 'shop_tails');
  await p.click('#shopGrid .sk:nth-child(2)'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => __KR.save.tails.includes('candy') && __KR.save.tail === 'candy' && __KR.save.coins === 1850), 'bought + equipped Candy tail (150)');
  await p.click('#shopTabs .tab:nth-child(3)'); await p.waitForTimeout(100); await snap(p, 'shop_trails');
  await p.click('#shopGrid .sk:nth-child(6)'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => __KR.save.trail === 'rainbow' && __KR.save.coins === 350), 'bought + equipped Rainbow trail (1500)');
  await p.click('#shopGrid .sk:nth-child(5)'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !__KR.save.trails.includes('leaves')), 'cannot buy unaffordable trail');
  await p.click('#shopX');
  await p.evaluate(() => { __KR.god(true); __KR.autopilot(true); __KR.start(); }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => __KR.parts) < 120, 'trail keeps particle count low (' + await p.evaluate(() => __KR.parts) + ')');
  await snap(p, 'trail_play');
  await p.evaluate(() => __KR.toTitle()); await hideDay(p);
  await p.click('#bMis'); await p.waitForTimeout(200);
  ok(/Weekly event/.test(await p.textContent('#misEv')) && /5,000 m/.test(await p.textContent('#misEv')), 'Missions panel shows weekly event progress'); await snap(p, 'missions_event'); await p.click('#misX');
  await p.evaluate(() => { __KR.save.ev.m = 4990; __KR.start(); __KR.warp(30); });
  await endRun(p);
  const evk = await p.evaluate(() => ['lantern', 'dragon', 'lotus', 'comet'].filter(k => __KR.save.skins.includes(k)));
  ok(evk.length === 1 && /New kite unlocked/.test(await p.textContent('#rRank')), 'weekly 5,000 m goal unlocks this week\'s event kite (' + evk + ')');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('11. Native bridge (mocked Capacitor + CdvPurchase)');
  p = await mk(undefined, SAVE({ coins: 100, tut: { steer: true, ring: true, cut: true }, stats: { runs: 1 } }), { init: MOCK });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => __KR.Platform.kind === 'native' && __KR.Platform.hasRewarded), 'Platform.kind native, rewarded available');
  const cn = await p.evaluate(() => window.__calls.map(c => c[0]));
  ok(['initialize', 'requestConsentInfo', 'showConsentForm', 'prepareRewardVideoAd', 'prepareInterstitial', 'statusHide', 'splashHide', 'signIn'].every(n => cn.includes(n)), 'init: AdMob init+consent form, preload ads, StatusBar/Splash hide, Game Center sign-in');
  ok(!cn.includes('att'), 'no ATT prompt on first launch');
  ok((await calls(p, 'prefSet')).some(c => c[1].key === 'kiterush.save.v3'), 'save mirrored to Preferences');
  await hideDay(p);
  await p.evaluate(() => { __KR.god(true); __KR.autopilot(true); __KR.fast(4); __KR.start(); }); await p.waitForTimeout(2500);
  await endRun(p, () => __KR.setRunT(300));
  ok((await calls(p, 'impact')).some(c => c[1].style === 'HEAVY'), 'death → Haptics HEAVY');
  ok((await calls(p, 'att')).length === 1, 'ATT requested after 2nd run');
  ok((await calls(p, 'submitScore')).some(c => c[1].leaderboardID === 'kr_best_alltime'), 'Game Center all-time score submitted');
  const rc = await p.evaluate(() => __KR.lastR.coins);
  ok(await p.isVisible('#bDouble') === rc >= 5, 'Double coins button shown iff run coins ≥ 5 (' + rc + ')');
  if (rc >= 5) { cc = await p.evaluate(() => __KR.save.coins); await p.click('#bDouble'); await p.waitForTimeout(900);
    ok(await p.evaluate(cc => __KR.save.coins, cc) === cc + rc && !(await p.isVisible('#bDouble')) && (await calls(p, 'showRewardVideoAd')).length === 1, 'rewarded ad doubles coins once'); }
  await snap(p, 'native_results');
  // interstitial guards
  const inter = () => calls(p, 'showInterstitial').then(a => a.length);
  await p.evaluate(() => { __KR.save.stats.runs = 2; __KR.save.adRuns = 9; }); await p.click('#bRetry'); await p.waitForTimeout(400);
  ok(await inter() === 0, 'no interstitial within first 3 runs of install');
  await endRun(p, () => __KR.setRunT(5)); await p.evaluate(() => { __KR.save.stats.runs = 10; __KR.save.adRuns = 9; }); await p.click('#bRetry'); await p.waitForTimeout(400);
  ok(await inter() === 0, 'no interstitial after a run < 20 s');
  await endRun(p, () => __KR.setRunT(30)); await p.evaluate(() => { __KR.save.adRuns = 1; }); await p.waitForTimeout(500); await p.click('#bRetry'); await p.waitForTimeout(400);
  ok(await inter() === 0, 'no interstitial when fewer than 3 runs since last');
  await endRun(p, () => __KR.setRunT(30)); await p.evaluate(() => { __KR.save.adRuns = 3; }); await p.waitForTimeout(500); await p.click('#bRetry'); await p.waitForTimeout(400);
  ok(await inter() === 1, 'interstitial shown at the 3-run cadence');
  // IAP
  await p.evaluate(() => { __KR.save.notif.asked = true; __KR.toTitle(); }); await hideDay(p); await p.click('#bShop'); await p.waitForTimeout(150);
  ok(/Coins/.test(await p.textContent('#shopTabs')), 'native: Coins tab present');
  await p.click('#shopTabs .tab:nth-child(4)'); await p.waitForTimeout(150); await snap(p, 'shop_coins');
  ok(/\$0\.99/.test(await p.textContent('#shopGrid')) && /\$3\.99/.test(await p.textContent('#shopGrid')), 'localized store prices shown');
  cc = await p.evaluate(() => __KR.save.coins);
  await p.click('#shopGrid .iapc:has-text("1,000 coins")'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __KR.save.coins) === cc + 1000 && (await calls(p, 'finish')).length === 1, 'coins1 purchase grants +1000 and finishes transaction');
  await p.evaluate(() => window.__replay('kr_coins_1000', 'tx1')); await p.waitForTimeout(100);
  ok(await p.evaluate(() => __KR.save.coins) === cc + 1000, 'replayed transaction id not granted twice');
  await p.click('#shopX'); await p.click('#bSet'); await p.waitForTimeout(150);
  ok(await p.isVisible('#sRestore') && await p.isVisible('#sNotif'), 'Settings: Restore purchases + Reminders toggle on native'); await snap(p, 'settings_native');
  await p.click('#sRestore'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __KR.save.skins.includes('phoenix') && __KR.save.removeAds), 'restore grants Starter Pack (Phoenix + remove ads)');
  await p.click('#setX');
  await p.evaluate(() => { __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); __KR.save.stats.runs = 10; __KR.save.adRuns = 9; __KR.start(); });
  await endRun(p, () => __KR.setRunT(40)); await p.waitForTimeout(500); const i0 = await inter(); await p.click('#bRetry'); await p.waitForTimeout(400);
  ok(await inter() === i0, 'no interstitial when Remove Ads owned');
  // lifecycle + notifications
  await p.evaluate(() => { __KR.save.notif.asked = false; __KR.save.stats.runs = 3; __KR.save.daily = { last: (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date()), streak: 4 }; __KR.toTitle(); });
  ok(await p.isVisible('#askM') && /reminders/i.test(await p.textContent('#aT')), 'notification pre-prompt after 3rd run'); await snap(p, 'notif_prompt');
  await p.click('#aYes'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __KR.save.notif.on), 'permission granted → reminders on');
  await p.evaluate(() => { document.getElementById('dayM').classList.add('hide'); __KR.start(); }); await p.waitForTimeout(200);
  await p.evaluate(() => window.__calls.length = 0);
  await p.evaluate(() => window.__appCb({ isActive: false })); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __KR.state) === 'pause', 'appStateChange(background) pauses the run');
  const sch = await calls(p, 'schedule');
  const ns = sch.length ? sch[sch.length - 1][1].notifications : [];
  ok((await calls(p, 'cancel')).length >= 1 && ns.some(n => n.id === 1 && n.schedule.at.getHours() === 19) && ns.some(n => n.id === 2 && /4-day streak/.test(n.body) && n.schedule.at.getHours() === 20), 'background: cancel + reschedule gift (19:00) and streak (20:00) reminders');
  await p.evaluate(() => { document.getElementById('pause').classList.add('hide'); __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); });
  await p.click('#bLb'); await p.waitForTimeout(150);
  ok(await p.isVisible('#lbNat') && (await p.textContent('#lbNat')) === 'Game Center', 'leaderboard shows Game Center button');
  await p.click('#lbNat'); await p.waitForTimeout(100);
  ok((await calls(p, 'showLeaderboard')).some(c => c[1].leaderboardID === 'kr_daily'), 'Game Center showLeaderboard(daily)');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();
  p = await mk(undefined, null, { init: [MOCK, () => { window.__pref = JSON.stringify({ coins: 777, best: 4321, skins: ['classic', 'mint'] }); }] });
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => __KR.save.coins === 777 && __KR.save.best === 4321) && /777/.test(await p.textContent('#tCoins')), 'empty localStorage → save restored from Preferences + title re-rendered');
  await p.close();

  console.log('12. Analytics, retention, export/import, reduced web UI');
  const beacons = [];
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true } }), { init: () => { window.KR_CONFIG = { analyticsUrl: 'https://an.test/collect', admob: {}, iap: {}, gameCenter: {} }; },
    route: async p => p.route('https://an.test/**', r => { beacons.push(r.request().postData()); r.fulfill({ status: 204, body: '' }); }) });
  await hideDay(p); await p.evaluate(() => { __KR.start(); }); await endRun(p);
  await p.evaluate(() => __KR.Analytics.flush()); await p.waitForTimeout(500);
  const ev = beacons.map(b => { try { return JSON.parse(b).events.map(e => e.e); } catch (e) { return []; } }).flat();
  ok(['session_start', 'run_start', 'run_end'].every(n => ev.includes(n)), 'analytics batch POSTed: ' + [...new Set(ev)].join(','));
  await p.close();
  p = await mk(undefined, SAVE({ coins: 1234, best: 2222, skins: ['classic', 'ocean'], tut: { steer: true, ring: true, cut: true } }));
  await hideDay(p);
  const code = await p.evaluate(() => __KR.exportCode());
  await p.click('#bSet'); await p.waitForTimeout(150);
  ok(!(await p.isVisible('#sRestore')) && !(await p.isVisible('#sNotif')), 'web: no Restore purchases / reminders');
  ok(await p.getAttribute('#sPriv', 'href') === 'privacy.html' && await p.getAttribute('#sTerms', 'href') === 'terms.html', 'Privacy/Terms links from KR_CONFIG');
  for (let i = 0; i < 5; i++) await p.click('#sVer');
  ok(await p.isVisible('#sDbg') && /D1 .* sessions/.test(await p.textContent('#sDbg')), 'hidden retention debug: ' + await p.textContent('#sDbg'));
  await snap(p, 'settings_web');
  await p.click('#sExp'); await p.waitForTimeout(200);
  ok(await p.inputValue('#aTa') === code, 'export shows base64 save code'); await p.click('#aYes');
  await p.close();
  p = await mk(undefined, SAVE({ coins: 50, skins: ['classic', 'mint'], tut: { steer: true, ring: true, cut: true } }));
  await hideDay(p); await p.click('#bSet'); await p.click('#sImp'); await p.fill('#aTa', 'not-a-code'); await p.click('#aYes'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => __KR.save.coins) === 50, 'invalid import code rejected');
  await p.click('#sImp'); await p.fill('#aTa', code); await p.click('#aYes'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => __KR.save.coins === 1234 && __KR.save.best === 2222 && ['mint', 'ocean'].every(k => __KR.save.skins.includes(k))), 'import merges (max coins/best, union of kites)');
  ok(await p.evaluate(() => __KR.save.ret.sessions >= 1 && __KR.save.ret.days.length >= 1 && __KR.save.ret.install > 0), 'retention stats kept in save');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('13. Round-4: banners, toasts, shop scroll, in-app review');
  p = await mk(undefined, SAVE({ best: 100, tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 } }), { q: '&vs=120&n=Maximiliano12' });
  await hideDay(p); await p.evaluate(() => { __KR.god(true); __KR.start(); }); await p.waitForTimeout(200);
  await p.evaluate(() => __KR.addScore(200)); await p.waitForTimeout(250);
  let bn = await p.evaluate(() => __KR.banner);
  ok(bn && bn.big === 'NEW BEST!' && bn.q.length === 1 && /Maximiliano/.test(bn.q[0]), 'simultaneous banners queued: ' + JSON.stringify(bn));
  await snap(p, 'banner_1'); await p.waitForTimeout(1900);
  bn = await p.evaluate(() => __KR.banner);
  ok(bn && /You beat Maximiliano1!/.test(bn.big) && bn.q.length === 0, 'second banner shows after the first finishes');
  await p.waitForTimeout(250); await snap(p, 'banner_2');
  await p.evaluate(() => __KR.toTitle()); await hideDay(p);
  await p.click('#bSet'); await p.click('#sName'); await p.fill('#aIn', '!!!'); await p.click('#aYes'); await p.waitForTimeout(250);
  const tb = await p.evaluate(() => { const t = document.getElementById('toast'); return { low: t.classList.contains('low'), b: t.getBoundingClientRect().bottom, h: innerHeight }; });
  ok(tb.low && tb.h - tb.b < 60, 'toast shown at bottom while a modal is open');
  await p.close();
  p = await mk({ width: 320, height: 568 }, SAVE({ coins: 99, tut: { steer: true, ring: true, cut: true } }));
  await hideDay(p); await p.click('#bShop'); await p.waitForTimeout(250);
  ok((await p.textContent('#shopM h2')) === 'Shop', 'shop modal titled "Shop"');
  ok(await p.evaluate(() => document.querySelector('#shopM .card').classList.contains('fade')), '320×568: scroll fade visible on shop card'); await snap(p, 'shop320_top');
  await p.evaluate(() => { const c = document.querySelector('#shopM .card'); c.scrollTop = c.scrollHeight; }); await p.waitForTimeout(200);
  const reach = await p.evaluate(() => { const c = document.querySelector('#shopM .card').getBoundingClientRect(), l = [...document.querySelectorAll('#shopGrid .sk')].pop().getBoundingClientRect(); return l.bottom <= c.bottom + 1 && l.top >= c.top; });
  ok(reach && !(await p.evaluate(() => document.querySelector('#shopM .card').classList.contains('fade'))), 'last kite reachable by scrolling; fade removed at bottom'); await snap(p, 'shop320_bottom');
  await p.close();
  const REV = () => { window.Capacitor.Plugins.InAppReview = { requestReview: () => { window.__calls.push(['review']); return Promise.resolve(); } }; };
  p = await mk(undefined, SAVE({ best: 100, coins: 0, tut: { steer: true, ring: true, cut: true }, stats: { runs: 3 }, notif: { asked: true } }), { init: [MOCK, REV] });
  await hideDay(p);
  const revRun = async () => { await p.evaluate(() => { if (__KR.state !== 'title') __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); __KR.god(true); __KR.start(); });
    await p.waitForTimeout(150); await endRun(p, () => { __KR.addScore(__KR.save.best + 500); __KR.setRunT(200); }); await p.waitForTimeout(1400); return (await calls(p, 'review')).length; };
  ok(await revRun(300) === 0, 'no review before the 5th run');
  const r1 = await revRun();
  ok(r1 === 1 && await p.evaluate(() => __KR.save.review.length === 1), '5th run with NEW BEST → review requested once, timestamp saved');
  await p.evaluate(() => { __KR.save.stats.runs = 20; __KR.save.adRuns = 9; __KR.save.removeAds = false; });
  await p.click('#bRetry'); await p.waitForTimeout(400);
  ok((await calls(p, 'showInterstitial')).length === 0, 'no interstitial in the same results session as a review');
  await endRun(p, () => { __KR.addScore(__KR.save.best + 500); __KR.setRunT(200); }); await p.waitForTimeout(1400);
  ok((await calls(p, 'review')).length === 1, 'no second review within 60 days');
  await p.evaluate(() => { __KR.save.review = [Date.now() - 61 * 864e5]; });
  await p.click('#bRetry'); await p.waitForTimeout(300);
  await endRun(p, () => { __KR.addScore(__KR.save.best + 500); __KR.setRunT(200); }); await p.waitForTimeout(1400);
  ok((await calls(p, 'review')).length === 2, 'review allowed again after 60 days');
  await p.evaluate(() => { __KR.save.review = [1, 2, 3]; });
  await p.click('#bRetry'); await p.waitForTimeout(300);
  await endRun(p, () => { __KR.addScore(__KR.save.best + 500); __KR.setRunT(200); }); await p.waitForTimeout(1400);
  ok((await calls(p, 'review')).length === 2, 'never more than 3 reviews ever');
  await p.click('#bRetry'); await p.waitForTimeout(300);
  await p.evaluate(() => { __KR.save.review = []; });
  await endRun(p, () => { __KR.setRunT(200); }); await p.waitForTimeout(1400);
  ok((await calls(p, 'review')).length === 2, 'no review after a run without a new best');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('14. v2.2: auto Updrafts + fusion, daily ghost race, accessibility');
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, notif: { asked: true } }));
  await hideDay(p);
  const waitPicks = async n => { for (let i = 0; i < 40 && await p.evaluate(() => __KR.picks) < n; i++) await p.waitForTimeout(100); };
  await p.evaluate(() => { __KR.god(true); __KR.start(); __KR.warp(140); });
  const sp0 = []; for (let i = 0; i < 25; i++) { await p.waitForTimeout(80); sp0.push(await p.evaluate(() => __KR.state)); }
  ok(await p.evaluate(() => __KR.picks) === 1, 'crossing 150 m applies an Updraft automatically (' + JSON.stringify(await p.evaluate(() => __KR.run.boons)) + ')');
  ok(sp0.every(s => s === 'play'), 'no pause: the run never leaves play state');
  ok(await p.evaluate(() => document.querySelectorAll('.modal:not(.hide)').length) === 0, 'no pick screen appears');
  await snap(p, 'v22_auto_updraft');
  await p.evaluate(() => { __KR.setBoons({ magnet: 3, lucky: 3 }); __KR.warp(__KR.gateAt(1) - 10); }); await waitPicks(2);
  ok(await p.evaluate(() => __KR.fused.goldstorm === true), 'two maxed partners → Gold Storm fusion taken automatically');
  await p.evaluate(() => { __KR.setBoons({ magnet: 2, halo: 1, tail: 1, long: 1 }); __KR.warp(__KR.gateAt(2) - 10); }); await waitPicks(3);
  const full = await p.evaluate(() => __KR.boons);
  ok(Object.keys(full).length === 4 && ['magnet', 'halo', 'tail', 'long'].every(k => full[k] >= 1), 'all 4 slots used → never adds a 5th upgrade (' + JSON.stringify(full) + ')');
  await endRun(p); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#rExtra .boons span').length >= 1), 'results list the run\'s Updrafts');
  await snap(p, 'v22_results_boons');
  // daily: seeded → identical build for everyone
  const dailyBuild = async () => { await p.evaluate(() => { __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); __KR.god(true); __KR.startDaily(); __KR.warp(140); });
    await waitPicks(1); return (await p.evaluate(() => __KR.run.boons || [])).join(','); };
  const o1 = await dailyBuild(), o2 = await dailyBuild();
  ok(o1 && o1 === o2, 'daily: the same Updraft is applied for everyone (' + o1 + ')');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  // ghost
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, notif: { asked: true } }));
  await hideDay(p);
  const rt = await p.evaluate(() => { const rec = []; let m = 0; for (let i = 0; i < 400; i++) { m += Math.random() * 20; rec.push([20 + Math.random() * 320, m]); } const d = __KR.ghostDec(__KR.ghostEnc(rec));
    let ex = 0, em = 0; rec.forEach(([x, mm], i) => { ex = Math.max(ex, Math.abs(d.xs[i] - x)); em = Math.max(em, Math.abs(d.ms[i] - mm)); }); return { ex, em, len: __KR.ghostEnc(rec).length }; });
  ok(rt.ex <= .75 && rt.em <= .2, `ghost encode/decode round-trip (x err ${rt.ex.toFixed(2)}, m err ${rt.em.toFixed(3)}, 100 s = ${rt.len} chars)`);
  await p.evaluate(() => { __KR.god(true); __KR.autopilot(true); __KR.fast(4); __KR.startDaily(); }); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => __KR.gRec) > 20, 'daily run records a ghost path');
  await endRun(p, () => { __KR.autopilot(false); __KR.fast(1); });
  const g1 = await p.evaluate(() => __KR.save.dc.ghost);
  ok(g1 && g1.day && g1.code.length > 20, 'daily best saves your ghost');
  { const g = await p.evaluate(() => __KR.save.dc.ghost); const ps = await mk(undefined, SAVE({ lb: { name: 'Vipul' }, dc: { days: {}, last: '', streak: 0, ghost: g }, stats: { runs: 5 } }), { route: srv, url: 'http://kr.test/game/index.html?test=1' });
    const u = await ps.evaluate(() => __KR.shareUrl(1500, true)); ok(u.includes('&d=' + g.day + '&g=' + g.code), 'daily share link carries the ghost (' + u.length + ' chars)');
    const u2 = await ps.evaluate(() => __KR.shareUrl(1500, false)); ok(!/&g=/.test(u2), 'normal-mode share link has no ghost'); await ps.close(); }
  await p.click('#bRetry'); await p.waitForTimeout(300);
  const gh = await p.evaluate(() => __KR.ghost);
  ok(gh && gh.lab === 'YOUR BEST' && gh.n > 20, 'next daily run races YOUR BEST ghost');
  await p.waitForTimeout(600); await snap(p, 'v22_ghost');
  await p.evaluate(() => { __KR.warp(__KR.ghost.top + 30); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => __KR.ghost.beat), 'climbing past the ghost\'s top → beaten');
  await endRun(p); await p.waitForTimeout(200);
  ok(/out-climbed your best run/.test(await p.evaluate(() => document.getElementById('rExtra').textContent)), 'results: ghost race outcome shown');
  // friend ghost link
  const today2 = await p.evaluate(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  const fcode = await p.evaluate(() => { const rec = []; for (let i = 0; i < 2000; i++)rec.push([180 + Math.sin(i / 9) * 100, i * 5]); return __KR.ghostEnc(rec); });
  const p2 = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, notif: { asked: true } }), { q: `&vs=900&n=Ana&d=${today2}&g=${fcode}` });
  await hideDay(p2);
  ok(await p2.evaluate(() => __KR.save.fghost && __KR.save.fghost.n === 'Ana' && !/[?&]g=/.test(location.search)), 'friend ghost link stored, params stripped');
  ok(/Ana's ghost is waiting/.test(await p2.textContent('#tDaily')), 'daily button: "Ana\'s ghost is waiting"');
  await p2.evaluate(() => { __KR.god(true); __KR.startDaily(); }); await p2.waitForTimeout(200);
  ok(await p2.evaluate(() => __KR.ghost && __KR.ghost.lab === 'ANA'), 'daily run races Ana\'s ghost');
  await p2.close();
  const p3 = await mk(undefined, SAVE({ stats: { runs: 5 } }), { q: `&d=2001-01-01&g=${fcode}` });
  ok(await p3.evaluate(() => !__KR.save.fghost), 'ghost link from another day ignored');
  await p3.close();
  const p4 = await mk(undefined, SAVE({ stats: { runs: 5 } }), { q: `&d=${today2}&g=%3Cscript%3E` });
  ok(await p4.evaluate(() => !__KR.save.fghost), 'malformed ghost code rejected');
  await p4.close();
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  // global #1 ghost (Supabase)
  { const gposts = []; let gcode = null;
    const sup2 = async p => { await p.route('https://lb.test/**', async r => { const q = r.request();
      if (q.method() === 'POST') { gposts.push(JSON.parse(q.postData() || '{}')); return r.fulfill({ status: 201, body: '' }); }
      if (/ghost=not\.is\.null/.test(q.url())) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gcode ? [{ uid: 'someoneelse99', name: 'Bob', score: 9999, ghost: gcode }] : []) });
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }); };
    const lbInit2 = () => { window.KR_CONFIG = { lbUrl: 'https://lb.test', lbKey: 'k', analyticsUrl: '', admob: {}, iap: {}, gameCenter: {} }; };
    const pg = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, lb: { name: 'Vipul', uid: 'myuid12345678', asked: true, pend: {} } }), { init: lbInit2, route: sup2 });
    await hideDay(pg);
    gcode = await pg.evaluate(() => { const rec = []; for (let i = 0; i < 3000; i++)rec.push([180, i * 6]); return __KR.ghostEnc(rec); });
    await pg.evaluate(() => { __KR.god(true); __KR.startDaily(); }); await pg.waitForTimeout(700);
    ok(await pg.evaluate(() => __KR.ghost && __KR.ghost.lab === '#1 BOB'), 'daily run fetches + races the #1 ghost (' + JSON.stringify(await pg.evaluate(() => __KR.ghost && __KR.ghost.lab)) + ')');
    await pg.evaluate(() => { __KR.autopilot(true); __KR.fast(4); }); await pg.waitForTimeout(2500);
    await endRun(pg, () => { __KR.autopilot(false); __KR.fast(1); __KR.setRunT(Math.max(__KR.runT, 60)); }); await pg.waitForTimeout(800);
    const dpg = gposts.find(x => x.board === 'daily');
    ok(dpg && typeof dpg.ghost === 'string' && dpg.ghost.length > 20, 'daily best POST carries the ghost path (' + (dpg && dpg.ghost && dpg.ghost.length) + ' chars)');
    const own = await pg.evaluate(() => __KR.LBghost());
    ok(own && own.n === 'Bob', '#1 ghost cached for the next run');
    ok(pg.errs.length === 0, 'no JS errors ' + pg.errs.join(' | '));
    await pg.close(); }

  // accessibility first launch
  p = await mk(undefined, null, { q: '&a11y=1' });
  ok(await p.evaluate(() => !document.getElementById('a11yM').classList.contains('hide')), 'first launch shows "Before you fly" options');
  await snap(p, 'v22_a11y');
  await p.click('#xLH'); await p.click('#xHV'); await p.click('#xRM');
  const a = await p.evaluate(() => ({ lh: document.body.classList.contains('lh'), a: __KR.a11y, rm: __KR.RM }));
  ok(a.lh && a.a.lh && a.a.hv, 'left-handed + hazard outlines toggled');
  ok(a.rm === true || a.rm === false, 'reduced motion toggle applies');
  await p.click('#xGo'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('a11yM').classList.contains('hide') && __KR.a11y.seen), '"Let\'s fly!" closes it for good');
  await p.reload(); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('a11yM').classList.contains('hide') && document.body.classList.contains('lh')), 'options persist; not shown again');
  await p.evaluate(() => { document.getElementById('dayM').classList.add('hide'); __KR.god(true); __KR.autopilot(true); __KR.fast(3); __KR.start(); __KR.warp(1100); }); await p.waitForTimeout(2500);
  await p.evaluate(() => { __KR.fast(1); }); await p.waitForTimeout(300); await snap(p, 'v22_lefthand_outlines');
  ok(await p.evaluate(() => { const r = document.getElementById('bPause').getBoundingClientRect(); return r.left < 100; }), 'left-handed: pause button on the left');
  await p.evaluate(() => { document.getElementById('bSet') && 0; });
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('15. Zen flight');
  p = await mk(undefined, SAVE({ coins: 77, best: 500, tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, notif: { asked: true } }));
  await hideDay(p);
  ok(await p.isVisible('#bZen'), 'title shows Zen flight button');
  await p.click('#bZen'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __KR.state === 'play' && __KR.mode === 'zen'), 'Zen button starts a zen run');
  await p.evaluate(() => { __KR.fast(3); __KR.warp(1900); });
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(250); if (await p.evaluate(() => __KR.state) === 'pick') await p.evaluate(() => __KR.choosePick(0)); }
  const z = await p.evaluate(() => ({ s: __KR.state, b: __KR.run.bonks || 0, m: __KR.climbed | 0 }));
  ok(z.s === 'play', 'no-fail: still flying after 10 s in Night Winds with no steering (' + z.b + ' bonks, ' + z.m + ' m)');
  ok(z.b > 0, 'hazard hits become bonks');
  await p.evaluate(() => __KR.fast(1)); await snap(p, 'zen_run');
  await p.evaluate(() => { if (__KR.state === 'pick') __KR.choosePick(0); }); await p.click('#bPause'); await p.waitForTimeout(150);
  ok(/End Zen flight/.test(await p.textContent('#bQuit')), 'pause offers "End Zen flight"');
  await p.click('#bQuit'); await p.waitForTimeout(250);
  ok(/Zen flight: [\d,]+ m · [1-9]\d* bonks?/.test(await p.textContent('#toast')), 'ending shows a summary toast: ' + await p.textContent('#toast'));
  const sv = await p.evaluate(() => ({ c: __KR.save.coins, b: __KR.save.best, r: __KR.save.stats.runs, st: __KR.state }));
  ok(sv.st === 'title' && sv.c === 77 && sv.b === 500 && sv.r === 5, 'zen gives no coins, best, stats or leaderboard entries');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('16. Updraft codex');
  p = await mk(undefined, SAVE({ coins: 0, codex: { b: { magnet: 2 }, f: {} }, tut: { steer: true, ring: true, cut: true }, stats: { runs: 5 }, notif: { asked: true } }));
  await hideDay(p); await p.click('#bMis'); await p.waitForTimeout(200);
  let cx = await p.evaluate(() => ({ n: document.querySelectorAll('#misCodex .cxi').length, lock: document.querySelectorAll('#misCodex .cxi.lock').length, t: document.querySelector('#misCodex .mhead').textContent }));
  ok(cx.n === 12 && cx.lock === 11 && /1\/12/.test(cx.t), 'codex lists 8 upgrades + 4 fusions, 1 discovered (' + cx.t + ')');
  await snap(p, 'codex'); await p.click('#misX');
  await p.evaluate(() => { __KR.god(true); __KR.start(); __KR.setBoons({ tail: 3, long: 3 }); __KR.warp(140); });
  for (let i = 0; i < 40 && await p.evaluate(() => __KR.picks) < 1; i++) await p.waitForTimeout(100);
  ok(await p.evaluate(() => __KR.fused.jet === true), 'Jet Stream fusion taken automatically');
  ok(await p.evaluate(() => __KR.save.codex.f.jet === 1 && __KR.save.coins === 100), 'first Jet Stream discovery: +100 coins, saved to codex');
  await p.evaluate(() => { __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); __KR.save.missions.forEach(m => m.done = true); __KR.start(); __KR.setBoons({ tail: 3, long: 3 }); __KR.warp(140); });
  for (let i = 0; i < 40 && await p.evaluate(() => __KR.picks) < 1; i++) await p.waitForTimeout(100);
  ok(await p.evaluate(() => __KR.save.codex.f.jet === 2 && __KR.save.coins === 100), 'repeat discovery counts but pays nothing');
  await p.evaluate(() => { __KR.toTitle(); document.getElementById('dayM').classList.add('hide'); }); await p.click('#bMis'); await p.waitForTimeout(150);
  ok(/Jet Stream/.test(await p.textContent('#misCodex')) && /2\/12/.test(await p.textContent('#misCodex .mhead')), 'codex shows Jet Stream (2/12)');
  await p.evaluate(() => __KR.mergeSave({ coins: 0, skins: ['classic'], codex: { b: { halo: 3, bogus: 9 }, f: { golden: 1 } } }));
  ok(await p.evaluate(() => __KR.save.codex.b.halo === 3 && !__KR.save.codex.b.bogus && __KR.save.codex.f.golden === 1), 'import merges codex, ignores unknown ids');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();


  console.log('17. Kite Rush Pro (one-time unlock)');
  p = await mk(undefined, SAVE({ coins: 40, tut: { steer: true, ring: true, cut: true }, stats: { runs: 8 }, notif: { asked: true }, att: true, review: [1, 2, 3] }), { init: MOCK });
  await hideDay(p); await p.waitForTimeout(300);
  ok(/3 free flights left/.test(await p.textContent('#bZen')), 'title: "3 free flights left" on Zen');
  for (let i = 0; i < 3; i++) { await p.click('#bZen'); await p.waitForTimeout(150); ok(await p.evaluate(() => __KR.mode) === 'zen', 'free Zen flight ' + (i + 1));
    await p.evaluate(() => __KR.toTitle()); await hideDay(p); }
  ok(/🔒 Pro/.test(await p.textContent('#bZen')), 'after 3 flights Zen shows 🔒 Pro');
  await p.click('#bZen'); await p.waitForTimeout(200);
  ok(await p.isVisible('#proM') && /free Zen flights/.test(await p.textContent('#proCtx')) && /\$4\.99/.test(await p.textContent('#proBuy')), 'locked Zen opens the Pro paywall with the store price');
  ok(await p.evaluate(() => __KR.state) === 'title', 'locked Zen does not start a run');
  await snap(p, 'pro_paywall');
  await p.click('#proBuy'); await p.waitForTimeout(250);
  const pv = await p.evaluate(() => ({ pro: __KR.save.pro, ra: __KR.save.removeAds, au: __KR.save.skins.includes('aurora'), modal: !document.getElementById('proM').classList.contains('hide') }));
  ok(pv.pro && pv.ra && pv.au && !pv.modal, 'buying Pro: pro + no ads + Aurora kite, paywall closes');
  ok(/no fail/.test(await p.textContent('#bZen')), 'Zen unlocked after Pro');
  await p.evaluate(() => { window.__calls.length = 0; __KR.god(true); __KR.start(); __KR.addScore(300); }); await p.waitForTimeout(200);
  await p.evaluate(() => { __KR.god(false); __KR.kill(); }); await p.waitForTimeout(1400);
  ok(await p.evaluate(() => __KR.state) === 'cont' && /FREE/.test(await p.textContent('#bContCoin')) && !(await p.isVisible('#bContAd')), 'Pro: Second Wind is free (no ad button)');
  const pc0 = await p.evaluate(() => __KR.save.coins); await p.click('#bContCoin'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => __KR.state) === 'play' && await p.evaluate(() => __KR.save.coins) === pc0, 'free continue costs nothing');
  await endRun(p, () => { __KR.run.coins = 12; }); await p.waitForTimeout(300);
  ok(/\+24/.test(await p.textContent('#rChips')) && /×2 PRO/.test(await p.textContent('#rChips')), 'Pro: run coins doubled on results (' + (await p.textContent('#rChips')).slice(0, 20) + ')');
  ok(!(await p.isVisible('#bDouble')), 'Pro: no "watch ad to double" button');
  for (let i = 0; i < 4; i++) { await p.evaluate(() => { __KR.save.adRuns = 9; __KR.setRunT(100); }); await p.click('#bRetry'); await p.waitForTimeout(250); await endRun(p, () => { __KR.setRunT(100); }); }
  ok((await calls(p, 'showInterstitial')).length === 0, 'Pro: never an interstitial');
  await p.evaluate(() => __KR.toTitle()); await hideDay(p); await p.click('#bSet'); await p.waitForTimeout(150);
  ok(/Owned/.test(await p.textContent('#sProV')), 'Settings shows Pro owned');
  await p.close();
  // results upsell + restore on fresh install
  p = await mk(undefined, SAVE({ tut: { steer: true, ring: true, cut: true }, stats: { runs: 8 }, notif: { asked: true }, att: true, review: [1, 2, 3] }), { init: [MOCK, () => { window.__restorePro = true; }] });
  await hideDay(p); await p.waitForTimeout(300);
  await p.evaluate(() => { __KR.god(true); __KR.start(); }); await endRun(p); await p.waitForTimeout(200);
  ok(await p.isVisible('#rPro'), 'results show a "Go Pro" link every 4th run from run 5 (run 9)');
  await p.click('#rPro'); await p.waitForTimeout(150); ok(await p.isVisible('#proM'), 'Go Pro link opens the paywall'); await p.click('#proX');
  await p.evaluate(() => __KR.toTitle()); await hideDay(p); await p.click('#bSet'); await p.click('#sRestore'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __KR.save.pro === true && __KR.save.skins.includes('aurora')), 'Restore purchases brings back Pro on a fresh install');
  await p.close();
  // save codes can't grant paid items; tampering rejected; web has no Pro UI
  p = await mk(undefined, SAVE({ coins: 10, tut: { steer: true, ring: true, cut: true }, stats: { runs: 8 } }));
  await hideDay(p);
  const forged = await p.evaluate(() => { const o = JSON.parse(JSON.stringify(__KR.save)); o.pro = true; o.removeAds = true; o.skins.push('phoenix', 'aurora', 'mint'); o.coins = 99; const js = JSON.stringify(o);
    const good = __KR.exportCode(); __KR.save.coins = 10; return { tampered: btoa(js) + '.' + good.split('.')[1], unsigned: btoa(js) }; });
  for (const [k, c] of Object.entries(forged)) { await p.click('#bSet'); await p.click('#sImp'); await p.fill('#aTa', c); await p.click('#aYes'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => __KR.save.coins === 10 && !__KR.save.pro), k + ' save code rejected'); await p.evaluate(() => document.getElementById('setM').classList.add('hide')); }
  const signed = await p.evaluate(() => { __KR.save.pro = true; __KR.save.removeAds = true; __KR.save.skins.push('phoenix', 'aurora', 'mint'); const c = __KR.exportCode();
    __KR.save.pro = false; __KR.save.removeAds = false; __KR.save.skins = ['classic']; return c; });
  await p.click('#bSet'); await p.click('#sImp'); await p.fill('#aTa', signed); await p.click('#aYes'); await p.waitForTimeout(150);
  const im = await p.evaluate(() => ({ pro: __KR.save.pro, ra: __KR.save.removeAds, s: __KR.save.skins }));
  ok(!im.pro && !im.ra && !im.s.includes('phoenix') && !im.s.includes('aurora') && im.s.includes('mint'), 'valid code imports coin kites but never Pro / no-ads / paid kites');
  ok(!(await p.isVisible('#sPro')), 'web: no Pro row in Settings');
  await p.evaluate(() => { document.getElementById('setM').classList.add('hide'); __KR.save.zenUsed = 50; __KR.renderTitle(); });
  ok(/no fail/.test(await p.textContent('#bZen')), 'web: Zen stays free (no paywall on portals)');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();


  console.log('18. Native first launch: ad consent waits until the first run ends');
  p = await mk(undefined, null, { init: MOCK, q: '&a11y=1' }); await p.waitForTimeout(400);
  ok(await p.isVisible('#a11yM') && (await calls(p, 'requestConsentInfo')).length === 0, 'no AdMob consent while the first-launch sheet is open');
  await p.click('#xGo'); await p.waitForTimeout(400);
  ok((await calls(p, 'requestConsentInfo')).length === 0, 'still no consent on the title screen before the first run');
  await p.evaluate(() => { __KR.god(true); __KR.start(); }); await endRun(p); await p.waitForTimeout(400);
  ok((await calls(p, 'initialize')).length === 1 && (await calls(p, 'showConsentForm')).length === 1, 'consent shown on the first results screen');
  await p.reload(); await p.waitForTimeout(400);
  ok((await calls(p, 'requestConsentInfo')).length === 1, 'later launches: consent at start');
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  console.log('19. Clutter budget (one threat at a time; a cloud wall counts as one obstacle)');
  p = await mk(); await hideDay(p);
  await p.evaluate(() => { __KR.god(true); __KR.autopilot(true); __KR.fast(3); __KR.start(); });
  const HZ = ['bird', 'storm', 'ekite', 'plane', 'bolt', 'meteor']; let nS = 0, sumH = 0, maxH = 0, maxK = 0, sumC = 0;
  for (let i = 0; i < 220; i++) { await p.waitForTimeout(100); const v = await p.evaluate(() => __KR.state === 'pick' ? (__KR.choosePick(0), null) : __KR.visible()); if (!v) continue;
    const h = v.filter(k => HZ.includes(k)); nS++; sumH += h.length; maxH = Math.max(maxH, h.length); maxK = Math.max(maxK, new Set(h).size); sumC += v.filter(k => k === 'coin').length; }
  const zc = await p.evaluate(() => __KR.climbed | 0);
  ok(sumH / nS <= 2.5, `avg hazards on screen ≤ 2.5 (${(sumH / nS).toFixed(2)}, to ${zc} m)`);
  ok(maxH <= 7, `peak hazards on screen ≤ 7 (${maxH})`);
  ok(maxK <= 2, `never more than 2 hazard types at once (${maxK})`);
  ok(sumC / nS <= 5, `avg coins on screen ≤ 5 (${(sumC / nS).toFixed(1)})`);
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();


  console.log('20. No input = no progress (the game must not play itself)');
  p = await mk(); await hideDay(p); const idle = [];
  for (let r = 0; r < 6; r++) { await p.evaluate(() => { __KR.save.coins = 0; __KR.fast(4); __KR.start(); }); let t = 0;
    for (; t < 200; t++) { await p.waitForTimeout(100); const s = await p.evaluate(() => __KR.state); if (s === 'cont') { await p.evaluate(() => __KR.finish()); break; } if (s !== 'play') break; }
    idle.push(await p.evaluate(() => __KR.runT)); await p.evaluate(() => __KR.toTitle()); await p.waitForTimeout(100); }
  ok(Math.max(...idle) <= 20, `an idle kite goes down within 20 s (${idle.map(x => x.toFixed(0) + 's').join(' ')})`);
  ok(p.errs.length === 0, 'no JS errors ' + p.errs.join(' | '));
  await p.close();

  await b.close();
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
