import React, { useState } from 'react';

interface ResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget?: (id: string, ra: number, dec: number, fov: number) => void;
  inline?: boolean;
}

const OFFICIAL_RESOURCES = [
  {
    id: 'irsa_spherex',
    title: 'SPHEREx Data (NASA IRSA)',
    provider: 'NASA / IPAC',
    url: 'https://irsa.ipac.caltech.edu/data/SPHEREx/',
    description: '102-band spectral survey cubes (0.75-5.00 µm), 6.2"/px Level 2 images, TAP cutouts.',
    tags: ['NASA', 'IRSA', 'FITS', 'Spectroscopy']
  },
  {
    id: 'caltech_tutorials',
    title: 'SPHEREx Tutorials',
    provider: 'IPAC / Caltech',
    url: 'https://github.com/Caltech-IPAC/SPHEREx-tutorials',
    description: 'Notebooks for spectral extraction, background subtraction, and aperture photometry.',
    tags: ['Python', 'Jupyter', 'Calibration']
  },
  {
    id: 'wiseview',
    title: 'WiseView Multi-Epoch Blinker',
    provider: 'Dan Caselden / Backyard Worlds',
    url: 'http://byw.tools/wiseview',
    description: 'Heritage blinking tool for unWISE coadds to identify cold brown dwarfs and motion targets.',
    tags: ['WiseView', 'Blink', 'Citizen Science']
  },
  {
    id: 'gaia_dr3',
    title: 'Gaia Data Release 3',
    provider: 'ESA / STScI',
    url: 'https://www.cosmos.esa.int/web/gaia/data-release-3',
    description: '1.8B+ sources with positions, parallaxes, and proper motions for cross-matching.',
    tags: ['ESA', 'Astrometry', 'Parallax', 'Proper Motion']
  },
  {
    id: 'csa_neossat',
    title: 'NEOSSat Space Telescope',
    provider: 'Canadian Space Agency (CSA)',
    url: 'https://www.asc-csa.gc.ca/eng/satellites/neossat/',
    description: 'Microsatellite tracking near-Earth asteroids, comets, and orbital debris.',
    tags: ['CSA', 'Asteroids', 'Space Debris']
  },
  {
    id: 'cadc',
    title: 'Canadian Astronomy Data Centre',
    provider: 'NRC Herzberg / CADC',
    url: 'https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/',
    description: 'Science archive for Canadian and international mission FITS files and TAP queries.',
    tags: ['CADC', 'Archive', 'Surveys']
  },
  {
    id: 'neossat_tutorial',
    title: 'NEOSSat Python Tutorial',
    provider: 'Canadian Space Agency (CSA)',
    url: 'https://github.com/asc-csa/NEOSSat',
    description: 'Tutorial for loading and extracting asteroid tracks from NEOSSat observations.',
    tags: ['Tutorial', 'Python', 'Photometry']
  },
  {
    id: 'neossat_dataset',
    title: 'NEOSSat Open Dataset',
    provider: 'Government of Canada',
    url: 'https://data.asc-csa.gc.ca/dataset/neossat',
    description: 'Open catalog of NEOSSat observations and tracked solar system passes.',
    tags: ['Open Data', 'NEOSSat', 'Solar System']
  }
];

const BENCHMARK_TARGETS = [
  {
    id: 'barnard',
    name: "Barnard's Star",
    type: 'High Proper Motion',
    ra: 269.4520,
    dec: 4.6930,
    fov: 0.5,
    motion: '10.3"/yr',
    desc: 'Fastest proper motion star. Creates high-contrast dipole in difference blinking.'
  },
  {
    id: 'wise0855',
    name: 'WISE 0855-0714',
    type: 'Sub-stellar Brown Dwarf (Y-dwarf)',
    ra: 133.7951,
    dec: -7.2451,
    fov: 0.5,
    motion: '8.1"/yr',
    desc: 'Coldest brown dwarf (250 K) with atmospheric water ice features.'
  },
  {
    id: 'eps_indi',
    name: 'Epsilon Indi B',
    type: 'Binary Brown Dwarf (T1+T6)',
    ra: 330.8400,
    dec: -56.7858,
    fov: 0.5,
    motion: '4.7"/yr',
    desc: 'High proper motion brown dwarf binary with CH4 absorption bands.'
  },
  {
    id: 'rwaur',
    name: 'RW Aurigae',
    type: 'Variable YSO',
    ra: 76.9563,
    dec: 30.4014,
    fov: 0.5,
    motion: 'Variable',
    desc: 'T Tauri star with photometric dimming from circumstellar dust.'
  },
  {
    id: 'r_dra',
    name: 'R Draconis',
    type: 'Mira Variable',
    ra: 248.2838,
    dec: 66.7025,
    fov: 0.5,
    motion: 'Variable',
    desc: 'Pulsating giant with large infrared amplitude across survey epochs.'
  }
];

