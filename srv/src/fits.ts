// multi-extension fits parser for real spherex data products
// handles primary header + extension hdus (IMAGE, FLAGS, VARIANCE, PSF)

export interface FitsHeader {
  [key: string]: string | number | boolean;
}

export interface FitsHdu {
  header: FitsHeader;
  extname: string;
  width: number;
  height: number;
  data: Float32Array | Int32Array | null;
}

export interface SphereXImage {
  primaryHeader: FitsHeader;
  imageHeader: FitsHeader;
  width: number;
  height: number;
  pixels: Float32Array;
  zodi?: Float32Array;
  flags?: Int32Array;
  bunit: string;
  wcs: {
    crval1: number;
    crval2: number;
    crpix1: number;
    crpix2: number;
    cdelt1: number;
    cdelt2: number;
    pc1_1?: number;
    pc1_2?: number;
    pc2_1?: number;
    pc2_2?: number;
    ctype1: string;
    ctype2: string;
    crpix1a?: number;
    crpix2a?: number;
  };
}

export function parseMultiExtensionFits(buffer: Buffer, subtractZodi = false): SphereXImage {
  let offset = 0;
  const hdus: FitsHdu[] = [];

  while (offset < buffer.length) {
    let headerCards: FitsHeader = {};
    let endFound = false;
    let headerBytes = 0;

    // read 2880 byte blocks until END card
    while (offset + headerBytes < buffer.length && !endFound) {
      const block = buffer.toString('ascii', offset + headerBytes, offset + headerBytes + 2880);
      for (let i = 0; i < 36; i++) {
        const card = block.substring(i * 80, (i + 1) * 80);
        const key = card.substring(0, 8).trim();
        if (key === 'END') {
          endFound = true;
          break;
        }
        const eqIdx = card.indexOf('=');
        if (eqIdx !== -1 && eqIdx < 12) {
          let valStr = card.substring(eqIdx + 1);
          const slashIdx = valStr.indexOf('/');
          if (slashIdx !== -1) valStr = valStr.substring(0, slashIdx);
          valStr = valStr.trim();
          const cleanVal = valStr.replace(/^'|'$/g, '').trim();

          if (cleanVal === 'T') headerCards[key] = true;
          else if (cleanVal === 'F') headerCards[key] = false;
          else if (!isNaN(Number(cleanVal)) && cleanVal.length > 0) headerCards[key] = Number(cleanVal);
          else headerCards[key] = cleanVal;
        }
      }
      headerBytes += 2880;
    }

    offset += headerBytes;
    const bitpix = Number(headerCards['BITPIX'] || 0);
    const naxis = Number(headerCards['NAXIS'] || 0);
    const naxis1 = Number(headerCards['NAXIS1'] || 0);
    const naxis2 = Number(headerCards['NAXIS2'] || 0);
    const extname = String(headerCards['EXTNAME'] || '').trim();

    let dataBytes = 0;
    let parsedData: Float32Array | Int32Array | null = null;

    if (naxis >= 2 && naxis1 > 0 && naxis2 > 0) {
      const totalPixels = naxis1 * naxis2;
      dataBytes = totalPixels * (Math.abs(bitpix) / 8);
      const rem = dataBytes % 2880;
      if (rem > 0) dataBytes += 2880 - rem;

      if (bitpix === -32) {
        // float32 big endian
        parsedData = new Float32Array(totalPixels);
        for (let p = 0; p < totalPixels; p++) {
          if (offset + p * 4 + 4 <= buffer.length) {
            parsedData[p] = buffer.readFloatBE(offset + p * 4);
          }
        }
      } else if (bitpix === 32) {
        // int32 big endian (flags)
        parsedData = new Int32Array(totalPixels);
        for (let p = 0; p < totalPixels; p++) {
          if (offset + p * 4 + 4 <= buffer.length) {
            parsedData[p] = buffer.readInt32BE(offset + p * 4);
          }
        }
      }
    }

    hdus.push({
      header: headerCards,
      extname,
      width: naxis1,
      height: naxis2,
      data: parsedData
    });

    offset += dataBytes;
    if (hdus.length > 10) break;
  }

  // HDU 0 is primary header
  const primaryHeader = hdus[0]?.header || {};
  // find HDU 1 or EXTNAME='IMAGE'
  const imageHdu = hdus.find(h => h.extname.includes('IMAGE')) || hdus[1] || hdus[0];
  const flagsHdu = hdus.find(h => h.extname.includes('FLAGS')) || hdus[2];
  const zodiHdu = hdus.find(h => h.extname.includes('ZODI'));

  const w = imageHdu.width || 128;
  const h = imageHdu.height || 128;
  const rawPixels = (imageHdu.data instanceof Float32Array)
    ? new Float32Array(imageHdu.data)
    : new Float32Array(w * h);

  const zodiPixels = (zodiHdu?.data instanceof Float32Array) ? zodiHdu.data : undefined;

  // subtract zodiacal background if requested and available
  if (subtractZodi && zodiPixels && zodiPixels.length === rawPixels.length) {
    for (let i = 0; i < rawPixels.length; i++) {
      if (!isNaN(rawPixels[i]) && !isNaN(zodiPixels[i])) {
        rawPixels[i] -= zodiPixels[i];
      }
    }
  }

  const bunit = String(imageHdu.header['BUNIT'] || 'MJy/sr');
  const pc1_1 = imageHdu.header['PC1_1'] !== undefined ? Number(imageHdu.header['PC1_1']) : undefined;
  const pc1_2 = imageHdu.header['PC1_2'] !== undefined ? Number(imageHdu.header['PC1_2']) : undefined;
  const pc2_1 = imageHdu.header['PC2_1'] !== undefined ? Number(imageHdu.header['PC2_1']) : undefined;
  const pc2_2 = imageHdu.header['PC2_2'] !== undefined ? Number(imageHdu.header['PC2_2']) : undefined;
  const crpix1a = imageHdu.header['CRPIX1A'] !== undefined ? Number(imageHdu.header['CRPIX1A']) : undefined;
  const crpix2a = imageHdu.header['CRPIX2A'] !== undefined ? Number(imageHdu.header['CRPIX2A']) : undefined;

  const wcs = {
    crval1: Number(imageHdu.header['CRVAL1'] ?? 0),
    crval2: Number(imageHdu.header['CRVAL2'] ?? 0),
    crpix1: Number(imageHdu.header['CRPIX1'] ?? (w / 2)),
    crpix2: Number(imageHdu.header['CRPIX2'] ?? (h / 2)),
    cdelt1: Number(imageHdu.header['CDELT1'] ?? -0.0017),
    cdelt2: Number(imageHdu.header['CDELT2'] ?? 0.0017),
    pc1_1,
    pc1_2,
    pc2_1,
    pc2_2,
    crpix1a,
    crpix2a,
    ctype1: String(imageHdu.header['CTYPE1'] ?? 'RA---TAN'),
    ctype2: String(imageHdu.header['CTYPE2'] ?? 'DEC--TAN')
  };

  return {
    primaryHeader,
    imageHeader: imageHdu.header,
    width: w,
    height: h,
    pixels: rawPixels,
    zodi: zodiPixels,
    flags: (flagsHdu?.data instanceof Int32Array) ? flagsHdu.data : undefined,
    bunit,
    wcs
  };
}

