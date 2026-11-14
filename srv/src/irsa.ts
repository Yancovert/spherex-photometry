import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseMultiExtensionFits, extractCutout, SphereXImage } from './fits.js';
import { getStoredCutout, storeCutout, saveObservation, findObservationsAt } from './db.js';

export interface CoverageResult {
  hasSphereX: boolean;
  observations: Array<{
    uri: string;
    bandpass: string;
    time_bounds_lower: number;
    plane_id: string;
  }>;
}

// in-memory parsed frame cache to eliminate repeated disk reads and Big-Endian float conversions
const memoryImageCache = new Map<string, SphereXImage>();
const activeTapQueries = new Set<string>();
const negativeCoverageCache = new Set<string>();

// query irsa tap to see if spherex has observed this coordinate yet
export async function checkSphereXCoverage(ra: number, dec: number, timeoutMs = 2500): Promise<CoverageResult> {
  // check local postgis first
  const local = await findObservationsAt(ra, dec);
  if (local.length > 0) {
    return {
      hasSphereX: true,
      observations: local.map(r => ({
        uri: r.uri,
        bandpass: r.bandpass,
        time_bounds_lower: r.time_bounds_lower,
        plane_id: r.plane_id
      }))
    };
  }

  const queryKey = `${ra.toFixed(2)}_${dec.toFixed(2)}`;
  if (negativeCoverageCache.has(queryKey) || activeTapQueries.has(queryKey)) {
    return { hasSphereX: false, observations: [] };
  }
  activeTapQueries.add(queryKey);

  // query caltech irsa tap service with low timeout to prevent UI stall
  const adql = `
    SELECT a.uri, p.planeid, p.energy_bandpassname, p.time_bounds_lower, p.poly
    FROM spherex.artifact a
    JOIN spherex.plane p ON a.planeid = p.planeid
    WHERE 1 = CONTAINS(POINT('ICRS', ${ra}, ${dec}), p.poly)
    ORDER BY p.time_bounds_lower ASC
  `;

  try {
    const url = `https://irsa.ipac.caltech.edu/TAP/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=csv&QUERY=${encodeURIComponent(adql)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) {
      return { hasSphereX: false, observations: [] };
    }

    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length <= 1) {
      return { hasSphereX: false, observations: [] };
    }

    const obs = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 4) {
        const uri = parts[0].trim();
        const planeId = parts[1].trim();
        const bandpass = parts[2].trim();
        const timeBounds = parseFloat(parts[3].trim());
        const poly = parts[4]?.trim() || '';

        obs.push({ uri, plane_id: planeId, bandpass, time_bounds_lower: timeBounds });
        
        // cache in postgis in background
        if (poly && poly.startsWith('0103')) {
          saveObservation(planeId, uri, bandpass, timeBounds, poly).catch(() => {});
        }
      }
    }

    if (obs.length === 0) {
      negativeCoverageCache.add(queryKey);
    }
    return { hasSphereX: obs.length > 0, observations: obs };
  } catch (err) {
    // fast bailout when tap server queue is congested
    negativeCoverageCache.add(queryKey);
    return { hasSphereX: false, observations: [] };
  } finally {
    activeTapQueries.delete(queryKey);
  }
}

// extract fits from unwise tar.gz
function extractFitsFromTarGz(tarGzBuf: Buffer): Buffer | null {
  try {
    const decompressed = zlib.gunzipSync(tarGzBuf);
    let offset = 0;
    while (offset + 512 <= decompressed.length) {
      const name = decompressed.toString('ascii', offset, offset + 100).replace(/\0/g, '').trim();
      if (!name) break;
      const sizeStr = decompressed.toString('ascii', offset + 124, offset + 136).replace(/\0/g, '').trim();
      const size = parseInt(sizeStr, 8);
      offset += 512;
      if (name.endsWith('.fits') && size > 0) {
        return Buffer.from(decompressed.subarray(offset, offset + size));
      }
      const blocks = Math.ceil(size / 512);
      offset += blocks * 512;
    }
  } catch (err) {
    console.warn('unwise tar extraction failed', err);
  }
  return null;
}

// real astronomical multi-epoch coadds from unwise / neowise missions
const UNWISE_EPOCH_VERSIONS = ['allwise', 'neo2', 'neo4', 'neo7'];

export async function fetchUnwiseCutout(
  ra: number,
  dec: number,
  fovDeg = 0.1,
  epoch = 1,
  band = 1
): Promise<SphereXImage | null> {
  const version = UNWISE_EPOCH_VERSIONS[Math.max(0, Math.min(epoch - 1, UNWISE_EPOCH_VERSIONS.length - 1))];
  const wiseBand = band > 50 ? 2 : 1;
  const pixelSize = Math.max(32, Math.min(256, Math.round((fovDeg * 3600) / 2.75)));

  // handle vercel serverless readonly filesystem gracefully
  const bundledDir = path.resolve(process.cwd(), 'cache', 'unwise');
  const cacheDir = process.env.VERCEL
    ? path.join('/tmp', 'cache', 'unwise')
    : bundledDir;

  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  } catch {}

  const filename = `unwise_${version}_${ra.toFixed(4)}_${dec.toFixed(4)}_b${wiseBand}_s${pixelSize}.fits`;
  const diskPath = path.join(cacheDir, filename);
  const bundledPath = path.join(bundledDir, filename);

  for (const p of [diskPath, bundledPath]) {
    if (fs.existsSync(p)) {
      try {
        const buf = fs.readFileSync(p);
        return parseMultiExtensionFits(buf, true);
      } catch {}
    }
  }

  // check if any nearby cutout exists for this epoch version and band
  for (const d of [cacheDir, bundledDir]) {
    if (fs.existsSync(d)) {
      try {
        const candidates = fs.readdirSync(d).filter(f => f.startsWith(`unwise_${version}_`) && f.includes(`_b${wiseBand}_`));
        for (const f of candidates) {
          const m = f.match(/unwise_[^_]+_([-\d.]+)_([-\d.]+)_b/);
          if (m) {
            const fRa = parseFloat(m[1]);
            const fDec = parseFloat(m[2]);
            if (Math.hypot(fRa - ra, fDec - dec) < 0.05) {
              const buf = fs.readFileSync(path.join(d, f));
              return parseMultiExtensionFits(buf, true);
            }
          }
        }
      } catch {}
    }
  }

  const url = `https://unwise.me/cutout_fits?version=${version}&ra=${ra}&dec=${dec}&size=${pixelSize}&bands=${wiseBand}&file_img_m=on`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const arrayBuf = await resp.arrayBuffer();
    const fitsBuf = extractFitsFromTarGz(Buffer.from(arrayBuf));
    if (!fitsBuf) return null;

    try {
      fs.writeFileSync(diskPath, fitsBuf);
    } catch {}
    return parseMultiExtensionFits(fitsBuf, true);
  } catch (err) {
    console.warn('unwise fetch failed', err);
    return null;
  }
}

