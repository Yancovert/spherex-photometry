// main application view for spherex batch aperture photometry tool
// 1:1 authentic 2000s windows desktop dialog interface
import React, { useState } from 'react';
import { BatchForm } from './batch';
import { ConsoleBox } from './console';
import { ResultsTable } from './table';
import { HelpDialog } from './help_dialog';
import { BatchRequest, PhotometryResult, runBatchPhotometry } from './api';

export const App: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Ready');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [suffix, setSuffix] = useState<string>('photometry');
  const [activeTab, setActiveTab] = useState<'results' | 'log'>('log');
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Pipeline ready. Local cache mounted at ./cache`,
    `[${new Date().toLocaleTimeString()}] Calibration baseline loaded: SPHEREx v28 CBE (6.20"/px, 96 LVF channels).`,
    `[${new Date().toLocaleTimeString()}] Ready for batch aperture photometry job submission.`
  ]);

  const [results, setResults] = useState<PhotometryResult[]>([]);

  const handleRun = async (req: BatchRequest) => {
    setIsRunning(true);
    setStatusText('Running aperture photometry...');
    setProgressPercent(15);
    setActiveTab('log');
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
        setActiveTab('results');
      }
    } catch (err: any) {
      setStatusText(`Error: ${err.message}`);
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
      setProgressPercent(0);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = () => {
    setIsRunning(false);
    setStatusText('Canceled by user');
    setLogs(prev => [...prev, 'WARN: Batch extraction canceled by user.']);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-2 select-none">
      {/* authentic windows 2000 window frame */}
      <div className="win2k-window flex flex-col w-full max-w-[700px] my-1">
        {/* titlebar */}
        <div className="win2k-titlebar flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {/* classic 16x16 application icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
              <rect width="16" height="16" fill="#000080" />
              <circle cx="8" cy="8" r="5" fill="#ffd700" />
              <path d="M 2 8 L 14 8 M 8 2 L 8 14" stroke="#ffffff" strokeWidth="1" />
            </svg>
            <span className="truncate">Batch Photometry Tool v1.4</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="win2k-title-btn font-bold cursor-pointer shrink-0 ml-2"
            title="How to Use"
          >
            ?
          </button>
        </div>

        {/* main dialog interior */}
        <div className="p-2 space-y-1.5">
          {/* batch form */}
          <BatchForm
            onRun={handleRun}
            onCancel={handleCancel}
            isRunning={isRunning}
            statusText={statusText}
            progressPercent={progressPercent}
            suffix={suffix}
            onSuffixChange={setSuffix}
          />

          {/* tab control for results table and execution telemetry log */}
          <div className="pt-0.5">
            <div className="win2k-tabs-bar">
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`win2k-tab-btn ${activeTab === 'results' ? 'win2k-tab-btn-active' : ''}`}
              >
                Results Table {results.length > 0 ? `(${results.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('log')}
                className={`win2k-tab-btn ${activeTab === 'log' ? 'win2k-tab-btn-active' : ''}`}
              >
                Execution Log ({logs.length})
              </button>
            </div>

            <div className="pt-1">
              {activeTab === 'results' ? (
                results.length > 0 ? (
                  <ResultsTable results={results} suffix={suffix} />
                ) : (
                  <div className="win2k-sunken p-4 text-center text-neutral-500 italic h-44 flex items-center justify-center">
                    No batch photometry results yet. Specify targets and click 'Run'.
                  </div>
                )
              ) : (
                <ConsoleBox logs={logs} onClear={handleClearLogs} />
              )}
            </div>
          </div>
        </div>

        {/* classic win32 status bar */}
        <div className="win2k-statusbar">
          <div className="win2k-status-pane flex-1 truncate">{statusText}</div>
          <div className="win2k-status-pane w-44 truncate">SPHEREx QR2 / Caltech IRSA</div>
          <div className="win2k-status-pane w-32 truncate">96 LVF Channels</div>
          <div className="win2k-status-pane w-24 truncate">6.20"/px</div>
          <div className="w-4 text-center text-neutral-500 font-mono text-[9px] select-none">:::</div>
        </div>
      </div>

      <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
