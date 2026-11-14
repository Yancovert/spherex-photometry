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
    <div className="bg-[#d4d0c8] border-t border-[#808080] p-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans text-black select-none">
      {/* epoch stepper and blink button */}
      <div className="flex items-center gap-1">
        <span className="font-bold mr-1">Epoch:</span>

        <button
          type="button"
          onClick={() => onEpochChange(epoch > 1 ? epoch - 1 : maxEpochs)}
          className="win2k-btn h-[22px] px-2 text-[11px]"
          title="Previous Epoch"
        >
          &lt; Prev
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className={`win2k-btn h-[22px] px-3 font-bold text-[11px] ${
            playing ? '!bg-[#dfdfdf] border-t-black border-l-black' : ''
          }`}
          title="Toggle WiseView-style automatic epoch blinking"
        >
          {playing ? 'Stop Blink' : 'Start Blink'}
        </button>

        <button
          type="button"
          onClick={() => onEpochChange(epoch < maxEpochs ? epoch + 1 : 1)}
          className="win2k-btn h-[22px] px-2 text-[11px]"
          title="Next Epoch"
        >
          Next &gt;
        </button>

        <div className="flex items-center gap-0.5 ml-1">
          {Array.from({ length: maxEpochs }, (_, i) => i + 1).map(ep => (
            <button
              key={ep}
              type="button"
              onClick={() => onEpochChange(ep)}
              className={`win2k-btn h-[22px] px-2 text-[11px] ${
                epoch === ep ? 'font-bold !bg-[#dfdfdf] border-t-black border-l-black' : ''
              }`}
            >
              E{ep}
            </button>
          ))}
        </div>
      </div>

      {/* rate slider */}
      <div className="flex items-center gap-1.5 border-l border-r border-[#808080] px-2">
        <span>Blink Rate:</span>
        <input
          type="range"
          min="1"
          max="8"
          value={fps}
          onChange={e => onFpsChange(parseInt(e.target.value, 10))}
          className="w-20 accent-[#0a246a]"
        />
        <span className="w-10 font-mono text-[10px]">{fps} Hz</span>
      </div>

      {/* stretch mode */}
      <div className="flex items-center gap-1">
        <span>Stretch:</span>
        <button
          type="button"
          onClick={() => onStretchChange(stretch === 'asinh' ? 'linear' : 'asinh')}
          className="win2k-btn h-[22px] px-2 text-[11px]"
        >
          {stretch === 'asinh' ? 'Asinh (Nonlinear)' : 'Linear'}
        </button>
      </div>

      {/* difference mode */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleDiff}
          className={`win2k-btn h-[22px] px-2 text-[11px] ${
            diffMode ? 'font-bold !bg-[#dfdfdf] border-t-black border-l-black' : ''
          }`}
          title="Signed Difference Image for Motion Dipole Detection"
        >
          {diffMode ? 'Difference: Active' : 'Difference'}
        </button>

        {diffMode && (
          <select
            value={`${diffPair[0]}-${diffPair[1]}`}
            onChange={e => {
              const [a, b] = e.target.value.split('-').map(Number);
              onDiffPairChange([a, b]);
            }}
            className="win2k-input text-[11px] h-[22px]"
          >
            <option value="1-2">Epoch 2 - Epoch 1</option>
            <option value="1-3">Epoch 3 - Epoch 1</option>
            <option value="1-4">Epoch 4 - Epoch 1</option>
            <option value="2-3">Epoch 3 - Epoch 2</option>
          </select>
        )}
      </div>
    </div>
  );
};
