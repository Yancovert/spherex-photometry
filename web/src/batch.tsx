// utilitarian parameter-driven batch analysis form
// 1:1 authentic 2000s windows win32 dialog layout
import React, { useState, useEffect } from 'react';
import {
  PhotometryParams,
  BatchRequest,
  PRESET_PROFILES,
  scanLocalFiles,
  ScannedFile,
  loadCustomProfiles,
  saveCustomProfile,
  deleteCustomProfile
} from './api';
import { FileDialog } from './file_dialog';

interface BatchFormProps {
  onRun: (req: BatchRequest) => void;
  onCancel: () => void;
  isRunning: boolean;
  statusText: string;
  progressPercent: number;
  suffix: string;
  onSuffixChange: (s: string) => void;
}

export const BatchForm: React.FC<BatchFormProps> = ({
  onRun,
  onCancel,
  isRunning,
  statusText,
  progressPercent,
  suffix,
  onSuffixChange
}) => {
  // input mode
  const [sourceType, setSourceType] = useState<'file' | 'folder' | 'archive'>('file');
  const [filePath, setFilePath] = useState<string>('cache/level2_2025W46_2A_0001_1D1_spx_l2b-v20-2025-321.fits');
  const [folderPath, setFolderPath] = useState<string>('cache');
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);

  // target mode
  const [targetMode, setTargetMode] = useState<'presets' | 'single' | 'csv'>('presets');
  const [singleId, setSingleId] = useState<string>('Target_1');
  const [singleRa, setSingleRa] = useState<number>(154.3488);
  const [singleDec, setSingleDec] = useState<number>(61.5057);
  const [selectedPresets, setSelectedPresets] = useState<string[]>(['field1', 'field2', 'barnard']);
  const [csvTargets, setCsvTargets] = useState<Array<{ id: string; ra: number; dec: number }>>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');

  // output configuration
  const [outputFolder, setOutputFolder] = useState<string>('');

  // parameters
  const [params, setParams] = useState<PhotometryParams>(PRESET_PROFILES.point_source.params);

  // profile manager
  const [profileName, setProfileName] = useState<string>('point_source');
  const [customProfiles, setCustomProfiles] = useState<Record<string, PhotometryParams>>({});

  // multi-channel band selection
  const [multiBand, setMultiBand] = useState<boolean>(false);
  const [fileDialogMode, setFileDialogMode] = useState<'file' | 'folder' | null>(null);

  useEffect(() => {
    scanLocalFiles('cache')
      .then(res => setScannedFiles(res.files))
      .catch(() => {});
    setCustomProfiles(loadCustomProfiles());
  }, []);

  const benchmarkPresets = [
    { id: 'field1', name: 'Field 1 (Ursa Major)', ra: 154.3488, dec: 61.5057 },
    { id: 'field2', name: 'Field 2 (Emission Ring)', ra: 161.7300, dec: 45.3400 },
    { id: 'barnard', name: "Barnard's Star", ra: 269.4520, dec: 4.6930 },
    { id: 'nep', name: 'North Ecliptic Pole Deep', ra: 270.0000, dec: 66.5607 },
    { id: 'sep', name: 'South Ecliptic Pole Deep', ra: 90.0000, dec: -66.5607 },
    { id: 'wise0855', name: 'WISE 0855-0714', ra: 133.7951, dec: -7.2451 }
  ];

  const handleLoadProfile = (key: string) => {
    setProfileName(key);
    if (PRESET_PROFILES[key]) {
      setParams({ ...PRESET_PROFILES[key].params });
    } else if (customProfiles[key]) {
      setParams({ ...customProfiles[key] });
    }
  };

  const handleSaveCurrentProfile = () => {
    const name = window.prompt('Save profile as:', profileName);
    if (!name) return;
    saveCustomProfile(name, params);
    setCustomProfiles(loadCustomProfiles());
    setProfileName(name);
  };

  const handleDeleteProfile = () => {
    if (PRESET_PROFILES[profileName]) {
      alert('Cannot delete built-in system profile.');
      return;
    }
    deleteCustomProfile(profileName);
    setCustomProfiles(loadCustomProfiles());
    setProfileName('point_source');
    setParams({ ...PRESET_PROFILES.point_source.params });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const text = String(evt.target?.result || '');
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) return;

      const header = lines[0].toLowerCase().split(',').map(h => h.trim());
      const raIdx = header.findIndex(h => h.includes('ra'));
      const decIdx = header.findIndex(h => h.includes('dec'));
      const idIdx = header.findIndex(h => h.includes('id') || h.includes('name'));

      const parsed: Array<{ id: string; ra: number; dec: number }> = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const ra = parseFloat(parts[raIdx >= 0 ? raIdx : 0]);
        const dec = parseFloat(parts[decIdx >= 0 ? decIdx : 1]);
        const id = idIdx >= 0 ? parts[idIdx] : `Target_${i}`;
        if (!isNaN(ra) && !isNaN(dec)) {
          parsed.push({ id, ra, dec });
        }
      }
      setCsvTargets(parsed);
    };
    reader.readAsText(file);
  };

  const buildTargets = () => {
    if (targetMode === 'single') {
      return [{ id: singleId, ra: singleRa, dec: singleDec }];
    }
    if (targetMode === 'csv') {
      return csvTargets;
    }
    return benchmarkPresets
      .filter(p => selectedPresets.includes(p.id))
      .map(p => ({ id: p.name, ra: p.ra, dec: p.dec }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targets = buildTargets();
    if (targets.length === 0) {
      alert('Error: Please select or specify at least one coordinate target.');
      return;
    }

    const bands = multiBand ? [1, 17, 33, 49, 65, 81] : [1];
    onRun({
      sourceType,
      filePath,
      folderPath,
      targets,
      params,
      bands
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5 text-[11px] text-black">
      {/* 1. INPUT GROUPBOX */}
      <fieldset className="win2k-groupbox">
        <legend>Input</legend>

        <div className="space-y-2 pt-1">
          {/* source mode radios */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                checked={sourceType === 'file'}
                onChange={() => setSourceType('file')}
              />
              <span>Single file</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                checked={sourceType === 'folder'}
                onChange={() => setSourceType('folder')}
              />
              <span>Folder (Batch)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                checked={sourceType === 'archive'}
                onChange={() => setSourceType('archive')}
              />
              <span>IRSA Archive / Precursor</span>
            </label>
          </div>

          {/* path inputs */}
          {sourceType === 'file' && (
            <div className="flex items-center gap-2">
              <span className="w-12 text-black">Path</span>
              <input
                type="text"
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                className="win2k-input flex-1 font-mono text-[11px]"
              />
              {scannedFiles.length > 0 && (
                <select
                  onChange={e => setFilePath(e.target.value)}
                  className="win2k-select max-w-xs"
                >
                  <option value="">Quick Select FITS...</option>
                  {scannedFiles.map(f => (
                    <option key={f.name} value={f.path}>{f.name} ({(f.sizeBytes / 1024 / 1024).toFixed(1)} MB)</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setFileDialogMode('file')}
                className="win2k-btn min-w-[70px]"
              >
                Browse...
              </button>
            </div>
          )}

          {sourceType === 'folder' && (
            <div className="flex items-center gap-2">
              <span className="w-12 text-black">Folder</span>
              <input
                type="text"
                value={folderPath}
                onChange={e => setFolderPath(e.target.value)}
                className="win2k-input flex-1 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() => setFileDialogMode('folder')}
                className="win2k-btn min-w-[70px]"
              >
                Browse...
              </button>
            </div>
          )}

          {/* target coordinates selection */}
          <div className="pt-2 border-t border-neutral-300">
            <div className="flex items-center gap-4 mb-1.5">
              <span className="font-bold">Targets:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === 'presets'}
                  onChange={() => setTargetMode('presets')}
                />
                <span>Benchmark Presets</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === 'single'}
                  onChange={() => setTargetMode('single')}
                />
                <span>Single Coordinate</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === 'csv'}
                  onChange={() => setTargetMode('csv')}
                />
                <span>Catalog CSV Upload</span>
              </label>
            </div>

            {targetMode === 'presets' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-white win2k-sunken max-h-28 overflow-y-auto">
                {benchmarkPresets.map(p => {
                  const isChecked = selectedPresets.includes(p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-1.5 p-1 hover:bg-[#0a246a] hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) setSelectedPresets(selectedPresets.filter(id => id !== p.id));
                          else setSelectedPresets([...selectedPresets, p.id]);
                        }}
                      />
                      <span className="truncate">
                        <strong>{p.name}</strong> <span className="opacity-80">({p.ra.toFixed(1)}, {p.dec.toFixed(1)})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {targetMode === 'single' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="block mb-0.5">Object ID:</span>
                  <input
                    type="text"
                    value={singleId}
                    onChange={e => setSingleId(e.target.value)}
                    className="win2k-input w-full"
                  />
                </div>
                <div>
                  <span className="block mb-0.5">Right Ascension (deg):</span>
                  <input
                    type="number"
                    step="any"
                    value={singleRa}
                    onChange={e => setSingleRa(parseFloat(e.target.value) || 0)}
                    className="win2k-input w-full font-mono"
                  />
                </div>
                <div>
                  <span className="block mb-0.5">Declination (deg):</span>
                  <input
                    type="number"
                    step="any"
                    value={singleDec}
                    onChange={e => setSingleDec(parseFloat(e.target.value) || 0)}
                    className="win2k-input w-full font-mono"
                  />
                </div>
              </div>
            )}

            {targetMode === 'csv' && (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvUpload}
                  className="text-[11px]"
                />
                {csvFileName && (
                  <span className="text-black">
                    Loaded: <strong>{csvFileName}</strong> ({csvTargets.length} targets)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* 2. OUTPUT GROUPBOX */}
      <fieldset className="win2k-groupbox">
        <legend>Output</legend>
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-20">Output folder</span>
            <input
              type="text"
              value={outputFolder}
              onChange={e => setOutputFolder(e.target.value)}
              placeholder="Leave empty to write next to source file or export on demand."
              className="win2k-input flex-1 font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={() => setFileDialogMode('folder')}
              className="win2k-btn min-w-[70px]"
            >
              Browse...
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20">Output suffix</span>
            <input
              type="text"
              value={suffix}
              onChange={e => onSuffixChange(e.target.value)}
              className="win2k-input w-44 font-mono text-[11px]"
            />
            <span className="text-neutral-600">Appended to exported FITS and CSV tables</span>
          </div>
        </div>
      </fieldset>

      {/* 3. PARAMETERS GROUPBOX */}
      <fieldset className="win2k-groupbox">
        <legend>Parameters</legend>

        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 pt-0.5">
          {/* col 1: apertures */}
          <div className="space-y-1">
            <div>
              <span className="block mb-0.5">Aperture radius (arcsec)</span>
              <input
                type="number"
                step="0.1"
                value={params.apertureRadiusArcsec}
                onChange={e => setParams({ ...params, apertureRadiusArcsec: parseFloat(e.target.value) || 1 })}
                className="win2k-input w-full font-mono"
              />
            </div>
            <div>
              <span className="block mb-0.5">Annulus inner (arcsec)</span>
              <input
                type="number"
                step="0.1"
                value={params.annulusInnerArcsec}
                onChange={e => setParams({ ...params, annulusInnerArcsec: parseFloat(e.target.value) || 2 })}
                className="win2k-input w-full font-mono"
              />
            </div>
            <div>
              <span className="block mb-0.5">Annulus outer (arcsec)</span>
              <input
                type="number"
                step="0.1"
                value={params.annulusOuterArcsec}
                onChange={e => setParams({ ...params, annulusOuterArcsec: parseFloat(e.target.value) || 3 })}
                className="win2k-input w-full font-mono"
              />
            </div>
          </div>

          {/* col 2: statistics */}
          <div className="space-y-1">
            <div>
              <span className="block mb-0.5">Sigma clip threshold</span>
              <input
                type="number"
                step="0.1"
                value={params.sigmaClipThreshold}
                onChange={e => setParams({ ...params, sigmaClipThreshold: parseFloat(e.target.value) || 3.0 })}
                className="win2k-input w-full font-mono"
              />
            </div>
            <div>
              <span className="block mb-0.5">Estimator</span>
              <select
                value={params.estimator}
                onChange={e => setParams({ ...params, estimator: e.target.value as any })}
                className="win2k-select w-full"
              >
                <option value="sigma_clipped_median">Sigma-clipped Median</option>
                <option value="mean">Mean</option>
              </select>
            </div>
            <div>
              <span className="block mb-0.5">Output Units</span>
              <select
                value={params.unit}
                onChange={e => setParams({ ...params, unit: e.target.value as any })}
                className="win2k-select w-full"
              >
                <option value="ujy">uJy (microJansky)</option>
                <option value="mjy">mJy (milliJansky)</option>
                <option value="mjy_sr">MJy/sr (detector)</option>
                <option value="ab_mag">AB Magnitude</option>
              </select>
            </div>
          </div>

          {/* col 3: wavelength and corrections */}
          <div className="space-y-1">
            <div>
              <span className="block mb-0.5">Wavelength (um)</span>
              <input
                type="number"
                step="0.01"
                value={params.wavelengthUm ?? 0.75}
                onChange={e => setParams({ ...params, wavelengthUm: parseFloat(e.target.value) || 0.75 })}
                className="win2k-input w-full font-mono"
              />
            </div>
            <div className="pt-1 space-y-1">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.applyApertureCorrection}
                  onChange={e => setParams({ ...params, applyApertureCorrection: e.target.checked })}
                />
                <span>Aperture Flux Correction</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.subtractZodi}
                  onChange={e => setParams({ ...params, subtractZodi: e.target.checked })}
                />
                <span>ZODI Subtraction (HDU 4)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.maskFlags}
                  onChange={e => setParams({ ...params, maskFlags: e.target.checked })}
                />
                <span>Mask Bad DQ Flags</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-neutral-300 flex items-center justify-between">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={multiBand}
              onChange={e => setMultiBand(e.target.checked)}
            />
            <span>Extract full 6-channel LVF array spectrum (0.75 - 5.0 um)</span>
          </label>

          <button
            type="button"
            onClick={() => setParams({ ...PRESET_PROFILES.point_source.params })}
            className="win2k-btn"
          >
            Load recommended defaults
          </button>
        </div>
      </fieldset>

      {/* 4. PROFILE MANAGER GROUPBOX */}
      <fieldset className="win2k-groupbox">
        <legend>Profile Manager</legend>

        <div className="flex items-center gap-2 pt-1">
          <span className="w-20">Profile name</span>
          <select
            value={profileName}
            onChange={e => handleLoadProfile(e.target.value)}
            className="win2k-select w-64"
          >
            <optgroup label="Built-in Presets">
              {Object.entries(PRESET_PROFILES).map(([k, p]) => (
                <option key={k} value={k}>{p.label}</option>
              ))}
            </optgroup>
            {Object.keys(customProfiles).length > 0 && (
              <optgroup label="Custom Profiles">
                {Object.keys(customProfiles).map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </optgroup>
            )}
          </select>

          <button
            type="button"
            onClick={handleSaveCurrentProfile}
            className="win2k-btn min-w-[85px]"
          >
            Save current
          </button>
          <button
            type="button"
            onClick={() => handleLoadProfile(profileName)}
            className="win2k-btn min-w-[65px]"
          >
            Load
          </button>
          <button
            type="button"
            onClick={handleDeleteProfile}
            className="win2k-btn min-w-[65px]"
          >
            Delete
          </button>
        </div>
        <p className="text-neutral-600 text-[10px] mt-1">
          Profiles store parameter and export settings, but not the selected input path or output folder.
        </p>
      </fieldset>

      {/* 5. EXECUTION & PROGRESS BAR */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-2.5">
          <button
            type="submit"
            disabled={isRunning}
            className="win2k-btn font-bold min-w-[80px]"
          >
            Run
          </button>
          <button
            type="button"
            disabled={!isRunning}
            onClick={onCancel}
            className="win2k-btn min-w-[80px]"
          >
            Cancel
          </button>
          <span className="ml-2 font-semibold">
            {statusText}
          </span>
          <span className="ml-auto font-mono">
            {progressPercent}%
          </span>
        </div>

        {/* authentic progress bar */}
        <div className="win2k-progress-trough w-full">
          <div
            className="win2k-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {fileDialogMode && (
        <FileDialog
          files={scannedFiles}
          initialPath={fileDialogMode === 'folder' ? folderPath : filePath}
          mode={fileDialogMode}
          onSelect={p => {
            if (fileDialogMode === 'folder') setFolderPath(p);
            else setFilePath(p);
          }}
          onClose={() => setFileDialogMode(null)}
        />
      )}
    </form>
  );
};