// compute celestial ra dec for pixel x y (0-indexed)
export function pixelToSky(wcs: SphereXImage['wcs'], x: number, y: number): { ra: number; dec: number } {
  const diffX = x + 1 - wcs.crpix1;
  const diffY = y + 1 - wcs.crpix2;

  let dx = 0;
  let dy = 0;

  if (wcs.pc1_1 !== undefined && wcs.pc2_2 !== undefined) {
    const cd1_1 = (wcs.cdelt1 || 1) * wcs.pc1_1;
    const cd1_2 = (wcs.cdelt1 || 1) * (wcs.pc1_2 || 0);
    const cd2_1 = (wcs.cdelt2 || 1) * (wcs.pc2_1 || 0);
    const cd2_2 = (wcs.cdelt2 || 1) * wcs.pc2_2;
    dx = cd1_1 * diffX + cd1_2 * diffY;
    dy = cd2_1 * diffX + cd2_2 * diffY;
  } else {
    dx = diffX * wcs.cdelt1;
    dy = diffY * wcs.cdelt2;
  }

  const rad = Math.PI / 180;
  const ra0 = wcs.crval1 * rad;
  const dec0 = wcs.crval2 * rad;
  const xi = dx * rad;
  const eta = dy * rad;

  const denom = Math.cos(dec0) - eta * Math.sin(dec0);
  const ra = ra0 + Math.atan2(xi, denom);
  const dec = Math.atan2(Math.sin(dec0) + eta * Math.cos(dec0), Math.sqrt(xi * xi + denom * denom));

  let raDeg = ra / rad;
  if (raDeg < 0) raDeg += 360;
  if (raDeg >= 360) raDeg -= 360;
  const decDeg = dec / rad;

  return { ra: raDeg, dec: decDeg };
}

