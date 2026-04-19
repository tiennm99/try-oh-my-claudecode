// Circle-vs-circle collision resolution.
// V2: enemy bullets vs player, player bullets vs boss, bullet pierce handling.

import { EnemyTypes, spawnSplitterChildren } from "./enemy.js";

function circleHit(a, b) {
  const dx = a.pos.x - b.pos.x;
  const dy = a.pos.y - b.pos.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy <= r * r;
}

export function resolveCollisions(game) {
  const bullets = game.bullets.items;
  const enemies = game.enemies.items;
  const player = game.player;
  const boss = game.boss;

  // Player bullets vs enemies + boss (with pierce).
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (!b.alive) continue;

    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (!e.alive) continue;
      if (typeof b.hasHit === "function" && b.hasHit(e)) continue;
      if (!circleHit(b, e)) continue;

      const killed = e.takeDamage(b.damage);
      game.particles.emit({
        x: b.pos.x,
        y: b.pos.y,
        color: e.color,
        count: 6,
        speedMin: 60,
        speedMax: 180,
        lifetime: 0.25,
        radius: 2.5,
      });

      if (typeof b.onHit === "function") {
        b.onHit(e);
      } else {
        b.alive = false;
      }

      if (killed) {
        game.onEnemyKilled(e);
        if (e.type === EnemyTypes.SPLITTER) {
          for (const child of spawnSplitterChildren(e)) {
            game.enemies.add(child);
          }
        }
      }

      if (!b.alive) break;
    }

    if (!b.alive) continue;

    if (boss && boss.alive) {
      const alreadyHit = typeof b.hasHit === "function" && b.hasHit(boss);
      if (!alreadyHit && circleHit(b, boss)) {
        const dmg = b.damage || 1;
        const killed = boss.takeDamage(dmg);
        game.particles.emit({
          x: b.pos.x,
          y: b.pos.y,
          color: boss.color || "#ff66aa",
          count: 8,
          speedMin: 80,
          speedMax: 220,
          lifetime: 0.3,
          radius: 3,
        });
        if (typeof b.onHit === "function") {
          b.onHit(boss);
        } else {
          b.alive = false;
        }
        if (killed || boss.health <= 0) {
          if (typeof game.onBossDefeated === "function") {
            game.onBossDefeated(boss);
          }
        }
      }
    }
  }

  // Enemy bullets vs player.
  const enemyBullets = game.enemyBullets?.items ?? [];
  if (player && player.alive) {
    for (let i = 0; i < enemyBullets.length; i++) {
      const eb = enemyBullets[i];
      if (!eb.alive) continue;
      if (!circleHit(eb, player)) continue;
      if (typeof game.onPlayerHit === "function") {
        game.onPlayerHit(eb);
      }
      eb.alive = false;
    }
  }

  // Player vs enemy bodies.
  if (player && player.alive && player.invuln <= 0) {
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (!e.alive) continue;
      if (!circleHit(player, e)) continue;
      const took = player.takeDamage(1, e.pos.x, e.pos.y);
      if (took) {
        game.onPlayerHit(e);
      }
      break;
    }
  }
}
