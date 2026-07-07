// qa_bot.js — gameplay QA bots for Kite Rush.
// Three personas play the game headlessly and report feel/balance metrics:
//   idle    — taps to launch, never steers (absolute beginner floor)
//   chaotic — jerky random swipes (novice)
//   skilled — dodges hazards, chases stars, reaction-limited (~150ms)
// Metrics: launch-to-control latency, survival, death altitude, unfair hits
// (hazard on screen <0.6s before it killed you), stars/min, ribbons/run.
// Usage: node qa_bot.js [idle|chaotic|skilled]
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
let script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Inject a read-only state probe at the end of the game IIFE.
const PROBE = "window.__qa={get kite(){return kite},get birds(){return birds},get stars(){return stars},"
  + "get storms(){return storms},get planes(){return planes},get sats(){return sats},get gusts(){return gusts},"
  + "get altitude(){return altitude},get lives(){return lives},get state(){return state},get phase(){return phase},"
  + "get hitCount(){return hitCount},get climbSpeed(){return climbSpeed},get charge(){return charge},"
  + "get starsHit(){return starsHit},get dodges(){return dodges},get tricksLanded(){return tricksLanded},"
  + "get frenzyT(){return frenzyT}};";
const cut = script.lastIndexOf('})();');
script = script.slice(0, cut) + PROBE + '\n' + script.slice(cut);

const innerW = 390, innerH = 844;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function makeEnv() {
  let clock = 1000;
  const ctx = new Proxy({}, {
    get(t, p) {
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (p in t) return t[p];
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; }
  });
  function makeEl(id) {
    return {
      id, style: {}, _h: {}, width: 0, height: 0,
      classList: (() => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c) }; })(),
      _text: '', get textContent() { return this._text; }, set textContent(v) { this._text = v; },
      _html: '', get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; },
      addEventListener(t, fn) { (this._h[t] || (this._h[t] = [])).push(fn); },
      removeEventListener() {}, focus() {}, select() {},
      appendChild() {}, removeChild() {}, getContext() { return ctx; },
      getBoundingClientRect() { return { left: 0, top: 0, width: innerW, height: innerH }; }
    };
  }
  const elements = {};
  const getEl = id => elements[id] || (elements[id] = makeEl(id));
  const doc = {
    _h: {}, getElementById: getEl, createElement: () => makeEl('tmp'), querySelector: () => makeEl('q'),
    body: { appendChild() {}, removeChild() {} }, hidden: false, execCommand() { return true; },
    addEventListener(t, fn) { (this._h[t] || (this._h[t] = [])).push(fn); }
  };
  function AudioMock() {
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
    return {
      currentTime: 0, destination: {}, state: 'running', resume() {},
      createOscillator() { return { type: '', frequency: param(), connect() {}, start() {}, stop() {} }; },
      createGain() { return { gain: param(), connect() {} }; },
      createBuffer() { return { getChannelData() { return new Float32Array(8820); } }; },
      createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {} }; },
      createBiquadFilter() { return { type: '', frequency: param(), connect() {} }; }
    };
  }
  const win = {
    _h: {}, innerWidth: innerW, innerHeight: innerH, devicePixelRatio: 2,
    AudioContext: AudioMock, webkitAudioContext: AudioMock,
    addEventListener(t, fn) { (this._h[t] || (this._h[t] = [])).push(fn); }
  };
  const navigatorM = { vibrate() { return true; }, share: undefined, clipboard: { writeText() { return Promise.resolve(); } } };
  const perf = { now() { return clock; } };
  const store = (() => {
    const d = {};
    return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: k => { delete d[k]; } };
  })();
  let rafCb = null;
  const errors = [];
  const f = new Function(
    'window', 'document', 'navigator', 'performance', 'localStorage',
    'requestAnimationFrame', 'cancelAnimationFrame', 'AudioContext', 'webkitAudioContext', 'setTimeout', 'Math', 'console',
    script
  );
  try {
    f(win, doc, navigatorM, perf, store, cb => { rafCb = cb; return 1; }, () => {}, AudioMock, AudioMock, setTimeout, Math, console);
  } catch (e) { errors.push('load: ' + e.message); }

  const fire = (target, type, evt) => { const hs = target._h[type]; if (hs) for (const h of hs) h(evt); };
  const mev = (x, y) => ({ clientX: x, clientY: y, preventDefault() {}, touches: undefined });
  const canvas = elements.c;
  let down = false;
  const io = {
    get isDown() { return down; },
    press(x, y) { if (!down) { down = true; try { fire(canvas, 'mousedown', mev(x, y)); } catch (e) { errors.push('press: ' + e.message); } } },
    move(x, y) { if (down) { try { fire(win, 'mousemove', mev(x, y)); } catch (e) { errors.push('move: ' + e.message); } } },
    release() { if (down) { down = false; try { fire(win, 'mouseup', {}); } catch (e) { errors.push('release: ' + e.message); } } },
    click(id) { const el = elements[id]; if (el) try { fire(el, 'click', {}); } catch (e) { errors.push('click ' + id + ': ' + e.message); } }
  };
  const step = dtMs => { clock += dtMs; try { if (rafCb) rafCb(clock); } catch (e) { errors.push('frame: ' + e.message); } };
  return { win, elements, io, step, errors };
}

