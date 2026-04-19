// Fixed-timestep game loop with requestAnimationFrame.
// Caps frame delta to avoid the "spiral of death" when the tab is backgrounded.

const MAX_FRAME_DT = 0.25;

export function startLoop({ update, render, fixedDt = 1 / 60 } = {}) {
  if (typeof update !== "function") throw new Error("startLoop: update is required");
  if (typeof render !== "function") throw new Error("startLoop: render is required");

  let accumulator = 0;
  let lastTime = 0;
  let rafId = 0;
  let running = true;
  let frames = 0;
  let fpsWindowStart = 0;
  let fps = 0;

  function frame(timeMs) {
    rafId = requestAnimationFrame(frame);

    if (!lastTime) {
      lastTime = timeMs;
      fpsWindowStart = timeMs;
      return;
    }

    let dt = (timeMs - lastTime) / 1000;
    lastTime = timeMs;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;

    if (running) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= fixedDt && steps < 8) {
        update(fixedDt);
        accumulator -= fixedDt;
        steps += 1;
      }

      const alpha = accumulator / fixedDt;
      render(alpha, dt);

      frames += 1;
      if (timeMs - fpsWindowStart >= 1000) {
        fps = frames;
        frames = 0;
        fpsWindowStart = timeMs;
      }
    }
  }

  rafId = requestAnimationFrame(frame);

  return {
    pause() {
      running = false;
    },
    resume() {
      running = true;
      lastTime = 0;
      accumulator = 0;
    },
    stop() {
      cancelAnimationFrame(rafId);
      running = false;
    },
    get running() {
      return running;
    },
    get fps() {
      return fps;
    },
  };
}
