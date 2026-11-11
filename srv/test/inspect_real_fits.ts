import fs from 'node:fs';

const buf = fs.readFileSync('test_cutout.fits');
console.log('Total file size:', buf.length, 'bytes');

let offset = 0;
let hduIdx = 0;

while (offset < buf.length) {
  let headerCards: Record<string, string> = {};
  let endFound = false;
  let headerBytes = 0;

  while (offset + headerBytes < buf.length && !endFound) {
    const block = buf.toString('ascii', offset + headerBytes, offset + headerBytes + 2880);
    for (let i = 0; i < 36; i++) {
      const card = block.substring(i * 80, (i + 1) * 80);
      const key = card.substring(0, 8).trim();
      if (key === 'END') {
        endFound = true;
        break;
      }
      const eqIdx = card.indexOf('=');
      if (eqIdx !== -1) {
        const val = card.substring(eqIdx + 1, 30).trim().replace(/^'|'$/g, '');
        headerCards[key] = val;
      }
    }
    headerBytes += 2880;
  }

  offset += headerBytes;
  const bitpix = parseInt(headerCards['BITPIX'] || '0', 10);
  const naxis = parseInt(headerCards['NAXIS'] || '0', 10);
  let naxis1 = parseInt(headerCards['NAXIS1'] || '0', 10);
  let naxis2 = parseInt(headerCards['NAXIS2'] || '0', 10);
  const extname = headerCards['EXTNAME'] || '(Primary)';

  let dataBytes = 0;
  if (naxis > 0 && naxis1 > 0 && naxis2 > 0) {
    dataBytes = naxis1 * naxis2 * (Math.abs(bitpix) / 8);
    const rem = dataBytes % 2880;
    if (rem > 0) dataBytes += (2880 - rem);
  }

  console.log(`HDU ${hduIdx}: EXTNAME='${extname}', NAXIS=${naxis} (${naxis1}x${naxis2}), BITPIX=${bitpix}, DATA_BYTES=${dataBytes}`);
  offset += dataBytes;
  hduIdx++;
  if (hduIdx > 15) break;
}
