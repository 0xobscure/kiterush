# Kite Rush — Store Listing (App Store + Google Play)

Screenshots are in `store/`:
- `ios69/`: 1320×2868. This is Apple's required 6.9" set, and it's also used for smaller iPhones.
- `ios65/`: 1242×2688
- `play/`: 1080×2160
- `play_feature_graphic_1024x500.png`
- New in v2.2: `07_updraft.png` (Updrafts + fusion) and `08_ghost.png` (ghost race), in every set. Suggested order: 01, 07, 08, 02, 03, 04, 05, 06.

## Names
| Field | Text | Limit |
|---|---|---|
| App name | **Kite Rush: Sky Climber** | 30 |
| iOS subtitle | **Cut strings. Ride rings.** | 30 |
| Play short description | **Fly your kite to orbit. Pick power-ups, cut rival strings, race friends' ghosts.** | 80 |

## Description (use for both stores)
Launch your kite off a city rooftop and climb all the way to outer space. How high can you fly?

**ONE THUMB, ENDLESS SKY.** Drag anywhere to steer. Weave past grumpy storm clouds, birds, planes, lightning and meteors as the sky gets faster and wilder.

**CUT RIVAL KITES — KAI PO CHE!** Rival kites trail their strings across the sky. Fly through a string to cut it loose, but touch the kite itself and you're out.

**RIDE THE RINGS.** Thread the gold rings for PERFECT bonuses, chain close calls, and build a ×5 multiplier. Fill your Rush meter to blast through everything in your path.

**POWER UP AS YOU CLIMB.** Updrafts upgrade your kite mid-flight, with no pause: magnets, wider rings, sharper manja, longer Rush. Max two partners to fuse them into wild combos like Gold Storm, Kai Po Cyclone and Jet Stream, then collect them all in the Codex.

**A NEW CHALLENGE EVERY DAY.** The Daily Challenge gives everyone the same course and the same Updrafts. Race a ghost of your best run, today's #1, or a friend's ghost from a shared link. Climb the leaderboard, keep your streak alive and earn bonus coins.

**ZEN FLIGHT.** No fail, just fly. Practise your lines and try out fusions at your own pace.

**FIVE SKY ZONES.** Rooftops → Cloud Sea → Golden Hour → Night Winds → Orbit.

**COLLECT & CUSTOMISE.** Unlock kites, tails and trails, including a limited event kite every week. Complete missions to rank up from Paper Flyer to Kite Master.

- Quick runs, instant retry
- Free to play. One-time **Kite Rush Pro** unlock: no ads, free Second Wind, double coins, unlimited Zen
- Game Center / leaderboards
- Challenge friends with a link and see their score in your sky
- Plays offline
- Accessibility options: reduced motion, hazard outlines, left-handed layout
- No account needed

## Keywords (iOS, 100 chars, comma-separated, no spaces)
`flying,arcade,endless,runner,climber,one tap,casual,patang,uttarayan,daily challenge,dodge,glider`
(97 chars. Don't repeat words that are already in the name or subtitle.)

## Categories
- **iOS:** Primary Games → Arcade · Secondary Games → Casual
- **Play:** Game → Arcade · Tags: Casual, Single player, Offline, Stylized

## Age rating answers (both stores)
- Violence: none (cartoon collisions only).
- No gambling, no simulated gambling. Coins can't be bought with real money in a random or loot-box form.
- In-app purchases: **Yes**. Ads: **Yes**.
- User-generated content: nicknames on leaderboards (filtered).
- Expected result: **4+** on iOS and **Everyone / PEGI 3** on Play, with "In-App Purchases" and "Contains Ads" labels.
- Target audience on Play: **13+** (so the Families policy doesn't apply). Don't select under-13 age groups unless you switch AdMob to child-directed ads.

## App Privacy ("nutrition label") answers — iOS
| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Identifiers → Device ID (IDFA, via AdMob, only after ATT consent) | Yes | No | **Yes** | Third-party advertising |
| Usage Data → Advertising data (AdMob) | Yes | No | Yes | Third-party advertising |
| Usage Data → Product interaction (analytics, if enabled) | Yes | No | No | Analytics |
| User Content → Gameplay content (nickname, scores and daily ghost flight path, if leaderboards enabled) | Yes | No | No | App functionality |
| Diagnostics → Crash data | Only if you add a crash reporter | – | – | – |

## Play Data safety answers
- **Data collected:**
  - Device or other IDs (advertising): ads, shared with Google AdMob.
  - App activity → In-app actions (analytics).
  - Nickname, scores and daily ghost flight path: app functionality.
- **Data encrypted in transit:** Yes.
- **Users can request deletion:** Yes, by email.
- **Data sharing:** advertising IDs with AdMob.

## In-app products (create with these exact IDs)
Display name / description for `kr_pro` (both stores):
- **Name:** Kite Rush Pro
- **Description (≤45 chars, Apple):** No ads, free continues, double coins
- **Review screenshot (Apple requires one per IAP):** `store/iap_review_pro.png`

| Product ID | Type | Suggested price | Grants |
|---|---|---|---|
| `kr_pro` | Non-consumable | **US$4.99** (set: use the US$4.99 price point; let each store auto-convert other currencies) | **Kite Rush Pro:** no ads, free Second Wind every run, ×2 run coins, unlimited Zen flights, Aurora kite |
| `kr_remove_ads` | Non-consumable | US$2.99 | No interstitial ads (rewarded ads stay optional) |
| `kr_starter_pack` | Non-consumable | US$4.99 | 1,500 coins + Phoenix kite + remove ads |
| `kr_coins_1000` | Consumable | US$0.99 | 1,000 coins |
| `kr_coins_3000` | Consumable | US$2.49 | 3,000 coins |

## Game Center leaderboards (App Store Connect → Game Center)
| Leaderboard ID | Type | Sort | Format |
|---|---|---|---|
| `kr_best_alltime` | Classic | High to low, best score | Integer, suffix " m" |
| `kr_daily` | **Recurring**, every 1 day, starting 00:00 UTC | High to low | Integer, suffix " m" |

## URLs you need to host
- Privacy policy: `privacy.html`. Fill in the `{{…}}` placeholders first.
- Terms: `terms.html`
- Support URL: a page or mailto link with your support email.
- Marketing URL: optional (the web game itself works).

## What's New (v2.2) — paste into both stores
New in this update:
- UPDRAFTS: choose an upgrade as you climb, and fuse two maxed partners into 4 secret fusions.
- GHOST RACE: race your best Daily run, today's #1, or a friend's ghost from a shared link.
- ZEN FLIGHT: a no-fail mode for practice and chill flights.
- CODEX: collect every upgrade and discover fusions for bonus coins.
- Accessibility: reduced motion, hazard outlines and a left-handed layout.
