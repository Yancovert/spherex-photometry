// main application view for spherex & planet x workstation
// 1:1 authentic 2000s windows desktop interface combining wiseview-heritage multi-epoch blinking,
// gaia dr3 & csa neossat cross-matching, and batch aperture photometry
import React, { useState, useEffect, useMemo } from 'react';
import { Viewer, CursorHover } from './viewer';
import { InputBar, ColormapType, MathTransfer, ViewerMode } from './input';
import { BlinkBar } from './blink';
import { BandsBar } from './bands';
import { SpectralModal } from './chart';
import { SidebarCatalog } from './sidebar_catalog';
import { ResourcesModal } from './resources_modal';
import { BatchForm } from './batch';
import { ConsoleBox } from './console';
import { ResultsTable } from './table';
import { HelpDialog } from './help_dialog';
import {
  BandInfo,
  SpectrumData,
  BatchRequest,
  PhotometryResult,
  fetchBands,
  fetchSpectrum,
  runBatchPhotometry
} from './api';

export const App: React.FC = () => {
  // parse initial url parameters synchronously to prevent mount re-render cascade
  const initParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  // top-level tab control
  const [activeTab, setActiveTab] = useState<'blink' | 'batch' | 'catalogs' | 'resources'>(() => {
    const t = initParams.get('tab');
    return (t === 'blink' || t === 'batch' || t === 'catalogs' || t === 'resources') ? t : 'blink';
  });

  // celestial coordinates and display settings (defaults to barnard's star)
  const [ra, setRa] = useState<number>(() => {
    const v = parseFloat(initParams.get('ra') || '');
    return !isNaN(v) ? v : 269.4520;
  });
  const [dec, setDec] = useState<number>(() => {
    const v = parseFloat(initParams.get('dec') || '');
    return !isNaN(v) ? v : 4.6930;
  });
  const [fov, setFov] = useState<number>(() => {
    const v = parseFloat(initParams.get('fov') || '');
    return !isNaN(v) ? v : 0.5;
  });
  const [targetLabel, setTargetLabel] = useState<string>("Barnard's Star (Dipole)");

  // multi-epoch blinking and inspection parameters
  const [epoch, setEpoch] = useState<number>(() => {
    const v = parseInt(initParams.get('epoch') || '', 10);
    return !isNaN(v) && v >= 1 && v <= 4 ? v : 1;
  });
  const [band, setBand] = useState<number>(() => {
    const v = parseInt(initParams.get('band') || '', 10);
    return !isNaN(v) && v >= 1 && v <= 102 ? v : 1;
  });
  const [stackedArray, setStackedArray] = useState<number | null>(null);
  const [colormap, setColormap] = useState<ColormapType>(() => {
    const c = initParams.get('colormap');
    if (c && ['grayscale', 'viridis', 'bipolar', 'inferno', 'plasma', 'turbo', 'coolwarm', 'inverted'].includes(c)) {
      return c as ColormapType;
    }
    return 'grayscale'; // default to astronomical monochrome grayscale like WiseView
  });
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [cursorHover, setCursorHover] = useState<CursorHover | null>(null);
  const [transfer, setTransfer] = useState<MathTransfer>('asinh');
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [mode, setMode] = useState<ViewerMode>(() => {
    const m = initParams.get('mode');
    return (m === 'single' || m === 'blink' || m === 'diff') ? m : 'blink';
  });
  const [savePngTrigger, setSavePngTrigger] = useState<number>(0);

  // blinking animator state
  const [playing, setPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(4);
  const [diffPair, setDiffPair] = useState<[number, number]>([1, 2]);

  // sidebars and overlays
  const [isCatalogOpen, setIsCatalogOpen] = useState<boolean>(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState<boolean>(false);
  const [spectrumData, setSpectrumData] = useState<SpectrumData | null>(null);
  const [showWinHelp, setShowWinHelp] = useState<boolean>(false);

  // bands catalog
  const [bands, setBands] = useState<BandInfo[]>([]);

  // batch photometry state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Ready');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [suffix, setSuffix] = useState<string>('photometry');
  const [batchSubTab, setBatchSubTab] = useState<'results' | 'log'>('log');
  const [results, setResults] = useState<PhotometryResult[]>([]);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Pipeline ready. Local cache mounted at ./cache`,
    `[${new Date().toLocaleTimeString()}] Calibration baseline loaded: SPHEREx v28 CBE (6.20"/px, 96 LVF channels).`,
    `[${new Date().toLocaleTimeString()}] Ready for batch aperture photometry job submission.`
  ]);

  // synchronize active parameters to url without page reloads
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('ra', ra.toFixed(4));
    params.set('dec', dec.toFixed(4));
    params.set('fov', fov.toString());
    params.set('epoch', epoch.toString());
    params.set('band', band.toString());
    params.set('mode', mode);
    if (activeTab !== 'blink') params.set('tab', activeTab);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [ra, dec, fov, epoch, band, mode, activeTab]);

  // f1 opens help dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowWinHelp(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // load band information on startup
  useEffect(() => {
    fetchBands()
      .then(b => setBands(b))
      .catch(() => {
        // fallback to standard 102 channels across 6 arrays
        const generated: BandInfo[] = [];
        for (let i = 1; i <= 102; i++) {
          const arr = Math.min(6, Math.floor((i - 1) / 17) + 1);
          const wl = 0.75 + (i - 1) * ((5.0 - 0.75) / 101);
          generated.push({ index: i, wavelength: Number(wl.toFixed(3)), array: arr });
        }
        setBands(generated);
      });
  }, []);

  const handleUpdateCoords = (newRa: number, newDec: number, newFov: number, label?: string) => {
    setRa(newRa);
    setDec(newDec);
    setFov(newFov);
    if (label) setTargetLabel(label);
  };

  const handleSourceClick = async (px: number, py: number) => {
    try {
      const data = await fetchSpectrum(ra, dec, epoch, px, py);
      setSpectrumData(data);
    } catch (err) {
      console.error('failed extracting spectrum', err);
    }
  };

  const handleSelectTarget = (_id: string, tRa: number, tDec: number, tFov: number) => {
    setRa(tRa);
    setDec(tDec);
    setFov(tFov);
    setActiveTab('blink');
  };

  // batch photometry execution
  const handleRunBatch = async (req: BatchRequest) => {
    setIsRunning(true);
    setStatusText('Running aperture photometry...');
    setProgressPercent(15);
    setBatchSubTab('log');
    setLogs(prev => [
      ...prev,
      `--- Starting batch run with ${req.targets.length} target(s) (${req.sourceType} mode) ---`
    ]);

    try {
      setProgressPercent(45);
      const res = await runBatchPhotometry(req);
      setProgressPercent(100);
      setStatusText(`Completed (${res.count} measurements in ${(res.durationMs / 1000).toFixed(2)}s)`);
      setResults(res.results);
      setLogs(prev => [...prev, ...res.logs]);
      if (res.results.length > 0) {
        setBatchSubTab('results');
      }
    } catch (err: any) {
      setStatusText(`Error: ${err.message}`);
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
      setProgressPercent(0);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancelBatch = () => {
    setIsRunning(false);
    setStatusText('Canceled by user');
    setLogs(prev => [...prev, 'WARN: Batch extraction canceled by user.']);
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#d4d0c8] select-none m-0 p-0 text-black font-sans text-[11px]">
      {/* tab control (SysTabControl32) */}
      <div className="win2k-tabs-bar px-1 pt-1 bg-[#d4d0c8] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('blink')}
          className={`win2k-tab-btn ${activeTab === 'blink' ? 'win2k-tab-btn-active' : ''}`}
        >
          Comparator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`win2k-tab-btn ${activeTab === 'batch' ? 'win2k-tab-btn-active' : ''}`}
        >
          Batch Photometry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('catalogs')}
          className={`win2k-tab-btn ${activeTab === 'catalogs' ? 'win2k-tab-btn-active' : ''}`}
        >
          Cross-Match
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`win2k-tab-btn ${activeTab === 'resources' ? 'win2k-tab-btn-active' : ''}`}
        >
          Resources
        </button>
      </div>

        {/* main tab interior */}
        <div className="p-1 bg-[#d4d0c8] text-black font-sans text-[11px] flex-1 min-h-0 flex flex-col">
          {/* tab 1: blink comparator view */}
          {activeTab === 'blink' && (
            <div className="flex-1 min-h-0 flex flex-col space-y-1">
              <InputBar
                ra={ra}
                dec={dec}
                fov={fov}
                colormap={colormap}
                transfer={transfer}
                measureMode={measureMode}
                mode={mode}
                onUpdate={handleUpdateCoords}
                onColormapChange={setColormap}
                onTransferChange={setTransfer}
                onToggleMeasure={() => setMeasureMode(m => !m)}
                onSavePng={() => setSavePngTrigger(t => t + 1)}
                onModeChange={setMode}
                onFovChange={setFov}
                onToggleCatalog={() => setIsCatalogOpen(c => !c)}
                catalogOpen={isCatalogOpen}
                onToggleResources={() => setIsResourcesOpen(true)}
                onOpenSed={() => handleSourceClick(14, 14)}
                showReticle={showReticle}
                onToggleReticle={() => setShowReticle(r => !r)}
              />

              {/* authentic sunken canvas viewport */}
              <div className="win2k-sunken relative flex-1 min-h-0 bg-black overflow-hidden flex">
                <Viewer
                  ra={ra}
                  dec={dec}
                  fov={fov}
                  epoch={epoch}
                  band={band}
                  colormap={colormap}
                  transfer={transfer}
                  measureMode={measureMode}
                  mode={mode}
                  savePngTrigger={savePngTrigger}
                  targetLabel={targetLabel}
                  diffPair={diffPair}
                  playing={playing}
                  fps={fps}
                  showReticle={showReticle}
                  onEpochChange={setEpoch}
                  onFovChange={setFov}
                  onSourceClick={handleSourceClick}
                  onHover={setCursorHover}
                />

                <SidebarCatalog
                  isOpen={isCatalogOpen}
                  onClose={() => setIsCatalogOpen(false)}
                  ra={ra}
                  dec={dec}
                  fov={fov}
                  onSelectCoords={(sRa, sDec) => {
                    setRa(sRa);
                    setDec(sDec);
                  }}
                />
              </div>

              {/* bottom blink & band controls */}
              <BlinkBar
                epoch={epoch}
                maxEpochs={4}
                playing={playing}
                fps={fps}
                diffMode={mode === 'diff'}
                diffPair={diffPair}
                stretch={transfer === 'linear' ? 'linear' : 'asinh'}
                onEpochChange={setEpoch}
                onTogglePlay={() => setPlaying(p => !p)}
                onFpsChange={setFps}
                onToggleDiff={() => setMode(m => (m === 'diff' ? 'blink' : 'diff'))}
                onDiffPairChange={setDiffPair}
                onStretchChange={str => setTransfer(str)}
              />

              <BandsBar
                bands={bands}
                activeBand={band}
                stackedArray={stackedArray}
                onBandChange={setBand}
                onStackChange={setStackedArray}
              />
            </div>
          )}

          {/* tab 2: windows 2000 batch photometry */}
          {activeTab === 'batch' && (
            <div className="p-1 space-y-1.5">
              <BatchForm
                onRun={handleRunBatch}
                onCancel={handleCancelBatch}
                isRunning={isRunning}
                statusText={statusText}
                progressPercent={progressPercent}
                suffix={suffix}
                onSuffixChange={setSuffix}
              />

              <div className="pt-0.5">
                <div className="win2k-tabs-bar">
                  <button
                    type="button"
                    onClick={() => setBatchSubTab('results')}
                    className={`win2k-tab-btn ${batchSubTab === 'results' ? 'win2k-tab-btn-active' : ''}`}
                  >
                    Results {results.length > 0 ? `(${results.length})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchSubTab('log')}
                    className={`win2k-tab-btn ${batchSubTab === 'log' ? 'win2k-tab-btn-active' : ''}`}
                  >
                    Log ({logs.length})
                  </button>
                </div>

                <div className="pt-1">
                  {batchSubTab === 'results' ? (
                    results.length > 0 ? (
                      <ResultsTable results={results} suffix={suffix} />
                    ) : (
                      <div className="win2k-sunken p-4 text-center text-neutral-500 italic h-44 flex items-center justify-center">
                        No batch photometry results yet. Specify targets and click 'Run'.
                      </div>
                    )
                  ) : (
                    <ConsoleBox logs={logs} onClear={() => setLogs([])} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* tab 3: dedicated cross-match catalogs view */}
          {activeTab === 'catalogs' && (
            <div className="p-2 space-y-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Field Catalogs:</strong> RA {ra.toFixed(4)}°, Dec {dec.toFixed(4)}° (FoV: {fov.toFixed(2)}°)
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('blink')}
                  className="win2k-btn h-[22px] px-3 font-bold"
                >
                  Return to Comparator
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                <SidebarCatalog
                  isOpen={true}
                  onClose={() => setActiveTab('blink')}
                  ra={ra}
                  dec={dec}
                  fov={fov}
                  inline={true}
                  onSelectCoords={(sRa, sDec) => {
                    setRa(sRa);
                    setDec(sDec);
                    setActiveTab('blink');
                  }}
                />
              </div>
            </div>
          )}

          {/* tab 4: challenge resources & citizen science guide */}
          {activeTab === 'resources' && (
            <div className="p-2 space-y-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-1 border-b border-[#808080]">
                <strong>Planet X & SPHEREx Mission Documentation</strong>
                <button
                  type="button"
                  onClick={() => setActiveTab('blink')}
                  className="win2k-btn h-[22px] px-3 font-bold"
                >
                  Open in Comparator
                </button>
              </div>

              <ResourcesModal
                isOpen={true}
                onClose={() => setActiveTab('blink')}
                onSelectTarget={handleSelectTarget}
                inline={true}
              />
            </div>
          )}
        </div>

        {/* classic win32 status bar */}
        <div className="win2k-statusbar">
          <div className="win2k-status-pane flex-1 truncate">
            {cursorHover && cursorHover.visible ? (
              <span>
                Pixel: [{cursorHover.pixelX}, {cursorHover.pixelY}] • RA: {cursorHover.raDeg.toFixed(4)}°, Dec: {cursorHover.decDeg.toFixed(4)}° • Flux: {cursorHover.val.toFixed(2)} {cursorHover.bunit}
              </span>
            ) : (
              <span>Target: {targetLabel} (RA: {ra.toFixed(4)}°, Dec: {dec.toFixed(4)}°) • Ready</span>
            )}
          </div>
          <div className="win2k-status-pane w-44 truncate">
            {mode === 'diff'
              ? `Difference: E${diffPair[1]} - E${diffPair[0]}`
              : `Epoch ${epoch}/4 (${playing ? `${fps} Hz Blink` : 'Manual'})`}
          </div>
          <div className="win2k-status-pane w-44 truncate">
            Band {band}/102 ({bands[band - 1]?.wavelength.toFixed(3) || '0.750'} µm)
          </div>
          <div className="win2k-status-pane w-28 truncate">SPHEREx QR2</div>
          <div className="win2k-status-pane w-20 truncate">6.20"/px</div>
          <div className="w-4 text-center text-neutral-500 font-mono text-[9px] select-none">:::</div>
        </div>

      {/* modal dialogs */}
      <HelpDialog isOpen={showWinHelp} onClose={() => setShowWinHelp(false)} />
      <SpectralModal data={spectrumData} onClose={() => setSpectrumData(null)} />
      {isResourcesOpen && activeTab !== 'resources' && (
        <ResourcesModal
          isOpen={isResourcesOpen}
          onClose={() => setIsResourcesOpen(false)}
          onSelectTarget={handleSelectTarget}
        />
      )}
    </div>
  );
};
