# Kite Rush v2 — QA log

Coverage: 7 phone sizes (280–430 px wide), tablet 768×1024, desktop 1366×768 / 1440×900, rotation, backgrounding, reduced-motion, first-time-player idle run, all 5 zones, every screen and modal. Playwright + frame-by-frame visual review. Regression harness: `npm test` (22 checks, all passing).

## Round 1 — 12 issues fixed
| Sev | Issue | Fix |
|---|---|---|
| P0 | Rotating to landscape showed the "rotate" overlay but the run kept going underneath | Auto-pause; can't start while the overlay shows |
| P0 | Meteor / lightning warnings drawn under the score HUD | Markers moved below the HUD band |
| P0 | Orbit zone: meteor trails hit the 420-particle cap (visual noise, evicted confetti) | Tidy comet tails; peak particles 419 → 125 |
| P0 | Speed streaks read as rain in Night/Orbit | Only during Rush, thinner, fainter |
| P0 | Title-screen coins trailed through the logo | Nothing spawns until launch |
| P0 | Orbit planet too big and too pink; competed with gameplay | Smaller, corner, muted |
| P1 | Subtitle wrapped with an orphan word on ≤375 px | One line, fluid size |
| P1 | Title text over busy building windows | Bottom scrim |
| P1 | Results showed "0 rings / 0 cuts / ×1" chips | Zero chips hidden |
| P1 | Steer tutorial icon was an unreadable grey dot | Swiping hand + ◀ ▶ |
| P1 | Tutorial hints flickered, overriding each other | Steer hint has priority |
| P1 | Score unreadable over bright sky/rings | Top scrim |

## Round 2 — 3 issues fixed
- ×N multiplier badge covered the score at 4+ digits → repositioned, clears at every pop scale.
- Rush triggered too often (active in 7/8 late-game frames) → ring fill 0.08/0.12, max 3 rings per chunk count.
- Mission toast collided with hazard warnings → markers lowered, plane marker clamped.

## Round 3 — 4 issues fixed
- Desktop: HUD pills, coin counter and pause button sat at the screen edges → all anchored to the play column.
- Photosensitivity: death flash was 85% white → all flashes capped at 50%; `prefers-reduced-motion` cuts shake 70%, flash 60%, removes Rush pulse.
- iOS audio unlock hardened (touchend/click unlock, resumes "interrupted" contexts).
- Mission toast overflowed on 320 px phones → auto-fits.

## Bugs caught earlier by the harness
- Lightning generator could loop forever (game freeze in Night zone) when the first bolt spawned near centre.

## Not verifiable in the lab — check on device
- Real iOS Safari audio + haptics (vibration is Android-only on the web).
- Thumb feel of steering sensitivity (`SENS = 1.3`) and difficulty for humans (bots have perfect reflexes).
- Frame rate on low-end Android.

## Round 4 — feature build (v2.1): 119 automated checks, 38 screens reviewed at 390 px and 320 px
- Long banners ("You beat …!") overflowed the screen → auto-fit + queued so banners never overlap.
- Toasts landed on modal headers → shown at bottom while a modal is open.
- Shop header said "Kites" on every tab → "Shop".
- 320 px shop grid clipped → scroll with visible fade affordance.
- Added in-app review prompt with strict frequency guards.
Native code paths (ads, IAP, notifications, Game Center, haptics, storage) verified against mocks; real-device checks are listed in LAUNCH.md §5.

## Round 5 — v2.2 features: 169 automated checks (+50), screens reviewed at 390 px and 320 px
- In bot testing, offering the Shield Bubble at every Updraft made late runs endless → shield offered at most every 3rd pick; grace after a pick cut from 1.1 s to 0.8 s; gates after 3,250 m spaced 1,000 m apart.
- `toTitle()` left the pick modal open, which blocked the next Daily start → modal closed on title.
- The pick caption said "150 m" while the HUD showed *score* (altitude + bonus) → caption now reads "Updraft N".
- Daily HUD showed "TODAY 0" before the first run → shows "DAILY CHALLENGE".
- Zen summary toast read the bonk count after the run was reset → captured before reset.
- The ghost share-link check passed vacuously on file:// → it now runs over a routed http origin.
- Supabase ghost SQL checked on PGlite: ghost stored with a better score, kept on a worse one, rejected on the all-time board and on malformed codes.

