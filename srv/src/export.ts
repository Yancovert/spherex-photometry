// fits binary table and csv serialization for photometry results
// generates standard 2880-byte block fits table compliant with astropy/topcat and nasa fits standard 4.0

import { PhotometryResult } from './photometry.js';

export function resultsToCsv(results: PhotometryResult[]): string {
  const metadataHeaders = [
    '# SPHEREx Batch Aperture Photometry Output',
    `# Generated: ${new Date().toISOString()}`,
    '# Reference: SPHEREx Public-products v28 CBE Calibration Baseline',
    '# Pixel Pitch: 6.20 arcsec | Solid Angle: 9.035e-10 sr'
  ];

  const columnHeaders = [
    'target_id',
    'ra_deg',
    'dec_deg',
    'pixel_x',
    'pixel_y',
    'band',
    'wavelength_um',
    'fwhm_arcsec',
    'ap_corr',
    'net_flux',
    'flux_err',
    'snr',
    'bg_level',
    'bg_rms',
    'aperture_px',
    'annulus_px',
    'unit',
    'status'
  ];

  const rows = results.map(r => [
    r.targetId,
    r.ra.toFixed(6),
    r.dec.toFixed(6),
    r.pixelX.toFixed(2),
    r.pixelY.toFixed(2),
    r.bandIndex ?? 1,
    (r.wavelengthUm ?? 0.75).toFixed(4),
    (r.fwhmArcsec ?? 4.61).toFixed(2),
    (r.apertureCorrectionFactor ?? 1.0).toFixed(3),
    r.netFlux.toFixed(4),
    r.fluxError.toFixed(4),
    r.snr.toFixed(2),
    r.bgLevel.toFixed(4),
    r.bgRms.toFixed(4),
    r.aperturePixels.toFixed(2),
    r.annulusPixels,
    r.unit,
    r.status
  ].join(','));

  return [...metadataHeaders, columnHeaders.join(','), ...rows].join('\n');
}

// format a standard 80-char fits header card
function makeCard(key: string, value: string | number | boolean, comment?: string): string {
  let card = key.padEnd(8, ' ') + '= ';
  if (typeof value === 'boolean') {
    card += (value ? 'T' : 'F').padStart(20, ' ');
  } else if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      card += value.toString().padStart(20, ' ');
    } else {
      card += value.toFixed(6).padStart(20, ' ');
    }
  } else {
    // string enclosed in single quotes, starting at col 11
    card += `'${value.padEnd(8, ' ')}'`.padEnd(20, ' ');
  }

  if (comment) {
    card += ` / ${comment}`;
  }
  return card.padEnd(80, ' ').substring(0, 80);
}

// pad buffer with zeros or spaces to 2880-byte multiple
function pad2880(buf: Buffer, fillByte = 0x20): Buffer {
  const rem = buf.length % 2880;
  if (rem === 0) return buf;
  const pad = Buffer.alloc(2880 - rem, fillByte);
  return Buffer.concat([buf, pad]);
}

