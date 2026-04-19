// Canvas bootstrap: device-pixel-ratio aware resize, exposes a stable logical size.

const LOGICAL_WIDTH = 1280;
const LOGICAL_HEIGHT = 720;

export function createCanvas(canvasEl) {
  if (!canvasEl) throw new Error("createCanvas: canvas element is required");

  const ctx = canvasEl.getContext("2d");
  if (!ctx) throw new Error("createCanvas: 2D context not available");

  const state = {
    canvas: canvasEl,
    ctx,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    dpr: 1,
  };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    const cssWidth = rect.width || LOGICAL_WIDTH;
    const cssHeight = rect.height || LOGICAL_HEIGHT;

    canvasEl.width = Math.round(cssWidth * dpr);
    canvasEl.height = Math.round(cssHeight * dpr);

    const scaleX = canvasEl.width / LOGICAL_WIDTH;
    const scaleY = canvasEl.height / LOGICAL_HEIGHT;
    const scale = Math.min(scaleX, scaleY);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    state.dpr = dpr;
    state.width = LOGICAL_WIDTH;
    state.height = LOGICAL_HEIGHT;
    state.cssWidth = cssWidth;
    state.cssHeight = cssHeight;
    state.displayScale = scale;
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  return {
    get ctx() {
      return state.ctx;
    },
    get canvas() {
      return state.canvas;
    },
    get width() {
      return state.width;
    },
    get height() {
      return state.height;
    },
    get dpr() {
      return state.dpr;
    },
    get displayScale() {
      return state.displayScale;
    },
    resize,
  };
}
