import React, { useState, useEffect } from 'react';
import { resolveTarget } from './api';

export type ColormapType = 'viridis' | 'inferno' | 'plasma' | 'turbo' | 'coolwarm' | 'grayscale' | 'inverted';
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
}

const PRESETS = [
  { id: 'field1', name: 'Field 1 (Ursa Major)', ra: 154.3488, dec: 61.5057 },
  { id: 'field2', name: 'Field 2 (Emission Ring)', ra: 161.7300, dec: 45.3400 },
  { id: 'barnard', name: "Barnard's Star (Dipole)", ra: 269.4520, dec: 4.6930 },
  { id: 'wise0855', name: 'WISE 0855-0714 (Brown Dwarf)', ra: 133.7951, dec: -7.2451 },
  { id: 'rwaur', name: 'RW Aurigae (Variable)', ra: 76.9563, dec: 30.4014 },
  { id: 'r_dra', name: 'R Draconis (Mira)', ra: 248.2838, dec: 66.7025 }
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
  onFovChange
}) => {
  const [searchType, setSearchType] = useState<string>('field1');
  const [query, setQuery] = useState('154.3488, 61.5057');
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
    <header className="bg-mono-950 border-b border-mono-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 font-mono text-xs select-none">
      {/* search and target selector */}
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <span className="font-bold text-white tracking-tight mr-1">SPHEREx</span>

        <select
          value={searchType}
          onChange={handleTypeChange}
          className="bg-mono-900 border border-mono-700 text-mono-200 hover:border-mono-500 px-2 py-1 rounded text-xs focus:outline-none"
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="coords">Coordinates</option>
          <option value="name">Target by Name</option>
        </select>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchType === 'name' ? 'e.g. Barnard, WISE 0855, M101' : 'RA, Dec (e.g. 154.3488, 61.5057)'}
          className="bg-mono-900 border border-mono-700 text-white placeholder-mono-600 px-2.5 py-1 text-xs rounded focus:outline-none focus:border-mono-400 w-52"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-mono-200 hover:bg-white text-mono-950 px-2.5 py-1 rounded font-bold transition disabled:opacity-50 text-xs"
        >
          {loading ? '...' : 'Search'}
        </button>

        {errorMsg && (
          <span className="text-red-400 text-[11px] ml-1">{errorMsg}</span>
        )}
      </form>

      {/* mode selectors */}
      <div className="flex items-center border border-mono-700 rounded overflow-hidden">
        {(['single', 'blink', 'diff'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`px-2.5 py-0.5 text-xs capitalize transition ${
              mode === m
                ? 'bg-mono-200 text-mono-950 font-bold'
                : 'text-mono-300 hover:text-white bg-mono-900'
            }`}
          >
            {m === 'diff' ? 'Diff' : m}
          </button>
        ))}
      </div>

      {/* display and analysis controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-mono-400">
          <span>FoV:</span>
          <select
            value={fov.toString()}
            onChange={e => onFovChange(parseFloat(e.target.value))}
            className="bg-mono-900 border border-mono-700 text-mono-200 px-1.5 py-0.5 rounded text-xs focus:outline-none"
          >
            <option value="3.5">Full Array (3.5°)</option>
            <option value="1">1.00° (60')</option>
            <option value="0.5">0.50° (30')</option>
            <option value="0.25">0.25° (15')</option>
            <option value="0.1">0.10° (6')</option>
            <option value="0.05">0.05° (3')</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-mono-400">
          <span>Map:</span>
          <select
            value={colormap}
            onChange={e => onColormapChange(e.target.value as ColormapType)}
            className="bg-mono-900 border border-mono-700 text-mono-200 px-1.5 py-0.5 rounded text-xs focus:outline-none capitalize"
          >
            <option value="viridis">Viridis</option>
            <option value="inferno">Inferno</option>
            <option value="plasma">Plasma</option>
            <option value="turbo">Turbo</option>
            <option value="coolwarm">Coolwarm</option>
            <option value="grayscale">Grayscale</option>
            <option value="inverted">Inverted</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-mono-400">
          <span>Scale:</span>
          <select
            value={transfer}
            onChange={e => onTransferChange(e.target.value as MathTransfer)}
            className="bg-mono-900 border border-mono-700 text-mono-200 px-1.5 py-0.5 rounded text-xs focus:outline-none uppercase"
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
          className={`border px-2 py-0.5 rounded transition text-xs ${
            measureMode
              ? 'border-white bg-mono-200 text-mono-950 font-bold'
              : 'border-mono-700 hover:border-mono-500 text-mono-300'
          }`}
          title="Toggle circular aperture photometry with sky annulus"
        >
          {measureMode ? 'Measure: On' : 'Measure'}
        </button>

        <button
          type="button"
          onClick={onSavePng}
          className="border border-mono-700 hover:border-mono-500 text-mono-300 hover:text-white px-2 py-0.5 rounded transition text-xs"
          title="Save current canvas as PNG"
        >
          Save PNG
        </button>

        <button
          type="button"
          onClick={handleDownloadFits}
          className="border border-mono-700 hover:border-mono-500 text-mono-300 hover:text-white px-2 py-0.5 rounded transition text-xs"
          title="Download authentic Level 2 FITS file"
        >
          Export FITS
        </button>
      </div>
    </header>
  );
};
