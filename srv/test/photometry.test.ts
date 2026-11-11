// comprehensive verification test suite for spherex aperture photometry, calibrations, and fits export
import assert from 'node:assert';
import { computeSigmaClippedStats, measureAperture, DEFAULT_PHOTOMETRY_PARAMS } from '../src/photometry.js';
import {
  SPHEREX_CHANNELS,
  getFwhmArcsec,
  getApertureEnclosedFraction,
  getApertureCorrectionFactor,
  convertMjySrToUjy,
  convertUjyToAbMag,
  SPHEREX_PIXEL_SCALE_ARCSEC,
  SPHEREX_PIXEL_SOLID_ANGLE_SR
} from '../src/calibration.js';
import { resultsToCsv, resultsToFits } from '../src/export.js';
import { SphereXImage } from '../src/fits.js';

console.log('--- 1. Testing Official Calibration Tables (v28 Baseline) ---');
assert.strictEqual(SPHEREX_CHANNELS.length, 96, 'must contain exactly 96 official spectral channels');
assert.strictEqual(SPHEREX_PIXEL_SCALE_ARCSEC, 6.20, 'pixel scale must be exactly 6.2 arcsec');
assert(Math.abs(SPHEREX_PIXEL_SOLID_ANGLE_SR - 9.035e-10) < 1e-12, 'solid angle must match 9.035e-10 sr');

const fwhm075 = getFwhmArcsec(0.75);
assert(Math.abs(fwhm075 - 4.6099) < 0.01, `fwhm at 0.75 um should be ~4.61", got ${fwhm075}`);
const fwhm480 = getFwhmArcsec(4.80);
assert(Math.abs(fwhm480 - 6.72) < 0.05, `fwhm at 4.80 um should be ~6.72", got ${fwhm480}`);

// verify curve of growth for r=15.5" (2.5 pixels)
const fEnc075 = getApertureEnclosedFraction(15.5, fwhm075);
assert(fEnc075 > 0.99, `at 0.75 um with 2.5px (15.5") aperture, enclosed energy should be >99%, got ${fEnc075}`);

console.log('--- 2. Testing Robust Sigma-Clipped Stats ---');
const bgValues = [10.1, 9.9, 10.0, 10.2, 9.8, 10.1, 10.0, 250.0, -100.0]; // 2 extreme outliers
const stats = computeSigmaClippedStats(bgValues, 3.0);
assert(Math.abs(stats.median - 10.0) < 0.2, `median should be close to 10.0, got ${stats.median}`);
assert(stats.stdDev < 1.0, `std dev should be small without outliers, got ${stats.stdDev}`);
assert(stats.count <= 7, `outliers should be clipped, count: ${stats.count}`);

console.log('--- 3. Testing Synthetic Point-Source Recovery (1% Error Margin) ---');
// test across multiple wavelength regimes
const testWavelengths = [0.75, 1.50, 3.00, 4.50];

