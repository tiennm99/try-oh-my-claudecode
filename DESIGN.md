# OMC Neon Arena — Design Document

## Concept
A top-down arcade survival shooter rendered on HTML5 canvas. The player controls a glowing "agent" orb, surviving endless waves of enemy "bugs." Built as a demo for **oh-my-claudecode** multi-agent orchestration — each subsystem was authored by a specialized teammate.

## Tech Stack
- **No build step.** Pure HTML + CSS + vanilla JS (ES modules).
- Canvas 2D for rendering, Web Audio API for procedural SFX, `localStorage` for high-score persistence.
- Served directly — open `index.html` in a browser or use a static server.

## File Layout (target)
```
index.html             Entry HTML, canvas, HUD DOM
styles/main.css        Neon theme, HUD, overlays, responsive
src/main.js            Bootstraps engine, game, UI
src/engine/loop.js     Fixed-timestep game loop
src/engine/input.js    Keyboard + pointer input
src/engine/entity.js   Entity / component base
src/game/player.js     Player movement, shooting, health
src/game/enemy.js      Enemy types + AI
src/game/waves.js      Wave spawner, difficulty curve
src/game/bullet.js     Projectiles
src/game/particles.js  Particle FX
src/game/audio.js      Procedural Web Audio SFX
src/ui/hud.js          Score, health, wave
src/ui/menu.js         Start, pause, game-over overlays
src/ui/highscore.js    localStorage high-score
README.md              Project-level intro
```

## Gameplay
- **Controls:** WASD/arrows move, mouse aim, click/space shoot, P pause.
- **Waves:** Increasing enemy counts and speeds. Three enemy types: chaser (fast/weak), bruiser (slow/tanky), splitter (splits on death).
- **Scoring:** Per-kill points scaled by wave. Combo multiplier when kills chain within 2s.
- **Death:** Overlay with score, best score, restart.

## Visual Language
- Dark background with subtle grid.
- Neon cyan/magenta/yellow palette; glow via `shadowBlur`.
- Screen shake on hits, particles on explosions.

## Task Decomposition
1. Scaffold + engine core (index.html, engine loop, input, entities).
2. Gameplay: player, enemies, bullets, waves, collisions.
3. UI/HUD: CSS theme, HUD overlay, menu/pause/game-over screens.
4. Audio + particles polish.
5. README with a "built with OMC" section.
