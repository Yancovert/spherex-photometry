import React, { useState, useEffect } from 'react';
import { queryProviderExposures, ingestProviderCutout, ProviderExposure } from './api';

interface ProviderModalProps {
  ra: number;
  dec: number;
  fov: number;
  isOpen: boolean;
  onClose: () => void;
  onCutoutIngested: () => void;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  ra,
  dec,
  fov,
  isOpen,
  onClose,
  onCutoutIngested
}) => {
  const [loading, setLoading] = useState(false);
  const [ingestingUri, setIngestingUri] = useState<string | null>(null);
  const [exposures, setExposures] = useState<ProviderExposure[]>([]);
  const [filterArray, setFilterArray] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const executeQuery = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await queryProviderExposures(ra, dec);
      setExposures(res.exposures);
    } catch {
      setError('Failed querying Caltech/IPAC IRSA TAP service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeQuery();
    }
  }, [isOpen, ra, dec]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleIngest = async (exp: ProviderExposure) => {
    setIngestingUri(exp.uri);
    setError(null);
    setSuccessMsg(null);
    try {
      await ingestProviderCutout(ra, dec, fov, exp.uri);
      setSuccessMsg(`Ingested ${exp.bandpass} into PostGIS database.`);
      // mark as cached
      setExposures(prev => prev.map(e => e.uri === exp.uri ? { ...e, isCached: true } : e));
      onCutoutIngested();
    } catch (err: any) {
      setError(`Ingestion failed: ${err.message}`);
    } finally {
      setIngestingUri(null);
    }
  };

  const filtered = exposures.filter(exp => {
    if (filterArray === 'all') return true;
    return exp.bandpass.includes(filterArray);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-mono select-none">
      <div className="bg-mono-950 border border-mono-700 w-full max-w-4xl max-h-[85vh] flex flex-col text-xs shadow-2xl">
        {/* header */}
        <div className="px-3 py-2 border-b border-mono-800 flex items-center justify-between text-mono-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase tracking-tight">Provider API Ingestion</span>
            <span className="text-mono-500 text-[10px]">NASA/IPAC IRSA TAP • SPHEREx QR2/QR3</span>
          </div>
          <button
            onClick={onClose}
            className="border border-mono-800 hover:border-mono-500 px-2 py-0.5 text-mono-400 hover:text-white"
          >
            Close [Esc]
          </button>
        </div>

        {/* top toolbar */}
        <div className="p-3 border-b border-mono-850 flex flex-wrap items-center justify-between gap-2 bg-mono-900/60">
          <div className="flex items-center gap-2 text-mono-400">
            <span>Query Target:</span>
            <span className="text-white font-bold">RA {ra.toFixed(4)}°, DEC {dec.toFixed(4)}°</span>
            <span className="text-mono-500">• Box: {fov.toFixed(3)}° ({Math.round(fov * 60)}')</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-mono-500 text-[11px]">Filter Band:</span>
            <select
              value={filterArray}
              onChange={e => setFilterArray(e.target.value)}
              className="bg-mono-950 border border-mono-700 px-1.5 py-0.5 text-mono-200 text-xs rounded"
            >
              <option value="all">All Detectors (D1-D6)</option>
              <option value="D1">D1 (0.75-1.1 µm)</option>
              <option value="D2">D2 (1.1-1.6 µm)</option>
              <option value="D3">D3 (1.6-2.4 µm)</option>
              <option value="D4">D4 (2.4-3.8 µm)</option>
              <option value="D5">D5 (3.8-4.4 µm)</option>
              <option value="D6">D6 (4.4-5.0 µm)</option>
            </select>

            <button
              onClick={executeQuery}
              disabled={loading}
              className="border border-mono-600 hover:border-mono-400 bg-mono-800 text-mono-100 px-2.5 py-0.5 rounded transition disabled:opacity-40"
            >
              {loading ? 'Querying...' : 'Re-ping TAP'}
            </button>
          </div>
        </div>

        {/* status / alert alerts */}
        {error && <div className="px-3 py-1.5 bg-mono-900 border-b border-mono-800 text-[11px] text-mono-300">{error}</div>}
        {successMsg && <div className="px-3 py-1.5 bg-mono-900 border-b border-mono-800 text-[11px] text-white font-bold">{successMsg}</div>}

        {/* exposures list table */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-12 text-mono-500 animate-pulse">
              Querying spherex.artifact & spherex.plane at Caltech/IPAC IRSA...
            </div>
          ) : exposures.length === 0 ? (
            <div className="border border-mono-850 p-6 flex flex-col items-center justify-center gap-2 text-center text-mono-400">
              <div className="font-bold text-mono-200">No SPHEREx exposures covering this tile in current release.</div>
              <div className="text-[11px] text-mono-500 max-w-md">
                SPHEREx is an active 2025-2027 all-sky mission. Regions outside current Quick Releases will be ingested as data arrives weekly.
              </div>
              <div className="mt-2 text-[11px] text-mono-400 border border-mono-800 px-3 py-1 bg-mono-900">
                Workstation is automatically displaying precursor AllWISE mid-IR baseline for this field.
              </div>
            </div>
          ) : (
            <div className="border border-mono-850 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-mono-900 border-b border-mono-800 text-mono-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Observation Date (UTC)</th>
                    <th className="p-2">Detector Bandpass</th>
                    <th className="p-2">MJD</th>
                    <th className="p-2">Pipeline Build</th>
                    <th className="p-2">Database Cache</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mono-900">
                  {filtered.map(exp => (
                    <tr key={exp.uri} className="hover:bg-mono-900/50 transition">
                      <td className="p-2 text-white font-mono">{exp.utcDate}</td>
                      <td className="p-2 font-bold text-mono-300">{exp.bandpass}</td>
                      <td className="p-2 text-mono-500">{exp.mjd}</td>
                      <td className="p-2 text-mono-400">{exp.pipelineVersion}</td>
                      <td className="p-2">
                        {exp.isCached ? (
                          <span className="text-white font-bold bg-mono-800 px-1.5 py-0.5 rounded text-[10px]">
                            PostGIS Stored
                          </span>
                        ) : (
                          <span className="text-mono-500 text-[10px]">Remote IRSA</span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => handleIngest(exp)}
                          disabled={ingestingUri === exp.uri}
                          className="border border-mono-700 hover:border-mono-400 bg-mono-900 px-2 py-0.5 text-mono-200 hover:text-white rounded disabled:opacity-40 transition"
                        >
                          {ingestingUri === exp.uri ? 'Ingesting...' : exp.isCached ? 'Cached' : 'Ingest Frame'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* footer summary */}
        <div className="px-3 py-2 border-t border-mono-800 flex items-center justify-between text-[11px] text-mono-500 bg-mono-950">
          <div>
            Showing {filtered.length} of {exposures.length} observations covering RA {ra.toFixed(2)}°, DEC {dec.toFixed(2)}°
          </div>
          <div>Full detector frame: 2040×2040 pixels (~3.5° FOV)</div>
        </div>
      </div>
    </div>
  );
};
