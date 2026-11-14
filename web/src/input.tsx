import React, { useState, useEffect } from 'react';
import { resolveTarget } from './api';

export type ColormapType = 'viridis' | 'bipolar' | 'inferno' | 'plasma' | 'turbo' | 'coolwarm' | 'grayscale' | 'inverted';
export type MathTransfer = 'asinh' | 'linear' | 'log' | 'sqrt';
export type ViewerMode = 'single' | 'blink' | 'diff';

interface InputBarProps {
  ra: number;
  dec: number;
  fov: number;
  colormap: ColormapType;
  transfer: MathTransfer;
  measureMode: boolean;
  mode: ViewerMode;
  onUpdate: (ra: number, dec: number, fov: number, label?: string) => void;
  onColormapChange: (c: ColormapType) => void;
  onTransferChange: (t: MathTransfer) => void;
  onToggleMeasure: () => void;
  onSavePng: () => void;
  onModeChange: (m: ViewerMode) => void;
  onFovChange: (fov: number) => void;
  onToggleCatalog?: () => void;
  catalogOpen?: boolean;
  onToggleResources?: () => void;
  onOpenSed?: () => void;
  showReticle?: boolean;
  onToggleReticle?: () => void;
}

const PRESETS = [
  { id: 'barnard', name: "Barnard's Star (10.3\"/yr Dipole)", ra: 269.4520, dec: 4.6930 },
  { id: 'wise0855', name: 'WISE 0855-0714 (Cold Brown Dwarf)', ra: 133.7951, dec: -7.2451 },
  { id: 'eps_indi', name: 'Epsilon Indi B (Binary Brown Dwarf)', ra: 330.8400, dec: -56.7858 },
  { id: 'rwaur', name: 'RW Aurigae (Variable)', ra: 76.9563, dec: 30.4014 },
  { id: 'r_dra', name: 'R Draconis (Mira Giant)', ra: 248.2838, dec: 66.7025 },
  { id: 'field1', name: 'Field 1 (Ursa Major L2)', ra: 154.3488, dec: 61.5057 },
  { id: 'field2', name: 'Field 2 (Emission Ring)', ra: 161.7300, dec: 45.3400 }
];

