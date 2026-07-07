// Headless test harness for Kite Rush. Mocks DOM/canvas, loads the game,
// drives input + frames, and reports crashes + how far it progressed.
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const innerW = 390, innerH = 844;
let clock = 1000;

// ---- captured render text (to measure progress) ----
const seenText = new Set();
let maxMeters = 0;
function capture(t){
  t = String(t); seenText.add(t);
  const m = /^([\d,]+)\s*m$/.exec(t);
  if (m){ const v = parseInt(m[1].replace(/,/g,''),10); if (v>maxMeters) maxMeters = v; }
}

// ---- mock 2D context (Proxy: any method = no-op, sane defaults) ----
const ctx = new Proxy({}, {
  get(t, p){
    if (p === 'measureText') return ()=>({width:10});
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return ()=>({addColorStop(){}});
    if (p === 'fillText') return (txt)=>capture(txt);
    if (p === 'canvas') return elements.c;
    if (p in t) return t[p];
    return ()=>{};            // every other ctx.method is a no-op
  },
  set(t,p,v){ t[p]=v; return true; }
});

function makeEl(id){
  return {
    id, style:{}, _h:{}, width:0, height:0,
    classList:(()=>{const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),contains:c=>s.has(c),toggle:c=>s.has(c)?s.delete(c):s.add(c)};})(),
    _text:'', get textContent(){return this._text;}, set textContent(v){this._text=v;},
    _html:'', get innerHTML(){return this._html;}, set innerHTML(v){this._html=v;},
    addEventListener(t,fn){ (this._h[t]||(this._h[t]=[])).push(fn); },
    removeEventListener(){}, focus(){}, select(){},
    appendChild(){}, removeChild(){},
    getContext(){ return ctx; },
    getBoundingClientRect(){ return {left:0,top:0,width:innerW,height:innerH}; }
  };
}
const elements = {};
function getEl(id){ return elements[id] || (elements[id]=makeEl(id)); }

const document = {
  _h:{},
  getElementById:getEl,
  createElement:()=>makeEl('tmp'),
  querySelector:()=>makeEl('q'),
  body:{ appendChild(){}, removeChild(){} },
  hidden:false,
  execCommand(){ return true; },
  addEventListener(t,fn){ (this._h[t]||(this._h[t]=[])).push(fn); }
};

function AudioMock(){
  return {
    currentTime:0, destination:{},
    createOscillator(){ return { type:'', frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}}, connect(){}, start(){}, stop(){} }; },
    createGain(){ return { gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}, connect(){} }; }
  };
}

const win = {
  _h:{}, innerWidth:innerW, innerHeight:innerH, devicePixelRatio:2,
  AudioContext:AudioMock, webkitAudioContext:AudioMock,
  addEventListener(t,fn){ (this._h[t]||(this._h[t]=[])).push(fn); }
};

const navigator = {
  vibrate(){ return true; },
  share: undefined,                                   // forces clipboard/legacy fallback path
  clipboard:{ writeText(){ return Promise.resolve(); } }
};

const performance = { now(){ return clock; } };
const localStorage = (()=>{ const d={'kiterush_ribbons':'9999'}; return {
  getItem:k=> (k in d? d[k] : null), setItem:(k,v)=>{d[k]=String(v);}, removeItem:k=>{delete d[k];}
};})();

let rafCb = null;
function requestAnimationFrame(cb){ rafCb = cb; return 1; }
function cancelAnimationFrame(){}

// ---- load the game inside the mocked environment ----
const errors = [];
function run(label, fn){ try { fn(); } catch(e){ errors.push(`[${label}] ${e && e.message}`); if(errors.length<=3 && e.stack) errors.push(e.stack.split('\n')[1]||''); } }

run('load', ()=>{
  const f = new Function(
    'window','document','navigator','performance','localStorage',
    'requestAnimationFrame','cancelAnimationFrame','AudioContext','webkitAudioContext','setTimeout','Math','console',
    script
  );
  f(win, document, navigator, performance, localStorage, requestAnimationFrame, cancelAnimationFrame, AudioMock, AudioMock, setTimeout, Math, console);
});

// ---- helpers to fire events ----
function fire(target, type, evt){ const hs = target._h[type]; if (hs) for (const h of hs) h(evt); }
function mev(x,y){ return { clientX:x, clientY:y, preventDefault(){}, touches:undefined }; }
const canvas = elements.c;

function step(){ clock += 50; run('frame', ()=>{ if (rafCb) rafCb(clock); }); }

// ---- drive the game ----
let fired = { play:0, again:0, continue:0, share:0, pause:0, resume:0, deaths:0 };
function clickEl(id){ const el=elements[id]; if(el) fire(el,'click',{}); }

// start
run('start', ()=>clickEl('play'));
// press and hold to charge launch, then release
run('press', ()=>fire(canvas,'mousedown',mev(innerW*0.5, innerH*0.6)));
for (let i=0;i<14;i++) step();                          // hold to charge
run('release', ()=>fire(win,'mouseup',{}));
for (let i=0;i<6;i++) step();                            // ascend
run('repress', ()=>fire(canvas,'mousedown',mev(innerW*0.5, innerH*0.42)));

