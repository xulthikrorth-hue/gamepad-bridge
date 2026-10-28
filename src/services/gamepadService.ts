import { DeviceInfo } from '../types/gamepad';
import { NAME_XBOX, NAME_DS4 } from './bridgeEngine';

export interface GamepadReading {
  connected: boolean;
  name: string;
  buttons: { [code: number]: number }; // evdev code -> 0 or 1
  rawButtons: number[]; // 0..16
  axes: {
    lx: number; // -1..1
    ly: number; // -1..1
    rx: number; // -1..1
    ry: number; // -1..1
    lt: number; // 0..1
    rt: number; // 0..1
    hatX: number; // -1, 0, 1
    hatY: number; // -1, 0, 1
  };
  timestamp: number;
}

// Map W3C standard gamepad button index to evdev key codes
export const STANDARD_BUTTON_TO_EVDEV: Record<number, number> = {
  0: 304, // A (BTN_SOUTH)
  1: 305, // B (BTN_EAST)
  2: 307, // X (BTN_NORTH)
  3: 308, // Y (BTN_WEST)
  4: 310, // L1 (BTN_TL)
  5: 311, // R1 (BTN_TR)
  6: 312, // L2 (digital button)
  7: 313, // R2 (digital button)
  8: 314, // Select / View / Share (BTN_SELECT)
  9: 315, // Start / Menu / Options (BTN_START)
  10: 317, // L3 (BTN_THUMBL)
  11: 318, // R3 (BTN_THUMBR)
  16: 316, // Mode / Guide / PS (BTN_MODE)
};

// Default mock devices if no physical controllers are plugged in
export const SAMPLE_DEVICES: DeviceInfo[] = [
  {
    id: 'sample-gamesir',
    name: 'GameSir X5 Lite (USB HID Gamepad)',
    path: '/dev/input/event2',
    isVirtual: true,
    connected: true,
  },
  {
    id: 'sample-generic',
    name: 'Generic 2.4G Wireless Gamepad',
    path: '/dev/input/event4',
    isVirtual: true,
    connected: true,
  },
  {
    id: 'sample-razer',
    name: 'Razer Kishi Controller',
    path: '/dev/input/event5',
    isVirtual: true,
    connected: true,
  },
];

export function getConnectedGamepadsList(): DeviceInfo[] {
  const result: DeviceInfo[] = [];

  // Query browser Gamepad API
  if (typeof navigator !== 'undefined' && 'getGamepads' in navigator) {
    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
          // Hide existing Xbox or DS4 if name matches to replicate Android behavior
          if (gp.id !== NAME_XBOX && gp.id !== NAME_DS4) {
            result.push({
              id: `gp-${gp.index}`,
              name: gp.id || `Gamepad ${gp.index}`,
              path: `/dev/input/event${gp.index + 2}`,
              isVirtual: false,
              connected: true,
              gamepadIndex: gp.index,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Always include simulated/sample devices for easy testing
  for (const s of SAMPLE_DEVICES) {
    if (!result.some((r) => r.path === s.path)) {
      result.push(s);
    }
  }

  return result;
}

export function readGamepadInput(
  selectedDevice: DeviceInfo | null,
  simulatedState?: {
    lx: number;
    ly: number;
    rx: number;
    ry: number;
    lt: number;
    rt: number;
    buttonsPressed: Set<number>;
  }
): GamepadReading {
  // If physical gamepad connected via Gamepad API:
  if (
    selectedDevice &&
    selectedDevice.gamepadIndex !== undefined &&
    typeof navigator !== 'undefined' &&
    'getGamepads' in navigator
  ) {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[selectedDevice.gamepadIndex];
    if (gp && gp.connected) {
      const buttons: Record<number, number> = {};
      const rawButtons: number[] = [];

      gp.buttons.forEach((b, idx) => {
        rawButtons.push(b.value);
        const evCode = STANDARD_BUTTON_TO_EVDEV[idx];
        if (evCode) {
          buttons[evCode] = b.pressed ? 1 : 0;
        }
      });

      // D-Pad buttons 12, 13, 14, 15
      let hatX = 0;
      let hatY = 0;
      if (gp.buttons[14]?.pressed) hatX = -1; // Left
      if (gp.buttons[15]?.pressed) hatX = 1;  // Right
      if (gp.buttons[12]?.pressed) hatY = -1; // Up
      if (gp.buttons[13]?.pressed) hatY = 1;  // Down

      // Trigger values from button 6 & 7 if available
      const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
      const rt = gp.buttons[7] ? gp.buttons[7].value : 0;

      // Sticks
      const lx = gp.axes[0] !== undefined ? gp.axes[0] : 0;
      const ly = gp.axes[1] !== undefined ? gp.axes[1] : 0;
      const rx = gp.axes[2] !== undefined ? gp.axes[2] : 0;
      const ry = gp.axes[3] !== undefined ? gp.axes[3] : 0;

      return {
        connected: true,
        name: gp.id,
        buttons,
        rawButtons,
        axes: {
          lx: Math.abs(lx) < 0.05 ? 0 : lx,
          ly: Math.abs(ly) < 0.05 ? 0 : ly,
          rx: Math.abs(rx) < 0.05 ? 0 : rx,
          ry: Math.abs(ry) < 0.05 ? 0 : ry,
          lt,
          rt,
          hatX,
          hatY,
        },
        timestamp: gp.timestamp || Date.now(),
      };
    }
  }

  // Simulated device state
  if (simulatedState) {
    const buttons: Record<number, number> = {};
    const rawButtons: number[] = new Array(17).fill(0);

    Object.entries(STANDARD_BUTTON_TO_EVDEV).forEach(([btnIdxStr, evCode]) => {
      const btnIdx = Number(btnIdxStr);
      const isPressed = simulatedState.buttonsPressed.has(evCode);
      buttons[evCode] = isPressed ? 1 : 0;
      rawButtons[btnIdx] = isPressed ? 1 : 0;
    });

    let hatX = 0;
    let hatY = 0;
    if (simulatedState.buttonsPressed.has(1001)) hatX = -1; // Left
    if (simulatedState.buttonsPressed.has(1002)) hatX = 1;  // Right
    if (simulatedState.buttonsPressed.has(1003)) hatY = -1; // Up
    if (simulatedState.buttonsPressed.has(1004)) hatY = 1;  // Down

    return {
      connected: true,
      name: selectedDevice?.name || 'Simulated Controller',
      buttons,
      rawButtons,
      axes: {
        lx: simulatedState.lx,
        ly: simulatedState.ly,
        rx: simulatedState.rx,
        ry: simulatedState.ry,
        lt: simulatedState.lt,
        rt: simulatedState.rt,
        hatX,
        hatY,
      },
      timestamp: Date.now(),
    };
  }

  return {
    connected: false,
    name: 'No Controller',
    buttons: {},
    rawButtons: [],
    axes: { lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, hatX: 0, hatY: 0 },
    timestamp: Date.now(),
  };
}
