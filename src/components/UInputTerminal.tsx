import React, { useState } from 'react';
import { UInputLogEntry } from '../types/gamepad';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';

interface UInputTerminalProps {
  logs: UInputLogEntry[];
  onClear: () => void;
}

export const UInputTerminal: React.FC<UInputTerminalProps> = ({ logs, onClear }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type}] ${l.content}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-900 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-medium text-stone-300">
            /system/bin/uinput Stream Monitor
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
            {logs.length} events
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded bg-stone-800 text-stone-300 hover:bg-stone-750 transition"
            title="Copy logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="p-1 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 font-mono text-[11px] max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-stone-500 py-4 text-center italic">
            Waiting for bridge to start. Uinput registration & injection packets will appear here...
          </div>
        ) : (
          logs.map((log) => {
            let badgeClass = 'text-stone-400';
            if (log.type === 'register') badgeClass = 'text-amber-400 font-bold';
            if (log.type === 'delay') badgeClass = 'text-blue-400';
            if (log.type === 'inject') badgeClass = 'text-emerald-400';
            if (log.type === 'error') badgeClass = 'text-red-400 font-bold';

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed break-all">
                <span className="text-stone-500 select-none shrink-0">{log.timestamp}</span>
                <span className={`uppercase text-[10px] px-1 rounded bg-stone-900 shrink-0 ${badgeClass}`}>
                  {log.type}
                </span>
                <span className="text-stone-300">{log.content}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
