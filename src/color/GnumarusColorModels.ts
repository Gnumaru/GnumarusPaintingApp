/**
 * Gnumarus color models: conversions between sRGB and the picker models
 * (RGB, CMYK, HSV, HSL, OKHSL, OKHSV, ARD) plus axis metadata and gradient
 * helpers for the custom color picker.
 *
 * All code below is our own implementation. The Oklab mathematics follows the
 * published Oklab/Okhsl/Okhsv specifications (matrices and constants are
 * numerical facts); the ARD model is our own cylindrical interpretation of
 * the angle/ratio/diagonal concept (polar coordinates around the RGB cube
 * main diagonal, inspired by Krita's Pigment.O plugin).
 */

export type GnumarusColorModelId = "rgb" | "cmyk" | "hsv" | "hsl" | "okhsl" | "okhsv" | "ard";

export type GnumarusAxisUnit = "percent" | "degrees" | "byte" | "scalar";

export interface GnumarusColorAxis {
  key: string;
  label: string;
  min: number;
  max: number;
  decimals: number;
  unit: GnumarusAxisUnit;
}

export interface GnumarusColorModelDef {
  id: GnumarusColorModelId;
  label: string;
  axes: GnumarusColorAxis[];
}

/** sRGB bytes plus alpha byte. */
export interface GnumarusRgbaBytes {
  r: number;
  g: number;
  b: number;
  a: number;
}

const PERCENT_AXIS = (key: string, label: string): GnumarusColorAxis => ({
  key,
  label,
  min: 0,
  max: 100,
  decimals: 1,
  unit: "percent",
});

const HUE_AXIS = (key: string, label: string): GnumarusColorAxis => ({
  key,
  label,
  min: 0,
  max: 360,
  decimals: 1,
  unit: "degrees",
});

const BYTE_AXIS = (key: string, label: string): GnumarusColorAxis => ({
  key,
  label,
  min: 0,
  max: 255,
  decimals: 0,
  unit: "byte",
});

export const GNUMARUS_COLOR_MODELS: GnumarusColorModelDef[] = [
  {
    id: "rgb",
    label: "RGB",
    axes: [BYTE_AXIS("r", "Red"), BYTE_AXIS("g", "Green"), BYTE_AXIS("b", "Blue"), BYTE_AXIS("a", "Alpha")],
  },
  {
    id: "cmyk",
    label: "CMYK",
    axes: [
      PERCENT_AXIS("c", "Cyan"),
      PERCENT_AXIS("m", "Magenta"),
      PERCENT_AXIS("y", "Yellow"),
      PERCENT_AXIS("k", "Black"),
      BYTE_AXIS("a", "Alpha"),
    ],
  },
  {
    id: "hsv",
    label: "HSV",
    axes: [HUE_AXIS("h", "Hue"), PERCENT_AXIS("s", "Saturation"), PERCENT_AXIS("v", "Value"), BYTE_AXIS("a", "Alpha")],
  },
  {
    id: "hsl",
    label: "HSL",
    axes: [HUE_AXIS("h", "Hue"), PERCENT_AXIS("s", "Saturation"), PERCENT_AXIS("l", "Lightness"), BYTE_AXIS("a", "Alpha")],
  },
  {
    id: "okhsl",
    label: "OKHSL",
    axes: [HUE_AXIS("h", "Hue"), PERCENT_AXIS("s", "Saturation"), PERCENT_AXIS("l", "Lightness"), BYTE_AXIS("a", "Alpha")],
  },
  {
    id: "okhsv",
    label: "OKHSV",
    axes: [HUE_AXIS("h", "Hue"), PERCENT_AXIS("s", "Saturation"), PERCENT_AXIS("v", "Value"), BYTE_AXIS("a", "Alpha")],
  },
  {
    id: "ard",
    label: "ARD",
    axes: [
      HUE_AXIS("a", "Angle"),
      { key: "r", label: "Ratio", min: 0, max: 255, decimals: 0, unit: "byte" },
      { key: "d", label: "Diagonal", min: 0, max: 360, decimals: 1, unit: "scalar" },
      BYTE_AXIS("alpha", "Alpha"),
    ],
  },
];

export function getColorModelDef(id: GnumarusColorModelId): GnumarusColorModelDef {
  const found = GNUMARUS_COLOR_MODELS.find((entry) => entry.id === id);
  return found ?? GNUMARUS_COLOR_MODELS[0]!;
}

