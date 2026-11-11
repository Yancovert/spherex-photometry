// matrix diff and addition for multi-epoch fits cutouts

export type MathMode = 'sub' | 'signed' | 'abs' | 'add';

export function computeDiff(
  a: Float32Array,
  b: Float32Array,
  mode: MathMode = 'signed'
): Float32Array {
  const len = Math.min(a.length, b.length);
  const out = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const va = a[i];
    const vb = b[i];

    // ignore bad or saturated pixels
    if (isNaN(va) || isNaN(vb) || !isFinite(va) || !isFinite(vb)) {
      out[i] = 0;
      continue;
    }

    if (mode === 'abs') {
      out[i] = Math.abs(vb - va);
    } else if (mode === 'sub' || mode === 'signed') {
      out[i] = vb - va;
    } else if (mode === 'add') {
      out[i] = (va + vb) * 0.5;
    }
  }

  return out;
}
