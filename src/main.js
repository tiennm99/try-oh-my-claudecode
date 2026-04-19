// Boots engine + game + UI and wires overlays, input, and the main loop.

import { createCanvas } from "./engine/canvas.js";
import { createInput } from "./engine/input.js";
import { startLoop } from "./engine/loop.js";
import { Game, GameState } from "./game/game.js";
import { HUD, wireV2Hud, wireV3Hud } from "./ui/hud.js";
import { Menu } from "./ui/menu.js";
import { HighScore } from "./ui/highscore.js";
import { Leaderboard } from "./ui/leaderboard.js";
import { saveSettings } from "./game/settings.js";

const canvasEl = document.getElementById("game");
if (!canvasEl) throw new Error("#game canvas not found");

const canvas = createCanvas(canvasEl);
const input = createInput({ canvas: canvasEl, logicalWidth: canvas.width, logicalHeight: canvas.height });
const hud = new HUD(document);
const highscore = new HighScore();
const leaderboard = new Leaderboard();

// Shim: game.js checks for leaderboard first, so highscore becomes a fallback adapter.
const highscoreShim = {
  get: () => leaderboard.top(),
  submit: (s) => { const r = leaderboard.submit(s); return r.top; },
};

const game = new Game({ canvas, input, hud, highscore: highscoreShim });
game.leaderboard = leaderboard;
hud.setBest(leaderboard.top());
wireV2Hud(game, hud);
wireV3Hud(game, hud);

const menu = new Menu(
  document,
  {
    start: () => {
      game.start();
    },
    resume: () => {
      game.resume();
    },
    reset: () => {
      game.start();
    },
  },
  {
    initialSettings: game.settings,
    onSettingChange: (key, value) => {
      game.settings[key] = value;
      saveSettings(game.settings);
      if (key === "volume" && game.audio && typeof game.audio.setMasterVolume === "function") {
        game.audio.setMasterVolume(value);
      }
    },
  },
);

function renderOverlay(state) {
  if (state === GameState.MENU) menu.show("menu");
  else if (state === GameState.PAUSED) menu.show("pause");
  else if (state === GameState.GAMEOVER) menu.show("gameover");
  else menu.hideAll();
}

game.on("stateChange", (state) => {
  renderOverlay(state);
  if (state === GameState.GAMEOVER) {
    menu.renderLeaderboard?.(leaderboard.top5(), game.score);
  }
});
renderOverlay(game.state);

if (game.audio && typeof game.audio.setMasterVolume === "function") {
  game.audio.setMasterVolume(game.settings.volume);
}

const loop = startLoop({
  update: (dt) => {
    if (input.wasPressed("KeyP") || input.wasPressed("Escape")) {
      if (game.state === GameState.PLAYING) game.pause();
      else if (game.state === GameState.PAUSED) game.resume();
    }
    if (input.wasPressed("ShiftLeft") || input.wasPressed("ShiftRight")) {
      if (game.state === GameState.PLAYING && typeof game.player.tryDash === "function") {
        game.player.tryDash(game);
      }
    }
    game.update(dt);
    input.endFrame();
  },
  render: (alpha, frameDt) => {
    game.render(alpha, frameDt);
  },
});

// Expose a small debug handle for other workers + console tinkering.
window.__omc = { game, loop, canvas, input, hud, highscore, leaderboard };

let lastFpsLog = 0;
setInterval(() => {
  const now = performance.now();
  if (now - lastFpsLog > 4500) {
    lastFpsLog = now;
    // eslint-disable-next-line no-console
    console.log(`[omc] fps=${loop.fps} state=${game.state}`);
  }
}, 5000);