export function isColorModelId(value: unknown): value is GnumarusColorModelId {
  return (
    value === "rgb" ||
    value === "cmyk" ||
    value === "hsv" ||
    value === "hsl" ||
    value === "okhsl" ||
    value === "okhsv" ||
    value === "ard"
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function clampByte(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

export function clampPercent(value: number): number {
  return clamp(value, 0, 100);
}

export function clampHue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  let result = value % 360;
  if (result < 0) {
    result += 360;
  }
  if (result >= 360) {
    return 0;
  }
  return result;
}

export function formatAxisValue(value: number, axis: GnumarusColorAxis): string {
  return clamp(value, axis.min, axis.max).toFixed(axis.decimals);
}

export function parseAxisInput(text: string, axis: GnumarusColorAxis): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized.length === 0) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (axis.unit === "degrees") {
    return clampHue(parsed);
  }
  if (axis.unit === "scalar") {
    const factor = 10 ** axis.decimals;
    const rounded = Math.round(clamp(parsed, axis.min, axis.max) * factor) / factor;
    return clamp(rounded, axis.min, axis.max);
  }
  const rounded =
    axis.decimals <= 0 ? Math.round(parsed) : Math.round(parsed * 10 ** axis.decimals) / 10 ** axis.decimals;
  return clamp(rounded, axis.min, axis.max);
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, "0");
}

/** Format bytes as `#rrggbb`, or `#rrggbbaa` when not fully opaque. */
export function rgbaBytesToHex(color: GnumarusRgbaBytes): string {
  const base = `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`;
  if (color.a >= 255) {
    return base;
  }
  return `${base}${toHexByte(color.a)}`;
}

function parseHexByte(pair: string): number | null {
  if (!/^[0-9a-fA-F]{2}$/.test(pair)) {
    return null;
  }
  return Number.parseInt(pair, 16);
}

/** Parse `#rgb`, `#rrggbb` and `#rrggbbaa` (alpha defaults to 255). */
export function parseHexToRgbaBytes(hex: string): GnumarusRgbaBytes | null {
  const normalized = hex.trim();
  const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(normalized);
  if (shortMatch !== null && shortMatch[1] !== undefined) {
    const digits = shortMatch[1];
    return {
      r: Number.parseInt(digits[0]! + digits[0]!, 16),
      g: Number.parseInt(digits[1]! + digits[1]!, 16),
      b: Number.parseInt(digits[2]! + digits[2]!, 16),
      a: 255,
    };
  }
  const longMatch = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(normalized);
  if (longMatch !== null && longMatch[1] !== undefined) {
    const digits = longMatch[1];
    const alphaPair = longMatch[2];
    const r = parseHexByte(digits.slice(0, 2));
    const g = parseHexByte(digits.slice(2, 4));
    const b = parseHexByte(digits.slice(4, 6));
    if (r === null || g === null || b === null) {
      return null;
    }
    let a = 255;
    if (alphaPair !== undefined) {
      const parsedAlpha = parseHexByte(alphaPair);
      if (parsedAlpha === null) {
        return null;
      }
      a = parsedAlpha;
    }
    return { r, g, b, a };
  }
  return null;
}

/** sRGB byte (0..255) to linear light (0..1). */
export function srgbByteToLinear(byte: number): number {
  const v = clamp(byte, 0, 255) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Linear light (0..1) to sRGB byte (0..255). */
export function linearToSrgbByte(linear: number): number {
  const v = clamp(linear, 0, 1);
  const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return clampByte(srgb * 255);
}

export interface GnumarusHsv {
  h: number;
  s: number;
  v: number;
}

export interface GnumarusHsl {
  h: number;
  s: number;
  l: number;
}

export function rgb01ToHsv(r: number, g: number, b: number): GnumarusHsv {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta > 1e-9) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
    if (h < 0) {
      h += 360;
    }
  }
  const s = max <= 1e-9 ? 0 : delta / max;
  return { h, s, v: clamp(max, 0, 1) };
}

export function hsvToRgb01(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hh = clampHue(h);
  const ss = clamp(s, 0, 1);
  const vv = clamp(v, 0, 1);
  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;
  let r = 0;
  let g = 0;
  let b = 0;
  const sector = Math.floor(hh / 60) % 6;
  if (sector === 0) {
    r = c;
    g = x;
  } else if (sector === 1) {
    r = x;
    g = c;
  } else if (sector === 2) {
    g = c;
    b = x;
  } else if (sector === 3) {
    g = x;
    b = c;
  } else if (sector === 4) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return { r: r + m, g: g + m, b: b + m };
}

export function rgb01ToHsl(r: number, g: number, b: number): GnumarusHsl {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta < 1e-9) {
    return { h: 0, s: 0, l: clamp(l, 0, 1) };
  }
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) {
    h += 360;
  }
  return { h, s: clamp(s, 0, 1), l: clamp(l, 0, 1) };
}