// generates authentic fits file with bintable hdu
export function resultsToFits(results: PhotometryResult[]): Buffer {
  // primary header: 0-data hdu conforming to fits standard 4.0
  const primaryCards = [
    makeCard('SIMPLE', true, 'conforms to FITS standard'),
    makeCard('BITPIX', 8, '8-bit character bytes'),
    makeCard('NAXIS', 0, 'no data in primary array'),
    makeCard('EXTEND', true, 'FITS table extension follows'),
    makeCard('TELESCOP', 'SPHEREx', 'NASA SPHEREx Mission'),
    makeCard('ORIGIN', 'CALTECH/IPAC', 'SPHEREx Batch Analysis Subsystem'),
    makeCard('INSTRUME', 'SPHEREx-L2', 'SPHEREx Level 2 Calibrated Pipeline'),
    'COMMENT   SPHEREx Batch Aperture Photometry Table                               ',
    'COMMENT   Conforming to v28 CBE Calibration Baseline                            ',
    'END'.padEnd(80, ' ')
  ];
  const primaryBuf = pad2880(Buffer.from(primaryCards.join(''), 'ascii'));

  // binary table schema:
  // col 1: TARGET_ID (32A, 32 bytes)
  // col 2: RA (1D, 8 bytes)
  // col 3: DEC (1D, 8 bytes)
  // col 4: PIX_X (1E, 4 bytes)
  // col 5: PIX_Y (1E, 4 bytes)
  // col 6: BAND (1J, 4 bytes)
  // col 7: WAVELENGTH (1E, 4 bytes)
  // col 8: NET_FLUX (1E, 4 bytes)
  // col 9: FLUX_ERR (1E, 4 bytes)
  // col 10: SNR (1E, 4 bytes)
  // col 11: BG_LEVEL (1E, 4 bytes)
  // col 12: BG_RMS (1E, 4 bytes)
  // col 13: AP_CORR (1E, 4 bytes)
  // col 14: STATUS (16A, 16 bytes)
  // total row size = 32 + 8 + 8 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 16 = 104 bytes
  const rowBytes = 104;
  const numRows = results.length;
  const unitStr = results.length > 0 ? results[0].unit : 'ujy';

  const extCards = [
    makeCard('XTENSION', 'BINTABLE', 'binary table extension'),
    makeCard('BITPIX', 8, '8-bit bytes'),
    makeCard('NAXIS', 2, '2-dimensional binary table'),
    makeCard('NAXIS1', rowBytes, 'bytes per row'),
    makeCard('NAXIS2', numRows, 'number of rows'),
    makeCard('PCOUNT', 0, 'no variable array area'),
    makeCard('GCOUNT', 1, 'one data group'),
    makeCard('TFIELDS', 14, 'number of table columns'),
    makeCard('EXTNAME', 'SPHEREX_SED', 'SPHEREx Spectral Energy Distribution'),

    makeCard('TTYPE1', 'TARGET_ID', 'Target Identifier'),
    makeCard('TFORM1', '32A', '32 characters'),

    makeCard('TTYPE2', 'RA', 'Right Ascension J2000'),
    makeCard('TFORM2', '1D', '64-bit float'),
    makeCard('TUNIT2', 'deg', 'degrees'),

    makeCard('TTYPE3', 'DEC', 'Declination J2000'),
    makeCard('TFORM3', '1D', '64-bit float'),
    makeCard('TUNIT3', 'deg', 'degrees'),

    makeCard('TTYPE4', 'PIX_X', 'Detector pixel X'),
    makeCard('TFORM4', '1E', '32-bit float'),
    makeCard('TUNIT4', 'pixel', 'detector pixels'),

    makeCard('TTYPE5', 'PIX_Y', 'Detector pixel Y'),
    makeCard('TFORM5', '1E', '32-bit float'),
    makeCard('TUNIT5', 'pixel', 'detector pixels'),

    makeCard('TTYPE6', 'BAND', 'SPHEREx band index (1-6)'),
    makeCard('TFORM6', '1J', '32-bit integer'),

    makeCard('TTYPE7', 'WAVELENGTH', 'Central wavelength'),
    makeCard('TFORM7', '1E', '32-bit float'),
    makeCard('TUNIT7', 'um', 'microns'),

    makeCard('TTYPE8', 'NET_FLUX', 'Aperture flux'),
    makeCard('TFORM8', '1E', '32-bit float'),
    makeCard('TUNIT8', unitStr, 'flux measurement unit'),

    makeCard('TTYPE9', 'FLUX_ERR', '1-sigma flux uncertainty'),
    makeCard('TFORM9', '1E', '32-bit float'),
    makeCard('TUNIT9', unitStr, 'flux error unit'),

    makeCard('TTYPE10', 'SNR', 'Signal to noise ratio'),
    makeCard('TFORM10', '1E', '32-bit float'),

    makeCard('TTYPE11', 'BG_LEVEL', 'Sky background level'),
    makeCard('TFORM11', '1E', '32-bit float'),
    makeCard('TUNIT11', 'MJy/sr', 'detector surface brightness'),

    makeCard('TTYPE12', 'BG_RMS', 'Sky background standard deviation'),
    makeCard('TFORM12', '1E', '32-bit float'),
    makeCard('TUNIT12', 'MJy/sr', 'detector surface brightness'),

    makeCard('TTYPE13', 'AP_CORR', 'Aperture flux loss correction factor'),
    makeCard('TFORM13', '1E', '32-bit float'),

    makeCard('TTYPE14', 'STATUS', 'Quality status flag'),
    makeCard('TFORM14', '16A', '16 characters'),

    'END'.padEnd(80, ' ')
  ];

  const extHeaderBuf = pad2880(Buffer.from(extCards.join(''), 'ascii'));

  // binary data block (big endian)
  const dataBuf = Buffer.alloc(rowBytes * numRows);
  let offset = 0;

  for (const r of results) {
    // 1. target id 32A
    const idStr = r.targetId.padEnd(32, ' ').substring(0, 32);
    dataBuf.write(idStr, offset, 32, 'ascii');
    offset += 32;

    // 2. ra 1D
    dataBuf.writeDoubleBE(r.ra, offset);
    offset += 8;

    // 3. dec 1D
    dataBuf.writeDoubleBE(r.dec, offset);
    offset += 8;

    // 4. pix x 1E
    dataBuf.writeFloatBE(r.pixelX, offset);
    offset += 4;

    // 5. pix y 1E
    dataBuf.writeFloatBE(r.pixelY, offset);
    offset += 4;

    // 6. band 1J
    dataBuf.writeInt32BE(r.bandIndex ?? 1, offset);
    offset += 4;

    // 7. wavelength 1E
    dataBuf.writeFloatBE(r.wavelengthUm ?? 0.75, offset);
    offset += 4;

    // 8. net flux 1E
    dataBuf.writeFloatBE(r.netFlux, offset);
    offset += 4;

    // 9. flux err 1E
    dataBuf.writeFloatBE(r.fluxError, offset);
    offset += 4;

    // 10. snr 1E
    dataBuf.writeFloatBE(r.snr, offset);
    offset += 4;

    // 11. bg level 1E
    dataBuf.writeFloatBE(r.bgLevel, offset);
    offset += 4;

    // 12. bg rms 1E
    dataBuf.writeFloatBE(r.bgRms, offset);
    offset += 4;

    // 13. ap corr 1E
    dataBuf.writeFloatBE(r.apertureCorrectionFactor ?? 1.0, offset);
    offset += 4;

    // 14. status 16A
    const statusStr = (r.status || 'OK').padEnd(16, ' ').substring(0, 16);
    dataBuf.write(statusStr, offset, 16, 'ascii');
    offset += 16;
  }

  const paddedDataBuf = pad2880(dataBuf, 0x00);
  return Buffer.concat([primaryBuf, extHeaderBuf, paddedDataBuf]);
}
