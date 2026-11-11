// standalone command-line batch photometry pipeline for spherex level 2 products
// allows automated headless execution, catalog processing, and fits/csv table export

import * as fs from 'fs';
import * as path from 'path';
import { parseMultiExtensionFits } from './fits.js';
import { measureAperture, DEFAULT_PHOTOMETRY_PARAMS, PhotometryParams, PhotometryResult } from './photometry.js';
import { resultsToCsv, resultsToFits } from './export.js';
import { SPHEREX_CHANNELS } from './calibration.js';

interface CliTarget {
  id: string;
  ra: number;
  dec: number;
}

export function resolveFilePath(p: string): string | null {
  if (path.isAbsolute(p) && fs.existsSync(p)) return p;
  const candidates = [
    path.resolve(process.cwd(), p),
    path.resolve(process.cwd(), '..', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port/cache', path.basename(p)),
    path.resolve(process.cwd(), 'cache', path.basename(p)),
    path.resolve(process.cwd(), '..', 'cache', path.basename(p))
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function resolveDirPath(p: string): string | null {
  if (path.isAbsolute(p) && fs.existsSync(p)) return p;
  const candidates = [
    path.resolve(process.cwd(), p),
    path.resolve(process.cwd(), '..', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port', p),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port/cache'),
    path.resolve(process.cwd(), 'cache'),
    path.resolve(process.cwd(), '..', 'cache')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function printUsage() {
  console.log(`
SPHEREx Batch Aperture Photometry & SED CLI
Usage:
  npx tsx srv/src/cli.ts [options]

Input Options:
  --file <path>              Single FITS file path (e.g. cache/level2_...fits)
  --dir <path>               Directory containing FITS files to batch process
  --ra <degrees>             Target Right Ascension (J2000)
  --dec <degrees>            Target Declination (J2000)
  --id <name>                Target Identifier (default: Target_1)
  --catalog <csv_path>       CSV catalog containing (id, ra, dec) columns

Photometry Parameters:
  --aperture <arcsec>        Aperture radius in arcseconds (default: 15.5)
  --annulus-in <arcsec>      Sky annulus inner radius (default: 24.8)
  --annulus-out <arcsec>     Sky annulus outer radius (default: 43.4)
  --estimator <median|mean>  Sky estimator (default: median)
  --unit <ujy|mjy|ab_mag>    Output measurement units (default: ujy)
  --no-zodi                  Disable zodiacal light subtraction

Output Options:
  --format <csv|fits>        Export table format (default: csv)
  --out <path>               Output file path (default: stdout for csv, or ./spherex_photometry.fits)
`);
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  let fileArg = '';
  let dirArg = '';
  let catalogPath = '';
  let targetRa = NaN;
  let targetDec = NaN;
  let targetId = 'Target_1';
  let format: 'csv' | 'fits' = 'csv';
  let outPath = '';

  const params: PhotometryParams = {
    ...DEFAULT_PHOTOMETRY_PARAMS
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && args[i + 1]) fileArg = args[++i];
    else if (a === '--dir' && args[i + 1]) dirArg = args[++i];
    else if (a === '--catalog' && args[i + 1]) catalogPath = args[++i];
    else if (a === '--ra' && args[i + 1]) targetRa = parseFloat(args[++i]);
    else if (a === '--dec' && args[i + 1]) targetDec = parseFloat(args[++i]);
    else if (a === '--id' && args[i + 1]) targetId = args[++i];
    else if (a === '--aperture' && args[i + 1]) params.apertureRadiusArcsec = parseFloat(args[++i]);
    else if (a === '--annulus-in' && args[i + 1]) params.annulusInnerArcsec = parseFloat(args[++i]);
    else if (a === '--annulus-out' && args[i + 1]) params.annulusOuterArcsec = parseFloat(args[++i]);
    else if (a === '--estimator' && args[i + 1]) {
      const e = args[++i];
      params.estimator = e === 'mean' ? 'mean' : 'sigma_clipped_median';
    }
    else if (a === '--unit' && args[i + 1]) {
      const u = args[++i].toLowerCase();
      if (['ujy', 'mjy', 'mjy_sr', 'ab_mag'].includes(u)) {
        params.unit = u as any;
      }
    }
    else if (a === '--no-zodi') params.subtractZodi = false;
    else if (a === '--format' && args[i + 1]) {
      const fmt = args[++i].toLowerCase();
      format = fmt === 'fits' ? 'fits' : 'csv';
    }
    else if (a === '--out' && args[i + 1]) outPath = args[++i];
  }

  // collect targets
  const targets: CliTarget[] = [];
  if (catalogPath) {
    const resolvedCat = resolveFilePath(catalogPath);
    if (!resolvedCat) {
      console.error(`Error: Catalog file not found: ${catalogPath}`);
      process.exit(1);
    }
    const lines = fs.readFileSync(resolvedCat, 'utf-8').trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(',').map(s => s.trim());
      if (i === 0 && (parts[0].toLowerCase().includes('id') || parts[1].toLowerCase().includes('ra'))) {
        continue; // skip header
      }
      if (parts.length >= 3) {
        targets.push({ id: parts[0], ra: parseFloat(parts[1]), dec: parseFloat(parts[2]) });
      }
    }
  } else if (!isNaN(targetRa) && !isNaN(targetDec)) {
    targets.push({ id: targetId, ra: targetRa, dec: targetDec });
  } else {
    console.log('No target specified. Using default NEP Deep Field benchmark coordinate (RA=270.0, Dec=66.5607)');
    targets.push({ id: 'SPX_NEP_01', ra: 270.0, dec: 66.5607 });
  }

  // collect fits files
  const fitsFiles: string[] = [];
  if (fileArg) {
    const resolvedFile = resolveFilePath(fileArg);
    if (!resolvedFile) {
      console.error(`Error: File not found: ${fileArg}`);
      process.exit(1);
    }
    fitsFiles.push(resolvedFile);
  } else if (dirArg) {
    const resolvedDir = resolveDirPath(dirArg);
    if (!resolvedDir) {
      console.error(`Error: Directory not found: ${dirArg}`);
      process.exit(1);
    }
    const entries = fs.readdirSync(resolvedDir);
    for (const e of entries) {
      if (e.endsWith('.fits') || e.endsWith('.fit')) {
        fitsFiles.push(path.join(resolvedDir, e));
      }
    }
  } else {
    // default to cache
    const defaultCache = resolveDirPath('cache');
    if (defaultCache) {
      const entries = fs.readdirSync(defaultCache);
      const l2 = entries.filter(f => f.startsWith('level2') && f.endsWith('.fits'));
      const chosen = l2.length > 0 ? l2 : entries.filter(f => f.endsWith('.fits')).slice(0, 5);
      for (const f of chosen) fitsFiles.push(path.join(defaultCache, f));
    }
  }

  if (fitsFiles.length === 0) {
    console.error('Error: No FITS files found to process.');
    process.exit(1);
  }

  console.log(`[SPHEREx CLI] Processing ${targets.length} target(s) across ${fitsFiles.length} FITS exposure(s)...`);
  const allResults: PhotometryResult[] = [];

  for (let fIdx = 0; fIdx < fitsFiles.length; fIdx++) {
    const fPath = fitsFiles[fIdx];
    const buf = fs.readFileSync(fPath);
    const image = parseMultiExtensionFits(buf, params.subtractZodi);

    for (const t of targets) {
      const res = measureAperture(image, t.ra, t.dec, t.id, params);
      res.bandIndex = 1;
      res.wavelengthUm = params.wavelengthUm ?? 0.75;
      allResults.push(res);
    }
  }

  console.log(`[SPHEREx CLI] Completed ${allResults.length} measurements.`);

  if (format === 'fits') {
    const fitsBuffer = resultsToFits(allResults);
    const savePath = outPath || 'spherex_photometry.fits';
    fs.writeFileSync(savePath, fitsBuffer);
    console.log(`[SPHEREx CLI] Saved FITS Binary Table to ${savePath} (${fitsBuffer.length} bytes)`);
  } else {
    const csvContent = resultsToCsv(allResults);
    if (outPath) {
      fs.writeFileSync(outPath, csvContent, 'utf-8');
      console.log(`[SPHEREx CLI] Saved CSV table to ${outPath}`);
    } else {
      console.log('\n' + csvContent);
    }
  }
}

runCli().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
