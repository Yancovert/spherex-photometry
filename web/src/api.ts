// api client for spherex backend proxy and batch aperture photometry engine

export interface GaiaSource {
  sourceId: string;
  ra: number;
  dec: number;
  photGMeanMag: number | null;
  pmra: number | null;
  pmdec: number | null;
  parallax: number | null;
  ruwe?: number | null;
}

export interface NeossatTrack {
  id: string;
  targetName: string;
  ra: number;
  dec: number;
  observationDate: string;
  cadcUrl: string;
  type: string;
}

export interface ChallengeResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  description: string;
  tags: string[];
}

export interface TargetInfo {
  name: string;
  ra: number;
  dec: number;
  type: string;
  desc: string;
}

export interface BandInfo {
  index: number;
  wavelength: number;
  array: number;
  fwhm?: number;
}

export interface SpectrumData {
  ra: number;
  dec: number;
  epoch: number;
  target?: string;
  points: { band: number; wavelength: number; array: number; flux: number }[];
  markers: { name: string; wavelength: number; color: string }[];
}

export interface ProviderExposure {
  uri: string;
  planeId: string;
  bandpass: string;
  mjd: number;
  utcDate: string;
  pipelineVersion: string;
  isCached: boolean;
}

export interface PixelResponse {
  width: number;
  height: number;
  pixels: Float32Array;
  bunit: string;
  source: string;
  hasSphereX: boolean;
  wcs?: any;
}

const PRODUCTION_FALLBACK_API = 'https://spherex-photometry.vercel.app';

export function getApiUrl(subpath: string): string {
  const cleanSub = subpath.startsWith('/') ? subpath : `/${subpath}`;
  const envBase = (import.meta as any).env?.VITE_API_URL;
  if (envBase) {
    return `${envBase.replace(/\/$/, '')}${cleanSub}`;
  }
  // when running on github pages or hugging face space, call vercel backend
  if (typeof window !== 'undefined' && (window.location.hostname.includes('github.io') || window.location.hostname.includes('hf.space') || window.location.hostname.includes('huggingface.co'))) {
    return `${PRODUCTION_FALLBACK_API}${cleanSub}`;
  }
  return cleanSub;
}

export async function fetchTargets(): Promise<Record<string, TargetInfo>> {
  const res = await fetch(getApiUrl('/api/targets'));
  return res.json();
}

export async function fetchBands(): Promise<BandInfo[]> {
  const res = await fetch(getApiUrl('/api/bands'));
  return res.json();
}

export async function resolveTarget(name: string): Promise<{ ra: number; dec: number; name: string } | null> {
  const res = await fetch(getApiUrl(`/api/resolve?name=${encodeURIComponent(name)}`));
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPixels(
  ra: number,
  dec: number,
  epoch: number,
  band: number,
  fov: number,
  subtractZodi?: boolean
): Promise<PixelResponse> {
  const res = await fetch(getApiUrl(`/api/pixels?ra=${ra}&dec=${dec}&epoch=${epoch}&band=${band}&fov=${fov}&zodi=${subtractZodi ? 1 : 0}`));
  if (!res.ok) throw new Error('failed to fetch pixels');

  const width = parseInt(res.headers.get('X-Width') || '29', 10);
  const height = parseInt(res.headers.get('X-Height') || '29', 10);
  const bunit = res.headers.get('X-Bunit') || 'MJy/sr';
  const source = res.headers.get('X-Source') || 'spherex';
  const hasSphereX = res.headers.get('X-HasSphereX') === '1';

  const buffer = await res.arrayBuffer();

  return {
    width,
    height,
    bunit,
    source,
    hasSphereX,
    pixels: new Float32Array(buffer)
  };
}

export async function fetchDiff(
  ra: number,
  dec: number,
  epochA: number,
  epochB: number,
  band: number,
  fov: number,
  mode = 'abs'
): Promise<PixelResponse> {
  const res = await fetch(getApiUrl('/api/diff'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ra, dec, epochA, epochB, band, fov, mode })
  });

  if (!res.ok) throw new Error('failed to compute difference');

  const width = parseInt(res.headers.get('X-Width') || '29', 10);
  const height = parseInt(res.headers.get('X-Height') || '29', 10);
  const bunit = res.headers.get('X-Bunit') || 'MJy/sr';
  const source = res.headers.get('X-Source') || 'spherex';
  const hasSphereX = res.headers.get('X-HasSphereX') === '1';

  const buffer = await res.arrayBuffer();

  return {
    width,
    height,
    bunit,
    source,
    hasSphereX,
    pixels: new Float32Array(buffer)
  };
}

