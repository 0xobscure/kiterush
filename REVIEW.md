# Kite Rush — Design & Tech Review (v1 → v2)

## Verdict on v1
Feature-rich, fun-poor. Twelve meta systems bolted onto a core loop where the player's input barely mattered.

## Why it wasn't addictive

| # | Problem | Why it kills retention | v2 fix |
|---|---------|------------------------|--------|
| 1 | **Score = time survived.** Altitude auto-climbed; stars/tricks added crumbs. | No skill expression → no "I can do better" pull. | Score = climb + skill bonuses (rings, cuts, close calls, Rush smashes) × a 1–5 multiplier. Good players out-score by 30–50%. |
| 2 | **Kite teleported to your finger.** Absolute positioning, finger covered the kite. | Zero game-feel, no mastery curve, hand hides hazards. | Relative drag (1.3× gain) with a critically-damped follow, tilt, squash & stretch. Thumb stays anywhere. |
| 3 | **Flick-tricks fought the steering.** A fast drag triggered loops by accident. | Unreliable controls = player blames the game. | Tricks removed. One input, one verb: steer. Depth comes from routing. |
| 4 | **3 lives + revive.** | Deaths had no weight → no tension, no "one more go". | One hit. Shield pickup = one spare. One "Second Wind" continue per run (coins or rewarded ad). |
| 5 | **Random spawns.** Birds hunted you from off-screen; overlaps created unfair walls. | Deaths felt random, not earned. | 12 hand-designed pattern chunks with guaranteed gaps, pacing breathers every 7 chunks, difficulty-scaled parameters. |
| 6 | **No telegraphing.** | Unreadable danger. | Planes show a dashed predicted flight path, lightning shows a flashing strike column, meteors show a drop marker. |
| 7 | **Nothing unique.** Birds/planes/stars = every other climber. | Forgettable. | Signature mechanic: **kite fighting (patang).** Fly across a rival's string to cut it — "KAI PO CHE!" — but touch their kite and you're out. |
| 8 | **Feature bloat.** Missions + dailies + achievements + XP + skins + tails + trails + daily deal + ghost + critters + frenzy + style meter. | Menu was a wall of text; nothing felt meaningful. | Three loops only: **Missions → Rank** (Jetpack-style), **Coins → Kites**, **Daily gift streak**. Each one visible on the title screen. |
| 9 | **Weak juice.** Beeps, random-per-frame shake, no hit-stop. | Actions didn't *feel* good. | Trauma-based shake, hit-stop + slow-mo death, near-miss micro slow-mo, rising-pitch coin chains, ring chimes up the scale, confetti, speed lines, Rush mode. |
| 10 | **No music.** | Silent sessions feel cheap. | Generative 112 bpm soundtrack that layers up in play and opens its filter in Rush. |
| 11 | **Restart friction.** Game-over screen had 4 buttons + paragraphs. | Every second between death and retry costs sessions. | Death → result in ~1.1 s; big "FLY AGAIN" under the thumb; tap-and-drag on title starts instantly. |
| 12 | **Mid-run goals absent.** | No moment-to-moment carrots. | BEST line in the sky, mid-run "NEW BEST!", mission-complete toasts, zone banners, Rush meter. |
| 13 | **Art inconsistency.** Emoji critters next to vector kites, heavy shadowBlur. | Didn't read as a crafted indie game. | One cohesive flat-vector style with characterful faces (grumpy storm clouds, rival kites with scowls), pre-rendered sprites. |

## Tech issues fixed
- Google Fonts dependency (broke offline / portal QA) → Fredoka embedded (OFL).
- `getElementById` + gradient creation every frame; `shadowBlur` on many objects → sprite cache, per-frame work cut.
- Game coordinates in pixels (resize mid-run broke layouts) → design-unit world (360-wide column) that scales to any screen, letterboxed play column on desktop.
- Save scattered over 15 localStorage keys → one versioned save object with migration from v1 (coins and matching skins carry over).
- No portal SDK hooks → Poki / CrazyGames adapter (gameplayStart/Stop, midgame + rewarded ads), no-ops on the open web.
- Mock-DOM test harness couldn't catch rendering bugs → Playwright harness driving the real page.
