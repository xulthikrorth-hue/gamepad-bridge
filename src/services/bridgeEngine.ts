import { TargetMode, UInputLogEntry } from '../types/gamepad';

export const NAME_XBOX = 'Xbox Wireless Controller';
export const NAME_DS4 = 'Wireless Controller';

// Vendor_045e_Product_02fd.kl (Xbox One S, Bluetooth). View/Back button must be KEY_BACK (158)
export const XBOX_MAP: Record<number, number> = {
  304: 304, // A (BTN_SOUTH)
  305: 305, // B (BTN_EAST)
  307: 307, // X (BTN_NORTH)
  308: 308, // Y (BTN_WEST)
  310: 310, // L1 (BTN_TL)
  311: 311, // R1 (BTN_TR)
  314: 158, // Select / View -> KEY_BACK (158)
  315: 315, // Start / Menu (BTN_START)
  316: 316, // Xbox Guide / Home (BTN_MODE)
  317: 317, // Left Thumbstick Click (BTN_THUMBL)
  318: 318, // Right Thumbstick Click (BTN_THUMBR)
};

// Vendor_054c_Product_09cc.kl (DualShock 4)
export const DS4_MAP: Record<number, number> = {
  304: 305, // A -> Cross (305)
  305: 306, // B -> Circle (306)
  307: 304, // X -> Square (304)
  308: 307, // Y -> Triangle (307)
  310: 308, // L1 -> L1 (308)
  311: 309, // R1 -> R1 (309)
  312: 310, // L2 (digital button) -> 310
  313: 311, // R2 (digital button) -> 311
  314: 312, // Select/View -> Share (312)
  315: 313, // Start/Menu -> Options (313)
  316: 316, // Home -> PS Button (316)
  317: 314, // L3 -> L3 (314)
  318: 315, // R3 -> R3 (315)
};

export const ABS_CODES: Record<string, number> = {
  ABS_X: 0,
  ABS_Y: 1,
  ABS_Z: 2,
  ABS_RX: 3,
  ABS_RY: 4,
  ABS_RZ: 5,
  ABS_GAS: 9,
  ABS_BRAKE: 10,
  ABS_HAT0X: 16,
  ABS_HAT0Y: 17,
};

function formatAbsInfo(code: number, min: number, max: number, fuzz: number, flat: number): string {
  return `{"code":${code},"info":{"value":0,"minimum":${min},"maximum":${max},"fuzz":${fuzz},"flat":${flat}}}`;
}

export function generateRegisterJson(mode: TargetMode): string {
  const isDs4 = mode === 'ds4';
  if (isDs4) {
    const abs = [
      formatAbsInfo(0, 0, 255, 0, 15),
      formatAbsInfo(1, 0, 255, 0, 15),
      formatAbsInfo(2, 0, 255, 0, 15),
      formatAbsInfo(5, 0, 255, 0, 15),
      formatAbsInfo(3, 0, 255, 0, 0),
      formatAbsInfo(4, 0, 255, 0, 0),
      formatAbsInfo(16, -1, 1, 0, 0),
      formatAbsInfo(17, -1, 1, 0, 0),
    ].join(',');
    const keys = Object.values(DS4_MAP).sort((a, b) => a - b).join(',');
    return `{"id":1,"command":"register","name":"${NAME_DS4}","vid":1356,"pid":2508,"bus":"bluetooth","configuration":[{"type":100,"data":[1,3]},{"type":101,"data":[${keys}]},{"type":103,"data":[0,1,2,3,4,5,16,17]}],"abs_info":[${abs}]}`;
  } else {
    const abs = [
      formatAbsInfo(0, -32768, 32767, 16, 128),
      formatAbsInfo(1, -32768, 32767, 16, 128),
      formatAbsInfo(2, -32768, 32767, 16, 128),
      formatAbsInfo(5, -32768, 32767, 16, 128),
      formatAbsInfo(9, 0, 1023, 0, 0),
      formatAbsInfo(10, 0, 1023, 0, 0),
      formatAbsInfo(16, -1, 1, 0, 0),
      formatAbsInfo(17, -1, 1, 0, 0),
    ].join(',');
    const keys = Object.values(XBOX_MAP).sort((a, b) => a - b).join(',');
    return `{"id":1,"command":"register","name":"${NAME_XBOX}","vid":1118,"pid":765,"bus":"bluetooth","configuration":[{"type":100,"data":[1,3]},{"type":101,"data":[${keys}]},{"type":103,"data":[0,1,2,5,9,10,16,17]}],"abs_info":[${abs}]}`;
  }
}

export function generateCenterJson(mode: TargetMode): string {
  if (mode === 'ds4') {
    return `{"id":1,"command":"inject","events":[3,0,128,3,1,128,3,2,128,3,5,128,3,3,0,3,4,0,3,16,0,3,17,0,0,0,0]}`;
  }
  return `{"id":1,"command":"inject","events":[3,0,0,3,1,0,3,2,0,3,5,0,3,9,0,3,10,0,3,16,0,3,17,0,0,0,0]}`;
}

export function scaleAxis(kind: 0 | 1 | 2, mode: TargetMode, normValue: number): number {
  // kind: 0 = stick (-1..1), 1 = trigger (0..1), 2 = hat (-1..1)
  const isDs4 = mode === 'ds4';
  if (kind === 2) {
    if (normValue > 0.5) return 1;
    if (normValue < -0.5) return -1;
    return 0;
  }
  if (kind === 0) {
    // Stick: normValue is between -1.0 and 1.0
    if (isDs4) {
      // DS4 sticks are 0..255 with 128 as center
      return Math.round(128 + normValue * 127);
    } else {
      // Xbox sticks are -32768..32767
      return Math.round(normValue * (normValue < 0 ? 32768 : 32767));
    }
  } else {
    // Trigger: normValue is between 0.0 and 1.0
    if (isDs4) {
      return Math.round(Math.max(0, Math.min(255, normValue * 255)));
    } else {
      return Math.round(Math.max(0, Math.min(1023, normValue * 1023)));
    }
  }
}

export function createUInputLogEntry(
  type: UInputLogEntry['type'],
  content: string,
  direction: 'in' | 'out' = 'out'
): UInputLogEntry {
  const d = new Date();
  const ts = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  return {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: ts,
    direction,
    type,
    content,
  };
}
