# Kite Rush 🪁 — v2.2

A one-thumb vertical sky climber. Steer your kite up through five zones — **Rooftops → Cloud Sea → Golden Hour → Night Winds → Orbit** — flying through rings, cutting rival kites' strings, and dodging birds, storm clouds, planes, lightning and meteors.

Everything ships in one self-contained file, `index.html` (~193 KB, font embedded, no network requests unless you configure leaderboards or analytics).

## Play / test locally
```bash
open index.html                 # plays fully from disk
npm run serve                   # http://localhost:5173 — needed for PWA install + service worker
npm i && npx playwright install chromium && npm test   # full QA harness (~2 min)
```

## How it plays
| Mechanic | Detail |
|---|---|
| **Steer** | Drag anywhere, left/right. Relative control (1.3× gain) so your thumb never covers the kite. Desktop: ← → / A D. |
| **One hit** | Any hazard ends the run. A **shield** bubble (rare) saves you once. |
| **Rings** | Fly through the gold hoops. Dead-centre = **PERFECT**. Chains climb a musical scale. |
| **Kite fighting** | Rival kites trail pink string. Cross the **string** to cut it — *KAI PO CHE!* Touch the **kite** and you're out. |
| **Close calls** | Skim a hazard without touching it for bonus metres + micro slow-mo. |
| **Multiplier ×1–×5** | Every 3 skill actions (ring / cut / close call) steps it up. Decays if you stop. |
| **Rush** | Fills from rings, cuts, close calls, coins. When full: 4 s of speed, invincibility, and smashing everything. |
| **Score** | Metres climbed + skill bonus metres × multiplier. |
| **Second Wind** | One continue per run (100 coins, or a rewarded ad on Poki/CrazyGames). |

Every dangerous thing is telegraphed: planes show a dashed flight path, lightning flashes its strike column, meteors mark where they'll fall.

## Meta loops (kept to three on purpose)
1. **Missions → Rank** — three missions at a time; clear all three to rank up (coin reward, harder set). Rank 8 unlocks the Prism kite.
2. **Coins → Kites** — 9 kites: 7 bought with coins, *Gold Rush* for flying 2,000 m, *Prism* for Rank 8. The title screen always shows how close the next one is.
3. **Daily gift** — 7-day streak, 50 → 200 coins.

A gold **BEST** line hangs in the sky at your record height; crossing it mid-run fires **NEW BEST!**


## Kite Rush Pro (one-time unlock, native only)
`kr_pro`, a non-consumable, suggested price US$4.99. The game stays free to play: "free to try, pay once to own".
- **Pro perks:** no ads, free Second Wind every run, ×2 run coins, unlimited Zen flights, exclusive Aurora kite.
- **Fairness:** Pro never touches the Daily course, the Updrafts or scoring.
- **Paywall triggers:**
  - Zen after `KR_CONFIG.zenFreeFlights` free flights (default 3)
  - A "Go Pro" link on results every 4th run from run 5
  - The Pro card in Shop → Coins
  - Settings → Kite Rush Pro