export async function getRealCutout(
  ra: number,
  dec: number,
  fovDeg = 0.1,
  epoch = 1,
  band = 1
): Promise<{ image: SphereXImage; source: 'spherex' | 'allwise' | 'unobserved'; hasSphereX: boolean }> {
  const cacheKey = `cutout_${ra.toFixed(4)}_${dec.toFixed(4)}_${fovDeg.toFixed(4)}_${epoch}_${band}`;
  
  // check postgres cache first
  const cached = await getStoredCutout(cacheKey);
  if (cached) {
    return {
      image: {
        primaryHeader: cached.header,
        imageHeader: cached.header,
        width: cached.width,
        height: cached.height,
        pixels: cached.pixels,
        bunit: cached.header.BUNIT || 'MJy/sr',
        wcs: cached.header.wcs || {
          crval1: ra, crval2: dec,
          crpix1: cached.width / 2, crpix2: cached.height / 2,
          cdelt1: -fovDeg / cached.width, cdelt2: fovDeg / cached.height,
          ctype1: 'RA---TAN', ctype2: 'DEC--TAN'
        }
      },
      source: cached.source as any,
      hasSphereX: cached.source === 'spherex'
    };
  }

  // fast path for known cached full frames (extract local cutout in ~0ms with zodi subtraction)
  let localFilename: string | null = null;
  if (Math.hypot(ra - 154.3488, dec - 61.5057) < 2.5) {
    localFilename = 'level2_2025W46_2A_0001_1D1_spx_l2b-v20-2025-321.fits';
  } else if (Math.hypot(ra - 161.73, dec - 45.34) < 2.5) {
    localFilename = 'level2_2025W45_2A_0001_1D1_spx_l2b-v20-2025-314.fits';
  }

  if (localFilename) {
    const cachedFilePath = findCachePath(localFilename);
    if (cachedFilePath) {
      let fullImg = memoryImageCache.get(localFilename);
      if (!fullImg) {
        const buf = fs.readFileSync(cachedFilePath);
        fullImg = parseMultiExtensionFits(buf, true);
        memoryImageCache.set(localFilename, fullImg);
      }
      const cutout = extractCutout(fullImg, ra, dec, fovDeg);
      await storeCutout(
        cacheKey, ra, dec, fovDeg, epoch, band,
        { ...cutout.imageHeader, wcs: cutout.wcs, BUNIT: cutout.bunit },
        cutout.pixels, cutout.width, cutout.height, 'spherex'
      );
      return { image: cutout, source: 'spherex', hasSphereX: true };
    }
  }

  // check coverage via irsa tap
  const cov = await checkSphereXCoverage(ra, dec);

  if (cov.hasSphereX && cov.observations.length > 0) {
    const obs = cov.observations[Math.min(epoch - 1, cov.observations.length - 1)];
    const rawUri = obs.uri.replace(/^\//, '');
    const cutoutUrl = rawUri.startsWith('http')
      ? `${rawUri}?center=${ra},${dec}&size=${fovDeg}`
      : `https://irsa.ipac.caltech.edu/${rawUri}?center=${ra},${dec}&size=${fovDeg}`;

    try {
      const resp = await fetch(cutoutUrl, { signal: AbortSignal.timeout(25000) });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const parsed = parseMultiExtensionFits(buf, true);

        await storeCutout(
          cacheKey, ra, dec, fovDeg, epoch, band,
          { ...parsed.imageHeader, wcs: parsed.wcs, BUNIT: parsed.bunit },
          parsed.pixels, parsed.width, parsed.height, 'spherex'
        );

        return { image: parsed, source: 'spherex', hasSphereX: true };
      }
    } catch (err) {
      console.warn('spherex cutout fetch failed, falling back to unwise', err);
    }
  }

  // real precursor multi-epoch fits cutouts from unwise / neowise
  const unwiseImg = await fetchUnwiseCutout(ra, dec, fovDeg, epoch, band);
  if (unwiseImg) {
    await storeCutout(
      cacheKey, ra, dec, fovDeg, epoch, band,
      { ...unwiseImg.imageHeader, wcs: unwiseImg.wcs, BUNIT: unwiseImg.bunit },
      unwiseImg.pixels, unwiseImg.width, unwiseImg.height, 'allwise'
    );
    return { image: unwiseImg, source: 'allwise', hasSphereX: false };
  }

  // blank cutout for unobserved coordinates with zero fake stars
  const size = 128;
  return {
    image: {
      primaryHeader: {},
      imageHeader: { BUNIT: 'MJy/sr' },
      width: size,
      height: size,
      pixels: new Float32Array(size * size).fill(NaN),
      bunit: 'MJy/sr',
      wcs: {
        crval1: ra, crval2: dec,
        crpix1: size / 2, crpix2: size / 2,
        cdelt1: -fovDeg / size, cdelt2: fovDeg / size,
        ctype1: 'RA---TAN', ctype2: 'DEC--TAN'
      }
    },
    source: 'unobserved',
    hasSphereX: false
  };
}

