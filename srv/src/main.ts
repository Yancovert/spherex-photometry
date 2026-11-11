import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { initDb } from './db.js';
import { getRealCutout, getFullFrame, checkSphereXCoverage } from './irsa.js';
import { queryIrsaTapExposures, ingestCutoutFromProvider } from './provider.js';
import { computeDiff, MathMode } from './diff.js';
import { parseMultiExtensionFits } from './fits.js';
import { measureAperture, DEFAULT_PHOTOMETRY_PARAMS, PhotometryParams, PhotometryResult } from './photometry.js';
import { resultsToCsv, resultsToFits } from './export.js';
import { SPHEREX_CHANNELS } from './calibration.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

try {
  await initDb();
  console.log('Connected to PostGIS database.');
} catch (err) {
  console.warn('PostGIS connection deferred or failed', err);
}

// benchmark targets for high proper-motion, transients, and calibration
const BENCHMARK_TARGETS: Record<string, { name: string; ra: number; dec: number; type: string; desc: string }> = {
  field1: {
    name: 'Field 1 (Ursa Major)',
    ra: 154.3488,
    dec: 61.5057,
    type: 'Calibration',
    desc: 'Level 2 QR2 calibrated exposure in Ursa Major'
  },
  field2: {
    name: 'Field 2 (Emission Ring)',
    ra: 161.7300,
    dec: 45.3400,
    type: 'Calibration',
    desc: 'Level 2 QR2 calibrated exposure with diffuse emission'
  },
  barnard: {
    name: "Barnard's Star",
    ra: 269.4520,
    dec: 4.6930,
    type: 'Kinematic Transient',
    desc: 'Fastest known stellar proper motion (10.39 arcsec/yr)'
  },
  wise0855: {
    name: 'WISE 0855-0714',
    ra: 133.7951,
    dec: -7.2451,
    type: 'Rogue Planet Analog',
    desc: 'Coldest known sub-stellar brown dwarf (250 K) with water ice clouds'
  },
  rwaur: {
    name: 'RW Aurigae',
    ra: 76.9563,
    dec: 30.4014,
    type: 'Variable Star',
    desc: 'Classical T Tauri young star exhibiting circumstellar disk dimming'
  },
  r_dra: {
    name: 'R Draconis',
    ra: 248.2838,
    dec: 66.7025,
    type: 'Mira Variable',
    desc: 'Pulsating asymptotic giant branch star with large NIR amplitude'
  }
};

app.get('/api/targets', (_req, res) => {
  res.json(BENCHMARK_TARGETS);
});

