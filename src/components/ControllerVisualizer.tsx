import React from 'react';
import { TargetMode } from '../types/gamepad';
import { GamepadReading } from '../services/gamepadService';
import { scaleAxis, XBOX_MAP, DS4_MAP } from '../services/bridgeEngine';

interface ControllerVisualizerProps {
  reading: GamepadReading;
  mode: TargetMode;
  onSimulateButton?: (btnCode: number, pressed: boolean) => void;
  onSimulateAxis?: (axis: 'lx' | 'ly' | 'rx' | 'ry' | 'lt' | 'rt', value: number) => void;
  isSimulatedDevice?: boolean;
}

export const ControllerVisualizer: React.FC<ControllerVisualizerProps> = ({
  reading,
  mode,
  onSimulateButton,
  onSimulateAxis,
  isSimulatedDevice,
}) => {
  const isDs4 = mode === 'ds4';
  const keyMap = isDs4 ? DS4_MAP : XBOX_MAP;

  // Source reading values
  const { lx, ly, rx, ry, lt, rt, hatX, hatY } = reading.axes;

  // Virtual output values scaled according to UserService.kt
  const virtLx = scaleAxis(0, mode, lx);
  const virtLy = scaleAxis(0, mode, ly);
  const virtRx = scaleAxis(0, mode, rx);
  const virtRy = scaleAxis(0, mode, ry);
  const virtLt = scaleAxis(1, mode, lt);
  const virtRt = scaleAxis(1, mode, rt);

  const isBtnDown = (evCode: number) => Boolean(reading.buttons[evCode]);

  return (
    <div className="bg-stone-800/80 border border-stone-700 rounded-xl p-4 shadow-lg space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-stone-700/60 pb-3 gap-2">
        <div>
          <h3 className="font-semibold text-stone-100 flex items-center gap-2 text-sm md:text-base">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Controller Input & Virtual Output Inspector
          </h3>
          <p className="text-xs text-stone-400">
            Real-time evdev mapping and axis scaling comparison
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded bg-stone-900 border border-stone-700 text-stone-300 font-mono">
            {isDs4 ? 'Sony DS4 v2 (0x054C:0x09CC)' : 'Xbox One S (0x045E:0x02FD)'}
          </span>
          {isSimulatedDevice && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600/40 text-amber-300">
              Interactive Test Mode
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Controller Panel */}
        <div className="bg-stone-900/70 border border-stone-700/70 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-stone-300 uppercase tracking-wide">
              Source Physical Controller
            </div>
            <div className="text-[11px] text-stone-400 font-mono truncate max-w-[160px]">
              {reading.name}
            </div>
          </div>

          {/* Buttons Matrix */}
          <div className="space-y-2 mb-3">
            <div className="text-[11px] text-stone-400 font-medium">Face Buttons & Bumpers:</div>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(304, true)}
                onMouseUp={() => onSimulateButton?.(304, false)}
                className={`py-1.5 px-2 rounded font-mono font-bold transition-all text-center border ${
                  isBtnDown(304)
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/40'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                }`}
              >
                A (304)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(305, true)}
                onMouseUp={() => onSimulateButton?.(305, false)}
                className={`py-1.5 px-2 rounded font-mono font-bold transition-all text-center border ${
                  isBtnDown(305)
                    ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-500/40'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                }`}
              >
                B (305)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(307, true)}
                onMouseUp={() => onSimulateButton?.(307, false)}
                className={`py-1.5 px-2 rounded font-mono font-bold transition-all text-center border ${
                  isBtnDown(307)
                    ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/40'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                }`}
              >
                X (307)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(308, true)}
                onMouseUp={() => onSimulateButton?.(308, false)}
                className={`py-1.5 px-2 rounded font-mono font-bold transition-all text-center border ${
                  isBtnDown(308)
                    ? 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-500/40'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                }`}
              >
                Y (308)
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(310, true)}
                onMouseUp={() => onSimulateButton?.(310, false)}
                className={`py-1 px-1.5 rounded font-mono text-[11px] border ${
                  isBtnDown(310)
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                LB (310)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(311, true)}
                onMouseUp={() => onSimulateButton?.(311, false)}
                className={`py-1 px-1.5 rounded font-mono text-[11px] border ${
                  isBtnDown(311)
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                RB (311)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(314, true)}
                onMouseUp={() => onSimulateButton?.(314, false)}
                className={`py-1 px-1.5 rounded font-mono text-[11px] border ${
                  isBtnDown(314)
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                Back/View (314)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(315, true)}
                onMouseUp={() => onSimulateButton?.(315, false)}
                className={`py-1 px-1.5 rounded font-mono text-[11px] border ${
                  isBtnDown(315)
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                Start (315)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(317, true)}
                onMouseUp={() => onSimulateButton?.(317, false)}
                className={`py-1 px-1.5 rounded font-mono text-[11px] border ${
                  isBtnDown(317)
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                L3 Stick (317)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(316, true)}
                onMouseUp={() => onSimulateButton?.(316, false)}
                className={`py-1 px-1.5 rounded font-mono text-[11px] border ${
                  isBtnDown(316)
                    ? 'bg-yellow-600 text-white border-yellow-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                Home/Guide (316)
              </button>
              <button
                type="button"
                onMouseDown={() => onSimulateButton?.(318, true)}
                onMouseUp={() => onSimulateButton?.(318, false)}
                className={`py-1 px-1.5 rounded font-mono text-[11px] border ${
                  isBtnDown(318)
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                R3 Stick (318)
              </button>
            </div>
          </div>

          {/* D-Pad Hat Status */}
          <div className="flex items-center justify-between text-xs py-1 border-t border-stone-800 text-stone-300 font-mono">
            <span>D-Pad Hat:</span>
            <span>
              Hat0X: <strong className="text-emerald-400">{hatX}</strong> | Hat0Y:{' '}
              <strong className="text-emerald-400">{hatY}</strong>
            </span>
          </div>

          {/* Analog Sticks & Triggers visualization */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-800">
            {/* Left Stick */}
            <div className="text-center">
              <div className="text-[10px] text-stone-400 mb-1 font-mono">
                Left Stick (X:{lx.toFixed(2)}, Y:{ly.toFixed(2)})
              </div>
              <div className="w-16 h-16 mx-auto bg-stone-950 border border-stone-700 rounded-full relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-stone-800"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-px bg-stone-800"></div>
                </div>
                <div
                  className="w-4 h-4 rounded-full bg-emerald-500 shadow"
                  style={{
                    transform: `translate(${lx * 22}px, ${ly * 22}px)`,
                  }}
                />
              </div>
            </div>

            {/* Right Stick */}
            <div className="text-center">
              <div className="text-[10px] text-stone-400 mb-1 font-mono">
                Right Stick (X:{rx.toFixed(2)}, Y:{ry.toFixed(2)})
              </div>
              <div className="w-16 h-16 mx-auto bg-stone-950 border border-stone-700 rounded-full relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-stone-800"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-px bg-stone-800"></div>
                </div>
                <div
                  className="w-4 h-4 rounded-full bg-blue-500 shadow"
                  style={{
                    transform: `translate(${rx * 22}px, ${ry * 22}px)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Triggers */}
          <div className="mt-2 space-y-1.5 pt-2 border-t border-stone-800 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="w-6 text-[10px] text-stone-400">LT:</span>
              <div className="flex-1 bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                <div
                  className="bg-emerald-500 h-full transition-all duration-75"
                  style={{ width: `${Math.round(lt * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] text-stone-300">
                {(lt * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="w-6 text-[10px] text-stone-400">RT:</span>
              <div className="flex-1 bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                <div
                  className="bg-blue-500 h-full transition-all duration-75"
                  style={{ width: `${Math.round(rt * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] text-stone-300">
                {(rt * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Virtual Target Controller Panel (Xbox / DS4) */}
        <div className="bg-stone-900/70 border border-emerald-800/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
              Virtual Target Pad ({isDs4 ? 'DualShock 4' : 'Xbox One S'})
            </div>
            <div className="text-[11px] text-emerald-300/80 font-mono">
              /dev/uinput output
            </div>
          </div>

          {/* Mapped Keycodes */}
          <div className="space-y-2 mb-3">
            <div className="text-[11px] text-stone-400 font-medium">
              Mapped Evdev Keycodes to Virtual Gamepad:
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
              {isDs4 ? (
                <>
                  <div className={`p-1 rounded border ${isBtnDown(304) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    304 (A) → <strong>305 (Cross)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(305) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    305 (B) → <strong>306 (Circle)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(307) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    307 (X) → <strong>304 (Square)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(308) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    308 (Y) → <strong>307 (Triangle)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(314) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    314 (View) → <strong>312 (Share)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(315) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    315 (Menu) → <strong>313 (Options)</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className={`p-1 rounded border ${isBtnDown(304) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    304 (A) → <strong>304 (A)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(305) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    305 (B) → <strong>305 (B)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(307) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    307 (X) → <strong>307 (X)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(308) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    308 (Y) → <strong>308 (Y)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(314) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 ring-1 ring-emerald-400' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    314 (View) → <strong className="text-amber-300">158 (KEY_BACK)</strong>
                  </div>
                  <div className={`p-1 rounded border ${isBtnDown(315) ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200' : 'bg-stone-800/60 border-stone-700/60 text-stone-400'}`}>
                    315 (Menu) → <strong>315 (START)</strong>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Target Scaled Values */}
          <div className="space-y-1.5 pt-2 border-t border-stone-800 font-mono text-xs">
            <div className="text-[11px] text-stone-400 font-medium">
              Injected Axis Values (Scale & Center):
            </div>
            <div className="bg-stone-950 p-2 rounded border border-stone-800 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-400">ABS_X (LX):</span>
                <span className="text-emerald-400 font-bold">
                  {virtLx} {isDs4 ? '(0..255)' : '(-32768..32767)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">ABS_Y (LY):</span>
                <span className="text-emerald-400 font-bold">
                  {virtLy} {isDs4 ? '(0..255)' : '(-32768..32767)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{isDs4 ? 'ABS_Z (RX)' : 'ABS_Z (RX)'}:</span>
                <span className="text-emerald-400 font-bold">
                  {virtRx} {isDs4 ? '(0..255)' : '(-32768..32767)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{isDs4 ? 'ABS_RZ (RY)' : 'ABS_RZ (RY)'}:</span>
                <span className="text-emerald-400 font-bold">
                  {virtRy} {isDs4 ? '(0..255)' : '(-32768..32767)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{isDs4 ? 'ABS_RX (LT analog)' : 'ABS_BRAKE (LT)'}:</span>
                <span className="text-cyan-400 font-bold">
                  {virtLt} {isDs4 ? '(0..255)' : '(0..1023)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">{isDs4 ? 'ABS_RY (RT analog)' : 'ABS_GAS (RT)'}:</span>
                <span className="text-cyan-400 font-bold">
                  {virtRt} {isDs4 ? '(0..255)' : '(0..1023)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
