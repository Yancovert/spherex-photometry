// scientific aperture photometry engine for spherex level 2 products
// handles sub-pixel integration, iterative sigma-clipped sky annulus, calibration-backed aperture corrections, and error propagation

import { SphereXImage, skyToPixel } from './fits.js';
import {
  SPHEREX_PIXEL_SCALE_ARCSEC,
  SPHEREX_PIXEL_SOLID_ANGLE_SR,
  getFwhmArcsec,
  getApertureEnclosedFraction,
  getApertureCorrectionFactor,
  convertMjySrToUjy,
  convertUjyToAbMag
} from './calibration.js';

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

export const DEFAULT_PHOTOMETRY_PARAMS: PhotometryParams = {
  apertureRadiusArcsec: 15.5,  // 2.5 SPHEREx 6.2" pixels standard aperture
  annulusInnerArcsec: 24.8,    // 4.0 pixels
  annulusOuterArcsec: 43.4,    // 7.0 pixels
  estimator: 'sigma_clipped_median',
  sigmaClipThreshold: 3.0,
  subtractZodi: true,
  maskFlags: true,
  applyApertureCorrection: true,
  wavelengthUm: 0.75,
  unit: 'ujy'
};

// computes pixel scale in degrees and steradians from wcs
export function getWcsScale(wcs: SphereXImage['wcs']): { scaleDeg: number; scaleArcsec: number; solidAngleSr: number } {
  const cdelt1 = wcs.cdelt1 || 1;
  const cdelt2 = wcs.cdelt2 || 1;
  const pc1_1 = wcs.pc1_1 ?? 1;
  const pc1_2 = wcs.pc1_2 ?? 0;
  const pc2_1 = wcs.pc2_1 ?? 0;
  const pc2_2 = wcs.pc2_2 ?? 1;

  const scaleDegX = Math.hypot(cdelt1 * pc1_1, cdelt1 * pc1_2);
  const scaleDegY = Math.hypot(cdelt2 * pc2_1, cdelt2 * pc2_2);
  let scaleDeg = (scaleDegX + scaleDegY) / 2;

  // fallback to official spherex pixel scale if missing or invalid
  if (scaleDeg > 0.5 || scaleDeg <= 0) {
    scaleDeg = SPHEREX_PIXEL_SCALE_ARCSEC / 3600.0;
  }

  const scaleArcsec = scaleDeg * 3600;
  const radPerPix = scaleDeg * (Math.PI / 180);
  const solidAngleSr = radPerPix * radPerPix;

  return { scaleDeg, scaleArcsec, solidAngleSr };
}

// compute iterative sigma-clipped median and standard deviation using median absolute deviation (mad)
export function computeSigmaClippedStats(
  values: number[],
  threshold = 3.0,
  maxIter = 5
): { median: number; stdDev: number; count: number } {
  if (values.length === 0) return { median: 0, stdDev: 0, count: 0 };
  let current = values.slice();

  for (let iter = 0; iter < maxIter; iter++) {
    current.sort((a, b) => a - b);
    const mid = Math.floor(current.length / 2);
    const med = current.length % 2 !== 0 ? current[mid] : (current[mid - 1] + current[mid]) / 2;

    // median absolute deviation (mad) provides robust outlier-resistant scale
    const absDevs = current.map(v => Math.abs(v - med)).sort((a, b) => a - b);
    const madMid = Math.floor(absDevs.length / 2);
    const mad = absDevs.length % 2 !== 0 ? absDevs[madMid] : (absDevs[madMid - 1] + absDevs[madMid]) / 2;
    let scale = 1.4826 * mad;

    // fallback to sample std dev if mad collapses to zero
    if (scale < 1e-12) {
      let sumSq = 0;
      for (let i = 0; i < current.length; i++) {
        const diff = current[i] - med;
        sumSq += diff * diff;
      }
      scale = Math.sqrt(sumSq / Math.max(1, current.length - 1));
      if (scale < 1e-12) return { median: med, stdDev: 0, count: current.length };
    }

    const filtered = current.filter(v => Math.abs(v - med) <= threshold * scale);
    if (filtered.length === current.length || filtered.length < 5) {
      let sumSq = 0;
      for (const v of current) sumSq += (v - med) * (v - med);
      const std = Math.sqrt(sumSq / Math.max(1, current.length - 1));
      return { median: med, stdDev: std, count: current.length };
    }
    current = filtered;
  }

  current.sort((a, b) => a - b);
  const mid = Math.floor(current.length / 2);
  const med = current.length % 2 !== 0 ? current[mid] : (current[mid - 1] + current[mid]) / 2;
  let sumSq = 0;
  for (let i = 0; i < current.length; i++) {
    const diff = current[i] - med;
    sumSq += diff * diff;
  }
  return { median: med, stdDev: Math.sqrt(sumSq / Math.max(1, current.length - 1)), count: current.length };
}

