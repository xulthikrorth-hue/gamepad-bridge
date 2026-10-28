export type TargetMode = 'xbox' | 'ds4';

export interface DeviceInfo {
  id: string;
  name: string;
  path: string; // e.g. /dev/input/event3
  isVirtual?: boolean;
  connected: boolean;
  gamepadIndex?: number;
}

export interface BridgeStats {
  running: boolean;
  framesForwarded: number;
  note: string;
  lastMessage: string;
  activeDescription: string;
  fps: number;
  registeredName: string;
  targetVid: number;
  targetPid: number;
}

export interface GamepadStateSnapshot {
  buttons: { [code: number]: number }; // code -> 0 or 1
  axes: { [axisCode: number]: number }; // normalized or raw
  timestamp: number;
}

export interface UInputLogEntry {
  id: string;
  timestamp: string;
  direction: 'in' | 'out';
  type: 'register' | 'delay' | 'inject' | 'system' | 'error';
  content: string;
}
