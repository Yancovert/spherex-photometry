import pg from 'pg';

const { Pool } = pg;

let isDbConnected = false;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'spherex',
  password: process.env.PGPASSWORD || 'spherex_password',
  database: process.env.PGDATABASE || 'spherex_catalog',
  max: 10,
  connectionTimeoutMillis: 1500
});

export async function initDb(): Promise<void> {
  if (process.env.VERCEL && !process.env.PGHOST) {
    return;
  }
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS postgis;

      CREATE TABLE IF NOT EXISTS spherex_observations (
        id SERIAL PRIMARY KEY,
        plane_id VARCHAR(64),
        uri TEXT UNIQUE NOT NULL,
        bandpass VARCHAR(32),
        time_bounds_lower DOUBLE PRECISION,
        poly GEOMETRY(Polygon, 4326),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_spherex_obs_poly 
      ON spherex_observations USING GIST (poly);

      CREATE TABLE IF NOT EXISTS spherex_cutouts (
        id SERIAL PRIMARY KEY,
        cache_key VARCHAR(64) UNIQUE NOT NULL,
        ra DOUBLE PRECISION NOT NULL,
        dec DOUBLE PRECISION NOT NULL,
        fov_deg DOUBLE PRECISION NOT NULL,
        epoch INT DEFAULT 1,
        band INT DEFAULT 1,
        header JSONB NOT NULL,
        pixels_raw BYTEA NOT NULL,
        width INT NOT NULL,
        height INT NOT NULL,
        source VARCHAR(32) DEFAULT 'spherex',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_spherex_cutouts_key 
      ON spherex_cutouts (cache_key);
    `);
    isDbConnected = true;
  } finally {
    client.release();
  }
}

export async function findObservationsAt(ra: number, dec: number): Promise<any[]> {
  if (!isDbConnected) return [];
  const query = `
    SELECT id, plane_id, uri, bandpass, time_bounds_lower
    FROM spherex_observations
    WHERE ST_Contains(poly, ST_SetSRID(ST_MakePoint($1, $2), 4326))
    ORDER BY time_bounds_lower ASC;
  `;
  const res = await pool.query(query, [ra, dec]);
  return res.rows;
}

export async function saveObservation(
  planeId: string,
  uri: string,
  bandpass: string,
  timeBounds: number,
  polyWkt: string
): Promise<void> {
  if (!isDbConnected) return;
  await pool.query(`
    INSERT INTO spherex_observations (plane_id, uri, bandpass, time_bounds_lower, poly)
    VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326))
    ON CONFLICT (uri) DO UPDATE 
    SET bandpass = EXCLUDED.bandpass, time_bounds_lower = EXCLUDED.time_bounds_lower;
  `, [planeId, uri, bandpass, timeBounds, polyWkt]);
}

export async function getStoredCutout(key: string): Promise<{
  header: any;
  pixels: Float32Array;
  width: number;
  height: number;
  source: string;
} | null> {
  if (!isDbConnected) return null;
  const res = await pool.query(`
    SELECT header, pixels_raw, width, height, source
    FROM spherex_cutouts
    WHERE cache_key = $1;
  `, [key]);

  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  const buf: Buffer = row.pixels_raw;
  // convert node buffer to float32array
  const floatArr = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

  return {
    header: row.header,
    pixels: floatArr,
    width: row.width,
    height: row.height,
    source: row.source
  };
}

export async function storeCutout(
  key: string,
  ra: number,
  dec: number,
  fovDeg: number,
  epoch: number,
  band: number,
  header: any,
  pixels: Float32Array,
  width: number,
  height: number,
  source = 'spherex'
): Promise<void> {
  if (!isDbConnected) return;
  // skip caching empty or invalid frames
  let hasValid = false;
  for (let i = 0; i < Math.min(pixels.length, 1000); i++) {
    if (pixels[i] !== 0 && !isNaN(pixels[i])) {
      hasValid = true;
      break;
    }
  }
  if (!hasValid) return;

  const buf = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  await pool.query(`
    INSERT INTO spherex_cutouts (cache_key, ra, dec, fov_deg, epoch, band, header, pixels_raw, width, height, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (cache_key) DO UPDATE
    SET header = EXCLUDED.header, pixels_raw = EXCLUDED.pixels_raw;
  `, [key, ra, dec, fovDeg, epoch, band, JSON.stringify(header), buf, width, height, source]);
}
