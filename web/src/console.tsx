// utilitarian execution console log window for batch telemetry
// 1:1 authentic 2000s windows win32 edit control styling
import React, { useEffect, useRef } from 'react';

interface ConsoleProps {
  logs: string[];
  onClear: () => void;
}

export const ConsoleBox: React.FC<ConsoleProps> = ({ logs, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
  };

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="win2k-sunken p-2 h-44 overflow-y-auto bg-white text-black font-mono text-[11px] leading-tight select-text space-y-0.5">
        {logs.length === 0 ? (
          <div className="text-neutral-500 italic">No execution telemetry. Click 'Run' to begin batch process.</div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap text-black">
              {line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-neutral-600">
          Telemetry stream: {logs.length} line(s)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyToClipboard}
            className="win2k-btn min-w-[70px]"
          >
            Copy Log
          </button>
          <button
            type="button"
            onClick={onClear}
            className="win2k-btn min-w-[65px]"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
