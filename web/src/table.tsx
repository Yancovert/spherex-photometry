// tabular view for batch photometry results with sorting, filtering, and export
// 1:1 authentic 2000s windows win32 syslistview32 grid styling
import React, { useState, useMemo } from 'react';
import { PhotometryResult, exportBatch } from './api';

interface TableProps {
  results: PhotometryResult[];
  suffix: string;
}

export const ResultsTable: React.FC<TableProps> = ({ results, suffix }) => {
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [sortBy, setSortBy] = useState<keyof PhotometryResult>('targetId');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const uniqueTargets = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) set.add(r.targetId);
    return Array.from(set);
  }, [results]);

  const displayedResults = useMemo(() => {
    let list = results;
    if (filterTarget !== 'all') {
      list = list.filter(r => r.targetId === filterTarget);
    }

    return [...list].sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [results, filterTarget, sortBy, sortAsc]);

  const toggleSort = (col: keyof PhotometryResult) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  const handleExport = async (format: 'csv' | 'fits') => {
    if (results.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await exportBatch(format, results, suffix);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spherex_${suffix || 'photometry'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (results.length === 0) {
    return null;
  }

  const detections = results.filter(r => r.snr >= 3.0).length;
  const avgSnr = results.reduce((acc, r) => acc + r.snr, 0) / Math.max(1, results.length);

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>
              Detections (SNR &ge; 3): <strong>{detections}</strong> / {results.length} | Avg SNR: {avgSnr.toFixed(1)}
            </span>
            {uniqueTargets.length > 1 && (
              <div className="flex items-center gap-1.5 ml-2">
                <span>Filter:</span>
                <select
                  value={filterTarget}
                  onChange={e => setFilterTarget(e.target.value)}
                  className="win2k-select"
                >
                  <option value="all">All Targets</option>
                  {uniqueTargets.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExport('csv')}
              className="win2k-btn min-w-[85px]"
            >
              Export CSV
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExport('fits')}
              className="win2k-btn min-w-[110px]"
            >
              Export FITS Table
            </button>
          </div>
        </div>

        {/* syslistview32 grid container */}
        <div className="win2k-sunken max-h-48 overflow-x-auto overflow-y-auto bg-white">
          <table className="w-full text-left border-collapse font-sans text-[11px]">
            <thead className="sticky top-0 bg-[#d4d0c8] select-none">
              <tr>
                {[
                  { key: 'targetId', label: 'Target ID' },
                  { key: 'ra', label: 'RA (deg)' },
                  { key: 'dec', label: 'Dec (deg)' },
                  { key: 'pixelX', label: 'Pixel (X, Y)' },
                  { key: 'wavelengthUm', label: 'Band / Wavelength' },
                  { key: 'netFlux', label: 'Net Flux' },
                  { key: 'fluxError', label: 'Flux Error' },
                  { key: 'snr', label: 'SNR' },
                  { key: 'bgLevel', label: 'Sky Bg (MJy/sr)' },
                  { key: 'status', label: 'Status' }
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key as keyof PhotometryResult)}
                    className="win2k-raised px-2 py-1 cursor-pointer font-normal whitespace-nowrap active:brightness-95"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>{col.label}</span>
                      {sortBy === col.key && (
                        <span className="text-[9px]">{sortAsc ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {displayedResults.map((r, idx) => {
                const isSelected = selectedIndex === idx;
                const isDet = r.snr >= 3.0;

                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={`cursor-default select-none ${
                      isSelected
                        ? 'bg-[#0a246a] text-white'
                        : 'hover:bg-neutral-100 text-black'
                    }`}
                  >
                    <td className="px-2 py-0.5 font-medium whitespace-nowrap">{r.targetId}</td>
                    <td className="px-2 py-0.5 font-mono">{r.ra.toFixed(4)}</td>
                    <td className="px-2 py-0.5 font-mono">{r.dec.toFixed(4)}</td>
                    <td className="px-2 py-0.5 font-mono opacity-80">({r.pixelX.toFixed(1)}, {r.pixelY.toFixed(1)})</td>
                    <td className="px-2 py-0.5 whitespace-nowrap">{r.bandName || `Band ${r.bandIndex || 1} (${r.wavelengthUm?.toFixed(2)} um)`}</td>
                    <td className="px-2 py-0.5 font-mono font-bold whitespace-nowrap">{r.netFlux.toFixed(3)} {r.unit}</td>
                    <td className="px-2 py-0.5 font-mono opacity-80">&plusmn;{r.fluxError.toFixed(3)}</td>
                    <td className="px-2 py-0.5 font-mono font-bold">
                      <span className={isSelected ? 'text-white' : (isDet ? 'text-green-800' : 'text-neutral-600')}>
                        {r.snr.toFixed(1)}&sigma;
                      </span>
                    </td>
                    <td className="px-2 py-0.5 font-mono opacity-80">{r.bgLevel.toFixed(3)} (&plusmn;{r.bgRms.toFixed(3)})</td>
                    <td className="px-2 py-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected ? 'text-white' : (
                          r.status === 'OK' ? 'text-green-700' :
                          r.status === 'LOW_SNR' ? 'text-amber-700' : 'text-red-700'
                        )
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
  );
};
