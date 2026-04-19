# OMC Neon Arena

A top-down arcade survival shooter built with **oh-my-claudecode** multi-agent orchestration. Survive endless waves of neon enemies, chase the combo multiplier, and compete for the high score.

## Built with oh-my-claudecode

This entire game was designed and implemented by a specialized multi-agent OMC team:

- **worker-1**: Engine & scaffold (HTML5 canvas, fixed-timestep loop, input handling)
- **worker-2**: Gameplay systems (player, enemies, bullets, waves, collision, scoring)
- **worker-3**: UI & visual theme (HUD, menus, neon CSS aesthetic)
- **worker-4**: Documentation (this README)

**Pipeline**: strategic planning → parallel execution (engine + gameplay + UI in lockstep) → verification → release.

## How to Run

No build step. Open the game in your browser:

**Option 1:** Use a static server
```bash
# Python 3
python -m http.server

# Or Node.js
npx serve
```

Then visit `http://localhost:8000` (or the port shown).

**Option 2:** Open directly
Open `index.html` in your browser. (Note: Chrome and modern browsers may block module imports from `file://` — use a server for best compatibility.)

## Controls

| Action | Key |
|--------|-----|
| Move | **WASD** or **Arrow Keys** |
| Aim | **Mouse** |
| Shoot | **Click** or **Space** |
| Pause | **P** or **Escape** |

## Gameplay

### Player
- **Health**: 3 HP per run
- **Speed**: 260 px/s
- **Shoot Cooldown**: 140ms (≈7 shots/s)
- **Bullet Speed**: 520 px/s
- **Invulnerability**: 0.9s after hit

### Enemy Types

| Type | HP | Speed | Color | Score |
|------|----|----|-------|-------|
| **Chaser** | 1 | 110 px/s | Magenta | 10 pts |
| **Bruiser** | 4 | 55 px/s | Yellow | 40 pts |
| **Splitter** | 2 | 90 px/s | Lime | 25 pts → splits into 2 **Minis** (1 HP, 5 pts each) |

All enemies seek the player. Splitters explode into two faster mini-enemies when defeated.

### Waves

| Wave | Contents | Spawning |
|------|----------|----------|
| **1** | 8 chasers | 0.35s stagger |
| **2** | 10 chasers + 2 bruisers | 0.35s stagger |
| **3+** | Scales: 8 + wave×2 chasers, floor(wave/2) bruisers, max(0, wave−2) splitters | 0.35s stagger |

Between waves: 2 second intermission to catch your breath.

### Scoring & Combos

- **Base Points**: Enemy score × combo multiplier
- **Combo Multiplier**: 1 + floor(combo/5)
  - Earn 1 combo per kill
  - Combo resets if you take 2+ seconds without a kill
  - Max multiplier at 5 kills = 2×, at 10 kills = 3×, etc.
- **Example**: Kill a bruiser (40 pts) with 7 combo stacks → 40 × (1 + floor(7/5)) = 40 × 2 = 80 pts

## Architecture

The game uses a modular, file-scoped design to allow parallel development:

```
src/
├── main.js                 Entry point, bootstraps engine + game + UI
├── engine/
│   ├── loop.js            Fixed-timestep game loop, render loop, pause state
│   ├── input.js           Keyboard (WASD/arrows) + pointer input
│   └── entity.js          Base Entity class, EntityPool (free-list allocator)
├── game/
│   ├── game.js            Game state machine, collision dispatch, scoring/combo logic, shake FX
│   ├── player.js          Player movement, shooting, health, knockback, invulnerability
│   ├── enemy.js           Enemy types (chaser, bruiser, splitter, mini), pathfinding
│   ├── waves.js           Wave scheduler, difficulty curve, enemy queue
│   ├── bullet.js          Projectile entity, lifetime, collision tag
│   ├── particles.js       Particle emitter system, pools, lifetime decay
│   ├── collision.js       Broad/narrow phase collision resolution
│   └── audio.js           Procedural Web Audio SFX (shoot, explode, hurt, wave, gameover)
└── ui/
    ├── hud.js             Score, health, wave, combo display updates
    ├── menu.js            Start, pause, game-over overlay state
    └── highscore.js       localStorage high-score persistence

styles/
└── main.css               Neon cyan/magenta/yellow palette, glows, overlays, responsive layout

index.html                 Canvas host, HUD/menu/overlay DOM, ES module entry
```

## What OMC Demonstrated

- **Parallel Task Decomposition**: Three subsystems (engine, gameplay, UI) developed independently without merge conflicts.
- **Specialist Routing**: Each agent played to its strengths — engine builder, gameplay designer, UI/visual specialist.
- **File-Scoped Isolation**: Strict module boundaries prevented stepping on toes; no shared mutable state between lanes.
- **Dependency Ordering**: Engine completed first, gameplay built on top, UI integrated last — critical path was visible and managed.
- **Verification Gates**: Each subsystem verified before integration; final pass checked gameplay balance and visual polish.

This is a proof-of-concept that multi-agent orchestration scales to interactive, real-time applications.

## License

Unlicensed. Built as a demo for oh-my-claudecode.