// resolve target name to coordinates via cds sesame
app.get('/api/resolve', async (req, res) => {
  const query = String(req.query.name || '').trim();
  if (!query) return res.status(400).json({ error: 'name required' });

  try {
    const url = `https://cds.unistra.fr/cgi-bin/nph-sesame/-oA/SNV?${encodeURIComponent(query)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const text = await resp.text();
    const match = text.match(/%J\s+([0-9.-]+)\s+([0-9.-]+)/);
    if (match) {
      return res.json({
        name: query,
        ra: parseFloat(match[1]),
        dec: parseFloat(match[2]),
        found: true
      });
    }
    return res.status(404).json({ error: 'Not found in SIMBAD/NED/VizieR' });
  } catch (err: any) {
    return res.status(502).json({ error: 'Resolver timeout' });
  }
});

// check mission coverage
app.get('/api/coverage', async (req, res) => {
  const ra = parseFloat(String(req.query.ra ?? 0));
  const dec = parseFloat(String(req.query.dec ?? 0));
  const cov = await checkSphereXCoverage(ra, dec);
  res.json(cov);
});

// query available raw exposures from irsa tap
app.get('/api/provider/query', async (req, res) => {
  const ra = parseFloat(String(req.query.ra ?? 154.3488));
  const dec = parseFloat(String(req.query.dec ?? 61.5057));
  try {
    const exposures = await queryIrsaTapExposures(ra, dec);
    res.json({ ra, dec, count: exposures.length, exposures });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ingest specific cutout from provider into postgis
app.post('/api/provider/ingest', async (req, res) => {
  const { ra, dec, fov = 0.5, uri, epoch = 1, band = 1 } = req.body;
  if (!uri || isNaN(ra) || isNaN(dec)) {
    return res.status(400).json({ error: 'ra, dec, and uri are required' });
  }

  try {
    const result = await ingestCutoutFromProvider(ra, dec, fov, uri, epoch, band);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 96 official spherex spectral channels from v28 CBE calibration baseline
const SPHEREX_BANDS = SPHEREX_CHANNELS.map(c => ({
  index: c.channel,
  wavelength: c.wavelengthUm,
  array: c.band,
  fwhm: c.fwhmArcsec
}));

app.get('/api/bands', (_req, res) => {
  res.json(SPHEREX_BANDS);
});

// extract authentic spectral measurement at pixel x,y
app.get('/api/spectrum', async (req, res) => {
  const ra = parseFloat(String(req.query.ra ?? 154.3488));
  const dec = parseFloat(String(req.query.dec ?? 61.5057));
  const epoch = parseInt(String(req.query.epoch ?? 1), 10);
  const px = parseInt(String(req.query.x ?? 0), 10);
  const py = parseInt(String(req.query.y ?? 0), 10);
  const fov = parseFloat(String(req.query.fov ?? 0.1));

  try {
    const { image, source } = await getRealCutout(ra, dec, fov, epoch);
    if (source === 'unobserved') {
      return res.json({ ra, dec, epoch, points: [], markers: [] });
    }

    const idx = py * image.width + px;
    const rawFlux = (idx >= 0 && idx < image.pixels.length) ? image.pixels[idx] : NaN;
    if (isNaN(rawFlux)) {
      return res.json({ ra, dec, epoch, points: [], markers: [] });
    }

    // linear variable filter wavelength mapping across detector dispersion axis
    const xOrig = (image.wcs.crpix1a ?? 1020) - 1 + px;
    const wavelength = Number((0.75 + (xOrig / 2040) * (1.11 - 0.75)).toFixed(3));

    const points = [
      {
        band: 1,
        wavelength,
        array: 1,
        flux: Number(rawFlux.toFixed(4))
      }
    ];

    const markers = [
      { name: 'H2O Ice', wavelength: 3.05, color: '#38bdf8' },
      { name: 'CH4 Methane', wavelength: 3.30, color: '#4ade80' },
      { name: 'CO2 Ice', wavelength: 4.27, color: '#f87171' },
      { name: 'CO Gas/Ice', wavelength: 4.67, color: '#fbbf24' }
    ];

    res.json({
      ra,
      dec,
      epoch,
      source,
      points,
      markers
    });
  } catch {
    res.json({ ra, dec, epoch, points: [], markers: [] });
  }
});

// download authentic level 2 fits file
app.get('/api/download/fits', (req, res) => {
  const ra = parseFloat(String(req.query.ra ?? 154.3488));
  const dec = parseFloat(String(req.query.dec ?? 61.5057));

  let filename = 'level2_2025W46_2A_0001_1D1_spx_l2b-v20-2025-321.fits';
  if (Math.hypot(ra - 161.73, dec - 45.34) < 2.5) {
    filename = 'level2_2025W45_2A_0001_1D1_spx_l2b-v20-2025-314.fits';
  }

  const candidates = [
    path.resolve(process.cwd(), 'cache', filename),
    path.resolve(process.cwd(), '../cache', filename),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port/cache', filename),
    path.resolve(process.cwd(), 'test_cutout.fits')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return res.download(c, filename);
    }
  }

  res.status(404).json({ error: 'FITS file not found in cache' });
});

// get fits header and wcs
app.get('/api/meta', async (req, res) => {
  const ra = parseFloat(String(req.query.ra ?? 154.3488));
  const dec = parseFloat(String(req.query.dec ?? 61.5057));
  const epoch = parseInt(String(req.query.epoch ?? 1), 10);
  const band = parseInt(String(req.query.band ?? 1), 10);
  const uri = req.query.uri ? String(req.query.uri) : undefined;
  const fov = parseFloat(String(req.query.fov ?? 3.5));
  const isFull = req.query.full === 'true' || req.query.full === '1' || fov >= 2.5;

  try {
    const { image, source, hasSphereX } = isFull
      ? await getFullFrame(ra, dec, epoch, band, uri)
      : await getRealCutout(ra, dec, fov, epoch, band);

    res.json({
      ra,
      dec,
      epoch,
      band,
      source,
      hasSphereX,
      width: image.width,
      height: image.height,
      bunit: image.bunit,
      wcs: image.wcs,
      header: image.imageHeader
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// stream raw float32 pixels with wcs headers
app.get('/api/pixels', async (req, res) => {
  const ra = parseFloat(String(req.query.ra ?? 154.3488));
  const dec = parseFloat(String(req.query.dec ?? 61.5057));
  const epoch = parseInt(String(req.query.epoch ?? 1), 10);
  const band = parseInt(String(req.query.band ?? 1), 10);
  const uri = req.query.uri ? String(req.query.uri) : undefined;
  const fov = parseFloat(String(req.query.fov ?? 3.5));
  const isFull = req.query.full === 'true' || req.query.full === '1' || fov >= 2.5;

  try {
    const { image, source, hasSphereX } = isFull
      ? await getFullFrame(ra, dec, epoch, band, uri)
      : await getRealCutout(ra, dec, fov, epoch, band);

    const pixelBuf = Buffer.from(image.pixels.buffer, image.pixels.byteOffset, image.pixels.byteLength);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('X-Width', image.width);
    res.setHeader('X-Height', image.height);
    res.setHeader('X-Bunit', image.bunit);
    res.setHeader('X-Source', source);
    res.setHeader('X-HasSphereX', hasSphereX ? '1' : '0');

    // wcs headers for client-side coordinate and flux calculation
    res.setHeader('X-Crval1', image.wcs.crval1);
    res.setHeader('X-Crval2', image.wcs.crval2);
    res.setHeader('X-Crpix1', image.wcs.crpix1);
    res.setHeader('X-Crpix2', image.wcs.crpix2);
    res.setHeader('X-Cdelt1', image.wcs.cdelt1);
    res.setHeader('X-Cdelt2', image.wcs.cdelt2);
    if (image.wcs.pc1_1 !== undefined) res.setHeader('X-Pc1-1', image.wcs.pc1_1);
    if (image.wcs.pc1_2 !== undefined) res.setHeader('X-Pc1-2', image.wcs.pc1_2);
    if (image.wcs.pc2_1 !== undefined) res.setHeader('X-Pc2-1', image.wcs.pc2_1);
    if (image.wcs.pc2_2 !== undefined) res.setHeader('X-Pc2-2', image.wcs.pc2_2);

    res.send(pixelBuf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// multi-epoch difference subtraction
app.post('/api/diff', async (req, res) => {
  const { ra = 154.3488, dec = 61.5057, fov = 3.5, epochA = 1, epochB = 2, band = 1, mode = 'signed', full = false } = req.body;

  try {
    const isFull = full === true || full === 'true' || fov >= 2.5;
    const [c1, c2] = await Promise.all([
      isFull ? getFullFrame(ra, dec, epochA, band) : getRealCutout(ra, dec, fov, epochA, band),
      isFull ? getFullFrame(ra, dec, epochB, band) : getRealCutout(ra, dec, fov, epochB, band)
    ]);

    const diff = computeDiff(c1.image.pixels, c2.image.pixels, mode as MathMode);
    const diffBuf = Buffer.from(diff.buffer, diff.byteOffset, diff.byteLength);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Width', c1.image.width);
    res.setHeader('X-Height', c1.image.height);
    res.setHeader('X-Bunit', c1.image.bunit);
    res.setHeader('X-Source', c1.source);
    res.setHeader('X-HasSphereX', c1.hasSphereX ? '1' : '0');

    res.setHeader('X-Crval1', c1.image.wcs.crval1);
    res.setHeader('X-Crval2', c1.image.wcs.crval2);
    res.setHeader('X-Crpix1', c1.image.wcs.crpix1);
    res.setHeader('X-Crpix2', c1.image.wcs.crpix2);
    res.setHeader('X-Cdelt1', c1.image.wcs.cdelt1);
    res.setHeader('X-Cdelt2', c1.image.wcs.cdelt2);

    res.send(diffBuf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function resolveFilePath(p: string): string | null {
  if (path.isAbsolute(p) && fs.existsSync(p)) return p;
  const candidates = [
    path.resolve(process.cwd(), p),
    path.resolve(process.cwd(), '..', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port/cache', path.basename(p))
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function resolveDirPath(p: string): string | null {
  if (path.isAbsolute(p) && fs.existsSync(p)) return p;
  const candidates = [
    path.resolve(process.cwd(), p),
    path.resolve(process.cwd(), '..', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port/cache')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// scan filesystem for available fits products
app.get('/api/fs/scan', async (req, res) => {
  const relDir = String(req.query.dir || 'cache');
  const targetDir = resolveDirPath(relDir);
  try {
    if (!targetDir || !fs.existsSync(targetDir)) {
      return res.json({ dir: relDir, files: [] });
    }
    const entries = fs.readdirSync(targetDir);
    const files = entries
      .filter(f => f.endsWith('.fits') || f.endsWith('.fit'))
      .map(f => {
        const fullPath = path.join(targetDir, f);
        const stat = fs.statSync(fullPath);
        return {
          name: f,
          path: path.relative(process.cwd(), fullPath),
          sizeBytes: stat.size,
          mtime: stat.mtime
        };
      });
    res.json({ dir: relDir, files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// batch aperture photometry execution
app.post('/api/batch/photometry', async (req, res) => {
  const {
    sourceType = 'file',
    filePath = 'cache/level2_2025W46_2A_0001_1D1_spx_l2b-v20-2025-321.fits',
    folderPath = 'cache',
    targets = [],
    params = DEFAULT_PHOTOMETRY_PARAMS,
    bands = [1]
  } = req.body;

  if (!Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ error: 'targets array with at least one target is required' });
  }

  const startTime = Date.now();
  const results: PhotometryResult[] = [];
  const logs: string[] = [];

  logs.push(`[${new Date().toISOString()}] START: Batch aperture photometry job initialized`);
  logs.push(`CONFIG: source=${sourceType}, targets=${targets.length}, r_ap=${params.apertureRadiusArcsec}", unit=${params.unit}`);

  try {
    if (sourceType === 'file') {
      const fullPath = resolveFilePath(filePath);
      if (!fullPath || !fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      logs.push(`INGEST: reading FITS file ${path.basename(fullPath)} (${(fs.statSync(fullPath).size / 1024 / 1024).toFixed(2)} MB)`);
      const buf = fs.readFileSync(fullPath);
      const image = parseMultiExtensionFits(buf, params.subtractZodi);

      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        logs.push(`--- Target ${i + 1}/${targets.length}: '${t.id}' (RA: ${t.ra}, Dec: ${t.dec}) ---`);
        const wl = params.wavelengthUm ?? 0.75;
        const resObj = measureAperture(image, t.ra, t.dec, t.id, params);
        resObj.bandIndex = 1;
        resObj.bandName = `Band 1 (${wl.toFixed(2)} um)`;
        resObj.wavelengthUm = wl;
        logs.push(...resObj.log);
        results.push(resObj);
      }
    } else if (sourceType === 'folder') {
      const dirPath = resolveDirPath(folderPath);
      if (!dirPath || !fs.existsSync(dirPath)) throw new Error(`Folder not found: ${folderPath}`);
      const fitsFiles = fs.readdirSync(dirPath).filter(f => f.startsWith('level2') && f.endsWith('.fits'));
      const activeFiles = fitsFiles.length > 0 ? fitsFiles : fs.readdirSync(dirPath).filter(f => f.endsWith('.fits')).slice(0, 10);

      logs.push(`INGEST: found ${activeFiles.length} FITS files in ${folderPath}`);
      for (const f of activeFiles) {
        const fullPath = path.join(dirPath, f);
        logs.push(`FILE: ${f}`);
        const buf = fs.readFileSync(fullPath);
        const image = parseMultiExtensionFits(buf, params.subtractZodi);
        const wl = params.wavelengthUm ?? 0.75;
        for (const t of targets) {
          const resObj = measureAperture(image, t.ra, t.dec, t.id, params);
          resObj.bandIndex = 1;
          resObj.bandName = `Band 1 (${wl.toFixed(2)} um)`;
          resObj.wavelengthUm = wl;
          logs.push(...resObj.log);
          results.push(resObj);
        }
      }
    } else {
      // archive mode: query IRSA or precursor for each target across selected bands
      logs.push(`INGEST: archive fetch across ${bands.length} spectral bands`);
      for (const t of targets) {
        for (const b of bands) {
          logs.push(`FETCH: target '${t.id}', band ${b}`);
          const { image, source } = await getFullFrame(t.ra, t.dec, 1, b);
          logs.push(`SOURCE: ${source} (${image.width}x${image.height})`);
          const resObj = measureAperture(image, t.ra, t.dec, t.id, params);
          resObj.bandIndex = b;
          const bandMeta = SPHEREX_BANDS.find(bandItem => bandItem.index === b);
          resObj.wavelengthUm = bandMeta ? bandMeta.wavelength : 0.75;
          resObj.bandName = `Band ${b} (${resObj.wavelengthUm} um)`;
          logs.push(...resObj.log);
          results.push(resObj);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    logs.push(`[${new Date().toISOString()}] COMPLETE: ${results.length} measurements computed in ${(durationMs / 1000).toFixed(2)}s`);
    res.json({
      success: true,
      count: results.length,
      durationMs,
      results,
      logs
    });
  } catch (err: any) {
    logs.push(`ERROR: ${err.message}`);
    res.status(500).json({ error: err.message, logs });
  }
});

// export batch results as csv or fits binary table
app.post('/api/batch/export', (req, res) => {
  const { format = 'csv', results = [], suffix = 'photometry' } = req.body;
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'No results to export' });
  }

  if (format === 'fits') {
    const fitsBuf = resultsToFits(results);
    res.setHeader('Content-Type', 'application/fits');
    res.setHeader('Content-Disposition', `attachment; filename="spherex_${suffix}.fits"`);
    res.send(fitsBuf);
  } else {
    const csvStr = resultsToCsv(results);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="spherex_${suffix}.csv"`);
    res.send(csvStr);
  }
});

// healthcheck endpoint
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.4',
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`SPHEREx scientific workstation backend running on http://localhost:${PORT}`);
  });
}

export default app;
export { app };