// measure background-subtracted aperture photometry on a single image
export function measureAperture(
  image: SphereXImage,
  ra: number,
  dec: number,
  targetId: string,
  params: PhotometryParams = DEFAULT_PHOTOMETRY_PARAMS
): PhotometryResult {
  const log: string[] = [];
  const { scaleArcsec, solidAngleSr } = getWcsScale(image.wcs);

  // wcs pixel mapping
  const { x: px, y: py } = skyToPixel(image.wcs, ra, dec);
  const pixelX = Math.round(px * 100) / 100;
  const pixelY = Math.round(py * 100) / 100;

  log.push(`WCS: target '${targetId}' (RA=${ra.toFixed(5)}, Dec=${dec.toFixed(5)}) -> pixel (${pixelX}, ${pixelY})`);
  log.push(`DETECTOR: ${image.width}x${image.height} px, scale=${scaleArcsec.toFixed(2)}"/px, BUNIT=${image.bunit}`);

  // check if target is outside detector array
  if (px < 0 || px >= image.width || py < 0 || py >= image.height) {
    log.push(`WARN: target outside detector bounds`);
    return {
      targetId,
      ra,
      dec,
      pixelX,
      pixelY,
      netFlux: 0,
      fluxError: 0,
      snr: 0,
      bgLevel: 0,
      bgRms: 0,
      aperturePixels: 0,
      annulusPixels: 0,
      unit: params.unit,
      status: 'OFF_IMAGE',
      log
    };
  }

  // convert radii from arcsec to detector pixels
  const rApPix = Math.max(0.5, params.apertureRadiusArcsec / scaleArcsec);
  const rInPix = Math.max(rApPix + 0.5, params.annulusInnerArcsec / scaleArcsec);
  const rOutPix = Math.max(rInPix + 1.0, params.annulusOuterArcsec / scaleArcsec);

  log.push(`RADII: r_ap=${params.apertureRadiusArcsec}" (${rApPix.toFixed(2)}px), r_in=${params.annulusInnerArcsec}" (${rInPix.toFixed(2)}px), r_out=${params.annulusOuterArcsec}" (${rOutPix.toFixed(2)}px)`);

  const w = image.width;
  const h = image.height;
  const pixels = image.pixels;
  const flags = image.flags;

  // bounding box
  const minX = Math.max(0, Math.floor(px - rOutPix - 1));
  const maxX = Math.min(w - 1, Math.ceil(px + rOutPix + 1));
  const minY = Math.max(0, Math.floor(py - rOutPix - 1));
  const maxY = Math.min(h - 1, Math.ceil(py + rOutPix + 1));

  const isTruncated = (px - rOutPix < 0 || px + rOutPix >= w || py - rOutPix < 0 || py + rOutPix >= h);

  // 1. collect annulus background pixels
  const annulusVals: number[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - px;
      const dy = y - py;
      const dist = Math.hypot(dx, dy);

      if (dist >= rInPix && dist <= rOutPix) {
        const idx = y * w + x;
        const val = pixels[idx];
        if (isNaN(val)) continue;

        // check flags bitmask if present (reject bit 0: bad, bit 1: cosmic ray, bit 2: saturation)
        if (params.maskFlags && flags && (flags[idx] & 0x07) !== 0) {
          continue;
        }

        annulusVals.push(val);
      }
    }
  }

  // compute background stats
  let bgLevel = 0;
  let bgRms = 0;
  if (annulusVals.length > 0) {
    if (params.estimator === 'sigma_clipped_median') {
      const stats = computeSigmaClippedStats(annulusVals, params.sigmaClipThreshold);
      bgLevel = stats.median;
      bgRms = stats.stdDev;
    } else {
      const mean = annulusVals.reduce((a, b) => a + b, 0) / annulusVals.length;
      let sumSq = 0;
      for (const v of annulusVals) sumSq += (v - mean) * (v - mean);
      bgLevel = mean;
      bgRms = Math.sqrt(sumSq / Math.max(1, annulusVals.length - 1));
    }
  }
  log.push(`BACKGROUND: N=${annulusVals.length} px, estimator=${params.estimator}, level=${bgLevel.toFixed(4)} MJy/sr, rms=${bgRms.toFixed(4)} MJy/sr`);

  // 2. integrate aperture flux with high-precision 10x10 sub-pixel sampling
  let rawFluxSum = 0;
  let apArea = 0;
  const subGrid = 10;
  const subStep = 1.0 / subGrid;
  const subWeight = 1.0 / (subGrid * subGrid);

  for (let y = Math.max(0, Math.floor(py - rApPix - 1)); y <= Math.min(h - 1, Math.ceil(py + rApPix + 1)); y++) {
    for (let x = Math.max(0, Math.floor(px - rApPix - 1)); x <= Math.min(w - 1, Math.ceil(px + rApPix + 1)); x++) {
      let subHits = 0;
      for (let sy = 0; sy < subGrid; sy++) {
        const subY = y + (sy + 0.5) * subStep;
        for (let sx = 0; sx < subGrid; sx++) {
          const subX = x + (sx + 0.5) * subStep;
          if (Math.hypot(subX - px, subY - py) <= rApPix) {
            subHits++;
          }
        }
      }

      if (subHits > 0) {
        const frac = subHits * subWeight;
        const idx = y * w + x;
        const val = pixels[idx];
        if (!isNaN(val)) {
          rawFluxSum += frac * val;
          apArea += frac;
        }
      }
    }
  }

  // background subtraction: net flux in detector units (MJy/sr)
  const netFluxMjySr = rawFluxSum - apArea * bgLevel;

  // calculate aperture correction factor based on official spherex fwhm
  const wavelengthUm = params.wavelengthUm ?? 0.75;
  const fwhmArcsec = getFwhmArcsec(wavelengthUm);
  let apCorrFactor = 1.0;
  if (params.applyApertureCorrection) {
    apCorrFactor = getApertureCorrectionFactor(params.apertureRadiusArcsec, fwhmArcsec);
    const fEnc = getApertureEnclosedFraction(params.apertureRadiusArcsec, fwhmArcsec);
    log.push(`CALIBRATION: lambda=${wavelengthUm} um, FWHM=${fwhmArcsec.toFixed(2)}", enclosed=${(fEnc * 100).toFixed(1)}%, corr=${apCorrFactor.toFixed(3)}`);
  }

  // standard aperture uncertainty: propagation of background variance into aperture
  // sigma^2 = bgRms^2 * apArea * (1 + apArea / N_annulus)
  const nAnn = Math.max(1, annulusVals.length);
  const fluxErrorMjySr = bgRms * Math.sqrt(Math.max(1, apArea) * (1 + apArea / nAnn));
  const snr = fluxErrorMjySr > 0 ? (netFluxMjySr / fluxErrorMjySr) : 0;

  log.push(`PHOTOMETRY: aperture area=${apArea.toFixed(2)} px, rawSum=${rawFluxSum.toFixed(4)}, net=${netFluxMjySr.toFixed(4)} MJy/sr, err=±${fluxErrorMjySr.toFixed(4)}, SNR=${snr.toFixed(2)}`);

  // unit conversion applying solid angle and aperture correction
  const fluxUjy = convertMjySrToUjy(netFluxMjySr, solidAngleSr, apCorrFactor);
  const errUjy = convertMjySrToUjy(fluxErrorMjySr, solidAngleSr, apCorrFactor);

  let finalFlux = 0;
  let finalErr = 0;

  switch (params.unit) {
    case 'ujy':
      finalFlux = fluxUjy;
      finalErr = errUjy;
      break;
    case 'mjy':
      finalFlux = fluxUjy * 1e-3;
      finalErr = errUjy * 1e-3;
      break;
    case 'ab_mag':
      if (fluxUjy > 0) {
        finalFlux = convertUjyToAbMag(fluxUjy);
        finalErr = snr > 0 ? (1.0857 / snr) : 0;
      } else {
        // upper limit at 3-sigma if negative or zero flux
        finalFlux = errUjy > 0 ? convertUjyToAbMag(3 * errUjy) : 99.9;
        finalErr = 0;
      }
      break;
    case 'mjy_sr':
    default:
      finalFlux = netFluxMjySr * apCorrFactor;
      finalErr = fluxErrorMjySr * apCorrFactor;
      break;
  }

  let status: PhotometryResult['status'] = 'OK';
  if (isTruncated) status = 'EDGE_TRUNCATED';
  else if (snr < 3.0) status = 'LOW_SNR';

  return {
    targetId,
    ra,
    dec,
    pixelX,
    pixelY,
    wavelengthUm,
    fwhmArcsec: Math.round(fwhmArcsec * 100) / 100,
    apertureCorrectionFactor: Math.round(apCorrFactor * 1000) / 1000,
    netFlux: Math.round(finalFlux * 1000) / 1000,
    fluxError: Math.round(finalErr * 1000) / 1000,
    snr: Math.round(snr * 100) / 100,
    bgLevel: Math.round(bgLevel * 10000) / 10000,
    bgRms: Math.round(bgRms * 10000) / 10000,
    aperturePixels: Math.round(apArea * 100) / 100,
    annulusPixels: annulusVals.length,
    unit: params.unit,
    status,
    log
  };
}
