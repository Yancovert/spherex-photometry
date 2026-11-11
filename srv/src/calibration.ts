// official spherex v28 baseline instrument performance calibrations
// derived directly from caltech/jpl spherex science team public-products
// https://github.com/SPHEREx/Public-products

export interface SphereXSpectralChannel {
  channel: number;
  band: number;
  wavelengthUm: number;
  fwhmArcsec: number;
  allSkySensitivityAbMag: number;
  deepSensitivityAbMag: number;
  allSkySurfaceBrightnessNoise: number;
  deepSurfaceBrightnessNoise: number;
}

// physical detector parameters
export const SPHEREX_PIXEL_SCALE_ARCSEC = 6.20;
export const SPHEREX_PIXEL_SCALE_RAD = (SPHEREX_PIXEL_SCALE_ARCSEC * Math.PI) / (180 * 3600); // 3.0058e-5 rad
export const SPHEREX_PIXEL_SOLID_ANGLE_SR = SPHEREX_PIXEL_SCALE_RAD * SPHEREX_PIXEL_SCALE_RAD; // 9.03498e-10 sr

// 96 official spectral channels across bands 1 through 6
export const SPHEREX_CHANNELS: SphereXSpectralChannel[] = [
  {
    "channel": 1,
    "band": 1,
    "wavelengthUm": 0.75,
    "fwhmArcsec": 4.6099,
    "allSkySensitivityAbMag": 19.588,
    "deepSensitivityAbMag": 21.738,
    "allSkySurfaceBrightnessNoise": 27.439,
    "deepSurfaceBrightnessNoise": 3.785
  },
  {
    "channel": 2,
    "band": 1,
    "wavelengthUm": 0.7683,
    "fwhmArcsec": 4.6131,
    "allSkySensitivityAbMag": 19.575,
    "deepSensitivityAbMag": 21.726,
    "allSkySurfaceBrightnessNoise": 27.077,
    "deepSurfaceBrightnessNoise": 3.735
  },
  {
    "channel": 3,
    "band": 1,
    "wavelengthUm": 0.787,
    "fwhmArcsec": 4.6164,
    "allSkySensitivityAbMag": 19.564,
    "deepSensitivityAbMag": 21.715,
    "allSkySurfaceBrightnessNoise": 26.698,
    "deepSurfaceBrightnessNoise": 3.683
  },
  {
    "channel": 4,
    "band": 1,
    "wavelengthUm": 0.8062,
    "fwhmArcsec": 4.62,
    "allSkySensitivityAbMag": 19.554,
    "deepSensitivityAbMag": 21.705,
    "allSkySurfaceBrightnessNoise": 26.303,
    "deepSurfaceBrightnessNoise": 3.628
  },
  {
    "channel": 5,
    "band": 1,
    "wavelengthUm": 0.8259,
    "fwhmArcsec": 4.6237,
    "allSkySensitivityAbMag": 19.544,
    "deepSensitivityAbMag": 21.695,
    "allSkySurfaceBrightnessNoise": 25.894,
    "deepSurfaceBrightnessNoise": 3.572
  },
  {
    "channel": 6,
    "band": 1,
    "wavelengthUm": 0.846,
    "fwhmArcsec": 4.6275,
    "allSkySensitivityAbMag": 19.535,
    "deepSensitivityAbMag": 21.686,
    "allSkySurfaceBrightnessNoise": 25.471,
    "deepSurfaceBrightnessNoise": 3.513
  },
  {
    "channel": 7,
    "band": 1,
    "wavelengthUm": 0.8667,
    "fwhmArcsec": 4.6316,
    "allSkySensitivityAbMag": 19.527,
    "deepSensitivityAbMag": 21.678,
    "allSkySurfaceBrightnessNoise": 25.036,
    "deepSurfaceBrightnessNoise": 3.453
  },
  {
    "channel": 8,
    "band": 1,
    "wavelengthUm": 0.8878,
    "fwhmArcsec": 4.6358,
    "allSkySensitivityAbMag": 19.52,
    "deepSensitivityAbMag": 21.671,
    "allSkySurfaceBrightnessNoise": 24.591,
    "deepSurfaceBrightnessNoise": 3.392
  },
  {
    "channel": 9,
    "band": 1,
    "wavelengthUm": 0.9095,
    "fwhmArcsec": 4.6403,
    "allSkySensitivityAbMag": 19.514,
    "deepSensitivityAbMag": 21.665,
    "allSkySurfaceBrightnessNoise": 24.136,
    "deepSurfaceBrightnessNoise": 3.329
  },
  {
    "channel": 10,
    "band": 1,
    "wavelengthUm": 0.9316,
    "fwhmArcsec": 4.645,
    "allSkySensitivityAbMag": 19.508,
    "deepSensitivityAbMag": 21.659,
    "allSkySurfaceBrightnessNoise": 23.674,
    "deepSurfaceBrightnessNoise": 3.266
  },
  {
    "channel": 11,
    "band": 1,
    "wavelengthUm": 0.9544,
    "fwhmArcsec": 4.6499,
    "allSkySensitivityAbMag": 19.503,
    "deepSensitivityAbMag": 21.654,
    "allSkySurfaceBrightnessNoise": 23.205,
    "deepSurfaceBrightnessNoise": 3.201
  },
  {
    "channel": 12,
    "band": 1,
    "wavelengthUm": 0.9776,
    "fwhmArcsec": 4.655,
    "allSkySensitivityAbMag": 19.499,
    "deepSensitivityAbMag": 21.649,
    "allSkySurfaceBrightnessNoise": 22.731,
    "deepSurfaceBrightnessNoise": 3.136
  },
  {
    "channel": 13,
    "band": 1,
    "wavelengthUm": 1.0015,
    "fwhmArcsec": 4.6604,
    "allSkySensitivityAbMag": 19.495,
    "deepSensitivityAbMag": 21.646,
    "allSkySurfaceBrightnessNoise": 22.252,
    "deepSurfaceBrightnessNoise": 3.07
  },
  {
    "channel": 14,
    "band": 1,
    "wavelengthUm": 1.0259,
    "fwhmArcsec": 4.6661,
    "allSkySensitivityAbMag": 19.492,
    "deepSensitivityAbMag": 21.643,
    "allSkySurfaceBrightnessNoise": 21.77,
    "deepSurfaceBrightnessNoise": 3.003
  },
  {
    "channel": 15,
    "band": 1,
    "wavelengthUm": 1.0509,
    "fwhmArcsec": 4.672,
    "allSkySensitivityAbMag": 19.489,
    "deepSensitivityAbMag": 21.64,
    "allSkySurfaceBrightnessNoise": 21.285,
    "deepSurfaceBrightnessNoise": 2.936
  },
  {
    "channel": 16,
    "band": 1,
    "wavelengthUm": 1.0766,
    "fwhmArcsec": 4.6782,
    "allSkySensitivityAbMag": 19.488,
    "deepSensitivityAbMag": 21.638,
    "allSkySurfaceBrightnessNoise": 20.8,
    "deepSurfaceBrightnessNoise": 2.869
  },
  {
    "channel": 17,
    "band": 2,
    "wavelengthUm": 1.1371,
    "fwhmArcsec": 4.6934,
    "allSkySensitivityAbMag": 19.51,
    "deepSensitivityAbMag": 21.661,
    "allSkySurfaceBrightnessNoise": 19.252,
    "deepSurfaceBrightnessNoise": 2.656
  },
  {
    "channel": 18,
    "band": 2,
    "wavelengthUm": 1.1648,
    "fwhmArcsec": 4.7006,
    "allSkySensitivityAbMag": 19.51,
    "deepSensitivityAbMag": 21.661,
    "allSkySurfaceBrightnessNoise": 18.78,
    "deepSurfaceBrightnessNoise": 2.591
  },
  {
    "channel": 19,
    "band": 2,
    "wavelengthUm": 1.1932,
    "fwhmArcsec": 4.7082,
    "allSkySensitivityAbMag": 19.511,
    "deepSensitivityAbMag": 21.661,
    "allSkySurfaceBrightnessNoise": 18.31,
    "deepSurfaceBrightnessNoise": 2.526
  },
  {
    "channel": 20,
    "band": 2,
    "wavelengthUm": 1.2223,
    "fwhmArcsec": 4.7161,
    "allSkySensitivityAbMag": 19.512,
    "deepSensitivityAbMag": 21.662,
    "allSkySurfaceBrightnessNoise": 17.842,
    "deepSurfaceBrightnessNoise": 2.461
  },
  {
    "channel": 21,
    "band": 2,
    "wavelengthUm": 1.2521,
    "fwhmArcsec": 4.7244,
    "allSkySensitivityAbMag": 19.513,
    "deepSensitivityAbMag": 21.664,
    "allSkySurfaceBrightnessNoise": 17.379,
    "deepSurfaceBrightnessNoise": 2.397
  },
  {
    "channel": 22,
    "band": 2,
    "wavelengthUm": 1.2827,
    "fwhmArcsec": 4.7331,
    "allSkySensitivityAbMag": 19.515,
    "deepSensitivityAbMag": 21.666,
    "allSkySurfaceBrightnessNoise": 16.919,
    "deepSurfaceBrightnessNoise": 2.334
  },
  {
    "channel": 23,
    "band": 2,
    "wavelengthUm": 1.314,
    "fwhmArcsec": 4.7423,
    "allSkySensitivityAbMag": 19.517,
    "deepSensitivityAbMag": 21.668,
    "allSkySurfaceBrightnessNoise": 16.465,
    "deepSurfaceBrightnessNoise": 2.271
  },
  {
    "channel": 24,
    "band": 2,
    "wavelengthUm": 1.346,
    "fwhmArcsec": 4.7518,
    "allSkySensitivityAbMag": 19.52,
    "deepSensitivityAbMag": 21.671,
    "allSkySurfaceBrightnessNoise": 16.015,
    "deepSurfaceBrightnessNoise": 2.209
  },
  {
    "channel": 25,
    "band": 2,
    "wavelengthUm": 1.3788,
    "fwhmArcsec": 4.7618,
    "allSkySensitivityAbMag": 19.523,
    "deepSensitivityAbMag": 21.674,
    "allSkySurfaceBrightnessNoise": 15.572,
    "deepSurfaceBrightnessNoise": 2.148
  },
  {
    "channel": 26,
    "band": 2,
    "wavelengthUm": 1.4125,
    "fwhmArcsec": 4.7723,
    "allSkySensitivityAbMag": 19.527,
    "deepSensitivityAbMag": 21.677,
    "allSkySurfaceBrightnessNoise": 15.134,
    "deepSurfaceBrightnessNoise": 2.088
  },
  {
    "channel": 27,
    "band": 2,
    "wavelengthUm": 1.4469,
    "fwhmArcsec": 4.7832,
    "allSkySensitivityAbMag": 19.53,
    "deepSensitivityAbMag": 21.681,
    "allSkySurfaceBrightnessNoise": 14.703,
    "deepSurfaceBrightnessNoise": 2.028
  },
  {
    "channel": 28,
    "band": 2,
    "wavelengthUm": 1.4822,
    "fwhmArcsec": 4.7947,
    "allSkySensitivityAbMag": 19.535,
    "deepSensitivityAbMag": 21.685,
    "allSkySurfaceBrightnessNoise": 14.279,
    "deepSurfaceBrightnessNoise": 1.97
  },
  {
    "channel": 29,
    "band": 2,
    "wavelengthUm": 1.5184,
    "fwhmArcsec": 4.8067,
    "allSkySensitivityAbMag": 19.539,
    "deepSensitivityAbMag": 21.69,
    "allSkySurfaceBrightnessNoise": 13.862,
    "deepSurfaceBrightnessNoise": 1.912
  },
  {
    "channel": 30,
    "band": 2,
    "wavelengthUm": 1.5554,
    "fwhmArcsec": 4.8193,
    "allSkySensitivityAbMag": 19.544,
    "deepSensitivityAbMag": 21.695,
    "allSkySurfaceBrightnessNoise": 13.453,
    "deepSurfaceBrightnessNoise": 1.856
  },
  {
    "channel": 31,
    "band": 2,
    "wavelengthUm": 1.5933,
    "fwhmArcsec": 4.8325,
    "allSkySensitivityAbMag": 19.549,
    "deepSensitivityAbMag": 21.7,
    "allSkySurfaceBrightnessNoise": 13.051,
    "deepSurfaceBrightnessNoise": 1.8
  },
  {
    "channel": 32,
    "band": 2,
    "wavelengthUm": 1.6322,
    "fwhmArcsec": 4.8462,
    "allSkySensitivityAbMag": 19.555,
    "deepSensitivityAbMag": 21.706,
    "allSkySurfaceBrightnessNoise": 12.656,
    "deepSurfaceBrightnessNoise": 1.746
  },
  {
    "channel": 33,
    "band": 3,
    "wavelengthUm": 1.68,
    "fwhmArcsec": 4.8636,
    "allSkySensitivityAbMag": 19.518,
    "deepSensitivityAbMag": 21.669,
    "allSkySurfaceBrightnessNoise": 12.698,
    "deepSurfaceBrightnessNoise": 1.752
  },
  {
    "channel": 34,
    "band": 3,
    "wavelengthUm": 1.721,
    "fwhmArcsec": 4.8788,
    "allSkySensitivityAbMag": 19.524,
    "deepSensitivityAbMag": 21.675,
    "allSkySurfaceBrightnessNoise": 12.307,
    "deepSurfaceBrightnessNoise": 1.697
  },
  {
    "channel": 35,
    "band": 3,
    "wavelengthUm": 1.763,
    "fwhmArcsec": 4.8947,
    "allSkySensitivityAbMag": 19.53,
    "deepSensitivityAbMag": 21.681,
    "allSkySurfaceBrightnessNoise": 11.924,
    "deepSurfaceBrightnessNoise": 1.645
  },
  {
    "channel": 36,
    "band": 3,
    "wavelengthUm": 1.8059,
    "fwhmArcsec": 4.9114,
    "allSkySensitivityAbMag": 19.537,
    "deepSensitivityAbMag": 21.688,
    "allSkySurfaceBrightnessNoise": 11.549,
    "deepSurfaceBrightnessNoise": 1.593
  },
  {
    "channel": 37,
    "band": 3,
    "wavelengthUm": 1.85,
    "fwhmArcsec": 4.9288,
    "allSkySensitivityAbMag": 19.543,
    "deepSensitivityAbMag": 21.694,
    "allSkySurfaceBrightnessNoise": 11.183,
    "deepSurfaceBrightnessNoise": 1.542
  },
  {
    "channel": 38,
    "band": 3,
    "wavelengthUm": 1.8951,
    "fwhmArcsec": 4.947,
    "allSkySensitivityAbMag": 19.55,
    "deepSensitivityAbMag": 21.701,
    "allSkySurfaceBrightnessNoise": 10.826,
    "deepSurfaceBrightnessNoise": 1.493
  },
  {
    "channel": 39,
    "band": 3,
    "wavelengthUm": 1.9413,
    "fwhmArcsec": 4.966,
    "allSkySensitivityAbMag": 19.557,
    "deepSensitivityAbMag": 21.708,
    "allSkySurfaceBrightnessNoise": 10.478,
    "deepSurfaceBrightnessNoise": 1.445
  },
  {
    "channel": 40,
    "band": 3,
    "wavelengthUm": 1.9887,
    "fwhmArcsec": 4.9859,
    "allSkySensitivityAbMag": 19.565,
    "deepSensitivityAbMag": 21.716,
    "allSkySurfaceBrightnessNoise": 10.138,
    "deepSurfaceBrightnessNoise": 1.398
  },
  {
    "channel": 41,
    "band": 3,
    "wavelengthUm": 2.0372,
    "fwhmArcsec": 5.0067,
    "allSkySensitivityAbMag": 19.572,
    "deepSensitivityAbMag": 21.723,
    "allSkySurfaceBrightnessNoise": 9.807,
    "deepSurfaceBrightnessNoise": 1.353
  },
  {
    "channel": 42,
    "band": 3,
    "wavelengthUm": 2.0869,
    "fwhmArcsec": 5.0284,
    "allSkySensitivityAbMag": 19.58,
    "deepSensitivityAbMag": 21.731,
    "allSkySurfaceBrightnessNoise": 9.485,
    "deepSurfaceBrightnessNoise": 1.308
  },
  {
    "channel": 43,
    "band": 3,
    "wavelengthUm": 2.1378,
    "fwhmArcsec": 5.0511,
    "allSkySensitivityAbMag": 19.587,
    "deepSensitivityAbMag": 21.738,
    "allSkySurfaceBrightnessNoise": 9.171,
    "deepSurfaceBrightnessNoise": 1.265
  },
  {
    "channel": 44,
    "band": 3,
    "wavelengthUm": 2.1899,
    "fwhmArcsec": 5.0748,
    "allSkySensitivityAbMag": 19.595,
    "deepSensitivityAbMag": 21.746,
    "allSkySurfaceBrightnessNoise": 8.866,
    "deepSurfaceBrightnessNoise": 1.223
  },
  {
    "channel": 45,
    "band": 3,
    "wavelengthUm": 2.2433,
    "fwhmArcsec": 5.0995,
    "allSkySensitivityAbMag": 19.603,
    "deepSensitivityAbMag": 21.754,
    "allSkySurfaceBrightnessNoise": 8.569,
    "deepSurfaceBrightnessNoise": 1.182
  },
  {
    "channel": 46,
    "band": 3,
    "wavelengthUm": 2.2981,
    "fwhmArcsec": 5.1254,
    "allSkySensitivityAbMag": 19.611,
    "deepSensitivityAbMag": 21.762,
    "allSkySurfaceBrightnessNoise": 8.281,
    "deepSurfaceBrightnessNoise": 1.142
  },
  {
    "channel": 47,
    "band": 3,
    "wavelengthUm": 2.3541,
    "fwhmArcsec": 5.1524,
    "allSkySensitivityAbMag": 19.619,
    "deepSensitivityAbMag": 21.77,
    "allSkySurfaceBrightnessNoise": 8.001,
    "deepSurfaceBrightnessNoise": 1.103
  },
  {
    "channel": 48,
    "band": 3,
    "wavelengthUm": 2.4115,
    "fwhmArcsec": 5.1805,
    "allSkySensitivityAbMag": 19.627,
    "deepSensitivityAbMag": 21.778,
    "allSkySurfaceBrightnessNoise": 7.729,
    "deepSurfaceBrightnessNoise": 1.066
  },
  {
    "channel": 49,
    "band": 4,
    "wavelengthUm": 2.4891,
    "fwhmArcsec": 5.2194,
    "allSkySensitivityAbMag": 19.727,
    "deepSensitivityAbMag": 21.878,
    "allSkySurfaceBrightnessNoise": 6.8,
    "deepSurfaceBrightnessNoise": 0.938
  },
  {
    "channel": 50,
    "band": 4,
    "wavelengthUm": 2.5603,
    "fwhmArcsec": 5.2559,
    "allSkySensitivityAbMag": 19.737,
    "deepSensitivityAbMag": 21.888,
    "allSkySurfaceBrightnessNoise": 6.526,
    "deepSurfaceBrightnessNoise": 0.9
  },
  {
    "channel": 51,
    "band": 4,
    "wavelengthUm": 2.6334,
    "fwhmArcsec": 5.2942,
    "allSkySensitivityAbMag": 19.747,
    "deepSensitivityAbMag": 21.898,
    "allSkySurfaceBrightnessNoise": 6.263,
    "deepSurfaceBrightnessNoise": 0.864
  },
  {
    "channel": 52,
    "band": 4,
    "wavelengthUm": 2.7087,
    "fwhmArcsec": 5.3344,
    "allSkySensitivityAbMag": 19.756,
    "deepSensitivityAbMag": 21.907,
    "allSkySurfaceBrightnessNoise": 6.011,
    "deepSurfaceBrightnessNoise": 0.829
  },
  {
    "channel": 53,
    "band": 4,
    "wavelengthUm": 2.786,
    "fwhmArcsec": 5.3766,
    "allSkySensitivityAbMag": 19.765,
    "deepSensitivityAbMag": 21.916,
    "allSkySurfaceBrightnessNoise": 5.771,
    "deepSurfaceBrightnessNoise": 0.796
  },
  {
    "channel": 54,
    "band": 4,
    "wavelengthUm": 2.8656,
    "fwhmArcsec": 5.421,
    "allSkySensitivityAbMag": 19.773,
    "deepSensitivityAbMag": 21.924,
    "allSkySurfaceBrightnessNoise": 5.543,
    "deepSurfaceBrightnessNoise": 0.765
  },
  {
    "channel": 55,
    "band": 4,
    "wavelengthUm": 2.9475,
    "fwhmArcsec": 5.4674,
    "allSkySensitivityAbMag": 19.78,
    "deepSensitivityAbMag": 21.931,
    "allSkySurfaceBrightnessNoise": 5.328,
    "deepSurfaceBrightnessNoise": 0.735
  },
  {
    "channel": 56,
    "band": 4,
    "wavelengthUm": 3.0317,
    "fwhmArcsec": 5.5162,
    "allSkySensitivityAbMag": 19.786,
    "deepSensitivityAbMag": 21.937,
    "allSkySurfaceBrightnessNoise": 5.129,
    "deepSurfaceBrightnessNoise": 0.707
  },
  {
    "channel": 57,
    "band": 4,
    "wavelengthUm": 3.1184,
    "fwhmArcsec": 5.5673,
    "allSkySensitivityAbMag": 19.789,
    "deepSensitivityAbMag": 21.94,
    "allSkySurfaceBrightnessNoise": 4.946,
    "deepSurfaceBrightnessNoise": 0.682
  },
  {
    "channel": 58,
    "band": 4,
    "wavelengthUm": 3.2075,
    "fwhmArcsec": 5.6209,
    "allSkySensitivityAbMag": 19.789,
    "deepSensitivityAbMag": 21.939,
    "allSkySurfaceBrightnessNoise": 4.784,
    "deepSurfaceBrightnessNoise": 0.66
  },
  {
    "channel": 59,
    "band": 4,
    "wavelengthUm": 3.2991,
    "fwhmArcsec": 5.677,
    "allSkySensitivityAbMag": 19.784,
    "deepSensitivityAbMag": 21.934,
    "allSkySurfaceBrightnessNoise": 4.646,
    "deepSurfaceBrightnessNoise": 0.641
  },
  {
    "channel": 60,
    "band": 4,
    "wavelengthUm": 3.3934,
    "fwhmArcsec": 5.7358,
    "allSkySensitivityAbMag": 19.773,
    "deepSensitivityAbMag": 21.924,
    "allSkySurfaceBrightnessNoise": 4.536,
    "deepSurfaceBrightnessNoise": 0.626
  },
  {
    "channel": 61,
    "band": 4,
    "wavelengthUm": 3.4903,
    "fwhmArcsec": 5.7974,
    "allSkySensitivityAbMag": 19.754,
    "deepSensitivityAbMag": 21.905,
    "allSkySurfaceBrightnessNoise": 4.458,
    "deepSurfaceBrightnessNoise": 0.615
  },
  {
    "channel": 62,
    "band": 4,
    "wavelengthUm": 3.59,
    "fwhmArcsec": 5.8618,
    "allSkySensitivityAbMag": 19.726,
    "deepSensitivityAbMag": 21.877,
    "allSkySurfaceBrightnessNoise": 4.42,
    "deepSurfaceBrightnessNoise": 0.61
  },
  {
    "channel": 63,
    "band": 4,
    "wavelengthUm": 3.6926,
    "fwhmArcsec": 5.9292,
    "allSkySensitivityAbMag": 19.687,
    "deepSensitivityAbMag": 21.837,
    "allSkySurfaceBrightnessNoise": 4.425,
    "deepSurfaceBrightnessNoise": 0.61
  },
  {
    "channel": 64,
    "band": 4,
    "wavelengthUm": 3.7981,
    "fwhmArcsec": 5.9996,
    "allSkySensitivityAbMag": 19.635,
    "deepSensitivityAbMag": 21.786,
    "allSkySurfaceBrightnessNoise": 4.479,
    "deepSurfaceBrightnessNoise": 0.618
  },
  {
    "channel": 65,
    "band": 5,
    "wavelengthUm": 3.8547,
    "fwhmArcsec": 6.0379,
    "allSkySensitivityAbMag": 18.861,
    "deepSensitivityAbMag": 21.013,
    "allSkySurfaceBrightnessNoise": 8.972,
    "deepSurfaceBrightnessNoise": 1.236
  },
  {
    "channel": 66,
    "band": 5,
    "wavelengthUm": 3.8898,
    "fwhmArcsec": 6.0618,
    "allSkySensitivityAbMag": 18.842,
    "deepSensitivityAbMag": 20.994,
    "allSkySurfaceBrightnessNoise": 9.027,
    "deepSurfaceBrightnessNoise": 1.244
  },
  {
    "channel": 67,
    "band": 5,
    "wavelengthUm": 3.9251,
    "fwhmArcsec": 6.086,
    "allSkySensitivityAbMag": 18.821,
    "deepSensitivityAbMag": 20.973,
    "allSkySurfaceBrightnessNoise": 9.094,
    "deepSurfaceBrightnessNoise": 1.253
  },
  {
    "channel": 68,
    "band": 5,
    "wavelengthUm": 3.9608,
    "fwhmArcsec": 6.1105,
    "allSkySensitivityAbMag": 18.8,
    "deepSensitivityAbMag": 20.952,
    "allSkySurfaceBrightnessNoise": 9.17,
    "deepSurfaceBrightnessNoise": 1.264
  },
  {
    "channel": 69,
    "band": 5,
    "wavelengthUm": 3.9968,
    "fwhmArcsec": 6.1354,
    "allSkySensitivityAbMag": 18.777,
    "deepSensitivityAbMag": 20.929,
    "allSkySurfaceBrightnessNoise": 9.257,
    "deepSurfaceBrightnessNoise": 1.276
  },
  {
    "channel": 70,
    "band": 5,
    "wavelengthUm": 4.0332,
    "fwhmArcsec": 6.1606,
    "allSkySensitivityAbMag": 18.753,
    "deepSensitivityAbMag": 20.905,
    "allSkySurfaceBrightnessNoise": 9.354,
    "deepSurfaceBrightnessNoise": 1.289
  },
  {
    "channel": 71,
    "band": 5,
    "wavelengthUm": 4.0698,
    "fwhmArcsec": 6.1862,
    "allSkySensitivityAbMag": 18.728,
    "deepSensitivityAbMag": 20.88,
    "allSkySurfaceBrightnessNoise": 9.462,
    "deepSurfaceBrightnessNoise": 1.304
  },
  {
    "channel": 72,
    "band": 5,
    "wavelengthUm": 4.1068,
    "fwhmArcsec": 6.2122,
    "allSkySensitivityAbMag": 18.702,
    "deepSensitivityAbMag": 20.854,
    "allSkySurfaceBrightnessNoise": 9.581,
    "deepSurfaceBrightnessNoise": 1.321
  },
  {
    "channel": 73,
    "band": 5,
    "wavelengthUm": 4.1442,
    "fwhmArcsec": 6.2385,
    "allSkySensitivityAbMag": 18.675,
    "deepSensitivityAbMag": 20.827,
    "allSkySurfaceBrightnessNoise": 9.71,
    "deepSurfaceBrightnessNoise": 1.338
  },
  {
    "channel": 74,
    "band": 5,
    "wavelengthUm": 4.1818,
    "fwhmArcsec": 6.2652,
    "allSkySensitivityAbMag": 18.647,
    "deepSensitivityAbMag": 20.798,
    "allSkySurfaceBrightnessNoise": 9.849,
    "deepSurfaceBrightnessNoise": 1.358
  },
  {
    "channel": 75,
    "band": 5,
    "wavelengthUm": 4.2198,
    "fwhmArcsec": 6.2922,
    "allSkySensitivityAbMag": 18.618,
    "deepSensitivityAbMag": 20.769,
    "allSkySurfaceBrightnessNoise": 9.999,
    "deepSurfaceBrightnessNoise": 1.378
  },
  {
    "channel": 76,
    "band": 5,
    "wavelengthUm": 4.2582,
    "fwhmArcsec": 6.3196,
    "allSkySensitivityAbMag": 18.588,
    "deepSensitivityAbMag": 20.739,
    "allSkySurfaceBrightnessNoise": 10.158,
    "deepSurfaceBrightnessNoise": 1.401
  },
  {
    "channel": 77,
    "band": 5,
    "wavelengthUm": 4.2969,
    "fwhmArcsec": 6.3474,
    "allSkySensitivityAbMag": 18.557,
    "deepSensitivityAbMag": 20.709,
    "allSkySurfaceBrightnessNoise": 10.328,
    "deepSurfaceBrightnessNoise": 1.424
  },
  {
    "channel": 78,
    "band": 5,
    "wavelengthUm": 4.336,
    "fwhmArcsec": 6.3756,
    "allSkySensitivityAbMag": 18.526,
    "deepSensitivityAbMag": 20.677,
    "allSkySurfaceBrightnessNoise": 10.508,
    "deepSurfaceBrightnessNoise": 1.449
  },
  {
    "channel": 79,
    "band": 5,
    "wavelengthUm": 4.3754,
    "fwhmArcsec": 6.4042,
    "allSkySensitivityAbMag": 18.494,
    "deepSensitivityAbMag": 20.645,
    "allSkySurfaceBrightnessNoise": 10.698,
    "deepSurfaceBrightnessNoise": 1.475
  },
  {
    "channel": 80,
    "band": 5,
    "wavelengthUm": 4.4152,
    "fwhmArcsec": 6.4332,
    "allSkySensitivityAbMag": 18.461,
    "deepSensitivityAbMag": 20.612,
    "allSkySurfaceBrightnessNoise": 10.897,
    "deepSurfaceBrightnessNoise": 1.503
  },
  {
    "channel": 81,
    "band": 6,
    "wavelengthUm": 4.454,
    "fwhmArcsec": 6.4616,
    "allSkySensitivityAbMag": 18.282,
    "deepSensitivityAbMag": 20.434,
    "allSkySurfaceBrightnessNoise": 12.699,
    "deepSurfaceBrightnessNoise": 1.751
  },
  {
    "channel": 82,
    "band": 6,
    "wavelengthUm": 4.4883,
    "fwhmArcsec": 6.4868,
    "allSkySensitivityAbMag": 18.254,
    "deepSensitivityAbMag": 20.405,
    "allSkySurfaceBrightnessNoise": 12.901,
    "deepSurfaceBrightnessNoise": 1.779
  },
  {
    "channel": 83,
    "band": 6,
    "wavelengthUm": 4.5228,
    "fwhmArcsec": 6.5122,
    "allSkySensitivityAbMag": 18.226,
    "deepSensitivityAbMag": 20.377,
    "allSkySurfaceBrightnessNoise": 13.111,
    "deepSurfaceBrightnessNoise": 1.808
  },
  {
    "channel": 84,
    "band": 6,
    "wavelengthUm": 4.5576,
    "fwhmArcsec": 6.538,
    "allSkySensitivityAbMag": 18.197,
    "deepSensitivityAbMag": 20.348,
    "allSkySurfaceBrightnessNoise": 13.328,
    "deepSurfaceBrightnessNoise": 1.838
  },
  {
    "channel": 85,
    "band": 6,
    "wavelengthUm": 4.5926,
    "fwhmArcsec": 6.564,
    "allSkySensitivityAbMag": 18.168,
    "deepSensitivityAbMag": 20.319,
    "allSkySurfaceBrightnessNoise": 13.552,
    "deepSurfaceBrightnessNoise": 1.869
  },
  {
    "channel": 86,
    "band": 6,
    "wavelengthUm": 4.628,
    "fwhmArcsec": 6.5903,
    "allSkySensitivityAbMag": 18.139,
    "deepSensitivityAbMag": 20.29,
    "allSkySurfaceBrightnessNoise": 13.783,
    "deepSurfaceBrightnessNoise": 1.901
  },
  {
    "channel": 87,
    "band": 6,
    "wavelengthUm": 4.6636,
    "fwhmArcsec": 6.617,
    "allSkySensitivityAbMag": 18.109,
    "deepSensitivityAbMag": 20.26,
    "allSkySurfaceBrightnessNoise": 14.02,
    "deepSurfaceBrightnessNoise": 1.934
  },
  {
    "channel": 88,
    "band": 6,
    "wavelengthUm": 4.6994,
    "fwhmArcsec": 6.6439,
    "allSkySensitivityAbMag": 18.079,
    "deepSensitivityAbMag": 20.23,
    "allSkySurfaceBrightnessNoise": 14.264,
    "deepSurfaceBrightnessNoise": 1.967
  },
  {
    "channel": 89,
    "band": 6,
    "wavelengthUm": 4.7356,
    "fwhmArcsec": 6.6712,
    "allSkySensitivityAbMag": 18.049,
    "deepSensitivityAbMag": 20.2,
    "allSkySurfaceBrightnessNoise": 14.513,
    "deepSurfaceBrightnessNoise": 2.002
  },
  {
    "channel": 90,
    "band": 6,
    "wavelengthUm": 4.772,
    "fwhmArcsec": 6.6987,
    "allSkySensitivityAbMag": 18.019,
    "deepSensitivityAbMag": 20.17,
    "allSkySurfaceBrightnessNoise": 14.769,
    "deepSurfaceBrightnessNoise": 2.037
  },
  {
    "channel": 91,
    "band": 6,
    "wavelengthUm": 4.8087,
    "fwhmArcsec": 6.7266,
    "allSkySensitivityAbMag": 17.989,
    "deepSensitivityAbMag": 20.14,
    "allSkySurfaceBrightnessNoise": 15.03,
    "deepSurfaceBrightnessNoise": 2.073
  },
  {
    "channel": 92,
    "band": 6,
    "wavelengthUm": 4.8457,
    "fwhmArcsec": 6.7547,
    "allSkySensitivityAbMag": 17.959,
    "deepSensitivityAbMag": 20.11,
    "allSkySurfaceBrightnessNoise": 15.296,
    "deepSurfaceBrightnessNoise": 2.11
  },
  {
    "channel": 93,
    "band": 6,
    "wavelengthUm": 4.883,
    "fwhmArcsec": 6.7832,
    "allSkySensitivityAbMag": 17.929,
    "deepSensitivityAbMag": 20.079,
    "allSkySurfaceBrightnessNoise": 15.568,
    "deepSurfaceBrightnessNoise": 2.148
  },
  {
    "channel": 94,
    "band": 6,
    "wavelengthUm": 4.9205,
    "fwhmArcsec": 6.812,
    "allSkySensitivityAbMag": 17.898,
    "deepSensitivityAbMag": 20.049,
    "allSkySurfaceBrightnessNoise": 15.845,
    "deepSurfaceBrightnessNoise": 2.186
  },
  {
    "channel": 95,
    "band": 6,
    "wavelengthUm": 4.9584,
    "fwhmArcsec": 6.8412,
    "allSkySensitivityAbMag": 17.868,
    "deepSensitivityAbMag": 20.018,
    "allSkySurfaceBrightnessNoise": 16.127,
    "deepSurfaceBrightnessNoise": 2.225
  },
  {
    "channel": 96,
    "band": 6,
    "wavelengthUm": 4.9965,
    "fwhmArcsec": 6.8706,
    "allSkySensitivityAbMag": 17.837,
    "deepSensitivityAbMag": 19.988,
    "allSkySurfaceBrightnessNoise": 16.413,
    "deepSurfaceBrightnessNoise": 2.264
  }
];