// inverse tan wcs mapping to find pixel for a given sky coordinate
export function skyToPixel(wcs: SphereXImage['wcs'], raDeg: number, decDeg: number): { x: number; y: number } {
  const rad = Math.PI / 180;
  const ra0 = wcs.crval1 * rad;
  const dec0 = wcs.crval2 * rad;
  const ra = raDeg * rad;
  const dec = decDeg * rad;

  const cosDec = Math.cos(dec);
  const sinDec = Math.sin(dec);
  const cosDec0 = Math.cos(dec0);
  const sinDec0 = Math.sin(dec0);
  const deltaRa = ra - ra0;

  const denom = sinDec * sinDec0 + cosDec * cosDec0 * Math.cos(deltaRa);
  if (Math.abs(denom) < 1e-9) return { x: wcs.crpix1 - 1, y: wcs.crpix2 - 1 };

  const xi = (cosDec * Math.sin(deltaRa)) / denom;
  const eta = (sinDec * cosDec0 - cosDec * sinDec0 * Math.cos(deltaRa)) / denom;

  const dx = xi / rad;
  const dy = eta / rad;

  if (wcs.pc1_1 !== undefined && wcs.pc2_2 !== undefined) {
    const cd1_1 = (wcs.cdelt1 || 1) * wcs.pc1_1;
    const cd1_2 = (wcs.cdelt1 || 1) * (wcs.pc1_2 || 0);
    const cd2_1 = (wcs.cdelt2 || 1) * (wcs.pc2_1 || 0);
    const cd2_2 = (wcs.cdelt2 || 1) * wcs.pc2_2;
    const det = cd1_1 * cd2_2 - cd1_2 * cd2_1;
    if (Math.abs(det) < 1e-12) return { x: wcs.crpix1 - 1, y: wcs.crpix2 - 1 };
    const diffX = (cd2_2 * dx - cd1_2 * dy) / det;
    const diffY = (-cd2_1 * dx + cd1_1 * dy) / det;
    return { x: diffX + wcs.crpix1 - 1, y: diffY + wcs.crpix2 - 1 };
  }

  const diffX = dx / (wcs.cdelt1 || 1);
  const diffY = dy / (wcs.cdelt2 || 1);
  return { x: diffX + wcs.crpix1 - 1, y: diffY + wcs.crpix2 - 1 };
}

// extract spatial subgrid cutout centered on target coordinates
export function extractCutout(
  fullImage: SphereXImage,
  ra: number,
  dec: number,
  fovDeg = 0.1
): SphereXImage {
  // full frame bypass when requested fov covers entire detector
  if (fovDeg >= 2.5) {
    return fullImage;
  }

  const pix = skyToPixel(fullImage.wcs, ra, dec);
  const cd1_1 = (fullImage.wcs.cdelt1 || 1) * (fullImage.wcs.pc1_1 ?? (fullImage.wcs.cdelt1 < 0 ? -1 : 1));
  const cd1_2 = (fullImage.wcs.cdelt1 || 1) * (fullImage.wcs.pc1_2 ?? 0);
  let pixelScale = Math.hypot(cd1_1, cd1_2);
  if (!pixelScale || pixelScale < 1e-5 || pixelScale > 0.05) {
    pixelScale = 0.00174158;
  }
  const size = Math.max(32, Math.min(1024, Math.round(fovDeg / pixelScale)));
  const half = Math.floor(size / 2);
  const cx = Math.round(pix.x);
  const cy = Math.round(pix.y);

  const sub = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcX = cx - half + x;
      const srcY = cy - half + y;
      if (srcX >= 0 && srcX < fullImage.width && srcY >= 0 && srcY < fullImage.height) {
        sub[y * size + x] = fullImage.pixels[srcY * fullImage.width + srcX];
      } else {
        sub[y * size + x] = NaN;
      }
    }
  }

  const newWcs = {
    ...fullImage.wcs,
    crpix1: fullImage.wcs.crpix1 - (cx - half),
    crpix2: fullImage.wcs.crpix2 - (cy - half),
    crpix1a: cx - half + 1,
    crpix2a: cy - half + 1
  };

  return {
    primaryHeader: fullImage.primaryHeader,
    imageHeader: {
      ...fullImage.imageHeader,
      NAXIS1: size,
      NAXIS2: size,
      CRPIX1: newWcs.crpix1,
      CRPIX2: newWcs.crpix2,
      CRVAL1: fullImage.wcs.crval1,
      CRVAL2: fullImage.wcs.crval2
    },
    width: size,
    height: size,
    pixels: sub,
    bunit: fullImage.bunit,
    wcs: newWcs
  };
}

