import { parseFits, writeFits } from '../src/fits.js';
import { computeDiff } from '../src/diff.js';
import assert from 'node:assert';

console.log('Testing FITS parser & serializer...');

const width = 16;
const height = 16;
const data = new Float32Array(width * height);
for (let i = 0; i < data.length; i++) {
  data[i] = i * 1.5;
}

const buffer = writeFits(data, width, height, { TESTKEY: 'SPHEREx' });
assert(buffer.length > 2880, 'FITS buffer should be at least 2880 bytes');
assert(buffer.length % 2880 === 0, 'FITS buffer must be multiple of 2880 bytes');

const parsed = parseFits(buffer);
assert.strictEqual(parsed.width, width, 'width match');
assert.strictEqual(parsed.height, height, 'height match');
assert.strictEqual(parsed.header['TESTKEY'], 'SPHEREx', 'custom header card match');
assert.strictEqual(Math.round(parsed.data[10]), Math.round(15.0), 'pixel value match');

console.log('Testing Difference Engine...');
const dataB = new Float32Array(width * height);
for (let i = 0; i < dataB.length; i++) {
  dataB[i] = i * 1.5 + 5.0;
}

const diff = computeDiff(data, dataB, 'abs');
assert.strictEqual(Math.round(diff[5]), 5, 'diff should be 5.0');

console.log('All backend tests passed successfully!');
