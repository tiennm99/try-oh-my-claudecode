// Boots engine + game + UI and wires overlays, input, and the main loop.

import { createCanvas } from "./engine/canvas.js";
import { createInput } from "./engine/input.js";
import { startLoop } from "./engine/loop.js";
import { Game, GameState } from "./game/game.js";
import { HUD } from "./ui/hud.js";
import { Menu } from "./ui/menu.js";
import { HighScore } from "./ui/highscore.js";

const canvasEl = document.getElementById("game");
if (!canvasEl) throw new Error("#game canvas not found");

const canvas = createCanvas(canvasEl);
const input = createInput({ canvas: canvasEl, logicalWidth: canvas.width, logicalHeight: canvas.height });
const hud = new HUD(document);
const highscore = new HighScore();

const game = new Game({ canvas, input, hud, highscore });
hud.setBest(highscore.get());

const menu = new Menu(document, {
  start: () => {
    game.start();
  },
  resume: () => {
    game.resume();
  },
  reset: () => {
    game.start();
  },
});

function renderOverlay(state) {
  if (state === GameState.MENU) menu.show("menu");
  else if (state === GameState.PAUSED) menu.show("pause");
  else if (state === GameState.GAMEOVER) menu.show("gameover");
  else menu.hideAll();
}

game.on("stateChange", renderOverlay);
renderOverlay(game.state);

const loop = startLoop({
  update: (dt) => {
    if (input.wasPressed("KeyP") || input.wasPressed("Escape")) {
      if (game.state === GameState.PLAYING) game.pause();
      else if (game.state === GameState.PAUSED) game.resume();
    }
    game.update(dt);
    input.endFrame();
  },
  render: (alpha, frameDt) => {
    game.render(alpha, frameDt);
  },
});

// Expose a small debug handle for other workers + console tinkering.
window.__omc = { game, loop, canvas, input, hud, highscore };

let lastFpsLog = 0;
setInterval(() => {
  const now = performance.now();
  if (now - lastFpsLog > 4500) {
    lastFpsLog = now;
    // eslint-disable-next-line no-console
    console.log(`[omc] fps=${loop.fps} state=${game.state}`);
  }
}, 5000);
