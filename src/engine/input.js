// Keyboard + pointer input manager. Tracks pressed keys, mouse position in
// canvas-logical coordinates, and mouse button state.

export function createInput({ canvas, logicalWidth = 1280, logicalHeight = 720 } = {}) {
  if (!canvas) throw new Error("createInput: canvas is required");

  const keys = new Set();
  const pressedThisFrame = new Set();
  const releasedThisFrame = new Set();
  const mouse = { x: logicalWidth / 2, y: logicalHeight / 2, down: false };

  function onKeyDown(e) {
    if (!keys.has(e.code)) pressedThisFrame.add(e.code);
    keys.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
    releasedThisFrame.add(e.code);
  }

  function updateMouseFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouse.x = ((e.clientX - rect.left) / rect.width) * logicalWidth;
    mouse.y = ((e.clientY - rect.top) / rect.height) * logicalHeight;
  }

  function onMouseMove(e) {
    updateMouseFromEvent(e);
  }

  function onMouseDown(e) {
    updateMouseFromEvent(e);
    mouse.down = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("blur", onBlur);

  return {
    isDown(code) {
      return keys.has(code);
    },
    wasPressed(code) {
      return pressedThisFrame.has(code);
    },
    wasReleased(code) {
      return releasedThisFrame.has(code);
    },
    anyDown(codes) {
      return codes.some((c) => keys.has(c));
    },
    get mouse() {
      return mouse;
    },
    endFrame() {
      pressedThisFrame.clear();
      releasedThisFrame.clear();
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