export function hslToRgb01(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = clampHue(h);
  const ss = clamp(s, 0, 1);
  const ll = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  const sector = Math.floor(hh / 60) % 6;
  if (sector === 0) {
    r = c;
    g = x;
  } else if (sector === 1) {
    r = x;
    g = c;
  } else if (sector === 2) {
    g = c;
    b = x;
  } else if (sector === 3) {
    g = x;
    b = c;
  } else if (sector === 4) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return { r: r + m, g: g + m, b: b + m };
}

export interface GnumarusCmyk {
  c: number;
  m: number;
  y: number;
  k: number;
}

export function rgb01ToCmyk(r: number, g: number, b: number): GnumarusCmyk {
  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - 1e-9) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }
  return {
    c: (1 - r - k) / (1 - k),
    m: (1 - g - k) / (1 - k),
    y: (1 - b - k) / (1 - k),
    k,
  };
}

export function cmykToRgb01(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const cc = clamp(c, 0, 1);
  const mm = clamp(m, 0, 1);
  const yy = clamp(y, 0, 1);
  const kk = clamp(k, 0, 1);
  return { r: (1 - cc) * (1 - kk), g: (1 - mm) * (1 - kk), b: (1 - yy) * (1 - kk) };
}

/* ------------------------------------------------------------------ */
/* Oklab core (forward and inverse between linear sRGB and Oklab).     */
/* ------------------------------------------------------------------ */

export interface GnumarusOklab {
  l: number;
  a: number;
  b: number;
}

