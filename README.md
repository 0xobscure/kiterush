# Kite Rush 🪁

A one-thumb vertical arcade climber. Launch your kite off the ground, climb through five sky
zones into space, dodge birds / planes / satellites / storms, ride gusts, pull loops & dives,
chain a Style multiplier, grab Frenzy, complete missions, earn Ribbons, and buy kite skins.

Everything runs in a single self-contained file — **`index.html`** — with no dependencies.

---

## Quick start (just play)

Open `index.html` in any modern browser, or drop it on your phone. That's it.

> Note: the native **Share** sheet and **install to home screen** only work when the game is
> served over **https** (see below). Opened as a local file it still plays fully; Share falls
> back to copying the score to the clipboard.

## Host it (recommended for launch)

Any static host works. Drop **all** of these files in the same folder:

```
index.html
manifest.json
service-worker.js
icon-192.png
icon-512.png
```

Then deploy the folder to:
- **Netlify** — drag the folder onto the dashboard, done.
- **Vercel** — `vercel` in the folder, or drag-and-drop.
- **Cloudflare Pages** / **GitHub Pages** — push the folder, enable Pages.

Visit the hosted URL on your phone → browser menu → **Add to Home Screen**. It installs as a
full-screen app with the kite icon, works offline (service worker caches everything), and the
native Share sheet works.

### One optional tweak for the best install

`index.html` ships with an **inline** manifest so the single file is fully self-sufficient.
When hosting with the files above, you can get the nicer PNG icons on the install by editing the
`<link rel="manifest" ...>` line near the top of `index.html` to point at the real file:

```html
<link rel="manifest" href="manifest.json" />
```

The service worker is already auto-registered by the page (it silently does nothing if the file
isn't present), so no other change is needed.

---

## What's inside (feature summary)

- **Launch-from-ground tutorial**, then drag-to-steer climbing with a tethered string.
- **Five altitude zones** (Open Sky → Outer Space) with a shifting sky and milestone banners.
- **Hazards:** birds (with flocks & squawks), storm clouds, airplanes, satellites.
- **Tricks:** flick ↑ Loop (brief invincibility), flick ↓ Dive (bonus height) → **Style** multiplier.
- **Near-miss "SWOOSH"** grazing, googly-eyed kite that watches threats.
- **Frenzy** rainbow orb — smash through everything for points.
- **Missions** (3 active, persist across runs) + **Ribbons** currency + **daily streak** reward.
- **Kite Shop** — 7 cosmetic skins that recolor the kite and tail.
- **Medals** (Bronze → Platinum) and a **ghost** of your best run climbing beside you.
- Haptics, subtle wind + drone ambience, SFX, pause, revive, share, persistent high score.

## Development notes

- `test_harness.js` is a headless smoke/integration tester. Run `node test_harness.js`
  (Node 18+). It mocks the DOM/canvas, drives thousands of frames with simulated input
  (steering, trick-flicks, shop buys), and reports crashes, max altitude, zones reached,
  and which systems fired. Re-run it after any change.
- The game is one ~1,200-line file. If you keep extending it, consider splitting into
  `index.html` + a few JS modules under a Git repo, with a small step that concatenates back
  to the single file for release.

Built as a single-file prototype. Tune difficulty and test on real devices before a public launch.
