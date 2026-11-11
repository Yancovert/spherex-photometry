import { pool, storeCutout, findObservationsAt, saveObservation } from './db.js';
import { parseMultiExtensionFits } from './fits.js';

export interface ProviderExposure {
  uri: string;
  planeId: string;
  bandpass: string;
  mjd: number;
  utcDate: string;
  pipelineVersion: string;
  isCached: boolean;
}

function mjdToUtc(mjd: number): string {
  const ms = (mjd - 40587) * 86400000;
  return new Date(ms).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

export async function queryIrsaTapExposures(ra: number, dec: number): Promise<ProviderExposure[]> {
  // check local postgis first for immediate sub-millisecond response
  const local = await findObservationsAt(ra, dec);
  
  const cachedRes = await pool.query(`SELECT cache_key FROM spherex_cutouts`);
  const cachedKeys = new Set(cachedRes.rows.map(r => r.cache_key));

  if (local.length > 0) {
    return local.map(r => {
      const vMatch = r.uri.match(/(l2b-v[0-9a-z-]+)/);
      return {
        uri: r.uri,
        planeId: r.plane_id,
        bandpass: r.bandpass,
        mjd: Number(parseFloat(r.time_bounds_lower).toFixed(4)),
        utcDate: mjdToUtc(parseFloat(r.time_bounds_lower)),
        pipelineVersion: vMatch ? vMatch[1] : 'v20-calibrated',
        isCached: true
      };
    });
  }

  // adql spatial containment query
  const adql = `
    SELECT a.uri, p.planeid, p.energy_bandpassname, p.time_bounds_lower, p.poly
    FROM spherex.artifact a
    JOIN spherex.plane p ON a.planeid = p.planeid
    WHERE 1 = CONTAINS(POINT('ICRS', ${ra}, ${dec}), p.poly)
    ORDER BY p.time_bounds_lower ASC
  `;

  // allow up to 30s for remote caltech tap server
  const url = `https://irsa.ipac.caltech.edu/TAP/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=csv&QUERY=${encodeURIComponent(adql)}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!resp.ok) return [];

  const text = await resp.text();
  const lines = text.trim().split('\n');
  if (lines.length <= 1) return [];

  const exposures: ProviderExposure[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 4) {
      const uri = parts[0].trim();
      const planeId = parts[1].trim();
      const bandpass = parts[2].trim();
      const mjd = parseFloat(parts[3].trim());
      const poly = parts[4]?.trim() || '';

      const vMatch = uri.match(/(l2b-v[0-9a-z-]+)/);
      const pipelineVersion = vMatch ? vMatch[1] : 'v20-calibrated';
      const isCached = Array.from(cachedKeys).some(k => k.includes(uri.substring(uri.lastIndexOf('/') + 1)));

      exposures.push({
        uri,
        planeId,
        bandpass,
        mjd: Number(mjd.toFixed(4)),
        utcDate: mjdToUtc(mjd),
        pipelineVersion,
        isCached
      });

      // index into postgis
      if (poly && poly.startsWith('0103')) {
        saveObservation(planeId, uri, bandpass, mjd, poly).catch(() => {});
      }
    }
  }

  return exposures;
}

export async function ingestCutoutFromProvider(
  ra: number,
  dec: number,
  fovDeg: number,
  uri: string,
  epoch = 1,
  band = 1
): Promise<{ success: boolean; width: number; height: number; bunit: string; key: string }> {
  const cutoutUrl = `https://irsa.ipac.caltech.edu/${uri}?center=${ra},${dec}&size=${fovDeg}`;
  const resp = await fetch(cutoutUrl, { signal: AbortSignal.timeout(30000) });
  if (!resp.ok) throw new Error(`IRSA IBE responded with HTTP ${resp.status}`);

  const arrayBuf = await resp.arrayBuffer();
  const parsed = parseMultiExtensionFits(Buffer.from(arrayBuf));

  const key = `cutout_${ra.toFixed(4)}_${dec.toFixed(4)}_${fovDeg.toFixed(4)}_${epoch}_${band}`;

  await storeCutout(
    key,
    ra,
    dec,
    fovDeg,
    epoch,
    band,
    { ...parsed.imageHeader, wcs: parsed.wcs, BUNIT: parsed.bunit },
    parsed.pixels,
    parsed.width,
    parsed.height,
    'spherex'
  );

  return {
    success: true,
    width: parsed.width,
    height: parsed.height,
    bunit: parsed.bunit,
    key
  };
}
