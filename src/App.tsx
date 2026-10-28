import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TargetMode, DeviceInfo, UInputLogEntry } from './types/gamepad';
import {
  getConnectedGamepadsList,
  readGamepadInput,
  GamepadReading,
} from './services/gamepadService';
import {
  generateRegisterJson,
  generateCenterJson,
  createUInputLogEntry,
  scaleAxis,
  XBOX_MAP,
  DS4_MAP,
} from './services/bridgeEngine';
import { ChooseControllerModal } from './components/ChooseControllerModal';
import { ControllerVisualizer } from './components/ControllerVisualizer';
import { UInputTerminal } from './components/UInputTerminal';
import { AdbHelperModal } from './components/AdbHelperModal';
import {
  Play,
  Square,
  HelpCircle,
  ShieldCheck,
  Gamepad2,
  Terminal,
  Activity,
  CheckCircle2,
  Info,
  Download,
  Shield,
  Lock,
} from 'lucide-react';


export const App: React.FC = () => {
  // Shizuku state machine (replicating Android Shizuku binder & permission)
  const [shizukuRunning, setShizukuRunning] = useState<boolean>(true);
  const [shizukuGranted, setShizukuGranted] = useState<boolean>(true);
  const [serviceConnecting, setServiceConnecting] = useState<boolean>(false);

  // Selected target mode: 0 = Xbox One, 1 = Dualshock 4
  const [mode, setMode] = useState<TargetMode>('xbox');

  // Input options to prevent double-input in games
  const [hideOriginal, setHideOriginal] = useState<boolean>(true);
  const [forwardEvents, setForwardEvents] = useState<boolean>(true);

  // Controller list & selection

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [isChooseModalOpen, setIsChooseModalOpen] = useState<boolean>(false);
  const [isAdbModalOpen, setIsAdbModalOpen] = useState<boolean>(false);

  // Bridge running state & telemetry
  const [bridgeRunning, setBridgeRunning] = useState<boolean>(false);
  const [framesForwarded, setFramesForwarded] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [lastMsg, setLastMsg] = useState<string>('');
  const [activeDesc, setActiveDesc] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live input reading
  const [currentReading, setCurrentReading] = useState<GamepadReading>({
    connected: false,
    name: 'None',
    buttons: {},
    rawButtons: [],
    axes: { lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, hatX: 0, hatY: 0 },
    timestamp: Date.now(),
  });

  // Interactive simulated gamepad state (when user clicks buttons or tests)
  const [simButtonsPressed, setSimButtonsPressed] = useState<Set<number>>(new Set());
  const [simAxes, setSimAxes] = useState({
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
    lt: 0,
    rt: 0,
  });

  // UInput logs
  const [uinputLogs, setUinputLogs] = useState<UInputLogEntry[]>([]);

  // Previous input snapshot for delta event injection
  const prevInputRef = useRef<{
    buttons: Record<number, number>;
    axes: Record<number, number>;
  }>({ buttons: {}, axes: {} });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Refresh available devices
  const refreshDevices = useCallback(() => {
    const list = getConnectedGamepadsList();
    setDevices(list);
    if (!selectedDevice && list.length > 0) {
      setSelectedDevice(list[0]);
    }
  }, [selectedDevice]);

  useEffect(() => {
    refreshDevices();
    const handleConnected = () => {
      refreshDevices();
      showToast('New gamepad connected');
    };
    const handleDisconnected = () => {
      refreshDevices();
      showToast('Gamepad disconnected');
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);
    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [refreshDevices, showToast]);

  // Request Shizuku permission
  const handleGrantPermission = () => {
    if (!shizukuRunning) {
      showToast('Start Shizuku first (Wireless debugging)');
      return;
    }
    setServiceConnecting(true);
    setTimeout(() => {
      setShizukuGranted(true);
      setServiceConnecting(false);
      showToast('Shizuku permission granted');
    }, 400);
  };

  // Start the bridging
  const handleStartPad = () => {
    if (!shizukuRunning || !shizukuGranted) {
      showToast('Not connected to Shizuku yet');
      return;
    }
    if (!selectedDevice) {
      showToast('Choose a controller first');
      setIsChooseModalOpen(true);
      return;
    }

    setLastMsg('');
    setNote('');
    setFramesForwarded(0);

    const isDs4 = mode === 'ds4';
    const regPayload = generateRegisterJson(mode);
    const centerPayload = generateCenterJson(mode);

    // Add uinput registration entries
    setUinputLogs((prev) => [
      createUInputLogEntry('register', regPayload),
      createUInputLogEntry('delay', '{"id":1,"command":"delay","duration":500}'),
      createUInputLogEntry('inject', centerPayload),
      ...prev.slice(0, 50),
    ]);

    setBridgeRunning(true);
    setActiveDesc(
      `${selectedDevice.name}  →  ${isDs4 ? 'Dualshock 4' : 'Xbox One'}` +
        (hideOriginal ? ' [Hidden via EVIOCGRAB]' : '') +
        (!forwardEvents ? ' [Anchor Mode]' : '')
    );
    if (hideOriginal) {
      setUinputLogs((prev) => [
        createUInputLogEntry(
          'system',
          `EVIOCGRAB (0x40044590) lock acquired on ${selectedDevice.path}. Original controller is hidden from Android games.`
        ),
        ...prev,
      ]);
    }
    showToast(
      hideOriginal
        ? 'Bridge started (original controller hidden)'
        : 'Bridge started'
    );
  };

  // Stop the bridging
  const handleStopPad = () => {
    setBridgeRunning(false);
    setLastMsg('');
    setActiveDesc('');
    setUinputLogs((prev) => [
      createUInputLogEntry(
        'system',
        'Virtual uinput device destroyed & released. EVIOCGRAB lock released.'
      ),
      ...prev.slice(0, 50),
    ]);
    showToast('Bridge stopped');
  };


  // Interactive buttons / axis simulation
  const handleSimulateButton = (btnCode: number, pressed: boolean) => {
    setSimButtonsPressed((prev) => {
      const next = new Set(prev);
      if (pressed) next.add(btnCode);
      else next.delete(btnCode);
      return next;
    });
  };

  const handleSimulateAxis = (
    axis: 'lx' | 'ly' | 'rx' | 'ry' | 'lt' | 'rt',
    value: number
  ) => {
    setSimAxes((prev) => ({ ...prev, [axis]: value }));
  };

  // Main input loop: continuously polls gamepad & injects events if running
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const reading = readGamepadInput(selectedDevice, {
        ...simAxes,
        buttonsPressed: simButtonsPressed,
      });
      setCurrentReading(reading);

      if (bridgeRunning && forwardEvents) {
        const isDs4 = mode === 'ds4';

        const keyMap = isDs4 ? DS4_MAP : XBOX_MAP;
        const events: number[] = [];

        // Check button changes
        Object.entries(reading.buttons).forEach(([codeStr, val]) => {
          const code = Number(codeStr);
          const prevVal = prevInputRef.current.buttons[code] ?? -1;
          if (val !== prevVal) {
            const mappedCode = keyMap[code];
            if (mappedCode !== undefined) {
              // type 1 (EV_KEY), code, value
              events.push(1, mappedCode, val);
            }
            prevInputRef.current.buttons[code] = val;
          }
        });

        // Check stick/trigger changes
        const axesToCheck: Array<{
          kind: 0 | 1 | 2;
          axisIdx: number;
          currNorm: number;
        }> = [
          { kind: 0, axisIdx: 0, currNorm: reading.axes.lx }, // LX
          { kind: 0, axisIdx: 1, currNorm: reading.axes.ly }, // LY
          { kind: 0, axisIdx: 2, currNorm: reading.axes.rx }, // RX (ABS_Z)
          { kind: 0, axisIdx: 3, currNorm: reading.axes.ry }, // RY (ABS_RZ)
          { kind: 1, axisIdx: 4, currNorm: reading.axes.lt }, // LT
          { kind: 1, axisIdx: 5, currNorm: reading.axes.rt }, // RT
          { kind: 2, axisIdx: 6, currNorm: reading.axes.hatX }, // HatX
          { kind: 2, axisIdx: 7, currNorm: reading.axes.hatY }, // HatY
        ];

        // Logical to virtual target mapping
        const logicalToVirtual = isDs4
          ? [0, 1, 2, 5, 3, 4, 16, 17]
          : [0, 1, 2, 5, 10, 9, 16, 17];

        axesToCheck.forEach((item) => {
          const scaled = scaleAxis(item.kind, mode, item.currNorm);
          const prevVal = prevInputRef.current.axes[item.axisIdx];
          if (prevVal === undefined || Math.abs(scaled - prevVal) > (item.kind === 0 ? 128 : 2)) {
            const virtCode = logicalToVirtual[item.axisIdx];
            events.push(3, virtCode, scaled);
            prevInputRef.current.axes[item.axisIdx] = scaled;
          }
        });

        if (events.length > 0) {
          setFramesForwarded((f) => f + 1);
          if (Math.random() < 0.15) {
            // Sample some inject packets into the log monitor to avoid DOM bloat
            const payload = `{"id":1,"command":"inject","events":[${events.join(',')},0,0,0]}`;
            setUinputLogs((prev) => [
              createUInputLogEntry('inject', payload),
              ...prev.slice(0, 40),
            ]);
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [bridgeRunning, mode, selectedDevice, simAxes, simButtonsPressed]);

  // Determine banner color and text matching Android's MainActivity.render()
  const ok = shizukuRunning && shizukuGranted;

  let bannerBgClass = 'bg-[#455A64]';
  let bannerMessage = '';

  if (!shizukuRunning) {
    bannerBgClass = 'bg-[#E65100]';
    bannerMessage = 'Shizuku is not running.\nOpen Shizuku and start it (Wireless debugging).';
  } else if (!ok) {
    bannerBgClass = 'bg-[#E65100]';
    bannerMessage = 'Tap "Grant Shizuku permission" below.';
  } else if (serviceConnecting) {
    bannerBgClass = 'bg-[#455A64]';
    bannerMessage = 'Connecting to Shizuku…';
  } else if (bridgeRunning) {
    bannerBgClass = 'bg-[#2E7D32]';
    bannerMessage =
      `● BRIDGE IS RUNNING\n` +
      (activeDesc ? `${activeDesc}\n` : '') +
      `Inputs passed through: ${framesForwarded}` +
      (note ? `\n⚠ ${note}` : '') +
      (lastMsg ? `\n${lastMsg}` : '');
  } else if (lastMsg.startsWith('error')) {
    bannerBgClass = 'bg-[#C62828]';
    bannerMessage = lastMsg;
  } else {
    bannerBgClass = 'bg-[#455A64]';
    bannerMessage = 'Bridge is stopped.' + (note ? `\n${note}` : '');
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center p-3 sm:p-6">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 z-50 bg-stone-800 text-white text-xs sm:text-sm px-4 py-2.5 rounded-full shadow-2xl border border-stone-600 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Container - replicates the Android Activity Layout */}
      <div className="w-full max-w-2xl bg-stone-900/90 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="bg-stone-950 px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2E7D32] flex items-center justify-center text-white shadow-md">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                Gamepad Bridge
              </h1>
              <p className="text-[11px] text-stone-400 font-mono">
                Virtual Xbox One & DualShock 4 uinput spoofer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/Gamepad-Bridge.apk"
              download="Gamepad-Bridge.apk"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition"
              title="Download compiled Gamepad Bridge Android APK"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span> APK
            </a>
            <button
              type="button"
              onClick={() => setIsAdbModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
              title="Wireless debugging & ADB helper"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Guide / ADB</span>
            </button>
          </div>

        </div>

        {/* The Famous Color-Coded Android Status Banner */}
        <div
          className={`p-4 transition-colors duration-200 text-white font-bold text-sm sm:text-base whitespace-pre-line shadow-inner ${bannerBgClass}`}
        >
          {bannerMessage}
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Shizuku Grant Permission Button (shown when not granted) */}
          {!ok && (
            <button
              type="button"
              onClick={handleGrantPermission}
              className="w-full py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium text-sm sm:text-base border border-stone-700 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Grant Shizuku permission
            </button>
          )}

          {/* Quick status bar for Shizuku / Wireless debugging toggle */}
          <div className="flex items-center justify-between text-xs text-stone-400 bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/80">
            <div className="flex items-center gap-2">
              <span className="font-mono text-stone-300">Shizuku Service:</span>
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  ok ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {ok ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected (UID 2000 shell)
                  </>
                ) : (
                  'Inactive / Needs Permission'
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShizukuRunning((v) => !v);
                setShizukuGranted(true);
              }}
              className="text-[11px] underline text-stone-400 hover:text-stone-200"
            >
              Toggle Shizuku state
            </button>
          </div>

          {/* Pretend to be: (Radio Group) */}
          <div className="space-y-2 pt-1">
            <label className="block text-sm font-bold text-stone-200">
              Pretend to be:
            </label>
            <div className="space-y-2 bg-stone-950/50 p-3 rounded-xl border border-stone-800">
              <label
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  mode === 'xbox'
                    ? 'bg-emerald-950/30 border-emerald-600/70 text-emerald-200'
                    : 'border-transparent text-stone-300 hover:bg-stone-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'xbox'}
                  onChange={() => setMode('xbox')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 bg-stone-800 border-stone-600"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Xbox One Controller</div>
                  <div className="text-xs text-stone-400 font-mono">
                    Xbox One S Bluetooth • VID 0x045E PID 0x02FD • Back button mapped to KEY_BACK 158
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  mode === 'ds4'
                    ? 'bg-emerald-950/30 border-emerald-600/70 text-emerald-200'
                    : 'border-transparent text-stone-300 hover:bg-stone-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'ds4'}
                  onChange={() => setMode('ds4')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 bg-stone-800 border-stone-600"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Dualshock 4 Controller</div>
                  <div className="text-xs text-stone-400 font-mono">
                    Sony DS4 v2 • VID 0x054C PID 0x09CC • Sticks & triggers scaled 0..255
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Choose Controller Section */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsChooseModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 font-medium text-sm border border-stone-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4 text-stone-400" />
              Choose controller
            </button>
            <div className="text-xs sm:text-sm text-stone-300 px-1 pt-1 flex items-center justify-between">
              <div>
                <span className="text-stone-400">Controller: </span>
                <span className="font-semibold text-emerald-400">
                  {selectedDevice ? selectedDevice.name : 'none chosen yet'}
                </span>
              </div>
              {selectedDevice && (
                <span className="text-[11px] font-mono text-stone-500">
                  {selectedDevice.path}
                </span>
              )}
            </div>
          </div>

          {/* Input Options (Double Input Prevention) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-stone-200">
                Input Options (Prevent Double Input):
              </label>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                EVIOCGRAB Supported
              </span>
            </div>
            <div className="space-y-2.5 bg-stone-950/50 p-3 rounded-xl border border-stone-800 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer text-stone-200">
                <input
                  type="checkbox"
                  checked={hideOriginal}
                  onChange={(e) => setHideOriginal(e.target.checked)}
                  className="mt-0.5 rounded border-stone-700 bg-stone-900 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Hide original controller (exclusive EVIOCGRAB lock)
                  </div>
                  <div className="text-[11px] text-stone-400 leading-normal mt-0.5">
                    Grabs the real controller node so Android's EventHub and games only see the virtual pad. Completely prevents duplicate button presses and double joystick inputs.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-stone-200 pt-2 border-t border-stone-800/80">
                <input
                  type="checkbox"
                  checked={forwardEvents}
                  onChange={(e) => setForwardEvents(e.target.checked)}
                  className="mt-0.5 rounded border-stone-700 bg-stone-900 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Forward controller inputs to virtual gamepad
                  </div>
                  <div className="text-[11px] text-stone-400 leading-normal mt-0.5">
                    When unchecked (&quot;Anchor Mode&quot;), the app maintains the virtual Xbox/DS4 device in the background so games like COD Mobile enable gamepad mode, while letting your real controller respond directly without forwarding.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Start and Stop Buttons with Exact Colors from Android */}
          <div className="space-y-2.5 pt-2">

            <button
              type="button"
              disabled={bridgeRunning}
              onClick={handleStartPad}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                bridgeRunning
                  ? 'opacity-50 cursor-not-allowed bg-stone-700'
                  : 'bg-[#2E7D32] hover:bg-[#256628] active:scale-[0.99]'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              Start the bridging
            </button>

            <button
              type="button"
              disabled={!bridgeRunning}
              onClick={handleStopPad}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm sm:text-base text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                !bridgeRunning
                  ? 'opacity-40 cursor-not-allowed bg-stone-700'
                  : 'bg-[#C62828] hover:bg-[#A91E1E] active:scale-[0.99]'
              }`}
            >
              <Square className="w-4 h-4 fill-white" />
              Stop
            </button>
          </div>

          {/* Controller Input & Output Inspector */}
          <ControllerVisualizer
            reading={currentReading}
            mode={mode}
            onSimulateButton={handleSimulateButton}
            onSimulateAxis={handleSimulateAxis}
            isSimulatedDevice={selectedDevice?.isVirtual}
          />

          {/* Live Uinput Terminal Stream Monitor */}
          <UInputTerminal
            logs={uinputLogs}
            onClear={() => setUinputLogs([])}
          />

          {/* How to use text exactly from Android app */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-4 text-xs text-stone-300 space-y-2 leading-relaxed">
            <div className="font-bold text-stone-200 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400" />
              How to use:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-stone-300">
              <li>Start Shizuku (Wireless debugging), then tap Grant.</li>
              <li>Connect your controller and tap Choose controller.</li>
              <li>Pick Xbox One or Dualshock 4.</li>
              <li>Tap Start the bridging, then open your game.</li>
            </ol>
            <p className="text-stone-400 pt-1 text-[11px] border-t border-stone-800/80">
              The bridge should keep running after you close this app. Open it again to check or stop it.
            </p>
          </div>

          {/* Disclaimer section from README.md */}
          <div className="text-[11px] text-stone-400 bg-stone-950/40 p-3 rounded-lg border border-stone-800/60 space-y-1">
            <div className="font-semibold text-stone-300">Disclaimer:</div>
            <p>
              Use this software entirely at your own risk. This project is not affiliated with, endorsed by or sponsored by Microsoft, Sony, GameSir, or the Shizuku project.
              Xbox, PlayStation, DualShock, and other names are trademarks of their respective owners.
            </p>
          </div>
        </div>
      </div>

      {/* Choose Controller Modal */}
      <ChooseControllerModal
        isOpen={isChooseModalOpen}
        onClose={() => setIsChooseModalOpen(false)}
        devices={devices}
        selectedDevice={selectedDevice}
        onSelect={(dev) => {
          setSelectedDevice(dev);
          showToast(`Selected: ${dev.name}`);
        }}
        onRefresh={() => {
          refreshDevices();
          showToast('Refreshed controller list');
        }}
      />

      {/* ADB / Wireless Debugging Helper Modal */}
      <AdbHelperModal
        isOpen={isAdbModalOpen}
        onClose={() => setIsAdbModalOpen(false)}
        mode={mode}
        selectedDevice={selectedDevice}
      />
    </div>
  );
};

export default App;