for (const wl of testWavelengths) {
  const fwhm = getFwhmArcsec(wl);
  const sigmaPix = fwhm / (SPHEREX_PIXEL_SCALE_ARCSEC * 2.354820045);
  const w = 61;
  const h = 61;
  const cx = 30.0;
  const cy = 30.0;
  const trueBg = 4.5;
  const trueNetFluxMjySr = 120.0; // integrated flux in detector units
  const trueFluxUjy = convertMjySrToUjy(trueNetFluxMjySr, SPHEREX_PIXEL_SOLID_ANGLE_SR, 1.0);

  const pixels = new Float32Array(w * h);
  const sub = 8;
  const subWeight = 1.0 / (sub * sub);

  // synthesize high-fidelity 2D Gaussian point source integrated over pixel grid
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let pixSourceFlux = 0;
      for (let sy = 0; sy < sub; sy++) {
        const py = y + (sy + 0.5) / sub;
        for (let sx = 0; sx < sub; sx++) {
          const px = x + (sx + 0.5) / sub;
          const rSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
          const psf = (1.0 / (2 * Math.PI * sigmaPix * sigmaPix)) * Math.exp(-rSq / (2 * sigmaPix * sigmaPix));
          pixSourceFlux += psf * subWeight;
        }
      }
      // total pixel value = source + background + slight noise
      const idx = y * w + x;
      const noise = ((idx % 7) - 3) * 0.005;
      pixels[idx] = trueNetFluxMjySr * pixSourceFlux + trueBg + noise;
    }
  }

  const mockImage: SphereXImage = {
    primaryHeader: {},
    imageHeader: { BUNIT: 'MJy/sr' },
    width: w,
    height: h,
    pixels,
    bunit: 'MJy/sr',
    wcs: {
      crval1: 200.0,
      crval2: 45.0,
      crpix1: cx + 0.5,
      crpix2: cy + 0.5,
      cdelt1: -0.0017222, // 6.2 arcsec in degrees
      cdelt2: 0.0017222,
      ctype1: 'RA---TAN',
      ctype2: 'DEC--TAN'
    }
  };

  const res = measureAperture(mockImage, 200.0, 45.0, `SynthTarget_${wl}`, {
    ...DEFAULT_PHOTOMETRY_PARAMS,
    apertureRadiusArcsec: 15.5, // 2.5 pixels standard
    annulusInnerArcsec: 24.8,
    annulusOuterArcsec: 43.4,
    applyApertureCorrection: true,
    wavelengthUm: wl,
    unit: 'ujy'
  });

  const recoveredFluxUjy = res.netFlux;
  const percentErr = Math.abs((recoveredFluxUjy - trueFluxUjy) / trueFluxUjy) * 100;
  console.log(`  Wavelength ${wl} um (FWHM=${fwhm.toFixed(2)}"): True=${trueFluxUjy.toFixed(2)} uJy, Recovered=${recoveredFluxUjy.toFixed(2)} uJy, Error=${percentErr.toFixed(3)}%`);

  assert(percentErr < 1.0, `Recovered flux at ${wl} um must be within 1% error tolerance! Got ${percentErr.toFixed(3)}%`);
  assert(Math.abs(res.bgLevel - trueBg) < 0.05, `Background should recover ${trueBg}, got ${res.bgLevel}`);
  assert.strictEqual(res.status, 'OK');
}

console.log('--- 4. Testing FITS BINTABLE and CSV Export Structure ---');
const sampleRes = measureAperture(
  {
    primaryHeader: {},
    imageHeader: { BUNIT: 'MJy/sr' },
    width: 20,
    height: 20,
    pixels: new Float32Array(400).fill(1.0),
    bunit: 'MJy/sr',
    wcs: {
      crval1: 100, crval2: 20, crpix1: 10, crpix2: 10,
      cdelt1: -0.0017222, cdelt2: 0.0017222, ctype1: 'RA---TAN', ctype2: 'DEC--TAN'
    }
  },
  100, 20, 'ExportTest', DEFAULT_PHOTOMETRY_PARAMS
);

const csvOut = resultsToCsv([sampleRes]);
assert(csvOut.includes('ExportTest'), 'CSV must contain target ID');
assert(csvOut.includes('target_id,ra_deg,dec_deg'), 'CSV must have proper header');

import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

const fitsBuf = resultsToFits([sampleRes]);
assert.strictEqual(fitsBuf.length % 2880, 0, 'FITS binary table must be exact multiple of 2880 bytes');
assert(fitsBuf.toString('ascii', 0, 8).startsWith('SIMPLE'), 'FITS must begin with SIMPLE header card');

// verify with astropy
const tmpFitsPath = '/tmp/verify_test.fits';
fs.writeFileSync(tmpFitsPath, fitsBuf);
try {
  const astropyOut = execSync(
    `uv run --with astropy python -c "from astropy.io import fits; h = fits.open('${tmpFitsPath}'); h.verify('exception'); print('Astropy verified:', h[1].name, len(h[1].data), 'rows')"`
  ).toString().trim();
  console.log('  ', astropyOut);
} catch (err: any) {
  assert.fail(`Astropy verification failed: ${err.message}`);
}

console.log('Verification Gate 1 & 2: All calibration, aperture recovery, and astropy standard tests passed 100%!');
