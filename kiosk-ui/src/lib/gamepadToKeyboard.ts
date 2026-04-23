type KeyName = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Enter" | "Escape";

type MapperOptions = {
  deadzone?: number;
  initialRepeatMs?: number;
  repeatMs?: number;
};

const DEFAULTS: Required<MapperOptions> = {
  deadzone: 0.5,
  initialRepeatMs: 250,
  repeatMs: 110,
};

const KEY_EVENT_OPTIONS: KeyboardEventInit = {
  bubbles: true,
  cancelable: true,
};

function emitKey(key: KeyName, isRepeat = false) {
  const target = document.activeElement && document.activeElement !== document.documentElement
    ? document.activeElement
    : document.body;

  target.dispatchEvent(new KeyboardEvent("keydown", { ...KEY_EVENT_OPTIONS, key, repeat: isRepeat }));
}

export function startGamepadKeyboardMapper(options: MapperOptions = {}) {
  const settings = { ...DEFAULTS, ...options };

  const heldAt = new Map<KeyName, number>();
  const lastFireAt = new Map<KeyName, number>();

  let rafId = 0;

  const keyState: Record<KeyName, boolean> = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Enter: false,
    Escape: false,
  };

  const tick = (now: number) => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads ? Array.from(pads).find((candidate) => Boolean(candidate && candidate.connected)) ?? null : null;

    if (pad) {
      const axisX = pad.axes[0] ?? 0;
      const axisY = pad.axes[1] ?? 0;

      const up = (pad.buttons[12]?.pressed ?? false) || axisY < -settings.deadzone;
      const down = (pad.buttons[13]?.pressed ?? false) || axisY > settings.deadzone;
      const left = (pad.buttons[14]?.pressed ?? false) || axisX < -settings.deadzone;
      const right = (pad.buttons[15]?.pressed ?? false) || axisX > settings.deadzone;

      const enter = (pad.buttons[0]?.pressed ?? false) || (pad.buttons[1]?.pressed ?? false);
      const escape = (pad.buttons[2]?.pressed ?? false) || (pad.buttons[8]?.pressed ?? false) || (pad.buttons[9]?.pressed ?? false);

      keyState.ArrowUp = up;
      keyState.ArrowDown = down;
      keyState.ArrowLeft = left;
      keyState.ArrowRight = right;
      keyState.Enter = enter;
      keyState.Escape = escape;
    } else {
      keyState.ArrowUp = false;
      keyState.ArrowDown = false;
      keyState.ArrowLeft = false;
      keyState.ArrowRight = false;
      keyState.Enter = false;
      keyState.Escape = false;
    }

    (Object.keys(keyState) as KeyName[]).forEach((key) => {
      const isPressed = keyState[key];
      const heldSince = heldAt.get(key);
      const lastFired = lastFireAt.get(key);

      if (!isPressed) {
        heldAt.delete(key);
        lastFireAt.delete(key);
        return;
      }

      if (heldSince === undefined) {
        heldAt.set(key, now);
        lastFireAt.set(key, now);
        emitKey(key, false);
        return;
      }

      if (lastFired === undefined) {
        lastFireAt.set(key, now);
        emitKey(key, false);
        return;
      }

      const repeatDelay = now - heldSince < settings.initialRepeatMs
        ? settings.initialRepeatMs
        : settings.repeatMs;

      if (now - lastFired >= repeatDelay) {
        lastFireAt.set(key, now);
        emitKey(key, true);
      }
    });

    rafId = window.requestAnimationFrame(tick);
  };

  rafId = window.requestAnimationFrame(tick);

  return () => {
    if (rafId) window.cancelAnimationFrame(rafId);
  };
}
