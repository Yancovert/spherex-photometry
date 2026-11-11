import fs from 'node:fs';
import path from 'node:path';
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

// fetch real fits cutout from irsa (spherex if covered, else precursor allwise)
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

        // store in postgis
        await storeCutout(
          cacheKey, ra, dec, fovDeg, epoch, band,
          { ...parsed.imageHeader, wcs: parsed.wcs, BUNIT: parsed.bunit },
          parsed.pixels, parsed.width, parsed.height, 'spherex'
        );

        return { image: parsed, source: 'spherex', hasSphereX: true };
      }
    } catch (err) {
      console.warn('spherex cutout fetch failed, falling back', err);
    }
  }

  // precursor fallback: allwise mid-infrared at 3.4um (w1, epoch 1) / 4.6um (w2, epoch 2)
  const wiseSurvey = epoch === 2 ? 'WISE+4.6' : 'WISE+3.4';
  const skyviewUrl = `https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?survey=${wiseSurvey}&Position=${ra},${dec}&Size=${fovDeg}&Pixels=64&Return=FITS`;
  try {
    const wiseResp = await fetch(skyviewUrl, { signal: AbortSignal.timeout(12000) });
    if (wiseResp.ok) {
      const buf = Buffer.from(await wiseResp.arrayBuffer());
      const parsed = parseMultiExtensionFits(buf, false);

      await storeCutout(
        cacheKey, ra, dec, fovDeg, epoch, band,
        { ...parsed.imageHeader, wcs: parsed.wcs, BUNIT: parsed.bunit },
        parsed.pixels, parsed.width, parsed.height, 'allwise'
      );

      return { image: parsed, source: 'allwise', hasSphereX: false };
    }
  } catch (err) {
    // network timeout or offline
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
  const rootCache = path.resolve(process.cwd(), 'cache');
  const parentCache = path.resolve(process.cwd(), '../cache');
  if (fs.existsSync(parentCache)) return path.join(parentCache, filename);
  if (!fs.existsSync(rootCache)) fs.mkdirSync(rootCache, { recursive: true });
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


