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
    <div className="bg-[#d4d0c8] border-t border-[#808080] p-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans text-black select-none">
      {/* 102-channel linear variable filter slider */}
      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
        <span className="font-bold">LVF Band:</span>
        <span className="font-mono font-bold w-12">{activeBand}/102</span>

        <input
          type="range"
          min="1"
          max="102"
          value={activeBand}
          onChange={e => {
            onStackChange(null);
            onBandChange(parseInt(e.target.value, 10));
          }}
          className="flex-1 accent-[#0a246a]"
        />

        <span className="font-mono font-bold w-20">{current.wavelength.toFixed(3)} µm</span>
        <span className="text-neutral-700">(Array {current.array})</span>
      </div>

      {/* detector array coadd stacking */}
      <div className="flex items-center gap-1 border-l border-[#808080] pl-2">
        <span className="text-neutral-700">Coadd Array:</span>
        {[1, 2, 3, 4, 5, 6].map(arr => (
          <button
            key={arr}
            type="button"
            onClick={() => onStackChange(stackedArray === arr ? null : arr)}
            className={`win2k-btn h-[22px] px-1.5 text-[10px] ${
              stackedArray === arr ? 'font-bold !bg-[#dfdfdf] border-t-black border-l-black' : ''
            }`}
            title={`Coadd all spectral channels in Detector Array ${arr} to boost SNR`}
          >
            A{arr}
          </button>
        ))}
      </div>
    </div>
  );
};
