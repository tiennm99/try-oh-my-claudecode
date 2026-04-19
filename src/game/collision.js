// Simple O(n^2) circle-vs-circle collision resolution for bullets/player/enemies.

import { EnemyTypes, spawnSplitterChildren } from "./enemy.js";

export function resolveCollisions(game) {
  const bullets = game.bullets.items;
  const enemies = game.enemies.items;
  const player = game.player;

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (!b.alive) continue;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (!e.alive) continue;
      const dx = b.pos.x - e.pos.x;
      const dy = b.pos.y - e.pos.y;
      const r = b.radius + e.radius;
      if (dx * dx + dy * dy <= r * r) {
        const killed = e.takeDamage(b.damage);
        b.alive = false;
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
        if (killed) {
          game.onEnemyKilled(e);
          if (e.type === EnemyTypes.SPLITTER) {
            for (const child of spawnSplitterChildren(e)) {
              game.enemies.add(child);
            }
          }
        }
        break;
      }
    }
  }

  if (player && player.alive && player.invuln <= 0) {
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (!e.alive) continue;
      const dx = player.pos.x - e.pos.x;
      const dy = player.pos.y - e.pos.y;
      const r = player.radius + e.radius;
      if (dx * dx + dy * dy <= r * r) {
        const took = player.takeDamage(1, e.pos.x, e.pos.y);
        if (took) {
          game.onPlayerHit(e);
        }
        break;
      }
    }
  }
}
