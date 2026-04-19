# OMC Neon Arena — V3 Features

Inspiration: Chicken Invaders (tier-stacking, drones, bonus waves) + 1942/Strikers-style (medals, announcer banners, hit-stop). All additive — keeps v1 and v2 surfaces working.

## Features

1. **Weapon tiers.** Collecting the same booster while active bumps its tier (1→2→3 max). Duration is refreshed on each pickup.
   - `rapidfire` tiers: cooldown × 0.5 / 0.35 / 0.25.
   - `spread` tiers: 3 / 4 / 5 bullets; angle spread 12° / 16° / 20°.
   - `pierce` tiers: pierce budget 3 / 5 / 8 per bullet.
   - `shield` keeps existing stack semantic (max 2). Collecting shield with a shield already active adds a stack; no tier.
   - `heal` remains instant (no tier, just restores +1 HP each pickup).
   - `bomb` remains instant (no tier).
   - `drone` (new, see #2) tiers: 1 / 2 / 2 drones + fire rate doubles at tier 3.

2. **Orbital drones.** New power-up `drone`. On pickup, spawns companion drone(s) that orbit the player at radius 56 and fire a bullet every 0.6 s toward the player's aim direction. Lasts 15 s (refreshed/extended on pickup). Drone bullets share the player's pierce budget (via active buffs). Drones render as small neon diamonds with a trailing tail.

3. **Medal pickups.** On non-boss enemy death, 25 % chance a medal spawns at kill position. Medals rise upward at 60 px/s, bob slightly, and expire after 3 s. Grabbing one adds `+20 × comboMult` to score and `+1` to the combo counter. Missed medals fade out with no penalty. Medal color scales with wave (bronze → silver → gold → neon). Max 32 active.

4. **Bonus wave.** Every 4th wave (4, 8, 12, 16, …) that is NOT a boss wave (waves 4, 8, 12, 16 — none collide with boss cadence 5, 10, 15). Enter a 18 s "METEOR RAIN" where no enemies spawn. Meteors fall vertically from the top at 160 – 320 px/s, tumble, and explode on bullet hits for +15 score per meteor. Meteors do NOT damage the player (pass through harmlessly). Announcer banner "BONUS: METEOR RAIN!". End of bonus wave emits a "WAVE CLEARED +<score>" floater.

5. **Announcer banners.** Replace generic "WAVE N" with flavor:
   - Wave 2: "ROLL CALL"
   - Wave 3: "SHOOTERS JOIN"
   - Wave 4 (bonus): "BONUS: METEOR RAIN!"
   - Wave 5/10/15… (boss): "BOSS APPROACHING"
   - Otherwise: "WAVE N"
   - Plus a "PERFECT WAVE!" popup if a wave is cleared without the player taking any damage (shield blocks do not count as damage).

6. **Hit-stop.** On boss death: `timescale = 0.1` for 180 ms then ease back. On combo kill where new combo multiplier bumps (e.g., reaches ×2, ×3, ×4): `timescale = 0.2` for 80 ms. Applied by multiplying `dt` in Game.update.

7. **Top-5 leaderboard.** Replace single `best` with an array of up to 5 entries `{score, date}` sorted desc. Persist to `localStorage` under `omc-neon-arena.leaderboard`. Game-over overlay shows the board with the new entry highlighted. Menu still shows the top score via the first entry. Keep the old `omc-neon-arena.best` key for backward compat on first load (import once if present).

## Files

**New:**
- `src/game/tiers.js` — tier lookup tables (duration, cooldown mult, spread count, etc.) + `applyTierEffect(kind, tier)`.
- `src/game/drones.js` — DronePool: spawn(count, owner), update(dt, game), render(ctx). Each drone is an entity orbiting at angular velocity; fires via existing Bullet with `owner=drone`.
- `src/game/medals.js` — Medal entity + MedalPool. Spawn on kill, magnetism to player at 160 px.
- `src/game/meteor.js` — Meteor entity, rotation, hp=1, score 15.
- `src/game/bonus.js` — BonusWaveManager: isBonus flag, timer, meteor spawner. Coordinates with waves.js.
- `src/game/hitstop.js` — simple singleton: `trigger(duration, scale)`, `sample(dt) → scaledDt`, `active` getter.
- `src/ui/leaderboard.js` — load/save/top5()/submit(score) → {rank, improved}. Migrates from `omc-neon-arena.best` on first load.

**Modified:**
- `src/game/buffs.js` — add `tier` to active buff state, bump on repeat `addBuff`, cap by `maxTier(kind)`.
- `src/game/powerup.js` — include `drone` in KIND_POOL; update drop odds slightly (add drone ~5 %); apply `drone` via drone pool; on buff kinds call tier bump; on `shield` stack +1.
- `src/game/player.js` — read tier in fire cooldown, spread count/angle, pierce budget.
- `src/game/game.js` — own `this.drones`, `this.medals`, `this.bonus`, `this.hitstop`; integrate update/render; medal drop in onEnemyKilled; hit-stop triggers in onBossDefeated + onEnemyKilled when multiplier increases; bonus-wave routing in update; "perfectWave" event emit; swap highscore for leaderboard (keep `this.highscore` name and public `.get()` for back compat OR introduce `this.leaderboard`).
- `src/game/waves.js` — bonus-wave branch (wave % 4 === 0 && wave % 5 !== 0); call bonus.start(game); advance when `bonus.isFinished()`. Emit wave label via `_emit('waveStart', {wave, isBoss, isBonus, label})` with the announcer label resolved here.
- `src/ui/hud.js` — buff chip shows tier as Roman numeral "II"/"III" when tier > 1; setWaveBanner reads label text from the emitted event (already does — just ensure it uses `label` when provided).
- `src/ui/menu.js` — game-over overlay now renders a top-5 list; highlight new entry.
- `index.html` — game-over overlay structure supports a list.
- `styles/main.css` — tier badges on chips, announcer flavor styling, leaderboard list rows with highlight.
- `src/main.js` — swap HighScore → Leaderboard while keeping the old function name `hud.setBest(topScore)` working (pass `leaderboard.top() ?? 0`).

## Contracts

- Game exposes: `this.drones`, `this.medals`, `this.bonus`, `this.hitstop` in addition to v2 fields.
- `game._emit('waveStart', { wave, isBoss, isBonus, label })` — all workers consume.
- `BuffManager.active()` entries may include `tier:number`. HUD uses it optionally.
- On boss death, Game calls `hitstop.trigger(180, 0.1)` before the existing onBossDefeated work (particles render during timescale freeze — intentional).
- `leaderboard.submit(score) → { rank, improved }` — Menu uses rank to highlight.

## Parallel Plan

- worker-1 (opus, FIRST — blocker): tiers.js + drones.js + buffs tier system + powerup drone/tier routing + player tier-aware fire + hitstop.js + Game integration of drones + hitstop + tiers. Touches: new files + buffs.js, powerup.js, player.js, game.js.
- worker-2 (opus, parallel after #1): medals.js + meteor.js + bonus.js + waves.js bonus branch + Game integration of medals+bonus (minimal, scoped fields) + collision.js for meteors. Touches: new files + waves.js, collision.js, small additive in game.js.
- worker-3 (sonnet, parallel after #1): leaderboard.js + HUD tier chip rendering + announcer label + perfect-wave detection + ui wiring in main.js. Touches: new files + hud.js, main.js.
- worker-4 (designer, parallel after #1): CSS for tier badges, announcer flavor styling, leaderboard overlay markup, drone/medal HUD hints if any. Touches: styles/main.css, index.html, src/ui/menu.js.

game.js conflict risk: workers 1/2/3 all touch it. Mitigation — worker-1 pre-scaffolds game.js with null-safe references for `this.drones / this.medals / this.bonus / this.hitstop / this.leaderboard` and per-frame hooks so workers 2 and 3 only fill in the modules and/or tweak their scoped integration points. If a later worker must edit game.js, keep edits additive and single-region.