// Shared launch behavior: press, hold `holdSec`, release. Returns true while in launch phase.
function launchStep(qa, io, t, mem, holdSec) {
  if (qa.phase === 'launch') {
    if (!io.isDown && !mem.pressed) { io.press(innerW / 2, innerH * 0.6); mem.pressed = true; mem.pt = t; }
    else if (io.isDown && t - mem.pt >= holdSec) io.release();
    return true;
  }
  mem.pressed = false;
  return false;
}

function idleBot() {
  const mem = {};
  return (qa, io, t) => {
    if (qa.state !== 'playing') return;
    if (launchStep(qa, io, t, mem, 0.05)) return; // quick tap launch, then hands off
    io.release();
  };
}

function chaosBot() {
  const mem = {};
  let tgt = { x: innerW / 2, y: innerH * 0.42 }, next = 0, px = innerW / 2, py = innerH * 0.42;
  return (qa, io, t, dt) => {
    if (qa.state !== 'playing') return;
    if (launchStep(qa, io, t, mem, 0.25)) return;
    if (!io.isDown) io.press(px, py);
    if (t > next) {
      next = t + 0.25 + Math.random() * 0.5;
      tgt = { x: innerW * (0.1 + Math.random() * 0.8), y: innerH * (0.18 + Math.random() * 0.5) };
    }
    const sp = 2600 * dt;
    px += clamp(tgt.x - px, -sp, sp); py += clamp(tgt.y - py, -sp, sp);
    io.move(px, py);
  };
}

function skilledBot() {
  const mem = {};
  let px = innerW / 2, py = innerH * 0.42, think = 0, tx = px, ty = py;
  return (qa, io, t, dt) => {
    if (qa.state !== 'playing') return;
    if (launchStep(qa, io, t, mem, 0.7)) return; // full-charge launch
    if (!io.isDown) io.press(px, py);
    if (t - think > 0.15) { // ~150ms human reaction cadence
      think = t;
      const k = qa.kite;
      let fx = 0, fy = 0;
      for (const h of [...qa.birds, ...qa.storms, ...qa.planes, ...qa.sats]) {
        const hx = h.x + (h.vx || 0) * 0.25, hy = h.y + ((h.vy || 0) + 140) * 0.25; // lead the hazard
        const dx = k.x - hx, dy = k.y - hy, d = Math.hypot(dx, dy) || 1;
        const R = (h.r || 20) + k.r + 95;
        if (d < R) { const w = (R - d) / R; fx += dx / d * w * 320; fy += dy / d * w * 150; }
      }
      let bs = null, bd = 1e9;
      for (const s of qa.stars) {
        if (s.y < -20 || s.y > innerH * 0.6) continue;
        const d = Math.hypot(k.x - s.x, k.y - s.y);
        if (d < bd) { bd = d; bs = s; }
      }
      tx = clamp((bs ? bs.x : innerW / 2) + fx, innerW * 0.09, innerW * 0.91);
      ty = clamp((bs ? Math.min(bs.y + 20, innerH * 0.6) : innerH * 0.4) + fy, innerH * 0.17, innerH * 0.62);
    }
    const sp = 2200 * dt;
    px += clamp(tx - px, -sp, sp); py += clamp(ty - py, -sp, sp);
    io.move(px, py);
  };
}