export function linearSrgbToOklab(r: number, g: number, bl: number): GnumarusOklab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl;
  const l_ = Math.cbrt(Math.max(0, l));
  const m_ = Math.cbrt(Math.max(0, m));
  const s_ = Math.cbrt(Math.max(0, s));
  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function oklabToLinearSrgb(lab: GnumarusOklab): { r: number; g: number; b: number } {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

const OKLAB_TOE_K1 = 0.206;
const OKLAB_TOE_K2 = 0.03;
const OKLAB_TOE_K3 = (1 + OKLAB_TOE_K1) / (1 + OKLAB_TOE_K2);

function oklabToe(x: number): number {
  return 0.5 * (OKLAB_TOE_K3 * x - OKLAB_TOE_K1 + Math.sqrt((OKLAB_TOE_K3 * x - OKLAB_TOE_K1) ** 2 + 4 * OKLAB_TOE_K2 * OKLAB_TOE_K3 * x));
}

function oklabToeInv(x: number): number {
  return (x * x + OKLAB_TOE_K1 * x) / (OKLAB_TOE_K3 * (x + OKLAB_TOE_K2));
}

function computeMaxSaturation(a: number, b: number): number {
  let k0: number;
  let k1: number;
  let k2: number;
  let k3: number;
  let k4: number;
  let wl: number;
  let wm: number;
  let ws: number;
  if (-1.88170328 * a - 0.80936493 * b > 1) {
    k0 = 1.19086277;
    k1 = 1.76576728;
    k2 = 0.59662641;
    k3 = 0.75515197;
    k4 = 0.56771245;
    wl = 4.0767416621;
    wm = -3.3077115913;
    ws = 0.2309699292;
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    k0 = 0.73956515;
    k1 = -0.45954404;
    k2 = 0.08285427;
    k3 = 0.1254107;
    k4 = 0.14503204;
    wl = -1.2684380046;
    wm = 2.6097574011;
    ws = -0.3413193965;
  } else {
    k0 = 1.35733652;
    k1 = -0.00915799;
    k2 = -1.1513021;
    k3 = -0.50559606;
    k4 = 0.00692167;
    wl = -0.0041960863;
    wm = -0.7034186147;
    ws = 1.707614701;
  }
  let s = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;
  const kl = 0.3963377774 * a + 0.2158037573 * b;
  const km = -0.1055613458 * a - 0.0638541728 * b;
  const ks = -0.0894841775 * a - 1.291485548 * b;
  const l_ = 1 + s * kl;
  const m_ = 1 + s * km;
  const s_ = 1 + s * ks;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const ss = s_ * s_ * s_;
  const lds = 3 * kl * l_ * l_;
  const mds = 3 * km * m_ * m_;
  const sds = 3 * ks * s_ * s_;
  const lds2 = 6 * kl * kl * l_;
  const mds2 = 6 * km * km * m_;
  const sds2 = 6 * ks * ks * s_;
  const f = wl * l + wm * m + ws * ss;
  const f1 = wl * lds + wm * mds + ws * sds;
  const f2 = wl * lds2 + wm * mds2 + ws * sds2;
  const denom = f1 * f1 - 0.5 * f * f2;
  if (Math.abs(denom) > 1e-12) {
    s = s - (f * f1) / denom;
  }
  return s;
}

interface GnumarusCusp {
  l: number;
  c: number;
}

function findCusp(a: number, b: number): GnumarusCusp {
  const sCusp = computeMaxSaturation(a, b);
  const rgb = oklabToLinearSrgb({ l: 1, a: sCusp * a, b: sCusp * b });
  const lCusp = Math.cbrt(1 / Math.max(Math.max(rgb.r, rgb.g), Math.max(rgb.b, 1e-12)));
  return { l: lCusp, c: lCusp * sCusp };
}

interface GnumarusST {
  s: number;
  t: number;
}

function cuspToST(cusp: GnumarusCusp): GnumarusST {
  return { s: cusp.c / Math.max(cusp.l, 1e-12), t: cusp.c / Math.max(1 - cusp.l, 1e-12) };
}

function getSTMid(a: number, b: number): GnumarusST {
  const s =
    0.11516993 +
    1 /
      (7.4477897 +
        4.1590124 * b +
        a *
          (-2.19557347 +
            1.75198401 * b +
            a *
              (-2.13704948 -
                10.02301043 * b +
                a * (-4.24894561 + 5.38770819 * b + 4.69891013 * a))));
  const t =
    0.11239642 +
    1 /
      (1.6132032 -
        0.68124379 * b +
        a *
          (0.40370612 +
            0.90148123 * b +
            a *
              (-0.27087943 +
                0.6122399 * b +
                a * (0.00299215 - 0.45399568 * b - 0.14661872 * a))));
  return { s, t };
}

interface GnumarusCs {
  c0: number;
  cMid: number;
  cMax: number;
}

function findGamutIntersection(a: number, b: number, l1: number, c1: number, l0: number, cusp: GnumarusCusp): number {
  let t: number;
  if ((l1 - l0) * cusp.c - (cusp.l - l0) * c1 <= 0) {
    const denom = c1 * cusp.l + cusp.c * (l0 - l1);
    if (Math.abs(denom) < 1e-12) {
      return 0;
    }
    t = (cusp.c * l0) / denom;
  } else {
    const denom = c1 * (cusp.l - 1) + cusp.c * (l0 - l1);
    if (Math.abs(denom) < 1e-12) {
      return 1;
    }
    t = (cusp.c * (l0 - 1)) / denom;
    const dl = l1 - l0;
    const dc = c1;
    const kl = 0.3963377774 * a + 0.2158037573 * b;
    const km = -0.1055613458 * a - 0.0638541728 * b;
    const ks = -0.0894841775 * a - 1.291485548 * b;
    const ldt = dl + dc * kl;
    const mdt = dl + dc * km;
    const sdt = dl + dc * ks;
    const l = l0 * (1 - t) + t * l1;
    const c = t * c1;
    const l_ = l + c * kl;
    const m_ = l + c * km;
    const s_ = l + c * ks;
    const ll = l_ * l_ * l_;
    const mm = m_ * m_ * m_;
    const ss = s_ * s_ * s_;
    const ldt2 = 3 * ldt * l_ * l_;
    const mdt2 = 3 * mdt * m_ * m_;
    const sdt2 = 3 * sdt * s_ * s_;
    const ldt22 = 6 * ldt * ldt * l_;
    const mdt22 = 6 * mdt * mdt * m_;
    const sdt22 = 6 * sdt * sdt * s_;
    const r = 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss - 1;
    const r1 = 4.0767416621 * ldt2 - 3.3077115913 * mdt2 + 0.2309699292 * sdt2;
    const r2 = 4.0767416621 * ldt22 - 3.3077115913 * mdt22 + 0.2309699292 * sdt22;
    const gg = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss - 1;
    const g1 = -1.2684380046 * ldt2 + 2.6097574011 * mdt2 - 0.3413193965 * sdt2;
    const g2 = -1.2684380046 * ldt22 + 2.6097574011 * mdt22 - 0.3413193965 * sdt22;
    const bb = -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss - 1;
    const b1 = -0.0041960863 * ldt2 - 0.7034186147 * mdt2 + 1.707614701 * sdt2;
    const b2 = -0.0041960863 * ldt22 - 0.7034186147 * mdt22 + 1.707614701 * sdt22;
    const uR = r1 / (r1 * r1 - 0.5 * r * r2);
    const uG = g1 / (g1 * g1 - 0.5 * gg * g2);
    const uB = b1 / (b1 * b1 - 0.5 * bb * b2);
    let tR = -r * uR;
    let tG = -gg * uG;
    let tB = -bb * uB;
    tR = uR >= 0 ? tR : Number.POSITIVE_INFINITY;
    tG = uG >= 0 ? tG : Number.POSITIVE_INFINITY;
    tB = uB >= 0 ? tB : Number.POSITIVE_INFINITY;
    t += Math.min(tR, Math.min(tG, tB));
  }
  return t;
}

function getCs(l: number, a: number, b: number): GnumarusCs {
  const cusp = findCusp(a, b);
  const cMax = findGamutIntersection(a, b, l, 1, l, cusp);
  const stMax = cuspToST(cusp);
  const k = cMax / Math.max(Math.min(l * stMax.s, (1 - l) * stMax.t), 1e-12);
  const stMid = getSTMid(a, b);
  const ca = l * stMid.s;
  const cb = (1 - l) * stMid.t;
  const cMid =
    (0.9 *
      k *
      Math.sqrt(
        Math.sqrt(1 / (1 / (ca * ca * ca * ca + 1e-12) + 1 / (cb * cb * cb * cb + 1e-12))),
      )) ||
    0;
  const c0a = l * 0.4;
  const c0b = (1 - l) * 0.8;
  const c0 = Math.sqrt(1 / (1 / (c0a * c0a + 1e-12) + 1 / (c0b * c0b + 1e-12)));
  return { c0, cMid, cMax };
}

export interface GnumarusOkhsl {
  h: number;
  s: number;
  l: number;
}

export interface GnumarusOkhsv {
  h: number;
  s: number;
  v: number;
}

export function linearSrgbToOkhsl(r: number, g: number, b: number): GnumarusOkhsl {
  const lab = linearSrgbToOklab(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  if (c < 1e-6) {
    return { h: 0, s: 0, l: oklabToe(clamp(lab.l, 0, 1)) };
  }
  const a_ = lab.a / c;
  const b_ = lab.b / c;
  const l = lab.l;
  let h = 0.5 + (0.5 * Math.atan2(-lab.b, -lab.a)) / Math.PI;
  if (!Number.isFinite(h)) {
    h = 0;
  }
  h = ((h % 1) + 1) % 1;
  const cs = getCs(l, a_, b_);
  const mid = 0.8;
  const midInv = 1.25;
  let s: number;
  if (c < cs.cMid) {
    const k1 = mid * cs.c0;
    const k2 = 1 - k1 / Math.max(cs.cMid, 1e-12);
    const t = c / (k1 + k2 * c);
    s = t * mid;
  } else {
    const k0 = cs.cMid;
    const k1 = ((1 - mid) * cs.cMid * cs.cMid * midInv * midInv) / Math.max(cs.c0, 1e-12);
    const k2 = 1 - k1 / Math.max(cs.cMax - cs.cMid, 1e-12);
    const t = (c - k0) / (k1 + k2 * (c - k0));
    s = mid + (1 - mid) * t;
  }
  return { h: h * 360, s: clamp(s, 0, 1), l: oklabToe(clamp(l, 0, 1)) };
}

export function okhslToLinearSrgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = clampHue(h) / 360;
  const ss = clamp(s, 0, 1);
  const ll = clamp(l, 0, 1);
  if (ll >= 1 - 1e-9) {
    return { r: 1, g: 1, b: 1 };
  }
  if (ll <= 1e-9) {
    return { r: 0, g: 0, b: 0 };
  }
  const a_ = Math.cos(2 * Math.PI * hh);
  const b_ = Math.sin(2 * Math.PI * hh);
  const L = oklabToeInv(ll);
  const cs = getCs(L, a_, b_);
  const mid = 0.8;
  const midInv = 1.25;
  let c: number;
  if (ss < mid) {
    const t = midInv * ss;
    const k1 = mid * cs.c0;
    const k2 = 1 - k1 / Math.max(cs.cMid, 1e-12);
    c = (t * k1) / (1 - k2 * t);
  } else {
    const t = (ss - mid) / (1 - mid);
    const k0 = cs.cMid;
    const k1 = ((1 - mid) * cs.cMid * cs.cMid * midInv * midInv) / Math.max(cs.c0, 1e-12);
    const k2 = 1 - k1 / Math.max(cs.cMax - cs.cMid, 1e-12);
    c = k0 + (t * k1) / (1 - k2 * t);
  }
  return oklabToLinearSrgb({ l: L, a: c * a_, b: c * b_ });
}

export function linearSrgbToOkhsv(r: number, g: number, b: number): GnumarusOkhsv {
  const lab = linearSrgbToOklab(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  const l = lab.l;
  if (c < 1e-6 || l < 1e-9) {
    if (l < 1e-9) {
      return { h: 0, s: 0, v: 0 };
    }
    return { h: 0, s: 0, v: oklabToe(clamp(l, 0, 1)) };
  }
  const a_ = lab.a / c;
  const b_ = lab.b / c;
  let h = 0.5 + (0.5 * Math.atan2(-lab.b, -lab.a)) / Math.PI;
  if (!Number.isFinite(h)) {
    h = 0;
  }
  h = ((h % 1) + 1) % 1;
  const cusp = findCusp(a_, b_);
  const stMax = cuspToST(cusp);
  const sMax = stMax.s;
  const tMax = stMax.t;
  const s0 = 0.5;
  const k = 1 - s0 / Math.max(sMax, 1e-12);
  const t = tMax / (c + l * tMax);
  const lV = t * l;
  const cV = t * c;
  if (lV < 1e-12) {
    return { h: h * 360, s: 0, v: 0 };
  }
  const lVt = oklabToeInv(lV);
  const cVt = (cV * lVt) / lV;
  const scaled = oklabToLinearSrgb({ l: lVt, a: a_ * cVt, b: b_ * cVt });
  const scaleL = Math.cbrt(1 / Math.max(Math.max(scaled.r, scaled.g), Math.max(scaled.b, 1e-12)));
  const lAdj = l / scaleL;
  const lToe = oklabToe(clamp(lAdj, 0, 1));
  const v = lToe / lV;
  const s = ((s0 + tMax) * cV) / (tMax * s0 + tMax * k * cV);
  return { h: h * 360, s: clamp(s, 0, 1), v: clamp(v, 0, 1) };
}

export function okhsvToLinearSrgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hh = clampHue(h) / 360;
  const ss = clamp(s, 0, 1);
  const vv = clamp(v, 0, 1);
  if (vv <= 1e-9) {
    return { r: 0, g: 0, b: 0 };
  }
  const a_ = Math.cos(2 * Math.PI * hh);
  const b_ = Math.sin(2 * Math.PI * hh);
  const cusp = findCusp(a_, b_);
  const stMax = cuspToST(cusp);
  const sMax = stMax.s;
  const tMax = stMax.t;
  const s0 = 0.5;
  const k = 1 - s0 / Math.max(sMax, 1e-12);
  const lV = 1 - (ss * s0) / (s0 + tMax - tMax * k * ss);
  const cV = (ss * tMax * s0) / (s0 + tMax - tMax * k * ss);
  const lVt = oklabToeInv(lV);
  const cVt = (cV * lVt) / Math.max(lV, 1e-12);
  const scaled = oklabToLinearSrgb({ l: lVt, a: a_ * cVt, b: b_ * cVt });
  const scaleL = Math.cbrt(1 / Math.max(Math.max(scaled.r, scaled.g), Math.max(scaled.b, 1e-12)));
  const lNew = oklabToeInv(vv * lV);
  const chroma = (cV * lNew) / Math.max(lV, 1e-12);
  return oklabToLinearSrgb({ l: lNew * scaleL, a: chroma * a_ * scaleL, b: chroma * b_ * scaleL });
}

/* ------------------------------------------------------------------ */
/* ARD: cylindrical coordinates around the RGB cube main diagonal.     */
/* A = angle around the diagonal (like hue), R = percentage of the     */
/* distance from the diagonal to the gamut edge in that direction       */
/* (like saturation + gain), D = position along the black-white         */
/* diagonal (like base value/lightness).                                */
/* ------------------------------------------------------------------ */

const ARD_U = [1 / Math.SQRT2, -1 / Math.SQRT2, 0];
const ARD_V = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)];