## Round 6 — "too noisy" (player feedback): calm pacing pass
Measured with screen sampling (0.1 s, autopilot). "Hazards" = birds / cloud rows / rival kites / planes / bolts / meteors on screen.

| Altitude | Before: avg / peak hazards | After: avg / peak | Before → after coins on screen |
|---|---|---|---|
| 300–800 m | 4.6 / 16 | 1.7 / 5 | 7.2 → 3.3 |
| 800–1,500 m | 4.1 / 9 | 1.9 / 6 | 4.3 → 2.8 |
| 2,500 m+ | 7.1 / 14 | 1.5 / 4 | 3.9 → 1.3 |

Changes:
- **One threat at a time:** a hazard pattern is followed by 210–300 units of clear air; chunks never overlap (the old negative-gap overlap is removed).
- **Breathers:** after two hazard patterns there's always a calm one (coins or rings); a ring set appears at least every 4th pattern.
- **Fewer things per pattern:**
  - Bird V-formation 5 → 3.
  - Crossing birds max 3, appearing later.
  - Double rival kites rare (after 70% difficulty, 30% of the time).
  - Meteors 3–5 → 2–3.
  - Double lightning rarer.
  - Planes always single.
- **Coins only where they guide:** removed the coin trails inside bird, zig, plane and shield patterns; ring connectors 2 → 1.
- **Speed:** top cruising speed about 21% lower (≈410 vs ≈520 units/s); Rush boost 1.6× → 1.35×.
- **Visual noise:** background clouds 8 → 5 and fainter; at most 3 floating score texts at once.
- **Guardrail:** new harness section 19 fails the build if average hazards > 2.5, peak > 7 (a cloud wall counts as one), more than 2 hazard types at once, or average coins > 5.

Bots can't judge feel: the perfect autopilot now outlives a 2-minute cap, and even a "human-like" bot (0.45 s reactions, ±22 px aim error) lasted a median 76 s on the old, crowded build. Difficulty for real players still needs a hands-on check; the knobs are listed in README → Tuning.

## Round 7 — player feedback: "pauses after every power", "dotted lines distracting"
- **Updrafts no longer pause the game.** The best of three offers is applied automatically (`pickScore()`: fusion > level an owned upgrade > partner of an owned upgrade > new upgrade > shield > coin bag). The 3-card screen and its 0.8 s grace are removed. The banner is smaller (26 px; fusions 34 px).
- **Dotted warning lines removed:** the plane flight path, the meteor trajectory and the lightning column edges are gone. What's left:
  - Plane: the "!" marker at the screen edge.
  - Meteor: the warning triangle at the top.
  - Lightning: a soft column tint with no flicker, plus the cloud marker.
- Zen: discovering a fusion records it in the codex but pays no coins (Zen never pays).

## Round 8 — first hands-on play on the iOS Simulator (iPhone 17, iOS 26.5)
Found by playing the native build (not visible in browser tests):
- **Score hidden behind the Dynamic Island.** WKWebView reports safe-area insets a moment after launch, and the canvas HUD only read them once. It now re-reads them every 30 frames (`syncSafe()`).
- **Two system dialogs before the first flight:** AdMob's consent message, then Apple's "Allow tracking?" prompt (the consent flow triggers it). Ads setup now waits until the first run ends, so a new player flies first.
- **The game played itself.** With no input at all the kite passed rings, triggered Rush and survived 40 s (1,100 m) on some runs, because the calm pass left the centre lane safe. Fixes, with no extra clutter:
  - Cloud-wall gaps are never in the centre lane, and zig clouds reach the centre.
  - The first bird of a group, the first rival kite and the first meteor of a shower aim at the player's current lane.
  - Ring sets start off-centre.
  - Idle survival: median 14 s → 9 s, worst 41 s → 15 s (old crowded build: 6 s).
  - Clutter is still 1.2–1.7 hazards on screen on average.
- New harness checks:
  - Section 18: no consent before the first run.
  - Section 20: an idle kite must go down within 20 s.
  - 203 checks passing.
