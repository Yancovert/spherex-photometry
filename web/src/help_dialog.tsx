// modal help dialog with human explanations for batch photometry workflow
// authentic windows 2000 dialog architecture
import React from 'react';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 select-none">
      <div className="win2k-window flex flex-col w-full max-w-[560px] shadow-2xl">
        {/* titlebar */}
        <div className="win2k-titlebar flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
              <rect width="16" height="16" fill="#000080" />
              <text x="8" y="12" fill="#ffd700" fontSize="12" fontWeight="bold" textAnchor="middle">?</text>
            </svg>
            <span className="truncate">How to Use - Batch Photometry Tool v1.4</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="win2k-title-btn font-bold cursor-pointer"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* interior */}
        <div className="p-3 space-y-2 text-[11px] text-black bg-[#d4d0c8]">
          <div className="win2k-sunken p-3 bg-white space-y-2.5 max-h-[380px] overflow-y-auto leading-normal">
            <div>
              <div className="font-bold text-[12px] text-black mb-0.5">Overview</div>
              <p className="text-neutral-700">
                Aperture photometry tool for SPHEREx Level 2 FITS images. Subtracts local sky background and calculates calibrated fluxes (uJy, mJy, AB mag).
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-0.5">
              <div className="font-bold text-black">1. Image Source</div>
              <p className="text-neutral-700">
                Choose single .fits file or folder mode to batch process targets across pointings.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-0.5">
              <div className="font-bold text-black">2. Target Coordinates</div>
              <p className="text-neutral-700">
                Select presets, enter manual RA/Dec, or upload a CSV file with id, ra, and dec columns.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-0.5">
              <div className="font-bold text-black">3. Photometry Settings</div>
              <p className="text-neutral-700">
                Default aperture 15.5" (2.5 px). Inner/outer sky annulus clips local background.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-0.5">
              <div className="font-bold text-black">4. Execution & Export</div>
              <p className="text-neutral-700">
                Click Run to process. Export results to CSV or standard FITS binary tables.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="win2k-btn min-w-[75px]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