function ardMaxRadius(d: number, dx: number, dy: number, dz: number): number {
  let max = Number.POSITIVE_INFINITY;
  const comps: Array<[number, number]> = [
    [d, dx],
    [d, dy],
    [d, dz],
  ];
  for (const [center, dir] of comps) {
    if (dir > 1e-12) {
      max = Math.min(max, (1 - center) / dir);
    } else if (dir < -1e-12) {
      max = Math.min(max, (0 - center) / dir);
    }
  }
  if (!Number.isFinite(max) || max < 0) {
    return 0;
  }
  return max;
}

export interface GnumarusArd {
  a: number;
  r: number;
  d: number;
}

export function rgb01ToArd(r: number, g: number, b: number): GnumarusArd {
  const d = (clamp(r, 0, 1) + clamp(g, 0, 1) + clamp(b, 0, 1)) / 3;
  const px = clamp(r, 0, 1) - d;
  const py = clamp(g, 0, 1) - d;
  const pz = clamp(b, 0, 1) - d;
  const ru = px * ARD_U[0]! + py * ARD_U[1]! + pz * ARD_U[2]!;
  const rv = px * ARD_V[0]! + py * ARD_V[1]! + pz * ARD_V[2]!;
  const mag = Math.sqrt(ru * ru + rv * rv);
  if (mag < 1e-9) {
    return { a: 0, r: 0, d };
  }
  const angle = ((Math.atan2(rv, ru) * 180) / Math.PI + 360) % 360;
  const len = Math.sqrt(ru * ru + rv * rv);
  const dx = (ru / len) * ARD_U[0]! + (rv / len) * ARD_V[0]!;
  const dy = (ru / len) * ARD_U[1]! + (rv / len) * ARD_V[1]!;
  const dz = (ru / len) * ARD_U[2]! + (rv / len) * ARD_V[2]!;
  const maxR = ardMaxRadius(d, dx, dy, dz);
  const ratio = maxR > 1e-12 ? clamp(mag / maxR, 0, 1) : 0;
  return { a: angle, r: ratio, d };
}