function pctl(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

function runPersona(name, controllerFactory, frames) {
  const env = makeEnv();
  const { io, step, errors, win, elements } = env;
  const qa = win.__qa;
  if (!qa) return { name, exceptions: errors.length, errorSample: errors.slice(0, 4), fatal: 'probe missing' };
  const DT = 1000 / 60, dt = 1 / 60;
  const ctl = controllerFactory();
  const runs = [], hits = [], launchLat = [], ribbonsRuns = [];
  let t = 0, lastHit = 0, runStart = 0, pressAt = null, climbAt = null;
  let prevHaz = [], prevState = 'menu', firstBird = null, maxBirds = 0, maxHaz = 0, totStars = 0, playT = 0;
  io.click('play');
  for (let i = 0; i < frames; i++) {
    t += dt;
    if (qa.state === 'playing') {
      playT += dt;
      const hazards = [...qa.birds, ...qa.storms, ...qa.planes, ...qa.sats];
      for (const h of hazards) if (h.__b === undefined) h.__b = t;
      if (qa.birds.length > maxBirds) maxBirds = qa.birds.length;
      if (hazards.length > maxHaz) maxHaz = hazards.length;
      if (firstBird === null && qa.birds.length) firstBird = t - runStart;
      if (qa.hitCount > lastHit) {
        lastHit = qa.hitCount;
        let cd = 1e9, ch = null;
        const k = qa.kite;
        for (const h of prevHaz) { const d = Math.hypot(k.x - h.x, k.y - h.y); if (d < cd) { cd = d; ch = h; } }
        const age = ch && ch.__b !== undefined ? t - ch.__b : 99;
        hits.push({ alt: Math.round(qa.altitude), onScreenSec: +age.toFixed(2) });
      }
      prevHaz = hazards;
      if (qa.phase === 'launch' && pressAt === null && io.isDown) pressAt = t;
      if (qa.phase === 'climb' && climbAt === null) {
        climbAt = t;
        if (pressAt !== null) launchLat.push(Math.round((t - pressAt) * 1000));
      }
    }
    ctl(qa, io, t, dt, env);
    step(DT);
    if (qa.state === 'over' && prevState === 'playing') {
      const goTxt = elements.goScore ? elements.goScore._text : '';
      const alt = parseInt(goTxt.replace(/[^\d]/g, ''), 10) || Math.round(qa.altitude);
      const rb = elements.goRibbons ? parseInt((elements.goRibbons._html.match(/\+(\d+)/) || [0, 0])[1], 10) : 0;
      runs.push({ sec: +(t - runStart).toFixed(1), alt });
      ribbonsRuns.push(rb);
      totStars += qa.starsHit;
      io.release();
      io.click('again');
      runStart = t; lastHit = 0; pressAt = null; climbAt = null; prevHaz = []; firstBird = null;
    }
    prevState = qa.state;
  }
  const secs = runs.map(r => r.sec), alts = runs.map(r => r.alt);
  const fast = hits.filter(h => h.onScreenSec < 0.6).length;
  return {
    name,
    exceptions: errors.length,
    errorSample: errors.slice(0, 4),
    minutesSimulated: +(frames / 60 / 60).toFixed(1),
    runs: runs.length,
    medianSurvivalSec: pctl(secs, 0.5),
    p90SurvivalSec: pctl(secs, 0.9),
    medianDeathAlt: pctl(alts, 0.5),
    bestAlt: alts.length ? Math.max(...alts) : Math.round(qa.altitude || 0),
    launchToControlMs: launchLat.length ? Math.round(launchLat.reduce((a, b) => a + b, 0) / launchLat.length) : null,
    firstBirdSec: firstBird !== null ? +firstBird.toFixed(1) : null,
    totalHits: hits.length,
    unfairHits: fast,
    unfairHitPct: hits.length ? Math.round(100 * fast / hits.length) : 0,
    hitOnScreenSecP10: pctl(hits.map(h => h.onScreenSec), 0.1),
    starsPerMin: playT > 0 ? +((totStars + qa.starsHit) / (playT / 60)).toFixed(1) : 0,
    medianRibbonsPerRun: pctl(ribbonsRuns, 0.5),
    maxBirdsOnScreen: maxBirds,
    maxHazardsOnScreen: maxHaz,
    sampleHits: hits.slice(0, 10)
  };
}

const PERSONAS = { idle: idleBot, chaotic: chaosBot, skilled: skilledBot };
const which = process.argv[2];
const FRAMES = 14400; // 4 minutes at 60fps per persona
const list = which ? { [which]: PERSONAS[which] } : PERSONAS;
const out = [];
for (const [name, factory] of Object.entries(list)) {
  if (!factory) { console.error('unknown persona: ' + name); process.exit(1); }
  out.push(runPersona(name, factory, FRAMES));
}
console.log(JSON.stringify(out, null, 2));
