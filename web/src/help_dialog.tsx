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
            ✕
          </button>
        </div>

        {/* interior */}
        <div className="p-3 space-y-2 text-[11px] text-black bg-[#d4d0c8]">
          <div className="win2k-sunken p-3 bg-white space-y-3 max-h-[380px] overflow-y-auto leading-normal">
            <div>
              <div className="font-bold text-[12px] text-black mb-0.5">Quick Overview</div>
              <p className="text-neutral-700">
                This tool measures light fluxes from celestial targets in SPHEREx Level 2 FITS images. You specify coordinates, and it finds the target on the detector, subtracts local sky background, applies instrument PSF corrections, and calculates calibrated fluxes in uJy, mJy, or AB magnitude.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-1">
              <div className="font-bold text-black">1. Choose your image source</div>
              <p className="text-neutral-700">
                - <strong>Single file</strong>: Pick a specific .fits file (e.g. from ./cache).<br />
                - <strong>Folder (Batch)</strong>: Select a directory with multiple exposures. The tool inspects all files and processes targets across every matching pointing.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-1">
              <div className="font-bold text-black">2. Pick target coordinates</div>
              <p className="text-neutral-700">
                - <strong>Benchmark Presets</strong>: Check reference fields (Ursa Major, Emission Ring, Barnard's Star, etc.).<br />
                - <strong>Single Coordinate</strong>: Enter an Object ID, RA, and Dec in decimal degrees.<br />
                - <strong>Catalog CSV Upload</strong>: Upload your own text or CSV catalog containing id, ra, and dec columns.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-1">
              <div className="font-bold text-black">3. Aperture and background settings</div>
              <p className="text-neutral-700">
                - <strong>Aperture radius</strong>: Area around the target where flux is gathered. Default 15.5" (2.5 pixels) is tuned for point sources.<br />
                - <strong>Annulus inner / outer</strong>: Concentric ring around the target used to estimate and clip sky background noise.<br />
                - <strong>Aperture flux correction</strong>: Compensates for PSF optical wings spilling outside the aperture.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-1">
              <div className="font-bold text-black">4. Why do some targets say "outside detector bounds"?</div>
              <p className="text-neutral-700">
                Each SPHEREx exposure covers a specific sky footprint (~3.5 x 3.5 deg). If a target's RA/Dec falls outside the image you selected, it gets flagged as <strong>OFF_IMAGE</strong> with zero flux. To catch targets across different parts of the sky, run in <strong>Folder (Batch)</strong> mode with exposures covering those coordinates.
              </p>
            </div>

            <div className="border-t border-neutral-200 pt-2 space-y-1">
              <div className="font-bold text-black">5. Run and export</div>
              <p className="text-neutral-700">
                Click <strong>Run</strong>. The tool streams execution steps in the Execution Log tab. When done, the Results Table tab opens automatically showing net fluxes, uncertainties, and signal-to-noise ratios. Use <strong>Export CSV</strong> or <strong>Export FITS Table</strong> to save standard files.
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