export function ardToRgb01(a: number, r: number, d: number): { r: number; g: number; b: number } {
  const dd = clamp(d, 0, 1);
  const ratio = clamp(r, 0, 1);
  const rad = (clampHue(a) * Math.PI) / 180;
  const ca = Math.cos(rad);
  const sa = Math.sin(rad);
  const dx = ca * ARD_U[0]! + sa * ARD_V[0]!;
  const dy = ca * ARD_U[1]! + sa * ARD_V[1]!;
  const dz = ca * ARD_U[2]! + sa * ARD_V[2]!;
  const maxR = ardMaxRadius(dd, dx, dy, dz);
  const m = ratio * maxR;
  return {
    r: clamp(dd + m * dx, 0, 1),
    g: clamp(dd + m * dy, 0, 1),
    b: clamp(dd + m * dz, 0, 1),
  };
}

/* ------------------------------------------------------------------ */
/* Model <-> sRGB bytes in display units.                              */
/* ------------------------------------------------------------------ */

/** Convert bytes to display-unit axis values for a model. */
export function rgbBytesToModelAxes(color: GnumarusRgbaBytes, model: GnumarusColorModelId): number[] {
  const r = clamp(color.r, 0, 255) / 255;
  const g = clamp(color.g, 0, 255) / 255;
  const b = clamp(color.b, 0, 255) / 255;
  switch (model) {
    case "rgb":
      return [color.r, color.g, color.b, clampByte(color.a)];
    case "cmyk": {
      const cmyk = rgb01ToCmyk(r, g, b);
      return [cmyk.c * 100, cmyk.m * 100, cmyk.y * 100, cmyk.k * 100, clampByte(color.a)];
    }
    case "hsv": {
      const hsv = rgb01ToHsv(r, g, b);
      return [hsv.h, hsv.s * 100, hsv.v * 100, clampByte(color.a)];
    }
    case "hsl": {
      const hsl = rgb01ToHsl(r, g, b);
      return [hsl.h, hsl.s * 100, hsl.l * 100, clampByte(color.a)];
    }
    case "okhsl": {
      const lin = { r: srgbByteToLinear(color.r), g: srgbByteToLinear(color.g), b: srgbByteToLinear(color.b) };
      const ok = linearSrgbToOkhsl(lin.r, lin.g, lin.b);
      return [clampHue(ok.h), clampPercent(ok.s * 100), clampPercent(ok.l * 100), clampByte(color.a)];
    }
    case "okhsv": {
      const lin = { r: srgbByteToLinear(color.r), g: srgbByteToLinear(color.g), b: srgbByteToLinear(color.b) };
      const ok = linearSrgbToOkhsv(lin.r, lin.g, lin.b);
      return [clampHue(ok.h), clampPercent(ok.s * 100), clampPercent(ok.v * 100), clampByte(color.a)];
    }
    case "ard": {
      const ard = rgb01ToArd(r, g, b);
      return [clampHue(ard.a), clamp(ard.r * 255, 0, 255), clamp(ard.d * 360, 0, 360), clampByte(color.a)];
    }
  }
}

