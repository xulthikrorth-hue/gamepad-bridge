import React, { useState } from 'react';
import { TargetMode, DeviceInfo } from '../types/gamepad';
import { generateRegisterJson, generateCenterJson } from '../services/bridgeEngine';
import { Terminal, Copy, Check, X, ShieldAlert, Cpu } from 'lucide-react';

interface AdbHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: TargetMode;
  selectedDevice: DeviceInfo | null;
}

export const AdbHelperModal: React.FC<AdbHelperModalProps> = ({
  isOpen,
  onClose,
  mode,
  selectedDevice,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'shizuku' | 'adb' | 'eviocgrab' | 'uinput_json'>('shizuku');

  if (!isOpen) return null;

  const regJson = generateRegisterJson(mode);
  const centerJson = generateCenterJson(mode);
  const devPath = selectedDevice?.path || '/dev/input/event2';

  const adbScript = `#!/bin/sh
# Gamepad Bridge Companion Script
# Target: ${mode === 'xbox' ? 'Xbox One S (Bluetooth)' : 'Sony DualShock 4 v2'}
# Source Controller: ${selectedDevice?.name || 'Any Gamepad'} (${devPath})

# 1. Hide original controller from games via permissions (or EVIOCGRAB in app)
chmod 000 ${devPath}

# 2. Start virtual uinput device
echo "Starting uinput daemon..."
/system/bin/uinput - << 'EOF'
${regJson}
{"id":1,"command":"delay","duration":500}
${centerJson}
EOF

# When stopped, restore permissions:
# chmod 660 ${devPath}
`;


  const shizukuGuide = `1. Turn on Developer Options on your phone:
   Settings -> About phone -> Tap "Build number" 7 times.

2. Turn on "Wireless Debugging" in Developer Options.

3. Open the Shizuku app:
   Tap "Pairing" -> enter the 6-digit Wi-Fi pairing code -> tap "Start".

4. Grant permission:
   Tap "Grant Shizuku permission" in Gamepad Bridge.

5. Select controller and tap "Start the bridging".
   Android's uinput subsystem will register the virtual ${mode === 'xbox' ? 'Xbox One S' : 'DualShock 4'} pad instantly.`;

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-stone-100 text-lg">
              Shizuku & ADB Wireless Debugging Guide
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-stone-800 bg-stone-950/40 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('shizuku')}
            className={`px-4 py-2.5 border-b-2 font-medium transition ${
              activeTab === 'shizuku'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/60'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Shizuku Setup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adb')}
            className={`px-4 py-2.5 border-b-2 font-medium transition ${
              activeTab === 'adb'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/60'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            ADB Shell Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('eviocgrab')}
            className={`px-4 py-2.5 border-b-2 font-medium transition ${
              activeTab === 'eviocgrab'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/60'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Hide Controller (EVIOCGRAB)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('uinput_json')}
            className={`px-4 py-2.5 border-b-2 font-medium transition ${
              activeTab === 'uinput_json'
                ? 'border-emerald-500 text-emerald-400 bg-stone-900/60'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Uinput JSON Payloads
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-sm text-stone-300">
          {activeTab === 'eviocgrab' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl space-y-2">
                <div className="font-semibold text-emerald-300 text-xs">
                  How Hiding the Physical Controller Works on Linux/Android:
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  When you play a controller-supported game, Android's <code className="bg-stone-900 px-1 py-0.5 rounded text-emerald-300">EventHub</code> reads events from every input node under <code className="bg-stone-900 px-1 py-0.5 rounded text-stone-200">/dev/input/event*</code>. If Gamepad Bridge forwards events to a virtual Xbox One / DualShock 4 pad, games may receive inputs from <em>both</em> controllers simultaneously (causing duplicate jumps, double weapon switches, or spinning cameras).
                </p>
              </div>

              <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
                <div className="text-xs font-semibold text-stone-200">
                  Method 1: Kernel Exclusive Grab (<code className="text-emerald-400">EVIOCGRAB</code> ioctl)
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Linux provides the <code className="text-stone-200">EVIOCGRAB</code> ioctl (hex code <code className="text-amber-400">0x40044590</code>). When the bridge process opens <code className="text-stone-200">{devPath}</code> and calls <code className="text-stone-200">ioctl(fd, 0x40044590, 1)</code>, the kernel exclusively passes all events only to the bridge. Android's EventHub is completely detached from the original pad, so games cannot see it!
                </p>
              </div>

              <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
                <div className="text-xs font-semibold text-stone-200">
                  Method 2: Virtual &quot;Anchor&quot; Mode (Zero Double-Input & Zero Latency)
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Games like <em>Call of Duty Mobile</em> or <em>Genshin Impact</em> only require an official Xbox One or DS4 device to be present in order to unlock gamepad mode. By unchecking &quot;Forward inputs&quot;, Gamepad Bridge creates the virtual pad as an anchor, and the game reads your physical controller directly. Since no inputs are forwarded, there is <strong>zero duplicate input</strong>!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'shizuku' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed">
                  <strong>No root required:</strong> Shizuku utilizes Android’s built-in ADB Wireless Debugging
                  to launch the privileged <code className="bg-amber-900/60 px-1 py-0.5 rounded">uinput</code> binary
                  with shell permissions (UID 2000).
                </div>
              </div>
              <pre className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-xs font-mono whitespace-pre-wrap leading-relaxed text-stone-200">
                {shizukuGuide}
              </pre>
            </div>
          )}

          {activeTab === 'adb' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400">
                If testing directly via ADB from a connected PC or terminal, you can pipe these commands into{' '}
                <code className="text-emerald-400">adb shell</code>:
              </p>
              <div className="relative">
                <pre className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-xs font-mono whitespace-pre-wrap text-emerald-300 overflow-x-auto">
                  {adbScript}
                </pre>
                <button
                  type="button"
                  onClick={() => copyText(adbScript)}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'uinput_json' && (
            <div className="space-y-3">
              <div className="text-xs text-stone-400">Registration payload for {mode === 'xbox' ? 'Xbox One' : 'DualShock 4'}:</div>
              <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[11px] font-mono whitespace-pre-wrap text-stone-300 break-all">
                {regJson}
              </pre>
              <div className="text-xs text-stone-400">Center sticks & triggers initialization payload:</div>
              <pre className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-[11px] font-mono whitespace-pre-wrap text-stone-300 break-all">
                {centerJson}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
