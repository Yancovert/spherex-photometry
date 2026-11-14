import React, { useState, useEffect } from 'react';
import { GaiaSource, NeossatTrack, fetchGaiaDr3, fetchNeossat } from './api';

interface SidebarCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  ra: number;
  dec: number;
  fov: number;
  onSelectCoords?: (ra: number, dec: number) => void;
  inline?: boolean;
}

export const SidebarCatalog: React.FC<SidebarCatalogProps> = ({
  isOpen,
  onClose,
  ra,
  dec,
  fov,
  onSelectCoords,
  inline = false
}) => {
  const [activeTab, setActiveTab] = useState<'gaia' | 'neossat'>('gaia');
  const [gaiaSources, setGaiaSources] = useState<GaiaSource[]>([]);
  const [gaiaCount, setGaiaCount] = useState<number>(0);
  const [loadingGaia, setLoadingGaia] = useState<boolean>(false);

  const [neossatTracks, setNeossatTracks] = useState<NeossatTrack[]>([]);
  const [neossatCount, setNeossatCount] = useState<number>(0);
  const [loadingNeossat, setLoadingNeossat] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  // query cone radius based on viewer fov
  const queryRadius = Math.max(0.05, Math.min(0.5, fov / 2));

  const loadGaia = async () => {
    setLoadingGaia(true);
    setError(null);
    try {
      const res = await fetchGaiaDr3(ra, dec, queryRadius);
      setGaiaSources(res.sources);
      setGaiaCount(res.count);
    } catch (err: any) {
      setError(`Gaia DR3 query failed: ${err.message}`);
    } finally {
      setLoadingGaia(false);
    }
  };

  const loadNeossat = async () => {
    setLoadingNeossat(true);
    setError(null);
    try {
      const res = await fetchNeossat(ra, dec, queryRadius);
      setNeossatTracks(res.tracks);
      setNeossatCount(res.count);
    } catch (err: any) {
      setError(`NEOSSat query failed: ${err.message}`);
    } finally {
      setLoadingNeossat(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadGaia();
    loadNeossat();
  }, [isOpen, ra, dec, queryRadius]);

  if (!isOpen) return null;

  return (
    <div
      className={
        inline
          ? 'flex-1 flex flex-col font-sans text-[11px] text-black select-none min-h-0 w-full'
          : 'win2k-window fixed top-10 right-2 bottom-10 w-96 flex flex-col z-40 shadow-2xl font-sans text-[11px] text-black select-none'
      }
    >
      {/* titlebar only in floating mode */}
      {!inline && (
        <div className="win2k-titlebar flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <rect width="16" height="16" fill="#000080" />
              <circle cx="8" cy="8" r="4" fill="#ffffff" />
              <path d="M 8 1 L 8 15 M 1 8 L 15 8" stroke="#ffffff" strokeWidth="1" />
            </svg>
            <span className="truncate">Cross-Match Catalogs (Cone: {queryRadius.toFixed(2)}°)</span>
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
      )}

      {/* tab control */}
      <div className="win2k-tabs-bar px-1 pt-1 bg-[#d4d0c8]">
        <button
          type="button"
          onClick={() => setActiveTab('gaia')}
          className={`win2k-tab-btn ${activeTab === 'gaia' ? 'win2k-tab-btn-active' : ''}`}
        >
          Gaia DR3 ({loadingGaia ? '...' : gaiaCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('neossat')}
          className={`win2k-tab-btn ${activeTab === 'neossat' ? 'win2k-tab-btn-active' : ''}`}
        >
          CSA NEOSSat ({loadingNeossat ? '...' : neossatCount})
        </button>
      </div>

      {/* content interior */}
      <div className="flex-1 p-2 bg-[#d4d0c8] flex flex-col space-y-1.5 min-h-0 overflow-hidden">
        {/* coordinate badge and refresh button */}
        <div className="flex items-center justify-between text-[11px] text-neutral-800">
          <span>RA {ra.toFixed(4)}°, Dec {dec.toFixed(4)}° (Cone radius: {queryRadius.toFixed(2)}°)</span>
          <button
            type="button"
            onClick={() => {
              loadGaia();
              loadNeossat();
            }}
            className="win2k-btn h-[20px] px-2 text-[10px]"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-1 text-red-700 bg-red-100 border border-red-400 text-[10px]">
            {error}
          </div>
        )}

        {activeTab === 'gaia' ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-1">
            {loadingGaia ? (
              <div className="win2k-sunken flex-1 p-4 bg-white flex items-center justify-center text-neutral-500 italic">
                Querying ESA Gaia TAP service...
              </div>
            ) : gaiaSources.length === 0 ? (
              <div className="win2k-sunken flex-1 p-4 bg-white flex items-center justify-center text-neutral-500 italic">
                No Gaia DR3 stars detected within cone.
              </div>
            ) : (
              <div className="win2k-sunken flex-1 bg-white overflow-y-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#d4d0c8] text-black border-b border-[#808080] sticky top-0">
                      <th className="p-1 text-left border-r border-[#808080]">Source ID</th>
                      {inline && <th className="p-1 text-right border-r border-[#808080]">RA / Dec</th>}
                      <th className="p-1 text-right border-r border-[#808080]">G Mag</th>
                      <th className="p-1 text-right border-r border-[#808080]">Total pm</th>
                      <th className="p-1 text-right border-r border-[#808080]">Dist</th>
                      <th className="p-1 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaiaSources.map(s => {
                      const pmTotal = (s.pmra !== null && s.pmdec !== null)
                        ? Math.hypot(s.pmra, s.pmdec).toFixed(1)
                        : '-';
                      const distPc = (s.parallax && s.parallax > 0)
                        ? `${(1000 / s.parallax).toFixed(1)} pc`
                        : '-';

                      return (
                        <tr
                          key={s.sourceId}
                          className="border-b border-neutral-200 hover:bg-[#0a246a] hover:text-white"
                        >
                          <td className="p-1 font-mono truncate max-w-[140px]" title={s.sourceId}>
                            {s.sourceId}
                          </td>
                          {inline && (
                            <td className="p-1 text-right font-mono text-neutral-600">
                              {s.ra.toFixed(4)}°, {s.dec.toFixed(4)}°
                            </td>
                          )}
                          <td className="p-1 text-right font-mono font-bold">
                            {s.photGMeanMag !== null ? s.photGMeanMag.toFixed(2) : '-'}
                          </td>
                          <td className="p-1 text-right font-mono">
                            {pmTotal} {pmTotal !== '-' ? 'mas/yr' : ''}
                          </td>
                          <td className="p-1 text-right font-mono">{distPc}</td>
                          <td className="p-1 text-center">
                            {onSelectCoords && (
                              <button
                                type="button"
                                onClick={() => onSelectCoords(s.ra, s.dec)}
                                className="win2k-btn h-[18px] px-1 text-[9px]"
                              >
                                Go
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-1">
            {loadingNeossat ? (
              <div className="win2k-sunken flex-1 p-4 bg-white flex items-center justify-center text-neutral-500 italic">
                Querying NEOSSat tracking database...
              </div>
            ) : neossatTracks.length === 0 ? (
              <div className="win2k-sunken flex-1 p-4 bg-white flex items-center justify-center text-neutral-500 italic">
                No active NEOSSat asteroid tracks in this immediate FOV.
              </div>
            ) : (
              <div className="win2k-sunken flex-1 bg-white overflow-y-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#d4d0c8] text-black border-b border-[#808080] sticky top-0">
                      <th className="p-1 text-left border-r border-[#808080]">Target Track</th>
                      <th className="p-1 text-left border-r border-[#808080]">Type</th>
                      {inline && <th className="p-1 text-right border-r border-[#808080]">RA / Dec</th>}
                      <th className="p-1 text-left border-r border-[#808080]">Observation</th>
                      {inline && <th className="p-1 text-center border-r border-[#808080]">CADC</th>}
                      <th className="p-1 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neossatTracks.map(t => (
                      <tr
                        key={t.id}
                        className="border-b border-neutral-200 hover:bg-[#0a246a] hover:text-white"
                      >
                        <td className="p-1 font-bold truncate max-w-[140px]" title={t.targetName}>
                          {t.targetName}
                        </td>
                        <td className="p-1">{t.type}</td>
                        {inline && (
                          <td className="p-1 text-right font-mono text-neutral-600">
                            {t.ra.toFixed(4)}°, {t.dec.toFixed(4)}°
                          </td>
                        )}
                        <td className="p-1 font-mono text-[9px]">{t.observationDate}</td>
                        {inline && (
                          <td className="p-1 text-center">
                            {t.cadcUrl ? (
                              <a
                                href={t.cadcUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#0a246a] hover:underline font-bold text-[9px]"
                              >
                                CADC FITS
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}
                        <td className="p-1 text-center">
                          {onSelectCoords && (
                            <button
                              type="button"
                              onClick={() => onSelectCoords(t.ra, t.dec)}
                              className="win2k-btn h-[18px] px-1 text-[9px]"
                            >
                              Go
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* classic win32 status bar */}
      <div className="win2k-statusbar">
        <div className="win2k-status-pane flex-1 truncate">
          {activeTab === 'gaia' ? `Gaia: ${gaiaCount} stars` : `NEOSSat: ${neossatCount} tracks`}
        </div>
        <div className="win2k-status-pane w-28 truncate">CADC / ESA</div>
        <div className="w-3 text-center text-neutral-500 font-mono text-[9px] select-none">:::</div>
      </div>
    </div>
  );
};
