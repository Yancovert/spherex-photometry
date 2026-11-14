import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const TARGETS = [
  { name: 'barnard', ra: 269.4520, dec: 4.6930 },
  { name: 'wise0855', ra: 133.7951, dec: -7.2451 },
  { name: 'rwaur', ra: 76.9563, dec: 30.4014 },
  { name: 'eps_indi', ra: 330.8400, dec: -56.7858 },
  { name: 'r_dra', ra: 248.2838, dec: 66.7025 }
];

const EPOCHS = ['allwise', 'neo2', 'neo4', 'neo7'];
const BANDS = [1, 2];
const SIZE = 128;

function extractFitsFromTarGz(tarGzBuf) {
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
  return null;
}

const cacheDir = path.resolve('cache', 'unwise');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

async function downloadAll() {
  console.log('Starting download of genuine multi-epoch FITS cutouts...');
  for (const t of TARGETS) {
    for (const b of BANDS) {
      for (const ep of EPOCHS) {
        const dest = path.join(
          cacheDir,
          `unwise_${ep}_${t.ra.toFixed(4)}_${t.dec.toFixed(4)}_b${b}_s${SIZE}.fits`
        );
        if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
          console.log(`Already cached: ${path.basename(dest)}`);
          continue;
        }

        const url = `https://unwise.me/cutout_fits?version=${ep}&ra=${t.ra}&dec=${t.dec}&size=${SIZE}&bands=${b}&file_img_m=on`;
        console.log(`Downloading: ${t.name} (${ep}, band ${b})...`);
        try {
          const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
          if (!resp.ok) {
            console.warn(`Failed ${t.name} ${ep}: HTTP ${resp.status}`);
            continue;
          }
          const ab = await resp.arrayBuffer();
          const fitsBuf = extractFitsFromTarGz(Buffer.from(ab));
          if (fitsBuf && fitsBuf.length > 1000) {
            fs.writeFileSync(dest, fitsBuf);
            console.log(`Saved: ${path.basename(dest)} (${fitsBuf.length} bytes)`);
          } else {
            console.warn(`No valid FITS in archive for ${t.name} ${ep}`);
          }
        } catch (err) {
          console.warn(`Error fetching ${t.name} ${ep}:`, err.message);
        }
        // brief pause to be polite to unwise.me
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }
  console.log('Finished downloading genuine FITS cutouts.');
}

downloadAll();
