# spherex-photometry (batch photometry tool v1.4)

made this quick tool to extract aperture photometry and SEDs from SPHEREx Level 2 FITS images over the weekend.

runs with an authentic early 2000s windows win32 interface (no modern web bloat, just the actual numbers, listview, and parameter controls).

## live demos

- web app (vercel): https://spherex-photometry.vercel.app
- web app (github pages): https://yancovert.github.io/spherex-photometry/
- hugging face space: https://huggingface.co/spaces/Yancovert/spherex-photometry

## what it does

- loads NASA SPHEREx Level 2 calibrated exposures (FITS format)
- sub-pixel circular aperture integration (10x10 sub-sampling grid per pixel)
- sky background subtraction using concentric annulus with MAD sigma-clipping (1.4826 * MAD)
- flux calibration for all 96 SPHEREx LVF channels (0.75 - 5.0 um, 6.2"/px pitch)
- curve-of-growth aperture flux loss correction based on v28 effective FWHM curve
- converts detector units (MJy/sr) into uJy, mJy, or AB magnitude with Poisson + background error propagation
- exports calibrated catalogs to CSV and NASA-standard FITS binary tables (BINTABLE)

## how to run locally

you need Node.js 18+ installed.

```bash
# clone repo
git clone https://github.com/Yancovert/spherex-photometry.git
cd spherex-photometry

# install deps
npm install

# start dev server (starts backend on 3001 and frontend on 5173)
npm run dev
```

open http://localhost:5173 in your browser.

## headless CLI mode

if you just want to run photometry from the terminal without opening the UI:

```bash
# run batch extraction on a fits file or cache directory
npm run --prefix srv cli -- --file cache/level2_2025W46_2A_0001_1D1_spx_l2b-v20-2025-321.fits --targets "154.3488,61.5057" --format fits
```

## notes

- if you give it coordinates that fall outside the detector area of a specific exposure, it flags them as OFF_IMAGE with 0 flux (single SPHEREx pointings only cover ~3.5 x 3.5 deg). use folder mode across your cache to process targets across multiple pointings.
- sample Level 2 exposures for Field 1 and Field 2 are included in ./cache so you can test it immediately without needing an IRSA TAP token upfront.
