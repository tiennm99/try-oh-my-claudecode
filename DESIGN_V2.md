# OMC Neon Arena — V2 Features

Feature round adding Chicken-Invaders-style booster drops and other arcade polish. Keeps all existing v1 files and their public surface working.

## Scope

1. **Power-up drops (boosters).** Enemies drop floating pickups on death. Six types:
   - `rapidfire` — cyan — halves shoot cooldown for 8s
   - `spread` — magenta — shoots 3-way fan for 8s
   - `pierce` — white — bullets pass through enemies (max 3 hits) for 8s
   - `shield` — yellow — one free hit absorbed (stacks, max 2)
   - `heal` — lime — instantly +1 HP (capped at maxHealth)
   - `bomb` — red — instant screen clear: all enemies + enemy bullets take 3 dmg, big FX
   
   Drop odds: chaser 15%, splitter 20%, bruiser 40%, shooter 25%, mini 5%, boss 100% (drops 2). Pickups float gently and drift toward the player when within 120 px. Expire after 12s with fade. Pickup triggers a small burst + sound.

2. **Dash ability.** Shift key. 180ms duration, 900ms cooldown, 480 px/s forward-velocity boost. Invulnerable during dash. Emits 5 ghost-trail particles. HUD shows dash-ready pip.

3. **Boss fight** every 5th wave (wave 5, 10, 15, …). Single large enemy, hp = 40 + 20·floor(wave/5), radius 48, score 500. Attacks rotate: (a) 8-way radial burst every 3s, (b) aimed 3-shot at player every 1.5s, (c) during the last HP third, faster cadence. Drops 2 power-ups guaranteed on death.

4. **Shooter enemy type** from wave 3+. hp 2, radius 14, speed 70, score 30, color #ff8ac2. Keeps distance ~260 px; fires aimed bullet every 1.8s.

5. **Enemy bullets.** Speed 180 px/s, 4 s TTL, glowing dot tracer. Collide only with player (damage via existing onPlayerHit path). Lives in its own pool `game.enemyBullets`.

6. **Parallax starfield background** — 3 layers of drifting dots behind the grid. Subtle (~1/3/7 px-per-sec downward drift). Additive blend.

7. **Floating combo text.** On enemy kill, spawn `+<points> ×<mult>!` floater at the kill position. Rises 40 px, fades out over 0.9s. Color matches the combo mult (white → cyan → magenta → yellow at higher mults). Also spawn on bomb/boss-defeat.

8. **Settings.** New overlay reachable from pause screen: master volume (0–100), screen-shake toggle. Persists to `localStorage` key `omc-neon-arena.settings`. Applied live.

## Architecture & File Plan

**New files (owned by the worker that creates them):**
- `src/game/powerup.js` — Pickup entity + PowerupPool + spawn helper.
- `src/game/buffs.js` — BuffManager: addBuff(kind, duration), hasBuff(kind), consumeShield(), tick(dt), active() → list for HUD.
- `src/game/boss.js` — Boss class + attack patterns.
- `src/game/enemy_bullet.js` — EnemyBullet + pool.
- `src/game/starfield.js` — Parallax 3-layer drift.
- `src/game/floaters.js` — FloaterPool + emit(text, x, y, color).
- `src/game/settings.js` — loadSettings(), saveSettings(), on/off screen shake flag, volume 0..1.

**Modified files (single owner to avoid conflicts):**
- `src/game/game.js` — **worker-1 owns.** Adds: import stubs for the seven new modules, instances `this.powerups/buffs/boss/enemyBullets/starfield/floaters/settings`. Wires update/render in correct order (starfield → grid → entities → floaters → HUD). onEnemyKilled → drop powerup check + floater emit. onBossDefeated → 2 drops. `applyBomb()` helper used by bomb power-up.
- `src/game/player.js` — **worker-1 owns.** Reads BuffManager for shoot cadence / spread / pierce. Dash on Shift. Shield consumption in onPlayerHit.
- `src/game/bullet.js` — **worker-1 owns.** Supports a `pierce` budget (pass-through hits remaining).
- `src/game/enemy.js` — **worker-2 owns.** Adds `shooter` type + enemy-bullet emission.
- `src/game/waves.js` — **worker-2 owns.** Boss cadence every 5 waves; shooter injection from wave 3+.
- `src/game/collision.js` — **worker-2 owns.** Enemy bullets vs player; bullet-vs-enemy pierce handling; bullet-vs-boss.
- `src/ui/hud.js` — **worker-3 owns.** setBuffs(list) → icons with countdown rings; setDashReady(bool); setBossHealth(0..1 | null); setWaveBanner(text, duration).
- `styles/main.css` — **worker-4 owns.** Buff icons, boss HP bar, wave banner, settings overlay. Polish classes for floaters if they use DOM (they will use canvas).
- `index.html` — **worker-4 owns.** Settings overlay markup + HUD slots for buffs/boss-bar/wave-banner.
- `src/ui/menu.js` — **worker-4 owns.** showSettings()/hideSettings(), wires volume slider + shake toggle.
- `src/main.js` — **worker-1 owns.** Hooks Shift key into Player.tryDash, wires menu.settings handlers to game.settings.

## Contracts

- `game.powerups`, `game.enemyBullets`, `game.floaters`, `game.buffs`, `game.boss`, `game.starfield`, `game.settings` must all exist on Game after v2.
- `game.onEnemyKilled(enemy)` still receives an Enemy instance. It internally calls powerup drop + floater emit + boss-defeat logic.
- `game.applyBomb()` clears enemies (3 damage each) and enemy bullets, emits large particles, plays sound.
- `HUD.setBuffs([{kind:'rapidfire', remaining:0..1}, …])` — remaining is fraction 0..1 for countdown ring.
- `game.settings` is a live object `{ volume:number, shake:boolean }` mutated by UI; Game reads each frame.

## Parallel Execution Plan

- worker-1 runs first (blocks 2, 3, 4). Creates all new stub files with stable exports + implements the full power-ups/dash/bullet pierce/Game wiring.
- worker-2, 3, 4 fan out in parallel once #1 lands.
