# Kite Rush v2.2 — design notes

These features are based on games that won awards or topped critics' lists in Jun–Sep 2026, adapted to Kite Rush.

| Source (2026) | What made it work | What Kite Rush took |
|---|---|---|
| **BALL x PIT** (Apple Design Award finalist, Delight & Fun; mobile launch 12 Mar 2026) | Level-up picks, fusing two powers to free a slot, feeling overpowered within 20 minutes | **Updrafts** + **Fusion** |
| **Pixel Flow!** (Pocket Gamer Mobile Games Awards 2026, Game of the Year) | Two daily 24 h competitive events drive daily return. Reviews punish levels that feel pay-gated. | **Daily ghost race** + shareable ghost links. No paid power in the daily. |
| **Pine Hearts** (Apple Design Award, Inclusivity) | Accessibility options shown *before* the game starts | **"Before you fly"** first-launch screen |
| **Grand Mountain Adventure 2** (ADA finalist, Interaction) | Gear is cosmetic, skill decides the result. Zen mode. | Cosmetic shop kept power-free. Zen mode (below) is built. |
| **Scritchy Scratchy** (critics' pick) | Reviews complained about PC-first touch targets | Left-handed layout. Updrafts never interrupt play. |

## Updrafts

### When picks happen
- Picks happen at 150, 400, 750, 1,150, 1,600, 2,100, 2,650 and 3,250 m, then every 1,000 m. They are front-loaded, so a new player sees 1–2 picks in a normal run.
- **No pause (player feedback):** the upgrade is chosen automatically and shown in a small banner. Pausing for a 3-card choice broke the flow.

### Slots and offers
- You have 4 slots and each upgrade has 3 levels.
- If you already own an upgrade that can still level up, one of the three cards is always an upgrade, so builds come together.
- The Shield Bubble is offered at most every 3rd pick. Bot testing showed that offering it at every gate made late runs endless.

### Fusions
| Fusion | Recipe | Power |
|---|---|---|
| Gold Storm 💰 | Magnet + Lucky Coins | Pulls in every coin on screen, and coins charge Rush 4× faster |
| Golden Halo 😇 | Wide Rings + Hot Streak | Every ring is PERFECT, and the multiplier floor is ×2 |
| Kai Po Cyclone 🌀 | Sharp Manja + Daredevil | Rival kites within ~95 units are cut automatically |
| Jet Stream 🚀 | Tailwind + Long Rush | When Rush ends, a shockwave smashes every hazard on screen |

### Daily fairness
- Offers come from their own seeded RNG (`kr-updraft-<day>`), separate from the course RNG.
- Picks never change the course, so the daily stays identical for everyone.

### Balance check
Autopilot bot runs at 4× speed with god mode off, always taking the first card:

| | Runs | Median | Range |
|---|---|---|---|
| v2.1 baseline | 8 | ≈3,000 m | 290–4,400 m |
| v2.2 | 16 | ≈3,400 m | 310–14,400 m (2 of 16 runs passed 10,000 m) |

That spread is the roguelite "broke the game" moment the design is aiming for. Tune it with `GATES`, `BSLOTS` and the fusion strengths.

## Daily ghost race

### Recording and storage
- During a daily run, the game records `[x, altitude]` 4 times a second.
- Each sample packs into 2 bytes, stored as URL-safe base64. That's about 11 chars per second, or ~1.3 KB for a 2-minute run.
- Today's best daily run is saved as your ghost.

### Replay
- The ghost replays on the time axis. The faster climb wins, not the higher score.
- When the ghost is ahead and off-screen, a purple tag shows how far ahead it is.
- When it runs out of samples (it crashed), it fades. Climbing past its peak fires "You beat your ghost!".

### Sharing
- Sharing a daily result adds `&d=<day>&g=<code>` to the link. Friends who open it the same day race that ghost, and the higher of the two ghosts is used.
- Decoding is strict: only the base64 alphabet, an even length, and at most 3,600 samples. Codes from other days are dropped.

## Accessibility
- **Reduced motion:** defaults to the OS setting. It cuts screen shake, flashes and the Rush vignette.
- **Hazard outlines:** a white + red ring drawn exactly on each hitbox (birds, storm clouds, rival kites, flying planes, falling meteors).
- **Left-handed:** the pause button moves left; the coin counter, shield and Updraft icons move right; the multiplier fallback moves left.

## Added after the first v2.2 commit
1. **Global #1 daily ghost:** a `ghost` column on the daily row; the trigger keeps the ghost with the best score. The SQL was verified on PGlite. The game races the *next rung*: the lowest ghost (friend, #1, or your own) that climbed higher than your best today.
2. **Zen flight:** a no-fail practice mode. Hits become bonks (you slow down and the multiplier resets). Updrafts still work. It gives no coins, best score, missions or leaderboard entries.
3. **Updraft codex:** a 12-tile collection in the Missions panel. The first discovery of each fusion pays +100 coins.
4. **Store assets:** `07_updraft.png` and `08_ghost.png` in `store/ios69`, `store/ios65` and `store/play`.

## Built after player feedback
- **Kite Rush Pro** (`kr_pro`, US$4.99): a one-time unlock on top of free play. See README → Kite Rush Pro.
- **Calm pacing:** one threat at a time, about 21% lower top speed, fewer coins on screen. A clutter budget is enforced in the harness.
- **Updrafts apply automatically** with no pause, and the dotted warning lines are gone.

## Still open
- **Needs you:**
  - Pick the publisher (individual or company).
  - Set the signing team in Xcode.
  - Add your real AdMob IDs.
  - Set up store accounts and the paid-apps agreements (LAUNCH.md §0–2).
- **Needs a person playing:** check difficulty feel and warning visibility on a real phone. Bots can't judge either.
- **Android build:** not compiled yet. Your Mac has no JDK or Android SDK. The Android project was synced and its manifest reviewed: test AdMob ID, billing and notification permissions, target SDK 36.

## QA
The Playwright harness now runs 200 checks, all passing. That includes 81 new checks since v2.1: picks freeze the game, fusion is offered, the slot cap holds, daily offers are seeded, ghost encode/decode round-trips, the ghost is saved and raced, friend ghost links work, wrong-day and malformed codes are rejected, and the accessibility options persist.