export const ResourcesModal: React.FC<ResourcesModalProps> = ({
  isOpen,
  onClose,
  onSelectTarget,
  inline = false
}) => {
  const [activeTab, setActiveTab] = useState<'resources' | 'targets' | 'guide'>('resources');

  if (!isOpen) return null;

  const content = (
    <div className={`flex flex-col ${inline ? 'w-full flex-1 min-h-0' : 'win2k-window w-full max-w-3xl shadow-2xl'}`}>
      {/* titlebar for modal */}
      {!inline && (
        <div className="win2k-titlebar flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <rect width="16" height="16" fill="#000080" />
              <text x="8" y="12" textAnchor="middle" fill="#ffffff" fontWeight="bold" fontSize="12">?</text>
            </svg>
            <span className="truncate">
              Planet X & SPHEREx Mission Resources (NASA / CSA / ESA)
            </span>
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
          onClick={() => setActiveTab('resources')}
          className={`win2k-tab-btn ${activeTab === 'resources' ? 'win2k-tab-btn-active' : ''}`}
        >
          Resources ({OFFICIAL_RESOURCES.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('targets')}
          className={`win2k-tab-btn ${activeTab === 'targets' ? 'win2k-tab-btn-active' : ''}`}
        >
          Targets ({BENCHMARK_TARGETS.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`win2k-tab-btn ${activeTab === 'guide' ? 'win2k-tab-btn-active' : ''}`}
        >
          Guide
        </button>
      </div>

      {/* dialog interior */}
      <div className={`p-2 bg-[#d4d0c8] space-y-2 text-black flex flex-col ${inline ? 'flex-1 min-h-0' : 'max-h-[70vh]'}`}>
        <div className="win2k-sunken flex-1 p-2 bg-white overflow-y-auto space-y-2">
          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {OFFICIAL_RESOURCES.map(r => (
                <div
                  key={r.id}
                  className="p-2 border border-neutral-300 bg-neutral-50 rounded flex flex-col justify-between"
                >
                  <div>
                    <div className="font-bold text-[11px] text-[#0a246a]">{r.title}</div>
                    <div className="text-[10px] text-neutral-600 font-semibold">{r.provider}</div>
                    <p className="text-neutral-800 text-[10px] leading-relaxed pt-1">{r.description}</p>
                  </div>

                  <div className="pt-2 mt-1 border-t border-neutral-200 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {r.tags.map(t => (
                        <span key={t} className="text-[9px] bg-neutral-200 text-neutral-700 px-1 py-0.2 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0a246a] hover:underline font-bold text-[10px]"
                    >
                      Open Resource -&gt;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'targets' && (
            <div className="space-y-1.5">
              {BENCHMARK_TARGETS.map(t => (
                <div
                  key={t.id}
                  className="p-2 border border-neutral-300 bg-neutral-50 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[11px] text-[#0a246a]">{t.name}</span>
                      <span className="text-[9px] bg-neutral-200 px-1 py-0.5 rounded text-neutral-700">
                        {t.type}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-600">
                        {t.motion}
                      </span>
                    </div>
                    <p className="text-neutral-700 text-[10px]">{t.desc}</p>
                    <div className="text-[10px] font-mono text-neutral-500">
                      RA {t.ra.toFixed(4)}°, Dec {t.dec.toFixed(4)}°
                    </div>
                  </div>

                  {onSelectTarget && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTarget(t.id, t.ra, t.dec, t.fov);
                        onClose();
                      }}
                      className="win2k-btn h-[22px] px-3 font-bold text-[10px] shrink-0"
                    >
                      Load
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-2 text-[11px] leading-relaxed text-neutral-800">
              <fieldset className="win2k-groupbox">
                <legend>1. Multi-Epoch Blinking</legend>
                <p className="p-1">
                  Step through E1-E4 (6-month survey passes). Moving objects shift against stationary background stars.
                </p>
              </fieldset>

              <fieldset className="win2k-groupbox">
                <legend>2. Difference Imaging</legend>
                <p className="p-1">
                  'Signed Diff' subtracts reference epoch (e.g. E2-E1). Moving sources show dark-deficit and bright-excess dipoles.
                </p>
              </fieldset>

              <fieldset className="win2k-groupbox">
                <legend>3. 102 LVF Bands & Stacking</legend>
                <p className="p-1">
                  Slider tunes 0.75-5.00 µm. Click 'A1'-'A6' to coadd channels within each detector array for higher SNR.
                </p>
              </fieldset>

              <fieldset className="win2k-groupbox">
                <legend>4. SED Extraction & Ice Diagnostics</legend>
                <p className="p-1">
                  Click any pixel in the viewer for a 102-band spectrum with H2O (3.05 µm), CH4 (3.30 µm), CO2 (4.27 µm), and CO (4.67 µm) markers.
                </p>
              </fieldset>

              <fieldset className="win2k-groupbox">
                <legend>5. Gaia DR3 & NEOSSat Cross-Match</legend>
                <p className="p-1">
                  Cross-match candidate movers with Gaia proper motions/parallaxes and NEOSSat asteroid tracks.
                </p>
              </fieldset>
            </div>
          )}
        </div>

        {/* dialog action buttons */}
        {!inline && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="win2k-btn h-[23px] px-5 font-bold"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return <div className="w-full flex-1 flex flex-col font-sans select-none text-[11px] min-h-0">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans select-none text-[11px]">
      {content}
    </div>
  );
};