function clampDisplayValues(model: GnumarusColorModelId, values: number[]): number[] {
  const def = getColorModelDef(model);
  return def.axes.map((axis, index) => {
    const raw = values[index] ?? axis.min;
    if (axis.unit === "degrees") {
      return clampHue(raw);
    }
    if (axis.unit === "byte") {
      return clampByte(raw);
    }
    return clamp(raw, axis.min, axis.max);
  });
}

/** Convert display-unit axis values back to sRGB bytes (alpha handled separately). */
export function modelAxesToRgbBytes(model: GnumarusColorModelId, values: number[]): { r: number; g: number; b: number } {
  const v = clampDisplayValues(model, values);
  switch (model) {
    case "rgb":
      return { r: clampByte(v[0] ?? 0), g: clampByte(v[1] ?? 0), b: clampByte(v[2] ?? 0) };
    case "cmyk": {
      const rgb = cmykToRgb01((v[0] ?? 0) / 100, (v[1] ?? 0) / 100, (v[2] ?? 0) / 100, (v[3] ?? 0) / 100);
      return { r: clampByte(rgb.r * 255), g: clampByte(rgb.g * 255), b: clampByte(rgb.b * 255) };
    }
    case "hsv": {
      const rgb = hsvToRgb01(v[0] ?? 0, (v[1] ?? 0) / 100, (v[2] ?? 0) / 100);
      return { r: clampByte(rgb.r * 255), g: clampByte(rgb.g * 255), b: clampByte(rgb.b * 255) };
    }
    case "hsl": {
      const rgb = hslToRgb01(v[0] ?? 0, (v[1] ?? 0) / 100, (v[2] ?? 0) / 100);
      return { r: clampByte(rgb.r * 255), g: clampByte(rgb.g * 255), b: clampByte(rgb.b * 255) };
    }
    case "okhsl": {
      const lin = okhslToLinearSrgb(v[0] ?? 0, (v[1] ?? 0) / 100, (v[2] ?? 0) / 100);
      return {
        r: linearToSrgbByte(lin.r),
        g: linearToSrgbByte(lin.g),
        b: linearToSrgbByte(lin.b),
      };
    }
    case "okhsv": {
      const lin = okhsvToLinearSrgb(v[0] ?? 0, (v[1] ?? 0) / 100, (v[2] ?? 0) / 100);
      return {
        r: linearToSrgbByte(lin.r),
        g: linearToSrgbByte(lin.g),
        b: linearToSrgbByte(lin.b),
      };
    }
    case "ard": {
      const rgb = ardToRgb01(v[0] ?? 0, (v[1] ?? 0) / 255, (v[2] ?? 0) / 360);
      return { r: clampByte(rgb.r * 255), g: clampByte(rgb.g * 255), b: clampByte(rgb.b * 255) };
    }
  }
}

