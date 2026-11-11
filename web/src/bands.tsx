import React from 'react';
import { BandInfo } from './api';

interface BandsProps {
  bands: BandInfo[];
  activeBand: number;
  stackedArray: number | null;
  onBandChange: (b: number) => void;
  onStackChange: (arr: number | null) => void;
}

export const BandsBar: React.FC<BandsProps> = ({
  bands,
  activeBand,
  stackedArray,
  onBandChange,
  onStackChange
}) => {
  const current = bands[activeBand - 1] || { wavelength: 1.5, array: 2 };

  return (
    <div className="bg-mono-950 border-t border-mono-850 px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      <div className="flex items-center gap-2 flex-1 min-w-[240px]">
        <span className="text-mono-500">Band:</span>
        <span className="text-mono-200 font-bold w-16">{activeBand}/102</span>

        <input
          type="range"
          min="1"
          max="102"
          value={activeBand}
          onChange={e => {
            onStackChange(null);
            onBandChange(parseInt(e.target.value, 10));
          }}
          className="flex-1 accent-mono-300"
        />

        <span className="text-mono-300">{current.wavelength.toFixed(3)} µm</span>
        <span className="text-mono-500 text-[11px]">(Array {current.array})</span>
      </div>

      <div className="flex items-center gap-1 border border-mono-800 p-0.5 rounded">
        <span className="text-mono-500 px-1 text-[11px]">Stack:</span>
        {[1, 2, 3, 4, 5, 6].map(arr => (
          <button
            key={arr}
            onClick={() => onStackChange(stackedArray === arr ? null : arr)}
            className={`px-1.5 py-0.5 rounded text-[11px] transition ${
              stackedArray === arr
                ? 'bg-mono-100 text-mono-950 font-bold'
                : 'text-mono-400 hover:text-white'
            }`}
          >
            A{arr}
          </button>
        ))}
      </div>
    </div>
  );
};