function findCachePath(filename: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'cache', filename),
    path.resolve(process.cwd(), '../cache', filename),
    path.resolve('/home/yierke/mnt/extra/Sphere-X-port/cache', filename)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function getSaveCachePath(filename: string): string {
  if (process.env.VERCEL) {
    const tmp = path.join('/tmp', 'cache');
    try {
      if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
    } catch {}
    return path.join(tmp, filename);
  }
  const rootCache = path.resolve(process.cwd(), 'cache');
  const parentCache = path.resolve(process.cwd(), '../cache');
  if (fs.existsSync(parentCache)) return path.join(parentCache, filename);
  try {
    if (!fs.existsSync(rootCache)) fs.mkdirSync(rootCache, { recursive: true });
  } catch {}
  return path.join(rootCache, filename);
}

// load full 2040x2040 official detector frame without cutouts
export async function getFullFrame(
  ra: number,
  dec: number,
  epoch = 1,
  band = 1,
  requestedUri?: string
): Promise<{ image: SphereXImage; source: 'spherex' | 'allwise' | 'unobserved'; hasSphereX: boolean }> {
  let targetUri = requestedUri;

  // 0. check unobserved memory cache for instant 0ms turnaround
  const unobsKey = `unobs_${ra.toFixed(3)}_${dec.toFixed(3)}`;
  if (memoryImageCache.has(unobsKey)) {
    return { image: memoryImageCache.get(unobsKey)!, source: 'unobserved', hasSphereX: false };
  }

  // 1. check proximity to known cached fields first for instant 0ms turnaround
  if (!targetUri) {
    if (Math.hypot(ra - 161.73, dec - 45.34) < 2.5) {
      targetUri = 'ibe/data/spherex/qr2/level2/2025W45_2A/l2b-v20-2025-314/1/level2_2025W45_2A_0001_1D1_spx_l2b-v20-2025-314.fits';
    } else if (Math.hypot(ra - 151.59, dec - 61.53) < 2.5 || Math.hypot(ra - 154.35, dec - 61.51) < 2.5) {
      targetUri = 'ibe/data/spherex/qr2/level2/2025W46_2A/l2b-v20-2025-321/1/level2_2025W46_2A_0001_1D1_spx_l2b-v20-2025-321.fits';
    }
  }

  // 2. check local postgis next (local postgres spatial query takes ~1ms)
  if (!targetUri) {
    const local = await findObservationsAt(ra, dec);
    if (local.length > 0) {
      targetUri = local[Math.min(epoch - 1, local.length - 1)].uri;
    }
  }

  // 3. check memory cache or disk cache if targetUri is known
  if (targetUri) {
    const filename = path.basename(targetUri);
    if (memoryImageCache.has(filename)) {
      return { image: memoryImageCache.get(filename)!, source: 'spherex', hasSphereX: true };
    }
    const cachedFile = findCachePath(filename);
    if (cachedFile) {
      const buf = fs.readFileSync(cachedFile);
      const parsed = parseMultiExtensionFits(buf);
      memoryImageCache.set(filename, parsed);
      return { image: parsed, source: 'spherex', hasSphereX: true };
    }

    // stream full frame image hdu via range to bypass 55mb of tables
    const fullUrl = `https://irsa.ipac.caltech.edu/${targetUri.replace(/^\//, '')}`;
    try {
      const resp = await fetch(fullUrl, {
        headers: { Range: 'bytes=0-16671360' },
        signal: AbortSignal.timeout(15000)
      });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const parsed = parseMultiExtensionFits(buf);
        fs.writeFileSync(getSaveCachePath(filename), buf);
        memoryImageCache.set(filename, parsed);
        return { image: parsed, source: 'spherex', hasSphereX: true };
      }
    } catch {
      // remote fetch dropped, fall back
    }
  }

  // 4. fast check of irsa tap (capped at 2.5s)
  const cov = await checkSphereXCoverage(ra, dec, 2500);
  if (cov.hasSphereX && cov.observations.length > 0) {
    targetUri = cov.observations[Math.min(epoch - 1, cov.observations.length - 1)].uri;
    const filename = path.basename(targetUri);
    if (memoryImageCache.has(filename)) {
      return { image: memoryImageCache.get(filename)!, source: 'spherex', hasSphereX: true };
    }
    const cachedFile = findCachePath(filename);
    if (cachedFile) {
      const buf = fs.readFileSync(cachedFile);
      const parsed = parseMultiExtensionFits(buf);
      memoryImageCache.set(filename, parsed);
      return { image: parsed, source: 'spherex', hasSphereX: true };
    }
  }

  // coordinate not observed in spherex qr2 - return blank frame with zero fake stars and zero fake noise
  const cacheKey = `unobs_${ra.toFixed(3)}_${dec.toFixed(3)}`;
  if (memoryImageCache.has(cacheKey)) {
    return { image: memoryImageCache.get(cacheKey)!, source: 'unobserved', hasSphereX: false };
  }

  const size = 1024;
  const pixels = new Float32Array(size * size).fill(NaN);

  const unobservedImage: SphereXImage = {
    primaryHeader: {},
    imageHeader: {
      CRVAL1: ra,
      CRVAL2: dec,
      CRPIX1: size / 2,
      CRPIX2: size / 2,
      CDELT1: -0.00174,
      CDELT2: 0.00174,
      CTYPE1: 'RA---TAN',
      CTYPE2: 'DEC--TAN',
      BUNIT: 'MJy/sr'
    },
    width: size,
    height: size,
    pixels,
    bunit: 'MJy/sr',
    wcs: {
      crval1: ra,
      crval2: dec,
      crpix1: size / 2,
      crpix2: size / 2,
      cdelt1: -0.00174,
      cdelt2: 0.00174,
      ctype1: 'RA---TAN',
      ctype2: 'DEC--TAN'
    }
  };

  memoryImageCache.set(cacheKey, unobservedImage);
  return { image: unobservedImage, source: 'unobserved', hasSphereX: false };
}