/** Read the Alpha axis value of any model (all models carry alpha). */
export function modelAlphaFromValues(model: GnumarusColorModelId, values: number[], fallback = 255): number {
  const def = getColorModelDef(model);
  const index = def.axes.findIndex((axis) => axis.label === "Alpha");
  if (index < 0) {
    return clampByte(fallback);
  }
  const raw = values[index];
  return typeof raw === "number" && Number.isFinite(raw) ? clampByte(raw) : clampByte(fallback);
}

/**
 * Build a CSS gradient for one axis by sampling its range while holding the
 * other axes fixed. Returns `linear-gradient(...)` with hard stops.
 */
export function modelAxisGradientCss(model: GnumarusColorModelId, axisIndex: number, currentValues: number[], stops = 11): string {
  const def = getColorModelDef(model);
  const axis = def.axes[axisIndex];
  if (axis === undefined) {
    return "linear-gradient(to right, #000000, #ffffff)";
  }
  const count = Math.max(2, Math.floor(stops));
  const parts: string[] = [];
  const isAlpha = axis.label === "Alpha";
  // Alpha is orthogonal to every model: hold the current color, fade its opacity.
  const alphaBase = isAlpha ? modelAxesToRgbBytes(model, currentValues) : null;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const sample = [...currentValues];
    sample[axisIndex] = axis.min + t * (axis.max - axis.min);
    const percent = Math.round(t * 1000) / 10;
    if (isAlpha && alphaBase !== null) {
      const alpha = Math.round((axis.min + t * (axis.max - axis.min)) * 10) / 10 / 255;
      parts.push(`rgba(${alphaBase.r}, ${alphaBase.g}, ${alphaBase.b}, ${Math.min(1, Math.max(0, alpha))}) ${percent}%`);
      continue;
    }
    const rgb = modelAxesToRgbBytes(model, sample);
    parts.push(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b}) ${percent}%`);
  }
  return `linear-gradient(to right, ${parts.join(", ")})`;
}

/** Round display values to their axis precision (used when committing manual input). */
export function normalizeModelValues(model: GnumarusColorModelId, values: number[]): number[] {
  const def = getColorModelDef(model);
  return def.axes.map((axis, index) => {
    const raw = values[index] ?? axis.min;
    if (axis.unit === "degrees") {
      const rounded = Math.round(clampHue(raw) * 10) / 10;
      return rounded >= 360 ? 0 : rounded;
    }
    if (axis.unit === "byte") {
      return clampByte(raw);
    }
    const factor = 10 ** axis.decimals;
    const rounded = Math.round(clamp(raw, axis.min, axis.max) * factor) / factor;
    return clamp(rounded, axis.min, axis.max);
  });
}
