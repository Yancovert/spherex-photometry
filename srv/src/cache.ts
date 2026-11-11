import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// flat filesystem cache for raw fits cutouts and diffs
const CACHE_DIR = path.resolve(process.cwd(), '../cache');

export async function initCache(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // dir exists or whatever
  }
}

export function cacheKey(parts: Record<string, any>): string {
  const raw = Object.keys(parts).sort().map(k => `${k}=${parts[k]}`).join('&');
  return crypto.createHash('md5').update(raw).digest('hex');
}

export async function getCached(key: string): Promise<Buffer | null> {
  const filePath = path.join(CACHE_DIR, `${key}.fits`);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function setCached(key: string, data: Buffer): Promise<void> {
  const filePath = path.join(CACHE_DIR, `${key}.fits`);
  try {
    await fs.writeFile(filePath, data);
  } catch (err) {
    // non-fatal, disk full or permissions
    console.error('cache write failed', err);
  }
}