// get channel by index (1 to 96)
export function getChannel(channelNumber: number): SphereXSpectralChannel {
  const ch = SPHEREX_CHANNELS[channelNumber - 1];
  if (!ch) {
    return SPHEREX_CHANNELS[0];
  }
  return ch;
}

// find nearest spectral channel or interpolate fwhm for arbitrary wavelength
export function getFwhmArcsec(wavelengthUm: number): number {
  if (wavelengthUm <= SPHEREX_CHANNELS[0].wavelengthUm) {
    return SPHEREX_CHANNELS[0].fwhmArcsec;
  }
  if (wavelengthUm >= SPHEREX_CHANNELS[SPHEREX_CHANNELS.length - 1].wavelengthUm) {
    return SPHEREX_CHANNELS[SPHEREX_CHANNELS.length - 1].fwhmArcsec;
  }
  for (let i = 0; i < SPHEREX_CHANNELS.length - 1; i++) {
    const c1 = SPHEREX_CHANNELS[i];
    const c2 = SPHEREX_CHANNELS[i + 1];
    if (wavelengthUm >= c1.wavelengthUm && wavelengthUm <= c2.wavelengthUm) {
      const frac = (wavelengthUm - c1.wavelengthUm) / (c2.wavelengthUm - c1.wavelengthUm);
      return c1.fwhmArcsec + frac * (c2.fwhmArcsec - c1.fwhmArcsec);
    }
  }
  return SPHEREX_CHANNELS[0].fwhmArcsec;
}

