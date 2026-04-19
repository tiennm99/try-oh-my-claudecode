// Entity base + EntityPool. Pools are not object pools (no recycling) — they
// just own a list and expose filterAlive() for sweeping dead entities.

let nextId = 1;

export class Entity {
  constructor({ x = 0, y = 0, vx = 0, vy = 0, radius = 8 } = {}) {
    this.id = nextId++;
    this.pos = { x, y };
    this.vel = { x: vx, y: vy };
    this.radius = radius;
    this.alive = true;
  }

  update(/* dt */) {}
  render(/* ctx */) {}

  kill() {
    this.alive = false;
  }
}

export class EntityPool {
  constructor() {
    this.items = [];
  }

  add(entity) {
    this.items.push(entity);
    return entity;
  }

  remove(entity) {
    const idx = this.items.indexOf(entity);
    if (idx !== -1) this.items.splice(idx, 1);
  }

  clear() {
    this.items.length = 0;
  }

  forEach(fn) {
    for (let i = 0; i < this.items.length; i++) fn(this.items[i], i);
  }

  filterAlive() {
    let write = 0;
    for (let read = 0; read < this.items.length; read++) {
      const item = this.items[read];
      if (item.alive) {
        this.items[write++] = item;
      }
    }
    this.items.length = write;
  }

  get size() {
    return this.items.length;
  }
}
