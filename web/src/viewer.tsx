import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { fetchPixels, fetchDiff, PixelResponse } from './api';
import { ColormapType, MathTransfer, ViewerMode } from './input';

interface ViewerProps {
  ra: number;
  dec: number;
  fov: number;
  epoch: number;
  band: number;
  colormap: ColormapType;
  transfer: MathTransfer;
  measureMode: boolean;
  mode: ViewerMode;
  savePngTrigger: number;
  targetLabel?: string;
  onFovChange: (fov: number) => void;
  onSourceClick: (px: number, py: number) => void;
}

interface CursorHover {
  visible: boolean;
  screenX: number;
  screenY: number;
  pixelX: number;
  pixelY: number;
  raDeg: number;
  decDeg: number;
  val: number;
  bunit: string;
}

interface AnnulusAperture {
  cx: number;
  cy: number;
  rAper: number;
  rIn: number;
  rOut: number;
  aperPixels: number;
  annPixels: number;
  rawSum: number;
  skyMedian: number;
  skyStd: number;
  netFlux: number;
  fluxMjy: number;
  snr: number;
}

// precalculated 256*3 RGB lookup tables for scientific false-color mapping
function createColormapLut(type: ColormapType): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  let stops: [number, number, number, number][];

  if (type === 'viridis') {
    stops = [
      [0.0, 68, 1, 84],
      [0.25, 59, 82, 139],
      [0.5, 33, 145, 140],
      [0.75, 94, 201, 98],
      [1.0, 253, 231, 37]
    ];
  } else if (type === 'inferno') {
    stops = [
      [0.0, 0, 0, 4],
      [0.25, 87, 16, 110],
      [0.5, 187, 55, 84],
      [0.75, 249, 142, 9],
      [1.0, 252, 255, 164]
    ];
  } else if (type === 'plasma') {
    stops = [
      [0.0, 13, 8, 135],
      [0.25, 126, 3, 168],
      [0.5, 204, 71, 120],
      [0.75, 248, 149, 64],
      [1.0, 240, 249, 33]
    ];
  } else if (type === 'turbo') {
    stops = [
      [0.0, 48, 18, 59],
      [0.2, 70, 134, 251],
      [0.4, 27, 229, 181],
      [0.6, 164, 252, 60],
      [0.8, 251, 155, 38],
      [1.0, 122, 4, 3]
    ];
  } else if (type === 'coolwarm') {
    stops = [
      [0.0, 59, 76, 192],
      [0.5, 221, 221, 221],
      [1.0, 180, 4, 38]
    ];
  } else if (type === 'inverted') {
    for (let i = 0; i < 256; i++) {
      const g = 255 - i;
      lut[i * 3] = g;
      lut[i * 3 + 1] = g;
      lut[i * 3 + 2] = g;
    }
    return lut;
  } else {
    // linear grayscale
    for (let i = 0; i < 256; i++) {
      lut[i * 3] = i;
      lut[i * 3 + 1] = i;
      lut[i * 3 + 2] = i;
    }
    return lut;
  }

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let seg = 0;
    while (seg < stops.length - 2 && t > stops[seg + 1][0]) seg++;
    const s0 = stops[seg];
    const s1 = stops[seg + 1];
    const frac = (t - s0[0]) / Math.max(1e-5, s1[0] - s0[0]);
    lut[i * 3] = Math.round(s0[1] + (s1[1] - s0[1]) * frac);
    lut[i * 3 + 1] = Math.round(s0[2] + (s1[2] - s0[2]) * frac);
    lut[i * 3 + 2] = Math.round(s0[3] + (s1[3] - s0[3]) * frac);
  }
  return lut;
}