export const InputBar: React.FC<InputBarProps> = ({
  ra,
  dec,
  fov,
  colormap,
  transfer,
  measureMode,
  mode,
  onUpdate,
  onColormapChange,
  onTransferChange,
  onToggleMeasure,
  onSavePng,
  onModeChange,
  onFovChange,
  onToggleCatalog,
  catalogOpen,
  onToggleResources,
  onOpenSed,
  showReticle,
  onToggleReticle
}) => {
  const [searchType, setSearchType] = useState<string>('barnard');
  const [query, setQuery] = useState('269.4520, 4.6930');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // sync input when coordinates change externally
  useEffect(() => {
    const matched = PRESETS.find(p => Math.hypot(ra - p.ra, dec - p.dec) < 0.05);
    if (matched) {
      setSearchType(matched.id);
      setQuery(`${matched.ra.toFixed(4)}, ${matched.dec.toFixed(4)}`);
    } else {
      setSearchType('coords');
      setQuery(`${ra.toFixed(4)}, ${dec.toFixed(4)}`);
    }
  }, [ra, dec]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = e.target.value;
    setSearchType(nextType);
    setErrorMsg(null);

    const preset = PRESETS.find(p => p.id === nextType);
    if (preset) {
      const nextFov = (preset.id === 'field1' || preset.id === 'field2') ? 3.5 : 0.5;
      setQuery(`${preset.ra}, ${preset.dec}`);
      onUpdate(preset.ra, preset.dec, nextFov, preset.name);
    } else if (nextType === 'coords') {
      setQuery(`${ra.toFixed(4)}, ${dec.toFixed(4)}`);
    } else if (nextType === 'name') {
      setQuery('');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setErrorMsg(null);

    if (searchType === 'name') {
      setLoading(true);
      try {
        const res = await resolveTarget(query.trim());
        if (res) {
          onUpdate(res.ra, res.dec, fov, res.name);
        } else {
          setErrorMsg('Target not found');
        }
      } catch {
        setErrorMsg('Resolver error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // parse coordinates (comma or space separated)
    const parts = query.replace(/[h|d|m|s|°]/g, ' ').replace(/,/g, ' ').trim().split(/\s+/);
    if (parts.length >= 2) {
      const parsedRa = parseFloat(parts[0]);
      const parsedDec = parseFloat(parts[1]);
      if (!isNaN(parsedRa) && !isNaN(parsedDec)) {
        onUpdate(parsedRa, parsedDec, fov);
        return;
      }
    }
    setErrorMsg('Invalid coordinates');
  };

  const handleDownloadFits = () => {
    window.location.href = `/api/download/fits?ra=${ra}&dec=${dec}`;
  };

  return (
    <div className="bg-[#d4d0c8] border-b border-[#808080] p-1.5 flex flex-wrap items-center justify-between gap-1.5 text-black font-sans text-[11px] select-none">
      {/* search and target selector */}
      <form onSubmit={handleSearch} className="flex items-center gap-1">
        <span className="font-bold mr-0.5">Target:</span>

        <select
          value={searchType}
          onChange={handleTypeChange}
          className="win2k-input text-[11px] h-[22px] max-w-[210px]"
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="coords">Coordinates (RA, Dec)</option>
          <option value="name">Target by Name (SIMBAD)</option>
        </select>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchType === 'name' ? 'e.g. Barnard, WISE 0855' : 'RA, Dec (e.g. 269.4520, 4.6930)'}
          className="win2k-input text-[11px] h-[22px] w-48 px-1"
        />

        <button
          type="submit"
          disabled={loading}
          className="win2k-btn h-[22px] px-2.5 font-bold"
        >
          {loading ? '...' : 'Go'}
        </button>

        {errorMsg && (
          <span className="text-red-700 font-bold text-[10px] ml-1">{errorMsg}</span>
        )}
      </form>

      {/* mode selectors (single, blink, diff) */}
      <div className="flex items-center gap-1 border-l border-r border-[#808080] px-1.5">
        <span className="text-neutral-700">Mode:</span>
        {(['single', 'blink', 'diff'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`win2k-btn h-[22px] px-2 text-[11px] capitalize ${
              mode === m ? 'font-bold !bg-[#dfdfdf] border-t-black border-l-black' : ''
            }`}
          >
            {m === 'diff' ? 'Signed Diff' : m === 'blink' ? 'Blink' : 'Single'}
          </button>
        ))}
      </div>

      {/* display and analysis controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1">
          <span>FoV:</span>
          <select
            value={fov.toString()}
            onChange={e => onFovChange(parseFloat(e.target.value))}
            className="win2k-input text-[11px] h-[22px]"
          >
            <option value="3.5">Full (3.5°)</option>
            <option value="1">1.00°</option>
            <option value="0.5">0.50°</option>
            <option value="0.25">0.25°</option>
            <option value="0.1">0.10°</option>
            <option value="0.05">0.05°</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span>Map:</span>
          <select
            value={colormap}
            onChange={e => onColormapChange(e.target.value as ColormapType)}
            className="win2k-input text-[11px] h-[22px] capitalize"
          >
            <option value="viridis">Viridis</option>
            <option value="bipolar">Bipolar (Dark Diff)</option>
            <option value="inferno">Inferno</option>
            <option value="plasma">Plasma</option>
            <option value="turbo">Turbo</option>
            <option value="coolwarm">Coolwarm (Light)</option>
            <option value="grayscale">Grayscale</option>
            <option value="inverted">Inverted</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span>Scale:</span>
          <select
            value={transfer}
            onChange={e => onTransferChange(e.target.value as MathTransfer)}
            className="win2k-input text-[11px] h-[22px] uppercase"
          >
            <option value="asinh">Asinh</option>
            <option value="linear">Linear</option>
            <option value="log">Log</option>
            <option value="sqrt">Sqrt</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onToggleMeasure}
          className={`win2k-btn h-[22px] px-2 text-[11px] ${
            measureMode ? 'font-bold !bg-[#dfdfdf] border-t-black border-l-black' : ''
          }`}
          title="Toggle circular aperture photometry with sky annulus"
        >
          {measureMode ? 'Aperture: ON' : 'Aperture'}
        </button>

        {onToggleReticle && (
          <button
            type="button"
            onClick={onToggleReticle}
            className={`win2k-btn h-[22px] px-2 text-[11px] ${
              showReticle ? 'font-bold !bg-[#dfdfdf] border-t-black border-l-black' : ''
            }`}
            title="Toggle WiseView-style target crosshair/reticle"
          >
            {showReticle ? 'Reticle: ON' : 'Reticle'}
          </button>
        )}

        <button
          type="button"
          onClick={onSavePng}
          className="win2k-btn h-[22px] px-2 text-[11px]"
          title="Save current canvas as PNG"
        >
          Save PNG
        </button>

        <button
          type="button"
          onClick={handleDownloadFits}
          className="win2k-btn h-[22px] px-2 text-[11px]"
          title="Download authentic Level 2 FITS file"
        >
          FITS
        </button>

        {onOpenSed && (
          <button
            type="button"
            onClick={onOpenSed}
            className="win2k-btn h-[22px] px-2 text-[11px] font-bold"
            title="Open on-the-fly 102-channel NIR spectrum (SED) with molecular ice diagnostic markers"
          >
            SED Plot
          </button>
        )}

        {onToggleCatalog && (
          <button
            type="button"
            onClick={onToggleCatalog}
            className={`win2k-btn h-[22px] px-2 text-[11px] ${
              catalogOpen ? 'font-bold !bg-[#dfdfdf] border-t-black border-l-black' : ''
            }`}
            title="Toggle Gaia DR3 and CSA NEOSSat cross-match catalog drawer"
          >
            Catalogs {catalogOpen ? '[X]' : ''}
          </button>
        )}

        {onToggleResources && (
          <button
            type="button"
            onClick={onToggleResources}
            className="win2k-btn h-[22px] px-2 text-[11px]"
            title="Resources & Reference Guides"
          >
            Help / Guide
          </button>
        )}
      </div>
    </div>
  );
};
