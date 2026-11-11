import React from 'react';

interface BlinkProps {
  epoch: number;
  maxEpochs?: number;
  playing: boolean;
  fps: number;
  diffMode: boolean;
  diffPair: [number, number];
  stretch: 'asinh' | 'linear';
  onEpochChange: (ep: number) => void;
  onTogglePlay: () => void;
  onFpsChange: (fps: number) => void;
  onToggleDiff: () => void;
  onDiffPairChange: (pair: [number, number]) => void;
  onStretchChange: (stretch: 'asinh' | 'linear') => void;
}

export const BlinkBar: React.FC<BlinkProps> = ({
  epoch,
  maxEpochs = 4,
  playing,
  fps,
  diffMode,
  diffPair,
  stretch,
  onEpochChange,
  onTogglePlay,
  onFpsChange,
  onToggleDiff,
  onDiffPairChange,
  onStretchChange
}) => {
  return (
    <div className="bg-mono-950 border-t border-mono-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onEpochChange(epoch > 1 ? epoch - 1 : maxEpochs)}
          className="border border-mono-800 hover:border-mono-600 px-2 py-0.5 rounded text-mono-300 hover:text-white transition"
        >
          Prev
        </button>

        <button
          onClick={onTogglePlay}
          className={`px-3 py-0.5 rounded font-bold transition ${
            playing ? 'bg-mono-100 text-mono-950' : 'border border-mono-700 text-mono-200 hover:border-mono-400'
          }`}
        >
          {playing ? 'Stop' : 'Blink'}
        </button>

        <button
          onClick={() => onEpochChange(epoch < maxEpochs ? epoch + 1 : 1)}
          className="border border-mono-800 hover:border-mono-600 px-2 py-0.5 rounded text-mono-300 hover:text-white transition"
        >
          Next
        </button>

        <div className="flex items-center gap-1 ml-2 border border-mono-800 p-0.5 rounded">
          {Array.from({ length: maxEpochs }, (_, i) => i + 1).map(ep => (
            <button
              key={ep}
              onClick={() => onEpochChange(ep)}
              className={`px-2 py-0.5 rounded text-[11px] transition ${
                epoch === ep ? 'bg-mono-100 text-mono-950 font-bold' : 'text-mono-400 hover:text-white'
              }`}
            >
              E{ep}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-mono-500">Rate:</span>
        <input
          type="range"
          min="1"
          max="8"
          value={fps}
          onChange={e => onFpsChange(parseInt(e.target.value, 10))}
          className="w-16 accent-mono-300"
        />
        <span className="text-mono-300 w-10">{fps} fps</span>
      </div>

      <div className="flex items-center gap-1 border border-mono-800 p-0.5 rounded">
        <span className="text-mono-500 px-1">Stretch:</span>
        <button
          onClick={() => onStretchChange(stretch === 'asinh' ? 'linear' : 'asinh')}
          className="px-2 py-0.5 rounded text-[11px] bg-mono-800 text-mono-200 hover:text-white"
        >
          {stretch === 'asinh' ? 'Asinh' : 'Linear'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDiff}
          className={`border px-2.5 py-0.5 rounded transition ${
            diffMode
              ? 'bg-mono-100 text-mono-950 font-bold border-mono-100'
              : 'border-mono-800 text-mono-300 hover:border-mono-600'
          }`}
        >
          {diffMode ? 'Diff: Active' : 'Difference'}
        </button>

        {diffMode && (
          <select
            value={`${diffPair[0]}-${diffPair[1]}`}
            onChange={e => {
              const [a, b] = e.target.value.split('-').map(Number);
              onDiffPairChange([a, b]);
            }}
            className="bg-mono-900 border border-mono-700 px-1 py-0.5 text-mono-200 text-xs rounded"
          >
            <option value="1-2">E2 - E1</option>
            <option value="1-3">E3 - E1</option>
            <option value="1-4">E4 - E1</option>
            <option value="2-3">E3 - E2</option>
          </select>
        )}
      </div>
    </div>
  );
};