- **Web:** web and portal builds never show Pro (Poki and CrazyGames don't allow paywalls).
- **Save codes:** export codes are now signed. Importing never grants Pro, Remove Ads or paid kites; those come back via **Restore purchases**.
- **Setup you need to do:** see LAUNCH.md §1b.

## New in v2.2 — Updrafts, ghost race, accessibility
Ideas taken from 2026 award winners and critics' picks (BALL x PIT, Pixel Flow, Pine Hearts, Grand Mountain Adventure 2). See `UPDATE_v2.2.md` for the design notes.
- **Updrafts (in-run upgrades):** at 150 / 400 / 750 / 1,150 / 1,600 / 2,100 / 2,650 / 3,250 m (then every 1,000 m) an upgrade is applied **automatically, with no pause**. A small banner names it and says what it does. Three offers are drawn and scored: a fusion first, then levelling an owned upgrade (more so if its partner is owned), then a new upgrade whose partner you own, then a new upgrade, then a shield, then a coin bag. There are 8 upgrades, each with 3 levels: Magnet, Lucky Coins, Wide Rings, Hot Streak, Sharp Manja, Daredevil, Tailwind and Long Rush. You get 4 slots.
- **Fusion:** max two partner upgrades and a FUSION card appears. Each fusion keeps both level-3 effects, adds a "broken" power and frees a slot: Gold Storm (Magnet + Lucky), Golden Halo (Wide Rings + Hot Streak), Kai Po Cyclone (Manja + Daredevil) and Jet Stream (Tailwind + Long Rush). Cards show the partner hint ("Max it with … to fuse").
- **Updraft codex:** in the Missions panel, a 12-tile collection. Upgrades show the highest level you've reached; fusions stay hidden as ??? until you discover them. The first discovery of each fusion pays +100 coins. The codex is included in save export/import.
- **Fair daily:** Updraft offers in the Daily Challenge are seeded per day, so everyone gets the same upgrades at the same altitudes. Results list the run's build.
- **Daily ghost race:** each daily run records your path (4 samples/s, about 11 bytes per second of play). Your best daily run becomes a translucent ghost kite on today's course. When it's ahead and off-screen, a "👻 YOUR BEST +123 m" tag shows at the top. Beating its top altitude fires a banner, and the result is shown on the results screen.
- **Share your ghost:** a daily share link adds `&d=<day>&g=<path>`. A friend who opens it the same day races your ghost ("👻 Vipul's ghost is waiting" on the Daily button). Links from other days and malformed codes are ignored.
- **Zen flight (from Grand Mountain Adventure 2):** a no-fail practice mode, started from the pill under Daily Challenge.
  - Hits become a "bonk": you slow down and the multiplier resets.
  - Updrafts still work, so you can practise fusions.
  - It gives no coins, best score, missions, stats or leaderboard entries, so it can't be farmed.
  - End it from pause ("End Zen flight"); a toast shows height and bonks.
- **Accessibility:** a "Before you fly" screen on first launch, and the same options in Settings:
  - Reduced motion, which defaults to the OS setting
  - Hazard outlines: a red and white ring around every hitbox
  - Left-handed: the pause button and coin counter swap sides
- **Global #1 ghost:** with Supabase configured, a new daily best uploads its ghost path, and each Daily run fetches today's #1 ghost (cached 3 min). The ghost you race is the *next rung*: the lowest ghost (friend, #1, or your own) that climbed higher than your best today. **Re-run `backend/supabase.sql`** to add the `ghost` column. It's idempotent, and the ghost always stays with the best score.

## New in v2.1 — retention + monetisation
- **Daily Challenge:** the same seeded course for everyone each day. It has its own best score, milestone coin rewards and a daily-play streak (3/7/14-day bonuses).
- **Leaderboards:** Today / All-time. Uses Game Center on iOS, or Supabase on web and Android (`backend/supabase.sql`). Falls back to your local top 10 + last 7 days. No fake entries, ever.
- **Rival links:** Share makes a `?vs=score&n=name` link. Your friend sees "Beat Vipul's 1,234 m!" and a pink rival line in their sky, and gets +25 coins for passing it.
- **Shop tabs:** Kites · Tails · Trails · Coins (native only). A weekly event kite (Lantern/Dragon/Lotus/Comet) is earned by flying 5,000 m that week. Phoenix kite comes with the Starter Pack.
- **Monetisation (native):** AdMob rewarded (continue, double coins) and interstitials (max 1 per 3 runs, never in the first 3 runs or after a run under 20 s, off with Remove Ads). In-app purchases: Remove Ads, 2 coin packs, Starter Pack, plus Restore Purchases. Rating prompt after a new best.
- **Native polish:** haptics, reminder notifications (opt-in after run 3), save mirrored to device storage, export/import save code, Game Center.
- **Analytics hook:** set `KR_CONFIG.analyticsUrl` to receive batched gameplay events. Hidden retention debug: tap the version text in Settings 5 times.
- All IDs and keys live in the `KR_CONFIG` block at the top of the script in `index.html`.

## Shipping to the App Store / Google Play
See **`LAUNCH.md`** (step-by-step, including the parts that need your accounts) and **`STORE_LISTING.md`** (copy, keywords, privacy answers, product IDs). The native project is in `native/`:
```bash
cd native && npm install && npm run ios      # or: npm run android
```

## Release checklist
| Target | Status | Notes |
|---|---|---|
| Open web / itch.io | ✅ Ready | Upload the folder (or zip it). |
| PWA (install to home screen) | ✅ Ready | Serve over https. Manifest + maskable icon + offline service worker included. |
| Poki / CrazyGames | ✅ Hooks in | Portals inject their SDK; the game auto-detects `PokiSDK` / `CrazyGames.SDK` and calls gameplayStart/Stop, a midgame ad every 3rd retry, and rewarded ads for Second Wind. On the plain web these are no-ops. |
| iOS / Android stores | 🔧 Project ready, needs your accounts | `native/` has the Capacitor iOS + Android project with ads, purchases, Game Center, haptics, notifications, icons and splash. Follow `LAUNCH.md`. |

Before each release, bump `CACHE` in `service-worker.js`.

## Tuning knobs (in `index.html`)
- `DMAX` — metres at which difficulty maxes out (2400).
- **Pacing (v2.2 calm pass):** `genChunk()`.
  - `gap`: clear air after a hazard pattern.
  - `hazRun`: a breather after 2 hazard patterns.
  - `sinceBreak>=3`: forces a ring set.
  - Lower the hazard gap to make it busier; raise it to calm it further.
- **Speed:** `update()` → `base = 220 + 190·(1−e^(−m/1800))`; Rush multiplier 1.35.
- **Clutter budget:** harness section 19 checks the limits.
- `update()` → `base` — climb speed curve.
- `ZW` — which pattern chunks appear in each zone and how often.
- `CH` — the pattern chunks themselves (gap widths, counts, speeds all scale with `d`).
- Rush fill rates live in `getCoin`, `passRing`, `nearMiss`, `cutKite` (all go through `addRush`).
- Updrafts: `GATES` (altitudes), `BOONS` / `FUSE`, `MAG`, `BSLOTS`, `BMAX`; the auto-choice rules are in `pickScore()`.

## Save data
One versioned object in `localStorage['kiterush.save.v3']`. v1 saves migrate automatically (Ribbons become coins, matching kites carry over).

## Files
```
index.html               the game
manifest.json            PWA manifest
service-worker.js        offline cache
icon-192/512.png, icon-maskable-512.png, apple-touch-icon.png
og-image.png             1200×630 share card
test_harness.js          Playwright QA harness (real page, real rendering)
REVIEW.md                what was wrong with v1 and how v2 fixes it
QA_LOG.md                issues found in QA rounds and their fixes
LAUNCH.md / STORE_LISTING.md   store submission
privacy.html, terms.html policies to host (fill in placeholders)
backend/supabase.sql     optional leaderboard database
native/                  Capacitor iOS + Android project (Game Center plugin in native/plugins)
store/                   App Store + Play screenshots and feature graphic
```
Font: Fredoka, SIL Open Font License 1.1.