// calculates enclosed energy fraction for circular aperture of radius r arcsec
// using 2d circular gaussian psf approximation where sigma = fwhm / (2 * sqrt(2 * ln(2)))
export function getApertureEnclosedFraction(radiusArcsec: number, fwhmArcsec: number): number {
  if (radiusArcsec <= 0 || fwhmArcsec <= 0) return 1.0;
  const sigma = fwhmArcsec / 2.354820045; // 2 * sqrt(2 * ln(2))
  const arg = -(radiusArcsec * radiusArcsec) / (2 * sigma * sigma);
  // 1 - exp(-r^2 / (2*sigma^2))
  const fEnc = 1.0 - Math.exp(arg);
  return Math.min(1.0, Math.max(1e-4, fEnc));
}

// aperture correction factor C_ap = 1 / f_enc(r)
export function getApertureCorrectionFactor(radiusArcsec: number, fwhmArcsec: number): number {
  const fEnc = getApertureEnclosedFraction(radiusArcsec, fwhmArcsec);
  return 1.0 / fEnc;
}

// converts net integrated surface brightness (MJy/sr * px) into total flux in microJansky
export function convertMjySrToUjy(
  netFluxMjySr: number,
  solidAngleSr: number = SPHEREX_PIXEL_SOLID_ANGLE_SR,
  apertureCorrection: number = 1.0
): number {
  // 1 MJy = 1e6 Jy = 1e12 uJy
  const fluxUjy = netFluxMjySr * solidAngleSr * 1e12 * apertureCorrection;
  return fluxUjy;
}

// converts flux in uJy to AB magnitude
export function convertUjyToAbMag(fluxUjy: number): number {
  if (fluxUjy <= 0) return 99.9;
  // f_nu in Jy = fluxUjy * 1e-6. m_AB = -2.5 * log10(f_nu / 3631)
  const fluxJy = fluxUjy * 1e-6;
  return -2.5 * Math.log10(fluxJy / 3631);
}