export async function fetchSpectrum(
  ra: number,
  dec: number,
  epoch: number,
  x: number,
  y: number
): Promise<SpectrumData> {
  const res = await fetch(getApiUrl(`/api/spectrum?ra=${ra}&dec=${dec}&epoch=${epoch}&x=${x}&y=${y}`));
  if (!res.ok) throw new Error('failed to fetch spectrum');
  return res.json();
}

export async function queryProviderExposures(
  ra: number,
  dec: number
): Promise<{ count: number; exposures: ProviderExposure[] }> {
  const res = await fetch(getApiUrl(`/api/provider/query?ra=${ra}&dec=${dec}`));
  if (!res.ok) throw new Error('failed querying IRSA TAP provider');
  return res.json();
}

export async function ingestProviderCutout(
  ra: number,
  dec: number,
  fov: number,
  uri: string,
  epoch = 1,
  band = 1
): Promise<{ success: boolean; width: number; height: number; bunit: string; key: string }> {
  const res = await fetch(getApiUrl('/api/provider/ingest'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ra, dec, fov, uri, epoch, band })
  });
  if (!res.ok) throw new Error('failed ingesting cutout');
  return res.json();
}

export async function fetchGaiaDr3(
  ra: number,
  dec: number,
  radiusDeg = 0.2
): Promise<{ count: number; sources: GaiaSource[] }> {
  const res = await fetch(getApiUrl(`/api/catalogs/gaia?ra=${ra}&dec=${dec}&radius=${radiusDeg}`));
  if (!res.ok) throw new Error('failed querying Gaia DR3');
  const data = await res.json();
  const sources: GaiaSource[] = (data.sources || []).map((s: any) => ({
    sourceId: String(s.sourceId ?? s.source_id ?? ''),
    ra: Number(s.ra),
    dec: Number(s.dec),
    photGMeanMag: s.gMag ?? s.photGMeanMag ?? s.phot_g_mean_mag ?? null,
    pmra: s.pmRa ?? s.pmra ?? null,
    pmdec: s.pmDec ?? s.pmdec ?? null,
    parallax: s.parallax ?? null,
    ruwe: s.ruwe ?? null
  }));
  return { count: sources.length, sources };
}

export async function fetchNeossat(
  ra: number,
  dec: number,
  radiusDeg = 0.5
): Promise<{ count: number; tracks: NeossatTrack[]; info: any }> {
  const res = await fetch(getApiUrl(`/api/catalogs/neossat?ra=${ra}&dec=${dec}&radius=${radiusDeg}`));
  if (!res.ok) throw new Error('failed querying CSA NEOSSat');
  const data = await res.json();
  const tracks: NeossatTrack[] = (data.matches || []).map((m: any, idx: number) => ({
    id: m.obsId || `track-${idx}`,
    targetName: m.target || 'NEOSSat Object',
    ra: Number(m.ra),
    dec: Number(m.dec),
    observationDate: m.obsId ? m.obsId.replace('NEOSSAT_', '') : '2025/2026',
    cadcUrl: m.datasetUrl || 'https://data.asc-csa.gc.ca/dataset/neossat',
    type: m.target?.includes('Debris') ? 'Space Debris' : 'Asteroid'
  }));
  return { count: tracks.length, tracks, info: data };
}

export async function fetchChallengeResources(): Promise<{ resources: ChallengeResource[] }> {
  const res = await fetch(getApiUrl('/api/resources'));
  if (!res.ok) throw new Error('failed fetching challenge resources');
  return res.json();
}

// batch aperture photometry interfaces and methods

export interface PhotometryParams {
  apertureRadiusArcsec: number;
  annulusInnerArcsec: number;
  annulusOuterArcsec: number;
  estimator: 'sigma_clipped_median' | 'mean';
  sigmaClipThreshold: number;
  subtractZodi: boolean;
  maskFlags: boolean;
  applyApertureCorrection: boolean;
  wavelengthUm?: number;
  unit: 'ujy' | 'mjy' | 'mjy_sr' | 'ab_mag';
}

