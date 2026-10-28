import React from 'react';
import { DeviceInfo } from '../types/gamepad';
import { RefreshCw, Gamepad2, X, AlertCircle } from 'lucide-react';

interface ChooseControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  onSelect: (device: DeviceInfo) => void;
  onRefresh: () => void;
}

export const ChooseControllerModal: React.FC<ChooseControllerModalProps> = ({
  isOpen,
  onClose,
  devices,
  selectedDevice,
  onSelect,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-stone-100 text-lg">
              {devices.length === 0 ? 'No controllers found' : 'Controllers found'}
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

        <div className="p-4 space-y-3">
          {devices.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-stone-300 text-sm">
                Connect your controller (Bluetooth, USB or 2.4 GHz) and try again.
              </p>
              <p className="text-stone-500 text-xs">
                Press any button on your physical gamepad so the browser activates it.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {devices.map((device) => {
                const isSelected = selectedDevice?.name === device.name;
                const nodeName = device.path.split('/').pop() || device.path;
                return (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() => {
                      onSelect(device);
                      onClose();
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 ring-1 ring-emerald-500'
                        : 'bg-stone-800/70 border-stone-700/80 text-stone-200 hover:bg-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm text-stone-100">{device.name}</div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">
                        {nodeName} ({device.path})
                      </div>
                    </div>
                    {device.isVirtual ? (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-700 text-stone-300">
                        Virtual Evdev
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700/50">
                        Physical HID
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-800 bg-stone-950/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh controller list
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