let py = innerH*0.42, px = innerW*0.5;
const FRAMES = 26000;
let lastGo = '';
for (let i=0;i<FRAMES;i++){
  // flick pattern: 3 fast frames per cycle, alternating; dive-weighted to bank altitude
  const cyc = i % 12, sub = Math.floor(i/12) % 3;
  const dir = (sub === 0) ? -1 : 1;                     // 1 loop : 2 dives
  if (cyc < 3){ py += dir*110; }                        // sustained fast move => flick
  else {
    const yt = innerH*(0.28 + 0.34*(0.5+0.5*Math.sin(i*0.015)));  // slow vertical sweep to cover the field
    py += (yt - py)*0.25; px = innerW*0.5 + Math.sin(i*0.06)*innerW*0.34;
  }
  py = Math.max(8, Math.min(innerH-8, py));
  run('move', ()=>fire(win,'mousemove',mev(px,py)));
  step();

  // detect a fresh game-over (goScore text changed) and restart / revive
  const go = elements.goScore ? elements.goScore._text : '';
  if (go && go !== lastGo){ lastGo = go; fired.deaths++;
    if (fired.deaths % 2 === 1){ run('continue',()=>clickEl('continue')); fired.continue++; }
    else { run('again',()=>clickEl('again')); fired.again++; run('repress2',()=>fire(canvas,'mousedown',mev(innerW*0.5,innerH*0.42))); }
  }

  // periodically exercise pause/resume and share
  if (i % 900 === 200){ run('pause',()=>clickEl('pauseBtn')); fired.pause++; }
  if (i % 900 === 260){ run('resume',()=>clickEl('resume')); fired.resume++; }
  if (i % 1500 === 700){ run('share',()=>clickEl('share')); fired.share++; }
}

// ---- exercise the cosmetic shop (buy + equip, all categories) ----
run('shopOpen', ()=>clickEl('shopBtn'));
const grid = elements.shopGrid;
function gridClick(id, act, cat){ run('shop:'+cat+':'+act, ()=>fire(grid,'click',{target:{closest:()=>({dataset:{id,act,cat:cat||'skin'}})}})); }
gridClick('sunset','buy','skin');
gridClick('galaxy','buy','skin');
gridClick('classic','equip','skin');
gridClick('sunset','equip','skin');
gridClick('candy','buy','tail');
gridClick('spark','buy','trail');
gridClick('match','equip','tail');
gridClick('spark','equip','trail');
run('shopBack', ()=>clickEl('shopBack'));
// ---- exercise the challenges hub ----
run('hubOpen', ()=>clickEl('hubBtn'));
run('hubBack', ()=>clickEl('hubBack'));
let ownedAfter='', cosmAfter='', xpAfter='', dailyAfter='';
try{ ownedAfter = localStorage.getItem('kiterush_owned')||''; }catch(e){}
try{ cosmAfter = localStorage.getItem('kiterush_cosm')||''; }catch(e){}
try{ xpAfter = localStorage.getItem('kiterush_xp')||''; }catch(e){}
try{ const dd=JSON.parse(localStorage.getItem('kiterush_dailych')||'null'); dailyAfter = dd?`${dd.ch.filter(c=>c.done).length}/3 done, bonus:${dd.bonus}`:''; }catch(e){}

// ---- report ----
const ZONES = ['OPEN SKY','HIGH WINDS','STRATOSPHERE','MESOSPHERE','OUTER SPACE'];
const zonesSeen = ZONES.filter(z=>seenText.has(z));
const humor = ['MOO! ','BAWK! ','YUM! ','BEEP! ','✨ ','🐄','🐔','🦄','🍕','🛸','RUDE!','SWOOSH!','BEEP BEEP!'];
const humorSeen = humor.filter(h=>[...seenText].some(t=>t.indexOf(h)>=0));
const tricksSeen = ['LOOP!','DIVE!','STYLE FLOW!'].filter(t=>[...seenText].some(s=>s.indexOf(t)>=0));
const has = sub => [...seenText].some(t=>t.indexOf(sub)>=0);
const frenzySeen = has('FRENZY');
const smashSeen = ['POW!','BAM!','SMASH!','BONK!','KAPOW!'].some(has);
const missionSeen = has('MISSION!');

console.log(JSON.stringify({
  framesRun: FRAMES,
  exceptions: errors.length,
  errorSample: errors.slice(0,6),
  maxAltitudeMeters: maxMeters,
  zonesReached: zonesSeen,
  hazardsExercised: { storms: maxMeters>800, planes: maxMeters>1000 || zonesSeen.includes('STRATOSPHERE'), satellites: maxMeters>1900 || zonesSeen.includes('MESOSPHERE') },
  tricksSeen, humorSeen,
  metaProgression: { frenzyTriggered: frenzySeen, frenzySmashes: smashSeen, missionCompleted: missionSeen,
                     walletText: elements.wallet?elements.wallet._text:'', ribbonsEarnedText: elements.goRibbons?elements.goRibbons._html:'',
                     medalText: elements.goMedal?elements.goMedal._html:'' },
  shop: { ownedAfter, cosmAfter, shopWallet: elements.shopWallet?elements.shopWallet._text:'' },
  gamification: { xpAfter, dailyAfter, goXP: elements.goXP?elements.goXP._html:'', goDaily: elements.goDaily?elements.goDaily._html:'',
                  hubRendered: elements.hubContent?elements.hubContent._html.length:0, pilotLine: elements.pilotLine?elements.pilotLine._html:'' },
  uiFired: fired,
  distinctRenderStrings: seenText.size
}, null, 2));