export interface PhotometryResult {
  targetId: string;
  ra: number;
  dec: number;
  pixelX: number;
  pixelY: number;
  bandIndex?: number;
  bandName?: string;
  wavelengthUm?: number;
  fwhmArcsec?: number;
  apertureCorrectionFactor?: number;
  netFlux: number;
  fluxError: number;
  snr: number;
  bgLevel: number;
  bgRms: number;
  aperturePixels: number;
  annulusPixels: number;
  unit: string;
  status: 'OK' | 'EDGE_TRUNCATED' | 'LOW_SNR' | 'OFF_IMAGE' | 'FLAGGED';
  log: string[];
}

export interface BatchRequest {
  sourceType: 'file' | 'folder' | 'archive';
  filePath?: string;
  folderPath?: string;
  targets: Array<{ id: string; ra: number; dec: number }>;
  params: PhotometryParams;
  bands?: number[];
}

export interface BatchResponse {
  success: boolean;
  count: number;
  durationMs: number;
  results: PhotometryResult[];
  logs: string[];
}

export interface ScannedFile {
  name: string;
  path: string;
  sizeBytes: number;
  mtime: string;
}

export const PRESET_PROFILES: Record<string, { label: string; params: PhotometryParams }> = {
  point_source: {
    label: 'Point Source Optimal (2.5px standard)',
    params: {
      apertureRadiusArcsec: 15.5,
      annulusInnerArcsec: 24.8,
      annulusOuterArcsec: 43.4,
      estimator: 'sigma_clipped_median',
      sigmaClipThreshold: 3.0,
      subtractZodi: true,
      maskFlags: true,
      applyApertureCorrection: true,
      wavelengthUm: 0.75,
      unit: 'ujy'
    }
  },
  faint_target: {
    label: 'Faint Target (Wide Annulus)',
    params: {
      apertureRadiusArcsec: 12.4,
      annulusInnerArcsec: 24.8,
      annulusOuterArcsec: 62.0,
      estimator: 'sigma_clipped_median',
      sigmaClipThreshold: 2.5,
      subtractZodi: true,
      maskFlags: true,
      applyApertureCorrection: true,
      wavelengthUm: 0.75,
      unit: 'ujy'
    }
  },
  bright_star: {
    label: 'Bright Star (Broad Aperture)',
    params: {
      apertureRadiusArcsec: 24.8,
      annulusInnerArcsec: 37.2,
      annulusOuterArcsec: 62.0,
      estimator: 'sigma_clipped_median',
      sigmaClipThreshold: 3.5,
      subtractZodi: true,
      maskFlags: true,
      applyApertureCorrection: true,
      wavelengthUm: 0.75,
      unit: 'mjy'
    }
  },
  extended_diffuse: {
    label: 'Extended Emission (Surface Brightness)',
    params: {
      apertureRadiusArcsec: 43.4,
      annulusInnerArcsec: 62.0,
      annulusOuterArcsec: 93.0,
      estimator: 'mean',
      sigmaClipThreshold: 3.0,
      subtractZodi: true,
      maskFlags: false,
      applyApertureCorrection: false,
      wavelengthUm: 0.75,
      unit: 'mjy_sr'
    }
  }
};

export async function scanLocalFiles(dir = 'cache'): Promise<{ dir: string; files: ScannedFile[] }> {
  const res = await fetch(getApiUrl(`/api/fs/scan?dir=${encodeURIComponent(dir)}`));
  if (!res.ok) throw new Error('failed scanning directory');
  return res.json();
}

export async function runBatchPhotometry(req: BatchRequest): Promise<BatchResponse> {
  const res = await fetch(getApiUrl('/api/batch/photometry'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'batch photometry execution failed');
  }
  return res.json();
}

export async function exportBatch(
  format: 'csv' | 'fits',
  results: PhotometryResult[],
  suffix = 'photometry'
): Promise<Blob> {
  const res = await fetch(getApiUrl('/api/batch/export'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, results, suffix })
  });
  if (!res.ok) throw new Error('failed exporting batch results');
  return res.blob();
}

// local storage profile helpers
const STORAGE_KEY = 'spherex_photometry_custom_profiles';

export function loadCustomProfiles(): Record<string, PhotometryParams> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomProfile(name: string, params: PhotometryParams): void {
  const profiles = loadCustomProfiles();
  profiles[name] = params;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function deleteCustomProfile(name: string): void {
  const profiles = loadCustomProfiles();
  delete profiles[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}