export const Viewer: React.FC<ViewerProps> = ({
  ra,
  dec,
  fov,
  band,
  colormap,
  transfer,
  measureMode,
  mode,
  savePngTrigger,
  onSourceClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorbarRef = useRef<HTMLCanvasElement>(null);

  // offscreen canvas caches for 60fps blink toggling
  const offscreenRef1 = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef2 = useRef<HTMLCanvasElement | null>(null);
  const offscreenRefDiff = useRef<HTMLCanvasElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [hasSphereX, setHasSphereX] = useState(true);
  const [sourceType, setSourceType] = useState('spherex');
  const [bunit, setBunit] = useState('MJy/sr');

  // data stores for multi-epoch frames
  const [dataEpoch1, setDataEpoch1] = useState<PixelResponse | null>(null);
  const [dataEpoch2, setDataEpoch2] = useState<PixelResponse | null>(null);
  const [dataDiff, setDataDiff] = useState<PixelResponse | null>(null);

  // display cuts
  const [cutLow, setCutLow] = useState<number>(0);
  const [cutHigh, setCutHigh] = useState<number>(1);

  // single mode active epoch selection
  const [selectedEpoch, setSelectedEpoch] = useState<number>(1);

  // blink comparator state
  const [blinkEpoch, setBlinkEpoch] = useState<number>(1);
  const [isBlinking, setIsBlinking] = useState<boolean>(true);
  const [blinkSpeed, setBlinkSpeed] = useState<number>(4);

  // camera viewport transform
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number }>({
    mouseX: 0,
    mouseY: 0,
    panX: 0,
    panY: 0
  });

  // aperture photometry with sky background annulus
  const [aperture, setAperture] = useState<AnnulusAperture | null>(null);
  const isMeasuringRef = useRef(false);
  const measureCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });

  const [hover, setHover] = useState<CursorHover>({
    visible: false,
    screenX: 0,
    screenY: 0,
    pixelX: 0,
    pixelY: 0,
    raDeg: ra,
    decDeg: dec,
    val: 0,
    bunit: 'MJy/sr'
  });

  // effective colormap: default coolwarm in diff mode for symmetric dipole visibility
  const effectiveColormap = useMemo(() => {
    if (mode === 'diff' && colormap === 'viridis') return 'coolwarm';
    return colormap;
  }, [mode, colormap]);

  const activeLut = useMemo(() => createColormapLut(effectiveColormap), [effectiveColormap]);

  // active pixel response based on mode
  const currentPixelData = useMemo(() => {
    if (mode === 'diff') return dataDiff;
    if (mode === 'blink') return blinkEpoch === 1 ? dataEpoch1 : dataEpoch2;
    return selectedEpoch === 1 ? dataEpoch1 : dataEpoch2;
  }, [mode, selectedEpoch, blinkEpoch, dataEpoch1, dataEpoch2, dataDiff]);

  // trigger save png
  useEffect(() => {
    if (savePngTrigger > 0 && canvasRef.current) {
      const link = document.createElement('a');
      link.download = `spherex_${mode}_${ra.toFixed(4)}_${dec.toFixed(4)}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  }, [savePngTrigger, ra, dec, mode]);

  // blink comparator timer
  useEffect(() => {
    if (mode !== 'blink' || !isBlinking) return;
    const intervalMs = Math.round(1000 / blinkSpeed);
    const timer = setInterval(() => {
      setBlinkEpoch(prev => (prev === 1 ? 2 : 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [mode, isBlinking, blinkSpeed]);

  // data fetching: loads epoch 1, epoch 2, and diff
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      try {
        if (mode === 'diff') {
          const diffRes = await fetchDiff(ra, dec, 1, 2, band, fov, 'signed');
          if (cancelled) return;
          setDataDiff(diffRes);
          setHasSphereX(diffRes.hasSphereX);
          setSourceType(diffRes.source);
          setBunit(diffRes.bunit);

          // symmetric zscale cut around zero for signed dipole residuals
          const absVals: number[] = [];
          const step = Math.max(1, Math.floor(diffRes.pixels.length / 50000));
          for (let i = 0; i < diffRes.pixels.length; i += step) {
            const v = diffRes.pixels[i];
            if (!isNaN(v) && isFinite(v)) absVals.push(Math.abs(v));
          }
          absVals.sort((a, b) => a - b);
          const p99 = absVals[Math.floor(absVals.length * 0.99)] || 1;
          const safeMax = Math.max(0.5, p99);
          setCutLow(-safeMax);
          setCutHigh(safeMax);

          // center viewport based on actual image dimensions
          if (containerRef.current) {
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const imgW = diffRes.width;
            const imgH = diffRes.height;
            const fitZoom = Math.min(cw / imgW, ch / imgH) * 0.92;
            setZoom(Math.max(0.05, Math.min(50, fitZoom)));
            setPan({
              x: (cw - imgW * fitZoom) / 2,
              y: (ch - imgH * fitZoom) / 2
            });
          }
        } else {
          // fetch epoch 1 and epoch 2 in parallel for instant blinking
          const [e1Res, e2Res] = await Promise.all([
            fetchPixels(ra, dec, 1, band, fov, false),
            fetchPixels(ra, dec, 2, band, fov, false)
          ]);
          if (cancelled) return;

          setDataEpoch1(e1Res);
          setDataEpoch2(e2Res);
          setHasSphereX(e1Res.hasSphereX);
          setSourceType(e1Res.source);
          setBunit(e1Res.bunit);

          // calculate robust astronomical percentile cuts
          const valid: number[] = [];
          const step = Math.max(1, Math.floor(e1Res.pixels.length / 50000));
          for (let i = 0; i < e1Res.pixels.length; i += step) {
            const v = e1Res.pixels[i];
            if (!isNaN(v) && isFinite(v)) valid.push(v);
          }
          if (valid.length > 0) {
            valid.sort((a, b) => a - b);
            const p1 = valid[Math.floor(valid.length * 0.005)];
            const p50 = valid[Math.floor(valid.length * 0.50)];
            const p99_5 = valid[Math.floor(valid.length * 0.995)];
            setCutLow(p1);
            // ensure contrast range so flat diffuse background doesn't turn into chunky noise
            const minHigh = p50 + Math.max(0.6, (p99_5 - p50));
            setCutHigh(Math.max(minHigh, p99_5));
          } else {
            setCutLow(0);
            setCutHigh(1);
          }

          // center viewport based on actual image dimensions
          if (containerRef.current) {
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const imgW = e1Res.width;
            const imgH = e1Res.height;
            const fitZoom = Math.min(cw / imgW, ch / imgH) * 0.92;
            setZoom(Math.max(0.05, Math.min(50, fitZoom)));
            setPan({
              x: (cw - imgW * fitZoom) / 2,
              y: (ch - imgH * fitZoom) / 2
            });
          }
        }
      } catch (err) {
        console.error('frame load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [ra, dec, fov, band, mode]);

  // offscreen canvas renderer for arbitrary float32 buffers
  const renderBuffer = useCallback(
    (pixelRes: PixelResponse | null, canvas: HTMLCanvasElement | null) => {
      if (!pixelRes || !canvas) return;
      const { width, height, pixels } = pixelRes;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = ctx.createImageData(width, height);
      const rgba = img.data;
      const lut = activeLut;
      const range = Math.max(1e-7, cutHigh - cutLow);

      // 1024-step transfer lut to avoid millions of transcendental calls
      const transLut = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        const norm = i / 1023;
        let scaled = norm;
        if (transfer === 'asinh') {
          scaled = Math.asinh(norm * 10) / Math.asinh(10);
        } else if (transfer === 'log') {
          scaled = Math.log(1 + norm * 9) / Math.log(10);
        } else if (transfer === 'sqrt') {
          scaled = Math.sqrt(norm);
        }
        transLut[i] = Math.min(255, Math.max(0, Math.round(scaled * 255)));
      }

      const len = pixels.length;
      for (let i = 0; i < len; i++) {
        const v = pixels[i];
        const idx = i * 4;

        if (!isNaN(v) && isFinite(v)) {
          let norm = (v - cutLow) / range;
          if (norm < 0) norm = 0;
          else if (norm > 1) norm = 1;

          const normInt = (norm * 1023) | 0;
          const lutVal = transLut[normInt];
          const lutIdx = lutVal * 3;

          rgba[idx] = lut[lutIdx];
          rgba[idx + 1] = lut[lutIdx + 1];
          rgba[idx + 2] = lut[lutIdx + 2];
          rgba[idx + 3] = 255;
        } else {
          // unobserved pixels
          rgba[idx] = 8;
          rgba[idx + 1] = 8;
          rgba[idx + 2] = 8;
          rgba[idx + 3] = 255;
        }
      }

      ctx.putImageData(img, 0, 0);
    },
    [cutLow, cutHigh, activeLut, transfer]
  );

  // keep offscreen buffers updated
  useEffect(() => {
    if (!offscreenRef1.current) offscreenRef1.current = document.createElement('canvas');
    if (!offscreenRef2.current) offscreenRef2.current = document.createElement('canvas');
    if (!offscreenRefDiff.current) offscreenRefDiff.current = document.createElement('canvas');

    if (mode === 'diff') {
      renderBuffer(dataDiff, offscreenRefDiff.current);
    } else {
      renderBuffer(dataEpoch1, offscreenRef1.current);
      renderBuffer(dataEpoch2, offscreenRef2.current);
    }
  }, [mode, dataDiff, dataEpoch1, dataEpoch2, renderBuffer]);

  // aperture photometry with concentric background sky annulus
  const calculateApertureStats = useCallback(
    (cx: number, cy: number, rAper: number): AnnulusAperture | null => {
      if (!currentPixelData || rAper <= 0.5) return null;
      const { width, height, pixels, wcs } = currentPixelData;

      // concentric annulus geometry
      const rIn = Math.max(rAper + 1.5, rAper * 1.5);
      const rOut = Math.max(rIn + 2.5, rAper * 2.5);

      const rAper2 = rAper * rAper;
      const rIn2 = rIn * rIn;
      const rOut2 = rOut * rOut;

      const minX = Math.max(0, Math.floor(cx - rOut));
      const maxX = Math.min(width - 1, Math.ceil(cx + rOut));
      const minY = Math.max(0, Math.floor(cy - rOut));
      const maxY = Math.min(height - 1, Math.ceil(cy + rOut));

      const aperVals: number[] = [];
      const annVals: number[] = [];

      for (let y = minY; y <= maxY; y++) {
        const dy2 = (y - cy) * (y - cy);
        for (let x = minX; x <= maxX; x++) {
          const d2 = (x - cx) * (x - cx) + dy2;
          const val = pixels[y * width + x];
          if (isNaN(val) || !isFinite(val)) continue;

          if (d2 <= rAper2) {
            aperVals.push(val);
          } else if (d2 >= rIn2 && d2 <= rOut2) {
            annVals.push(val);
          }
        }
      }

      if (aperVals.length === 0) return null;

      // median background level robust against cosmic rays and neighbours
      annVals.sort((a, b) => a - b);
      const skyMedian = annVals.length > 0 ? annVals[Math.floor(annVals.length / 2)] : 0;

      // background standard deviation
      let sumSqDiff = 0;
      for (const v of annVals) {
        sumSqDiff += (v - skyMedian) * (v - skyMedian);
      }
      const skyStd = annVals.length > 1 ? Math.sqrt(sumSqDiff / (annVals.length - 1)) : 0;

      // raw and background-subtracted net flux
      const rawSum = aperVals.reduce((acc, v) => acc + v, 0);
      const netFlux = rawSum - aperVals.length * skyMedian;

      // solid angle per detector pixel in steradians
      const cdelt = Math.abs(wcs.cdelt1 || 0.00172);
      const omegaPix = Math.pow(cdelt * (Math.PI / 180), 2);
      // convert MJy/sr integrated over solid angle into milliJanskys
      const fluxMjy = netFlux * omegaPix * 1e9;

      // snr via ccd equation with background annulus variance
      const sigmaTot = skyStd * Math.sqrt(aperVals.length + Math.pow(aperVals.length, 2) / Math.max(1, annVals.length));
      const snr = sigmaTot > 0 && netFlux > 0 ? netFlux / sigmaTot : 0;

      return {
        cx,
        cy,
        rAper,
        rIn,
        rOut,
        aperPixels: aperVals.length,
        annPixels: annVals.length,
        rawSum,
        skyMedian,
        skyStd,
        netFlux,
        fluxMjy,
        snr
      };
    },
    [currentPixelData]
  );

  // canvas draw loop
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !currentPixelData) return;

    let offCanvas: HTMLCanvasElement | null = null;
    if (mode === 'diff') {
      offCanvas = offscreenRefDiff.current;
    } else if (mode === 'blink') {
      offCanvas = blinkEpoch === 1 ? offscreenRef1.current : offscreenRef2.current;
    } else {
      offCanvas = selectedEpoch === 1 ? offscreenRef1.current : offscreenRef2.current;
    }

    if (!offCanvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.imageSmoothingEnabled = zoom < 3;
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // fast blit of pre-rendered detector frame
    ctx.drawImage(offCanvas, 0, 0);

    // frame border
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(0, 0, currentPixelData.width, currentPixelData.height);

    ctx.restore();

    // render circular aperture with concentric sky background annulus
    if (aperture && aperture.rAper > 0) {
      const sx = pan.x + aperture.cx * zoom;
      const sy = pan.y + aperture.cy * zoom;
      const srAper = aperture.rAper * zoom;
      const srIn = aperture.rIn * zoom;
      const srOut = aperture.rOut * zoom;

      ctx.save();

      // inner source aperture circle
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(sx, sy, srAper, 0, Math.PI * 2);
      ctx.stroke();

      // inner background annulus circle
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, srIn, 0, Math.PI * 2);
      ctx.stroke();

      // outer background annulus circle
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sx, sy, srOut, 0, Math.PI * 2);
      ctx.stroke();

      // center reticle
      ctx.strokeStyle = '#facc15';
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy);
      ctx.lineTo(sx + 4, sy);
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx, sy + 4);
      ctx.stroke();

      ctx.restore();
    }

    if (!hasSphereX && sourceType === 'unobserved') {
      ctx.fillStyle = '#71717a';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[ NO SPHEREx OBSERVATION COVERAGE AT THESE COORDINATES ]', width / 2, height / 2);
    }
  }, [pan, zoom, currentPixelData, mode, selectedEpoch, blinkEpoch, hasSphereX, sourceType, aperture]);

  // calibrated vertical colorbar
  const drawColorbar = useCallback(() => {
    const cbar = colorbarRef.current;
    if (!cbar || !currentPixelData) return;
    const ctx = cbar.getContext('2d');
    if (!ctx) return;

    const w = cbar.width;
    const h = cbar.height;
    ctx.clearRect(0, 0, w, h);

    const img = ctx.createImageData(w, h);
    const rgba = img.data;
    const lut = activeLut;

    for (let y = 0; y < h; y++) {
      const norm = 1 - y / (h - 1);
      const lutIdx = Math.min(255, Math.floor(norm * 255)) * 3;
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        rgba[idx] = lut[lutIdx];
        rgba[idx + 1] = lut[lutIdx + 1];
        rgba[idx + 2] = lut[lutIdx + 2];
        rgba[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [activeLut, currentPixelData]);

  useEffect(() => {
    drawMainCanvas();
    drawColorbar();
  }, [drawMainCanvas, drawColorbar]);

  // mouse interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container || !currentPixelData) return;

    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const imgX = (screenX - pan.x) / zoom;
    const imgY = (screenY - pan.y) / zoom;

    if (measureMode) {
      isMeasuringRef.current = true;
      measureCenterRef.current = { cx: imgX, cy: imgY };
      const initial = calculateApertureStats(imgX, imgY, 2);
      setAperture(initial);
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container || !currentPixelData) return;

    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const imgX = (screenX - pan.x) / zoom;
    const imgY = (screenY - pan.y) / zoom;

    if (measureMode && isMeasuringRef.current) {
      const rAper = Math.max(1, Math.hypot(imgX - measureCenterRef.current.cx, imgY - measureCenterRef.current.cy));
      const updated = calculateApertureStats(measureCenterRef.current.cx, measureCenterRef.current.cy, rAper);
      setAperture(updated);
      return;
    }

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
    }

    const intX = Math.floor(imgX);
    const intY = Math.floor(imgY);

    if (intX < 0 || intX >= currentPixelData.width || intY < 0 || intY >= currentPixelData.height) {
      setHover(prev => ({ ...prev, visible: false }));
      return;
    }

    const val = currentPixelData.pixels[intY * currentPixelData.width + intX] ?? 0;

    // celestial wcs calculation
    const wcs = currentPixelData.wcs;
    const diffX = intX + 1 - wcs.crpix1;
    const diffY = intY + 1 - wcs.crpix2;
    const cd1_1 = (wcs.cdelt1 || 1) * (wcs.pc1_1 ?? (wcs.cdelt1 < 0 ? -1 : 1));
    const cd1_2 = (wcs.cdelt1 || 1) * (wcs.pc1_2 ?? 0);
    const cd2_1 = (wcs.cdelt2 || 1) * (wcs.pc2_1 ?? 0);
    const cd2_2 = (wcs.cdelt2 || 1) * (wcs.pc2_2 ?? (wcs.cdelt2 > 0 ? 1 : -1));

    const dx = cd1_1 * diffX + cd1_2 * diffY;
    const dy = cd2_1 * diffX + cd2_2 * diffY;
    const rad = Math.PI / 180;
    const ra0 = wcs.crval1 * rad;
    const dec0 = wcs.crval2 * rad;
    const xi = dx * rad;
    const eta = dy * rad;

    const denom = Math.cos(dec0) - eta * Math.sin(dec0);
    let curRa = (ra0 + Math.atan2(xi, denom)) / rad;
    if (curRa < 0) curRa += 360;
    if (curRa >= 360) curRa -= 360;
    const curDec = Math.atan2(Math.sin(dec0) + eta * Math.cos(dec0), Math.sqrt(xi * xi + denom * denom)) / rad;

    setHover({
      visible: true,
      screenX: e.clientX,
      screenY: e.clientY,
      pixelX: intX,
      pixelY: intY,
      raDeg: curRa,
      decDeg: curDec,
      val: Number(val.toFixed(3)),
      bunit
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    isMeasuringRef.current = false;
  };

  // deep mouse-wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.2, Math.min(50, zoom * factor));

    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    setPan({
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom
    });
    setZoom(newZoom);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="relative flex-1 w-full h-full bg-black select-none font-mono overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          isMeasuringRef.current = false;
          setHover(prev => ({ ...prev, visible: false }));
        }}
        onClick={() => {
          if (!measureMode && hover.visible && !isDragging) {
            onSourceClick(hover.pixelX, hover.pixelY);
          }
        }}
        className={`w-full h-full block ${
          measureMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-default'
        }`}
      />

      {/* single mode epoch selector */}
      {mode === 'single' && (
        <div className="absolute top-3 right-3 z-30 bg-mono-950/95 border border-mono-800 px-2.5 py-1 text-xs text-mono-200 flex items-center gap-2 shadow-xl rounded">
          <span className="text-mono-400">Epoch:</span>
          <div className="flex items-center border border-mono-700 rounded overflow-hidden">
            {[1, 2].map(ep => (
              <button
                key={ep}
                onClick={() => setSelectedEpoch(ep)}
                className={`px-2 py-0.5 text-xs ${
                  selectedEpoch === ep
                    ? 'bg-mono-200 text-mono-950 font-bold'
                    : 'text-mono-400 hover:text-white bg-mono-900'
                }`}
              >
                Epoch {ep}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* blink mode controls */}
      {mode === 'blink' && (
        <div className="absolute top-3 right-3 z-30 bg-mono-950/95 border border-mono-800 px-2.5 py-1 text-xs text-mono-200 flex items-center gap-2 shadow-xl rounded">
          <span className="text-white font-bold">Blink:</span>
          <button
            onClick={() => setIsBlinking(b => !b)}
            className="px-2 py-0.5 rounded border border-mono-700 hover:border-mono-400 text-mono-200 text-xs"
          >
            {isBlinking ? 'Pause' : 'Play'}
          </button>
          <div className="flex items-center border border-mono-700 rounded overflow-hidden">
            {[1, 2, 4, 8].map(hz => (
              <button
                key={hz}
                onClick={() => setBlinkSpeed(hz)}
                className={`px-1.5 py-0.5 text-[11px] ${
                  blinkSpeed === hz
                    ? 'bg-mono-200 text-mono-950 font-bold'
                    : 'text-mono-400 hover:text-white bg-mono-900'
                }`}
              >
                {hz}Hz
              </button>
            ))}
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold ${
              blinkEpoch === 1
                ? 'bg-blue-950 text-blue-300 border border-blue-700'
                : 'bg-amber-950 text-amber-300 border border-amber-700'
            }`}
          >
            Epoch {blinkEpoch}
          </span>
        </div>
      )}

      {/* difference mode indicator */}
      {mode === 'diff' && (
        <div className="absolute top-3 right-3 z-30 bg-mono-950/95 border border-mono-800 px-2.5 py-1 text-xs text-mono-200 flex items-center gap-2 shadow-xl rounded">
          <span className="text-mono-400">Mode:</span>
          <span className="text-white font-bold">Signed Difference (Epoch 2 - Epoch 1)</span>
        </div>
      )}

      {/* calibrated vertical colorbar */}
      {currentPixelData && (
        <div className="absolute right-3 top-16 bottom-12 flex items-center gap-1.5 pointer-events-none select-none text-[9px] font-mono z-20">
          <canvas
            ref={colorbarRef}
            width={16}
            height={200}
            className="border border-mono-800 shadow-xl"
          />
          <div className="h-[200px] flex flex-col justify-between text-mono-300 py-0.5">
            <div>
              {cutHigh.toFixed(2)} <span className="text-[8px] text-mono-500">{bunit}</span>
            </div>
            <div>{(cutLow + (cutHigh - cutLow) * 0.75).toFixed(2)}</div>
            <div>{(cutLow + (cutHigh - cutLow) * 0.5).toFixed(2)}</div>
            <div>{(cutLow + (cutHigh - cutLow) * 0.25).toFixed(2)}</div>
            <div>{cutLow.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* concentric sky annulus aperture photometry HUD */}
      {measureMode && aperture && (
        <div className="absolute top-3 left-3 z-30 bg-mono-950/95 border border-yellow-500/70 px-3 py-2 text-xs text-mono-200 flex flex-col gap-1 shadow-2xl rounded max-w-md">
          <div className="flex items-center justify-between border-b border-mono-800 pb-1">
            <span className="text-yellow-400 font-bold">Aperture Photometry (Sky Subtracted)</span>
            <button
              onClick={() => setAperture(null)}
              className="text-mono-400 hover:text-white border border-mono-700 hover:border-mono-400 px-1.5 py-0.2 rounded text-[10px]"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>r_aper: <span className="text-white font-bold">{aperture.rAper.toFixed(1)} px</span> ({aperture.aperPixels} px)</span>
            <span>sky: <span className="text-sky-300 font-bold">{aperture.rIn.toFixed(1)} - {aperture.rOut.toFixed(1)} px</span> ({aperture.annPixels} px)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Net Flux: <span className="text-white font-bold">{aperture.netFlux.toFixed(3)}</span> {bunit}</span>
            <span>Flux Density: <span className="text-green-400 font-bold">{aperture.fluxMjy.toFixed(2)} mJy</span></span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-mono-400">
            <span>Sky Bkg: {aperture.skyMedian.toFixed(3)} &plusmn; {aperture.skyStd.toFixed(3)}</span>
            <span>SNR: <span className="text-yellow-300 font-bold">{aperture.snr.toFixed(1)}</span></span>
          </div>
        </div>
      )}

      {/* bottom status line */}
      <footer className="absolute bottom-0 left-0 right-0 h-6 bg-mono-950/95 border-t border-mono-800 px-3 flex items-center justify-between text-[11px] text-mono-400 z-30 select-none">
        <div>
          {hover.visible ? (
            <span>
              RA: <span className="text-white">{hover.raDeg.toFixed(4)}&deg;</span> DEC:{' '}
              <span className="text-white">{hover.decDeg.toFixed(4)}&deg;</span> &bull; Pixel [{hover.pixelX}, {hover.pixelY}] &bull; Flux:{' '}
              <span className="text-white font-bold">{hover.val}</span> {hover.bunit}
            </span>
          ) : (
            <span>Click any source to extract 102-channel NIR spectrum &bull; Drag to pan &bull; Wheel to zoom</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sourceType === 'spherex' ? (
            <span className="text-emerald-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
              SPHEREx QR2 (ZODI SUBTRACTED)
            </span>
          ) : sourceType === 'allwise' ? (
            <span className="text-amber-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800">
              ALLWISE PRECURSOR
            </span>
          ) : (
            <span className="text-red-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800">
              NO SURVEY COVERAGE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading && <span className="text-mono-300 animate-pulse">loading...</span>}
          <span>Zoom: <span className="text-white font-bold">{Math.round(zoom * 100)}%</span></span>
          <span className="text-mono-600">|</span>
          <span className="text-mono-400">
            {currentPixelData ? `${currentPixelData.width}x${currentPixelData.height}` : '---'}
          </span>
        </div>
      </footer>
    </div>
  );
};
