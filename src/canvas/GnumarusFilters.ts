/**
 * Destructive texture filters (Krita/GIMP style, original implementations).
 * Every kernel is pure: straight RGB in, straight RGB out, alpha preserved
 * unless stated. Coordinates are layer pixels; out-of-bounds reads clamp
 * to the edge. Callers mix the result over the base by selection mask.
 *
 * Large radii stay interactive via algorithmic choices (sliding-window box
 * blurs for gaussians, per-pixel histograms for median/oil), and the shell
 * paints its spinner over one yielded frame before running a kernel.
 */

/** Filter parameter kinds the generic dialog can render. */
export type GnumarusFilterParamKind = "number" | "boolean" | "enum" | "text";

export interface GnumarusFilterParamOption {
  value: string;
  label: string;
}

export interface GnumarusFilterParamDef {
  key: string;
  kind: GnumarusFilterParamKind;
  label: string;
  hint: string;
  min?: number;
  max?: number;
  step?: number;
  def: number | boolean | string;
  options?: GnumarusFilterParamOption[];
}

export type GnumarusFilterTheme = "blur" | "enhance" | "artistic" | "edge" | "noise" | "colors" | "decor";

export interface GnumarusFilterDef {
  id: string;
  title: string;
  hint: string;
  theme: GnumarusFilterTheme;
  params: GnumarusFilterParamDef[];
}

export type GnumarusFilterValues = Record<string, number | boolean | string>;

/** Deterministic LCG (seeded noise must replay identically). */
export function filterRandom(seed: number): () => number {
  let state = (Math.floor(seed) | 0) >>> 0;
  if (state === 0) {
    state = 0x9e3779b9;
  }
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, num));
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, num));
}

/** Coerce raw dialog values through a filter schema (invalid becomes default). */
export function normalizeFilterValues(
  def: GnumarusFilterDef,
  raw: GnumarusFilterValues | null | undefined,
): GnumarusFilterValues {
  const out: GnumarusFilterValues = {};
  for (const param of def.params) {
    const value = raw?.[param.key];
    if (value === undefined || value === null) {
      out[param.key] = param.def;
      continue;
    }
    if (param.kind === "boolean") {
      out[param.key] = value === true;
    } else if (param.kind === "enum") {
      const allowed = new Set((param.options ?? []).map((option) => option.value));
      out[param.key] = typeof value === "string" && allowed.has(value) ? value : (param.def as string);
    } else if (param.kind === "text") {
      out[param.key] = typeof value === "string" ? value : (param.def as string);
    } else {
      const min = param.min ?? Number.NEGATIVE_INFINITY;
      const max = param.max ?? Number.POSITIVE_INFINITY;
      const fallback = typeof param.def === "number" ? param.def : 0;
      out[param.key] = clampFloat(value, min, max, fallback);
    }
  }
  return out;
}

/** Parse `#rrggbb` (leading `#` optional); null when malformed. */
export function parseFilterHexColor(value: unknown): { r: number; g: number; b: number } | null {
  if (typeof value !== "string") {
    return null;
  }
  const hex = value.startsWith("#") ? value.slice(1) : value;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function sampleClamped(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
): number {
  const cx = Math.min(width - 1, Math.max(0, x));
  const cy = Math.min(height - 1, Math.max(0, y));
  return buffer[(cy * width + cx) * 4 + channel] ?? 0;
}

/**
 * One sliding-window box blur pass (radius >= 1) into `dst`.
 * Separable horizontal+vertical accumulation makes the cost independent
 * of the radius; callers run it three times for a gaussian approximation.
 */
function boxBlurPass(
  src: Uint8ClampedArray | Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
): void {
  const window = radius * 2 + 1;
  if (horizontal) {
    for (let y = 0; y < height; y += 1) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      let accA = 0;
      for (let x = -radius; x <= radius; x += 1) {
        const cx = Math.min(width - 1, Math.max(0, x));
        const at = (y * width + cx) * 4;
        accR += src[at] ?? 0;
        accG += src[at + 1] ?? 0;
        accB += src[at + 2] ?? 0;
        accA += src[at + 3] ?? 0;
      }
      for (let x = 0; x < width; x += 1) {
        const at = (y * width + x) * 4;
        dst[at] = accR / window;
        dst[at + 1] = accG / window;
        dst[at + 2] = accB / window;
        dst[at + 3] = accA / window;
        const out = Math.min(width - 1, Math.max(0, x - radius));
        const inn = Math.min(width - 1, Math.max(0, x + radius + 1));
        const oat = (y * width + out) * 4;
        const iat = (y * width + inn) * 4;
        accR += (src[iat] ?? 0) - (src[oat] ?? 0);
        accG += (src[iat + 1] ?? 0) - (src[oat + 1] ?? 0);
        accB += (src[iat + 2] ?? 0) - (src[oat + 2] ?? 0);
        accA += (src[iat + 3] ?? 0) - (src[oat + 3] ?? 0);
      }
    }
    return;
  }
  for (let x = 0; x < width; x += 1) {
    let accR = 0;
    let accG = 0;
    let accB = 0;
    let accA = 0;
    for (let y = -radius; y <= radius; y += 1) {
      const cy = Math.min(height - 1, Math.max(0, y));
      const at = (cy * width + x) * 4;
      accR += src[at] ?? 0;
      accG += src[at + 1] ?? 0;
      accB += src[at + 2] ?? 0;
      accA += src[at + 3] ?? 0;
    }
    for (let y = 0; y < height; y += 1) {
      const at = (y * width + x) * 4;
      dst[at] = accR / window;
      dst[at + 1] = accG / window;
      dst[at + 2] = accB / window;
      dst[at + 3] = accA / window;
      const out = Math.min(height - 1, Math.max(0, y - radius));
      const inn = Math.min(height - 1, Math.max(0, y + radius + 1));
      const oat = (out * width + x) * 4;
      const iat = (inn * width + x) * 4;
      accR += (src[iat] ?? 0) - (src[oat] ?? 0);
      accG += (src[iat + 1] ?? 0) - (src[oat + 1] ?? 0);
      accB += (src[iat + 2] ?? 0) - (src[oat + 2] ?? 0);
      accA += (src[iat + 3] ?? 0) - (src[oat + 3] ?? 0);
    }
  }
}

/** Triple box blur approximating a gaussian of the given radius. */
function gaussianBlur(source: Uint8ClampedArray, width: number, height: number, radius: number): Float32Array {
  const r = Math.max(1, Math.round(radius));
  // Ideal box widths for 3 passes (Glasner approximation).
  const ideal = Math.sqrt((12 * r * r) / 9 + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) {
    wl -= 1;
  }
  const wu = wl + 2;
  const idealReal = (12 * r * r) / 9 + 1;
  let m = Math.round((12 * r * r - 9 * wl * wl - 3 * wl) / (6 * wl + 12 - 3 * idealReal + 3 * wl * wl));
  m = Math.min(3, Math.max(0, m));
  const sizes = [wl, wl, wl];
  for (let i = 0; i < m; i += 1) {
    sizes[i] = wu;
  }
  let read: Uint8ClampedArray | Float32Array = source;
  let write = new Float32Array(width * height * 4);
  for (let pass = 0; pass < 3; pass += 1) {
    const size = sizes[pass] ?? 1;
    const pr = Math.max(1, (size - 1) / 2);
    boxBlurPass(read, write, width, height, pr, true);
    const scratch = new Float32Array(width * height * 4);
    boxBlurPass(write, scratch, width, height, pr, false);
    read = scratch;
    write = new Float32Array(width * height * 4);
  }
  return read as Float32Array;
}

function luminance709(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kernelGaussianBlur(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const radius = clampFloat(v["radius"], 0.5, 50, 2);
  const blurred = gaussianBlur(src, width, height, radius);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = clampByte(blurred[i] ?? 0);
    dst[i + 1] = clampByte(blurred[i + 1] ?? 0);
    dst[i + 2] = clampByte(blurred[i + 2] ?? 0);
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelMotionBlur(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const angle = ((clampFloat(v["angle"], 0, 360, 0) * Math.PI) / 180) % (Math.PI * 2);
  const length = Math.max(1, Math.round(clampFloat(v["length"], 1, 100, 10)));
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const dst = new Uint8ClampedArray(src.length);
  const half = (length - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      let accA = 0;
      for (let s = 0; s < length; s += 1) {
        const t = s - half;
        const sx = Math.round(x + dx * t);
        const sy = Math.round(y + dy * t);
        const cx = Math.min(width - 1, Math.max(0, sx));
        const cy = Math.min(height - 1, Math.max(0, sy));
        const at = (cy * width + cx) * 4;
        accR += src[at] ?? 0;
        accG += src[at + 1] ?? 0;
        accB += src[at + 2] ?? 0;
        accA += src[at + 3] ?? 0;
      }
      const at = (y * width + x) * 4;
      dst[at] = Math.round(accR / length);
      dst[at + 1] = Math.round(accG / length);
      dst[at + 2] = Math.round(accB / length);
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function kernelPixelize(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const size = Math.max(2, Math.round(clampFloat(v["size"], 2, 128, 8)));
  const dst = new Uint8ClampedArray(src.length);
  for (let by = 0; by < height; by += size) {
    for (let bx = 0; bx < width; bx += size) {
      let accR = 0;
      let accG = 0;
      let accB = 0;
      let accA = 0;
      let count = 0;
      for (let y = by; y < Math.min(height, by + size); y += 1) {
        for (let x = bx; x < Math.min(width, bx + size); x += 1) {
          const at = (y * width + x) * 4;
          accR += src[at] ?? 0;
          accG += src[at + 1] ?? 0;
          accB += src[at + 2] ?? 0;
          accA += src[at + 3] ?? 0;
          count += 1;
        }
      }
      const r = Math.round(accR / Math.max(1, count));
      const g = Math.round(accG / Math.max(1, count));
      const b = Math.round(accB / Math.max(1, count));
      const a = Math.round(accA / Math.max(1, count));
      for (let y = by; y < Math.min(height, by + size); y += 1) {
        for (let x = bx; x < Math.min(width, bx + size); x += 1) {
          const at = (y * width + x) * 4;
          dst[at] = r;
          dst[at + 1] = g;
          dst[at + 2] = b;
          dst[at + 3] = a;
        }
      }
    }
  }
  return dst;
}

function kernelUnsharpMask(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const radius = clampFloat(v["radius"], 0.5, 20, 2);
  const amount = clampFloat(v["amount"], 0, 500, 100) / 100;
  const threshold = clampInt(v["threshold"], 0, 255, 0);
  const blurred = gaussianBlur(src, width, height, radius);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const orig = src[i + c] ?? 0;
      const soft = blurred[i + c] ?? 0;
      if (Math.abs(orig - soft) < threshold) {
        dst[i + c] = orig;
      } else {
        dst[i + c] = clampByte(orig + (orig - soft) * amount);
      }
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelSharpen(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  // Classic 3x3 sharpen: center weight 5, direct neighbors -1.
  const dst = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const center = (src[at + c] ?? 0) * 5;
        const sides =
          (sampleClamped(src, width, height, x - 1, y, c) as number) +
          (sampleClamped(src, width, height, x + 1, y, c) as number) +
          (sampleClamped(src, width, height, x, y - 1, c) as number) +
          (sampleClamped(src, width, height, x, y + 1, c) as number);
        dst[at + c] = clampByte(center - sides);
      }
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function kernelDespeckle(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const radius = clampInt(v["radius"], 1, 5, 1);
  const dst = new Uint8ClampedArray(src.length);
  const binsR = new Uint8Array(256);
  const binsG = new Uint8Array(256);
  const binsB = new Uint8Array(256);
  const countAt = (x: number, y: number): number => {
    const cx = Math.min(width - 1, Math.max(0, x));
    const cy = Math.min(height - 1, Math.max(0, y));
    return (cy * width + cx) * 4;
  };
  const medianOf = (bins: Uint8Array, total: number): number => {
    let acc = 0;
    const half = Math.floor(total / 2);
    for (let i = 0; i < 256; i += 1) {
      acc += bins[i] ?? 0;
      if (acc > half) {
        return i;
      }
    }
    return 255;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      binsR.fill(0);
      binsG.fill(0);
      binsB.fill(0);
      let total = 0;
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          const at = countAt(x + ox, y + oy);
          binsR[src[at] ?? 0] = ((binsR[src[at] ?? 0] ?? 0) + 1) & 255;
          binsG[src[at + 1] ?? 0] = ((binsG[src[at + 1] ?? 0] ?? 0) + 1) & 255;
          binsB[src[at + 2] ?? 0] = ((binsB[src[at + 2] ?? 0] ?? 0) + 1) & 255;
          total += 1;
        }
      }
      const at = (y * width + x) * 4;
      dst[at] = medianOf(binsR, total);
      dst[at + 1] = medianOf(binsG, total);
      dst[at + 2] = medianOf(binsB, total);
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function kernelOilify(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const size = Math.max(1, Math.round(clampFloat(v["size"], 1, 8, 3)));
  const levels = Math.max(2, Math.round(clampFloat(v["levels"], 8, 64, 24)));
  const dst = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const counts = new Uint16Array(levels);
      const sumR = new Float64Array(levels);
      const sumG = new Float64Array(levels);
      const sumB = new Float64Array(levels);
      for (let oy = -size; oy <= size; oy += 1) {
        for (let ox = -size; ox <= size; ox += 1) {
          const cx = Math.min(width - 1, Math.max(0, x + ox));
          const cy = Math.min(height - 1, Math.max(0, y + oy));
          const at = (cy * width + cx) * 4;
          const intensity = Math.min(
            levels - 1,
            Math.floor((((src[at] ?? 0) + (src[at + 1] ?? 0) + (src[at + 2] ?? 0)) / 3 / 256) * levels),
          );
          counts[intensity] = (counts[intensity] ?? 0) + 1;
          sumR[intensity] = (sumR[intensity] ?? 0) + (src[at] ?? 0);
          sumG[intensity] = (sumG[intensity] ?? 0) + (src[at + 1] ?? 0);
          sumB[intensity] = (sumB[intensity] ?? 0) + (src[at + 2] ?? 0);
        }
      }
      let best = 0;
      let bestCount = -1;
      for (let i = 0; i < levels; i += 1) {
        if ((counts[i] ?? 0) > bestCount) {
          bestCount = counts[i] ?? 0;
          best = i;
        }
      }
      const n = Math.max(1, counts[best] ?? 1);
      const at = (y * width + x) * 4;
      dst[at] = clampByte((sumR[best] ?? 0) / n);
      dst[at + 1] = clampByte((sumG[best] ?? 0) / n);
      dst[at + 2] = clampByte((sumB[best] ?? 0) / n);
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function kernelEmboss(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const depth = clampFloat(v["depth"], 1, 30, 10);
  const azimuth = ((clampFloat(v["azimuth"], 0, 360, 135) * Math.PI) / 180) % (Math.PI * 2);
  const lx = Math.cos(azimuth);
  const ly = Math.sin(azimuth);
  const dst = new Uint8ClampedArray(src.length);
  const lum = (x: number, y: number): number => {
    const cx = Math.min(width - 1, Math.max(0, x));
    const cy = Math.min(height - 1, Math.max(0, y));
    const at = (cy * width + cx) * 4;
    return luminance709(src[at] ?? 0, src[at + 1] ?? 0, src[at + 2] ?? 0) / 255;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const gx = lum(x + 1, y) - lum(x - 1, y);
      const gy = lum(x, y + 1) - lum(x, y - 1);
      const height_ = 128 + depth * 32 * (gx * lx + gy * ly);
      const at = (y * width + x) * 4;
      const gray = clampByte(height_);
      dst[at] = gray;
      dst[at + 1] = gray;
      dst[at + 2] = gray;
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function sobelMagnitude(src: Uint8ClampedArray, width: number, height: number, horizontal: boolean, vertical: boolean): Float32Array {
  const out = new Float32Array(width * height);
  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const lum = (x: number, y: number): number => {
    const cx = Math.min(width - 1, Math.max(0, x));
    const cy = Math.min(height - 1, Math.max(0, y));
    const at = (cy * width + cx) * 4;
    return luminance709(src[at] ?? 0, src[at + 1] ?? 0, src[at + 2] ?? 0);
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const w = lum(x + kx, y + ky);
          gx += w * (gxKernel[(ky + 1) * 3 + (kx + 1)] ?? 0);
          gy += w * (gyKernel[(ky + 1) * 3 + (kx + 1)] ?? 0);
        }
      }
      const mag = Math.sqrt((horizontal ? gx * gx : 0) + (vertical ? gy * gy : 0));
      out[y * width + x] = Math.min(255, mag / 4);
    }
  }
  return out;
}

function kernelSobel(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const direction = v["direction"];
  // "Horizontal" finds horizontal edges (Y gradient), "vertical" finds
  // vertical edges (X gradient).
  const useGx = direction !== "horizontal";
  const useGy = direction !== "vertical";
  const mag = sobelMagnitude(src, width, height, useGx, useGy);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0, p = 0; i < src.length; i += 4, p += 1) {
    const gray = clampByte(mag[p] ?? 0);
    dst[i] = gray;
    dst[i + 1] = gray;
    dst[i + 2] = gray;
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelNeon(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const radius = clampFloat(v["radius"], 1, 10, 3);
  const amount = clampFloat(v["amount"], 1, 100, 50) / 100;
  const edges = sobelMagnitude(src, width, height, true, true);
  const soft = new Float32Array(width * height);
  const r = Math.max(1, Math.round(radius));
  for (let y = 0; y < height; y += 1) {
    let acc = 0;
    for (let x = -r; x <= r; x += 1) {
      acc += edges[y * width + Math.min(width - 1, Math.max(0, x))] ?? 0;
    }
    for (let x = 0; x < width; x += 1) {
      soft[y * width + x] = acc / (r * 2 + 1);
      const outX = Math.min(width - 1, Math.max(0, x - r));
      const inX = Math.min(width - 1, Math.max(0, x + r + 1));
      acc += (edges[y * width + inX] ?? 0) - (edges[y * width + outX] ?? 0);
    }
  }
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0, p = 0; i < src.length; i += 4, p += 1) {
    const glow = (soft[p] ?? 0) * amount;
    const alpha = Math.min(1, ((src[i + 3] ?? 0) / 255 + glow / 255) * 1);
    dst[i] = clampByte((src[i] ?? 0) + glow);
    dst[i + 1] = clampByte((src[i + 1] ?? 0) + glow);
    dst[i + 2] = clampByte((src[i + 2] ?? 0) + glow);
    dst[i + 3] = clampByte(Math.max(src[i + 3] ?? 0, Math.min(255, alpha * 255)));
  }
  return dst;
}

function kernelRgbNoise(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const amount = clampFloat(v["amount"], 0, 100, 10);
  const mono = v["mono"] === true;
  const seed = clampInt(v["seed"], 1, 9999, 1);
  const rand = filterRandom(seed * 7919 + 13);
  const dst = new Uint8ClampedArray(src.length);
  const span = (amount / 100) * 255;
  for (let i = 0; i < src.length; i += 4) {
    const shared = (rand() * 2 - 1) * span;
    for (let c = 0; c < 3; c += 1) {
      const jitter = mono ? shared : (rand() * 2 - 1) * span;
      dst[i + c] = clampByte((src[i + c] ?? 0) + jitter);
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelPosterize(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const levels = Math.max(2, Math.round(clampFloat(v["levels"], 2, 32, 4)));
  const step = 255 / (levels - 1);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      dst[i + c] = clampByte(Math.round(((src[i + c] ?? 0) / 255) * (levels - 1)) * step);
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelThreshold(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const threshold = clampInt(v["threshold"], 0, 255, 128);
  const channel = v["channel"];
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const sample =
      channel === "red" ? r : channel === "green" ? g : channel === "blue" ? b : Math.round(luminance709(r, g, b));
    const on = sample >= threshold ? 255 : 0;
    dst[i] = on;
    dst[i + 1] = on;
    dst[i + 2] = on;
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelInvert(src: Uint8ClampedArray, _width: number, _height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = 255 - (src[i] ?? 0);
    dst[i + 1] = 255 - (src[i + 1] ?? 0);
    dst[i + 2] = 255 - (src[i + 2] ?? 0);
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelDesaturate(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const mode = v["mode"];
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const gray =
      mode === "luminance"
        ? Math.round(luminance709(r, g, b))
        : mode === "average"
          ? Math.round((r + g + b) / 3)
          : Math.round((Math.max(r, g, b) + Math.min(r, g, b)) / 2);
    dst[i] = gray;
    dst[i + 1] = gray;
    dst[i + 2] = gray;
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelColorToAlpha(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const target = parseFilterHexColor(v["color"]) ?? { r: 255, g: 255, b: 255 };
  const threshold = clampInt(v["threshold"], 0, 255, 0);
  const dst = new Uint8ClampedArray(src.length);
  const maxDist = Math.sqrt(3 * 255 * 255);
  for (let i = 0; i < src.length; i += 4) {
    const dr = (src[i] ?? 0) - target.r;
    const dg = (src[i + 1] ?? 0) - target.g;
    const db = (src[i + 2] ?? 0) - target.b;
    const dist = (Math.sqrt(dr * dr + dg * dg + db * db) / maxDist) * 255;
    if (dist <= threshold) {
      dst[i] = src[i] ?? 0;
      dst[i + 1] = src[i + 1] ?? 0;
      dst[i + 2] = src[i + 2] ?? 0;
      dst[i + 3] = 0;
    } else {
      const alpha = 255 * ((dist - threshold) / Math.max(1, 255 - threshold));
      dst[i] = src[i] ?? 0;
      dst[i + 1] = src[i + 1] ?? 0;
      dst[i + 2] = src[i + 2] ?? 0;
      dst[i + 3] = clampByte(Math.min(src[i + 3] ?? 0, alpha));
    }
  }
  return dst;
}

function rangeToneWeight(lum01: number, range: unknown): number {
  if (range === "shadows") {
    return Math.min(1, Math.max(0, (0.5 - lum01) * 2));
  }
  if (range === "highlights") {
    return Math.min(1, Math.max(0, (lum01 - 0.5) * 2));
  }
  return Math.min(1, Math.max(0, 1 - Math.abs(lum01 - 0.5) * 2));
}

/** Restore the original luminance after a per-pixel RGB shift (optional). */
function restoreLuminance(r: number, g: number, b: number, targetLum: number): [number, number, number] {
  const lum = luminance709(r, g, b) / 255;
  if (lum < 0.001) {
    return [clampByte(r), clampByte(g), clampByte(b)];
  }
  const scale = targetLum / lum;
  return [clampByte(r * scale), clampByte(g * scale), clampByte(b * scale)];
}

function kernelColorBalance(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const shift = (key: string): number => (clampFloat(v[key], -100, 100, 0) / 100) * 255;
  const cr = shift("cyanRed");
  const mg = shift("magentaGreen");
  const yb = shift("yellowBlue");
  const range = v["range"];
  const preserve = v["preserve"] === true;
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const lum = luminance709(r, g, b) / 255;
    const w = rangeToneWeight(lum, range);
    let out: [number, number, number] = [r + cr * w, g + mg * w, b + yb * w];
    if (preserve) {
      out = restoreLuminance(out[0], out[1], out[2], lum);
    } else {
      out = [clampByte(out[0]), clampByte(out[1]), clampByte(out[2])];
    }
    dst[i] = out[0];
    dst[i + 1] = out[1];
    dst[i + 2] = out[2];
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelChannelMixer(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const gain = (key: string, fallback: number): number => clampFloat(v[key], -200, 200, fallback) / 100;
  const m: number[] = [
    gain("rr", 100), gain("rg", 0), gain("rb", 0),
    gain("gr", 0), gain("gg", 100), gain("gb", 0),
    gain("br", 0), gain("bg", 0), gain("bb", 100),
  ];
  const preserve = v["preserve"] === true;
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const lum = luminance709(r, g, b) / 255;
    let out: [number, number, number] = [
      (m[0] ?? 0) * r + (m[1] ?? 0) * g + (m[2] ?? 0) * b,
      (m[3] ?? 0) * r + (m[4] ?? 0) * g + (m[5] ?? 0) * b,
      (m[6] ?? 0) * r + (m[7] ?? 0) * g + (m[8] ?? 0) * b,
    ];
    if (preserve) {
      out = restoreLuminance(out[0], out[1], out[2], lum);
    } else {
      out = [clampByte(out[0]), clampByte(out[1]), clampByte(out[2])];
    }
    dst[i] = out[0];
    dst[i + 1] = out[1];
    dst[i + 2] = out[2];
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function rgbToHsl01(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return [h / 6, s, l];
}

function hslToRgb255(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 1) + 1) % 1;
  const sat = Math.min(1, Math.max(0, s));
  const lit = Math.min(1, Math.max(0, l));
  if (sat === 0) {
    const gray = clampByte(lit * 255);
    return [gray, gray, gray];
  }
  const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat;
  const p = 2 * lit - q;
  const channel = (t: number): number => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) {
      return p + (q - p) * 6 * tt;
    }
    if (tt < 1 / 2) {
      return q;
    }
    if (tt < 2 / 3) {
      return p + (q - p) * (2 / 3 - tt) * 6;
    }
    return p;
  };
  return [clampByte(channel(hue + 1 / 3) * 255), clampByte(channel(hue) * 255), clampByte(channel(hue - 1 / 3) * 255)];
}

function kernelColorize(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const hue = clampFloat(v["hue"], 0, 360, 220) / 360;
  const sat = clampFloat(v["saturation"], 0, 100, 50) / 100;
  const light = clampFloat(v["lightness"], -100, 100, 0) / 100;
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const [, , l] = rgbToHsl01((src[i] ?? 0) / 255, (src[i + 1] ?? 0) / 255, (src[i + 2] ?? 0) / 255);
    const [r, g, b] = hslToRgb255(hue, sat, l + light);
    dst[i] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelSepia(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const t = clampFloat(v["scale"], 0, 100, 100) / 100;
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const sr = 0.393 * r + 0.769 * g + 0.189 * b;
    const sg = 0.349 * r + 0.686 * g + 0.168 * b;
    const sb = 0.272 * r + 0.534 * g + 0.131 * b;
    dst[i] = clampByte(r * (1 - t) + sr * t);
    dst[i + 1] = clampByte(g * (1 - t) + sg * t);
    dst[i + 2] = clampByte(b * (1 - t) + sb * t);
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelExposure(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const black = clampFloat(v["black"], 0, 100, 0) / 100;
  const stops = clampFloat(v["exposure"], -5, 5, 0);
  const gain = Math.pow(2, stops);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      dst[i + c] = clampByte((((src[i + c] ?? 0) / 255 - black) * gain) * 255);
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelSaturation(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const t = clampFloat(v["scale"], 0, 200, 100) / 100;
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const lum = luminance709(r, g, b);
    dst[i] = clampByte(lum + (r - lum) * t);
    dst[i + 1] = clampByte(lum + (g - lum) * t);
    dst[i + 2] = clampByte(lum + (b - lum) * t);
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelDodgeBurn(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const dodge = v["mode"] !== "burn";
  const e = clampFloat(v["exposure"], 0, 100, 50) / 100;
  const range = v["type"];
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const lum = luminance709(src[i] ?? 0, src[i + 1] ?? 0, src[i + 2] ?? 0) / 255;
    const w = rangeToneWeight(lum, range);
    for (let c = 0; c < 3; c += 1) {
      const orig = src[i + c] ?? 0;
      dst[i + c] = dodge ? clampByte(orig + (255 - orig) * e * w) : clampByte(orig * (1 - e * w));
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelAutoContrast(src: Uint8ClampedArray, _width: number, _height: number): Uint8ClampedArray {
  const lo = [255, 255, 255];
  const hi = [0, 0, 0];
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const value = src[i + c] ?? 0;
      if (value < (lo[c] ?? 255)) {
        lo[c] = value;
      }
      if (value > (hi[c] ?? 0)) {
        hi[c] = value;
      }
    }
  }
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const span = (hi[c] ?? 0) - (lo[c] ?? 0);
      dst[i + c] = span < 1 ? (src[i + c] ?? 0) : clampByte((((src[i + c] ?? 0) - (lo[c] ?? 0)) / span) * 255);
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelCartoon(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const strength = clampFloat(v["amount"], 0, 100, 50) / 100;
  const edges = sobelMagnitude(src, width, height, true, true);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0, p = 0; i < src.length; i += 4, p += 1) {
    const darken = strength * Math.min(1, (edges[p] ?? 0) / 255);
    dst[i] = clampByte((src[i] ?? 0) * (1 - darken));
    dst[i + 1] = clampByte((src[i + 1] ?? 0) * (1 - darken));
    dst[i + 2] = clampByte((src[i + 2] ?? 0) * (1 - darken));
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelLaplace(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  // Fixed 3x3 Laplacian: center 8, direct and diagonal neighbors -1.
  const dst = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const center = (src[at + c] ?? 0) * 8;
        let sides = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            if (kx === 0 && ky === 0) {
              continue;
            }
            sides += sampleClamped(src, width, height, x + kx, y + ky, c) as number;
          }
        }
        dst[at + c] = clampByte(Math.abs(center - sides));
      }
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function kernelDifferenceOfGaussians(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const r1 = clampFloat(v["radius1"], 0.5, 20, 1);
  const r2 = clampFloat(v["radius2"], 0.5, 20, 3);
  const soft1 = gaussianBlur(src, width, height, r1);
  const soft2 = gaussianBlur(src, width, height, r2);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      dst[i + c] = clampByte(128 + ((soft1[i + c] ?? 0) - (soft2[i + c] ?? 0)));
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelHurl(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const amount = clampFloat(v["amount"], 0, 100, 10) / 100;
  const neighbor = v["mode"] === "neighbor";
  const seed = clampInt(v["seed"], 1, 9999, 1);
  const rand = filterRandom(seed * 131 + 7);
  const dst = new Uint8ClampedArray(src);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rand() >= amount) {
        // Keep the RNG stream aligned whether or not this pixel is hit.
        rand();
        rand();
        rand();
        continue;
      }
      const at = (y * width + x) * 4;
      if (neighbor) {
        const ox = Math.floor(rand() * 5) - 2;
        const oy = Math.floor(rand() * 5) - 2;
        const cx = Math.min(width - 1, Math.max(0, x + ox));
        const cy = Math.min(height - 1, Math.max(0, y + oy));
        const from = (cy * width + cx) * 4;
        dst[at] = src[from] ?? 0;
        dst[at + 1] = src[from + 1] ?? 0;
        dst[at + 2] = src[from + 2] ?? 0;
      } else {
        dst[at] = Math.floor(rand() * 256);
        dst[at + 1] = Math.floor(rand() * 256);
        dst[at + 2] = Math.floor(rand() * 256);
      }
      rand();
    }
  }
  return dst;
}

function kernelSlopeOffsetPower(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  // ASC-CDL style: out = (in * slope + offset) ^ power, per channel.
  const slope = (key: string): number => clampFloat(v[key], 0, 2, 1);
  const offset = (key: string): number => clampFloat(v[key], -1, 1, 0);
  const power = (key: string): number => clampFloat(v[key], 0, 4, 1);
  const s = [slope("slopeR"), slope("slopeG"), slope("slopeB")];
  const o = [offset("offsetR"), offset("offsetG"), offset("offsetB")];
  const p = [power("powerR"), power("powerG"), power("powerB")];
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const x = Math.max(0, ((src[i + c] ?? 0) / 255) * (s[c] ?? 1) + (o[c] ?? 0));
      dst[i + c] = clampByte(Math.pow(x, p[c] ?? 1) * 255);
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelMonoMixer(src: Uint8ClampedArray, _width: number, _height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const gr = clampFloat(v["red"], 0, 100, 34) / 100;
  const gg = clampFloat(v["green"], 0, 100, 33) / 100;
  const gb = clampFloat(v["blue"], 0, 100, 33) / 100;
  const preserve = v["preserve"] === true;
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i] ?? 0;
    const g = src[i + 1] ?? 0;
    const b = src[i + 2] ?? 0;
    const gray = r * gr + g * gg + b * gb;
    if (preserve) {
      const [nr, ng, nb] = restoreLuminance(gray, gray, gray, luminance709(r, g, b) / 255);
      dst[i] = nr;
      dst[i + 1] = ng;
      dst[i + 2] = nb;
    } else {
      const rounded = clampByte(gray);
      dst[i] = rounded;
      dst[i + 1] = rounded;
      dst[i + 2] = rounded;
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelMaximizeChannel(src: Uint8ClampedArray, _width: number, _height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const top = Math.max(src[i] ?? 0, src[i + 1] ?? 0, src[i + 2] ?? 0);
    dst[i] = top;
    dst[i + 1] = top;
    dst[i + 2] = top;
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelMinimizeChannel(src: Uint8ClampedArray, _width: number, _height: number): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const low = Math.min(src[i] ?? 0, src[i + 1] ?? 0, src[i + 2] ?? 0);
    dst[i] = low;
    dst[i + 1] = low;
    dst[i + 2] = low;
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelNormalize(src: Uint8ClampedArray, _width: number, _height: number): Uint8ClampedArray {
  // Global stretch across all channels at once (unlike per-channel auto-contrast).
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const value = src[i + c] ?? 0;
      if (value < lo) {
        lo = value;
      }
      if (value > hi) {
        hi = value;
      }
    }
  }
  const dst = new Uint8ClampedArray(src.length);
  const span = hi - lo;
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      dst[i + c] = span < 1 ? (src[i + c] ?? 0) : clampByte((((src[i + c] ?? 0) - lo) / span) * 255);
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelBoxBlur(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const radius = Math.max(1, Math.round(clampFloat(v["radius"], 1, 50, 3)));
  const tmp = new Float32Array(width * height * 4);
  boxBlurPass(src, tmp, width, height, radius, true);
  const soft = new Float32Array(width * height * 4);
  boxBlurPass(tmp, soft, width, height, radius, false);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    dst[i] = clampByte(soft[i] ?? 0);
    dst[i + 1] = clampByte(soft[i + 1] ?? 0);
    dst[i + 2] = clampByte(soft[i + 2] ?? 0);
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelSnnMean(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  // Symmetric nearest neighbor: average the pair pixel closest to the center.
  const r = clampInt(v["radius"], 1, 5, 1);
  const pairs = [
    [-r, 0, r, 0],
    [0, -r, 0, r],
    [-r, -r, r, r],
    [-r, r, r, -r],
  ];
  const dst = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const center = src[at + c] ?? 0;
        let acc = 0;
        for (const [ax, ay, bx, by] of pairs) {
          const a = sampleClamped(src, width, height, x + (ax ?? 0), y + (ay ?? 0), c) as number;
          const b = sampleClamped(src, width, height, x + (bx ?? 0), y + (by ?? 0), c) as number;
          acc += Math.abs(a - center) <= Math.abs(b - center) ? a : b;
        }
        dst[at + c] = Math.round(acc / pairs.length);
      }
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function kernelHighPass(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const radius = clampFloat(v["radius"], 0.5, 20, 5);
  const contrast = clampFloat(v["contrast"], 1, 10, 5);
  const soft = gaussianBlur(src, width, height, radius);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      dst[i + c] = clampByte(128 + (((src[i + c] ?? 0) - (soft[i + c] ?? 0)) * contrast));
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelEmbossFixed(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const direction = v["direction"];
  const kernel =
    direction === "horizontal"
      ? [0, 0, 0, 1, 0, -1, 0, 0, 0]
      : direction === "vertical"
        ? [0, 1, 0, 0, 0, 0, 0, -1, 0]
        : [-1, -1, 0, -1, 0, 1, 0, 1, 1];
  const lum = (x: number, y: number): number => {
    const cx = Math.min(width - 1, Math.max(0, x));
    const cy = Math.min(height - 1, Math.max(0, y));
    const at = (cy * width + cx) * 4;
    return luminance709(src[at] ?? 0, src[at + 1] ?? 0, src[at + 2] ?? 0);
  };
  const dst = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          acc += lum(x + kx, y + ky) * (kernel[(ky + 1) * 3 + (kx + 1)] ?? 0);
        }
      }
      const at = (y * width + x) * 4;
      const gray = clampByte(128 + acc);
      dst[at] = gray;
      dst[at + 1] = gray;
      dst[at + 2] = gray;
      dst[at + 3] = src[at + 3] ?? 0;
    }
  }
  return dst;
}

function kernelAntialias(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  // Selective smoothing: blend toward a soft blur only where pixels differ
  // from their neighborhood (flat areas pass through untouched).
  const soft = gaussianBlur(src, width, height, 1);
  const dst = new Uint8ClampedArray(src.length);
  for (let i = 0, p = 0; i < src.length; i += 4, p += 1) {
    const lum = luminance709(src[i] ?? 0, src[i + 1] ?? 0, src[i + 2] ?? 0);
    const softLum = luminance709(soft[i] ?? 0, soft[i + 1] ?? 0, soft[i + 2] ?? 0);
    const mask = Math.min(1, Math.abs(lum - softLum) / 32);
    for (let c = 0; c < 3; c += 1) {
      dst[i + c] = clampByte((src[i + c] ?? 0) * (1 - mask) + (soft[i + c] ?? 0) * mask);
    }
    dst[i + 3] = src[i + 3] ?? 0;
  }
  return dst;
}

function kernelRoundCorners(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const requested = Math.max(1, Math.round(clampFloat(v["radius"], 1, 128, 16)));
  const r = Math.min(requested, Math.floor(Math.min(width, height) / 2));
  const dst = new Uint8ClampedArray(src);
  const cut = (x: number, y: number, cx: number, cy: number): boolean => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy > r * r;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      const outside =
        (x < r && y < r && cut(x, y, r, r)) ||
        (x >= width - r && y < r && cut(x, y, width - 1 - r, r)) ||
        (x < r && y >= height - r && cut(x, y, r, height - 1 - r)) ||
        (x >= width - r && y >= height - r && cut(x, y, width - 1 - r, height - 1 - r));
      if (outside) {
        dst[at + 3] = 0;
      }
    }
  }
  return dst;
}

function kernelVideoDegradation(src: Uint8ClampedArray, width: number, height: number, v: GnumarusFilterValues): Uint8ClampedArray {
  const pattern = v["pattern"];
  const strength = clampFloat(v["strength"], 0, 100, 50) / 100;
  const shift = Math.round(strength * 4);
  const dst = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      if (pattern === "shift") {
        const from = (y * width + Math.min(width - 1, Math.max(0, x - shift))) * 4;
        dst[at] = src[from] ?? 0;
        dst[at + 1] = src[from + 1] ?? 0;
        dst[at + 2] = src[from + 2] ?? 0;
        dst[at + 3] = src[from + 3] ?? 0;
      } else {
        const hit = pattern === "checker" ? (x + y) % 2 === 1 : y % 2 === 1;
        const t = hit ? strength : 0;
        dst[at] = clampByte((src[at] ?? 0) * (1 - t));
        dst[at + 1] = clampByte((src[at + 1] ?? 0) * (1 - t));
        dst[at + 2] = clampByte((src[at + 2] ?? 0) * (1 - t));
        dst[at + 3] = src[at + 3] ?? 0;
      }
    }
  }
  return dst;
}

/** Filter registry: id, theme, title, hint, and dialog params. */
export const GNUMARUS_FILTERS: GnumarusFilterDef[] = [
  {
    id: "gaussian-blur",
    title: "Gaussian Blur",
    hint: "Softens the image with a gaussian blur (separable triple box approximation).",
    theme: "blur",
    params: [{ key: "radius", kind: "number", label: "Radius", hint: "Blur radius in pixels.", min: 0.5, max: 50, step: 0.5, def: 2 }],
  },
  {
    id: "motion-blur",
    title: "Motion Blur",
    hint: "Smears pixels along a direction, like camera motion.",
    theme: "blur",
    params: [
      { key: "angle", kind: "number", label: "Angle", hint: "Smear direction in degrees.", min: 0, max: 360, step: 1, def: 0 },
      { key: "length", kind: "number", label: "Length", hint: "Smear length in pixels.", min: 1, max: 100, step: 1, def: 10 },
    ],
  },
  {
    id: "pixelize",
    title: "Pixelize",
    hint: "Downsamples the image into flat blocks.",
    theme: "blur",
    params: [{ key: "size", kind: "number", label: "Block size", hint: "Block edge in pixels.", min: 2, max: 128, step: 1, def: 8 }],
  },
  {
    id: "unsharp-mask",
    title: "Unsharp Mask",
    hint: "Sharpens by adding back blurred detail above a threshold.",
    theme: "enhance",
    params: [
      { key: "radius", kind: "number", label: "Radius", hint: "Detail scale in pixels.", min: 0.5, max: 20, step: 0.5, def: 2 },
      { key: "amount", kind: "number", label: "Amount (%)", hint: "How much detail to add back.", min: 0, max: 500, step: 1, def: 100 },
      { key: "threshold", kind: "number", label: "Threshold", hint: "Ignore differences below this (0-255).", min: 0, max: 255, step: 1, def: 0 },
    ],
  },
  { id: "sharpen", title: "Sharpen", hint: "Fixed 3x3 sharpening kernel.", theme: "enhance", params: [] },
  {
    id: "despeckle",
    title: "Despeckle",
    hint: "Median filter: removes speckle noise while keeping edges.",
    theme: "enhance",
    params: [{ key: "radius", kind: "number", label: "Radius", hint: "Neighborhood radius in pixels.", min: 1, max: 5, step: 1, def: 1 }],
  },
  {
    id: "oilify",
    title: "Oil Paint",
    hint: "Replaces each pixel with its neighborhood's dominant tone.",
    theme: "artistic",
    params: [
      { key: "size", kind: "number", label: "Brush size", hint: "Neighborhood half-size in pixels.", min: 1, max: 8, step: 1, def: 3 },
      { key: "levels", kind: "number", label: "Intensity levels", hint: "Tone buckets for the histogram.", min: 8, max: 64, step: 1, def: 24 },
    ],
  },
  {
    id: "emboss",
    title: "Emboss",
    hint: "Relief shading from a directional light.",
    theme: "artistic",
    params: [
      { key: "depth", kind: "number", label: "Depth", hint: "Relief strength.", min: 1, max: 30, step: 1, def: 10 },
      { key: "azimuth", kind: "number", label: "Azimuth", hint: "Light direction in degrees.", min: 0, max: 360, step: 1, def: 135 },
    ],
  },
  {
    id: "sobel",
    title: "Sobel Edges",
    hint: "Edge magnitude as grayscale (transparent stays transparent).",
    theme: "edge",
    params: [
      {
        key: "direction",
        kind: "enum",
        label: "Direction",
        hint: "Which edges to detect.",
        def: "both",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
          { value: "both", label: "Both" },
        ],
      },
    ],
  },
  {
    id: "neon",
    title: "Neon Edges",
    hint: "Adds a soft edge glow on top of the image.",
    theme: "edge",
    params: [
      { key: "radius", kind: "number", label: "Glow radius", hint: "Glow spread in pixels.", min: 1, max: 10, step: 1, def: 3 },
      { key: "amount", kind: "number", label: "Amount (%)", hint: "Glow strength.", min: 1, max: 100, step: 1, def: 50 },
    ],
  },
  {
    id: "rgb-noise",
    title: "RGB Noise",
    hint: "Adds deterministic random grain (same seed replays).",
    theme: "noise",
    params: [
      { key: "amount", kind: "number", label: "Amount (%)", hint: "Noise strength.", min: 0, max: 100, step: 1, def: 10 },
      { key: "mono", kind: "boolean", label: "Monochrome", hint: "Same jitter on all channels.", def: true },
      { key: "seed", kind: "number", label: "Seed", hint: "Random seed.", min: 1, max: 9999, step: 1, def: 1 },
    ],
  },
  {
    id: "posterize",
    title: "Posterize",
    hint: "Reduces each channel to a fixed number of tones.",
    theme: "colors",
    params: [{ key: "levels", kind: "number", label: "Levels", hint: "Tones per channel.", min: 2, max: 32, step: 1, def: 4 }],
  },
  {
    id: "threshold",
    title: "Threshold",
    hint: "Binarizes the image around a channel value.",
    theme: "colors",
    params: [
      { key: "threshold", kind: "number", label: "Threshold", hint: "Cutoff value (0-255).", min: 0, max: 255, step: 1, def: 128 },
      {
        key: "channel",
        kind: "enum",
        label: "Channel",
        hint: "Channel to compare.",
        def: "luminance",
        options: [
          { value: "luminance", label: "Luminance" },
          { value: "red", label: "Red" },
          { value: "green", label: "Green" },
          { value: "blue", label: "Blue" },
        ],
      },
    ],
  },
  { id: "invert", title: "Invert", hint: "Inverts RGB, keeps alpha.", theme: "colors", params: [] },
  {
    id: "desaturate",
    title: "Desaturate",
    hint: "Converts to grayscale.",
    theme: "colors",
    params: [
      {
        key: "mode",
        kind: "enum",
        label: "Mode",
        hint: "Grayscale formula.",
        def: "luminance",
        options: [
          { value: "luminance", label: "Luminance (BT.709)" },
          { value: "lightness", label: "Lightness" },
          { value: "average", label: "Average" },
        ],
      },
    ],
  },
  {
    id: "color-to-alpha",
    title: "Color to Alpha",
    hint: "Makes a color transparent proportionally to its distance.",
    theme: "colors",
    params: [
      { key: "color", kind: "text", label: "Color", hint: "Hex color to remove (e.g. #ffffff).", def: "#ffffff" },
      { key: "threshold", kind: "number", label: "Threshold", hint: "Fully transparent below this distance.", min: 0, max: 255, step: 1, def: 0 },
    ],
  },
  {
    id: "color-balance",
    title: "Color Balance",
    hint: "Shifts cyan/red, magenta/green and yellow/blue in one tonal range.",
    theme: "colors",
    params: [
      {
        key: "range",
        kind: "enum",
        label: "Range",
        hint: "Which tones to adjust.",
        def: "midtones",
        options: [
          { value: "shadows", label: "Shadows" },
          { value: "midtones", label: "Midtones" },
          { value: "highlights", label: "Highlights" },
        ],
      },
      { key: "cyanRed", kind: "number", label: "Cyan-Red", hint: "Negative is cyan, positive is red.", min: -100, max: 100, step: 1, def: 0 },
      { key: "magentaGreen", kind: "number", label: "Magenta-Green", hint: "Negative is magenta, positive is green.", min: -100, max: 100, step: 1, def: 0 },
      { key: "yellowBlue", kind: "number", label: "Yellow-Blue", hint: "Negative is yellow, positive is blue.", min: -100, max: 100, step: 1, def: 0 },
      { key: "preserve", kind: "boolean", label: "Preserve luminosity", hint: "Keep the original brightness.", def: true },
    ],
  },
  {
    id: "channel-mixer",
    title: "Channel Mixer",
    hint: "Rebuilds each channel as a weighted mix of the three channels.",
    theme: "colors",
    params: [
      { key: "rr", kind: "number", label: "Red from red (%)", hint: "Red channel weight in the red output.", min: -200, max: 200, step: 1, def: 100 },
      { key: "rg", kind: "number", label: "Red from green (%)", hint: "Green channel weight in the red output.", min: -200, max: 200, step: 1, def: 0 },
      { key: "rb", kind: "number", label: "Red from blue (%)", hint: "Blue channel weight in the red output.", min: -200, max: 200, step: 1, def: 0 },
      { key: "gr", kind: "number", label: "Green from red (%)", hint: "Red channel weight in the green output.", min: -200, max: 200, step: 1, def: 0 },
      { key: "gg", kind: "number", label: "Green from green (%)", hint: "Green channel weight in the green output.", min: -200, max: 200, step: 1, def: 100 },
      { key: "gb", kind: "number", label: "Green from blue (%)", hint: "Blue channel weight in the green output.", min: -200, max: 200, step: 1, def: 0 },
      { key: "br", kind: "number", label: "Blue from red (%)", hint: "Red channel weight in the blue output.", min: -200, max: 200, step: 1, def: 0 },
      { key: "bg", kind: "number", label: "Blue from green (%)", hint: "Green channel weight in the blue output.", min: -200, max: 200, step: 1, def: 0 },
      { key: "bb", kind: "number", label: "Blue from blue (%)", hint: "Blue channel weight in the blue output.", min: -200, max: 200, step: 1, def: 100 },
      { key: "preserve", kind: "boolean", label: "Preserve luminosity", hint: "Keep the original brightness.", def: true },
    ],
  },
  {
    id: "colorize",
    title: "Colorize",
    hint: "Paints the image with one hue at a chosen saturation.",
    theme: "colors",
    params: [
      { key: "hue", kind: "number", label: "Hue", hint: "Color hue in degrees.", min: 0, max: 360, step: 1, def: 220 },
      { key: "saturation", kind: "number", label: "Saturation (%)", hint: "Color intensity.", min: 0, max: 100, step: 1, def: 50 },
      { key: "lightness", kind: "number", label: "Lightness shift", hint: "Brightness offset.", min: -100, max: 100, step: 1, def: 0 },
    ],
  },
  {
    id: "sepia",
    title: "Sepia",
    hint: "Aged-photo brown tone, blendable with the original.",
    theme: "colors",
    params: [{ key: "scale", kind: "number", label: "Amount (%)", hint: "How much sepia to apply.", min: 0, max: 100, step: 1, def: 100 }],
  },
  {
    id: "exposure",
    title: "Exposure",
    hint: "Lifts the black point and applies an exposure gain in stops.",
    theme: "colors",
    params: [
      { key: "black", kind: "number", label: "Black point (%)", hint: "Input level mapped to black.", min: 0, max: 100, step: 1, def: 0 },
      { key: "exposure", kind: "number", label: "Exposure (stops)", hint: "Gain in f-stops.", min: -5, max: 5, step: 0.1, def: 0 },
    ],
  },
  {
    id: "saturation",
    title: "Saturation",
    hint: "Scales color intensity around gray (0 is grayscale).",
    theme: "colors",
    params: [{ key: "scale", kind: "number", label: "Scale (%)", hint: "100 keeps the image unchanged.", min: 0, max: 200, step: 1, def: 100 }],
  },
  {
    id: "dodge-burn",
    title: "Dodge and Burn",
    hint: "Lightens (dodge) or darkens (burn) one tonal range.",
    theme: "colors",
    params: [
      {
        key: "mode",
        kind: "enum",
        label: "Mode",
        hint: "Lighten or darken.",
        def: "dodge",
        options: [
          { value: "dodge", label: "Dodge" },
          { value: "burn", label: "Burn" },
        ],
      },
      {
        key: "type",
        kind: "enum",
        label: "Range",
        hint: "Which tones to adjust.",
        def: "midtones",
        options: [
          { value: "shadows", label: "Shadows" },
          { value: "midtones", label: "Midtones" },
          { value: "highlights", label: "Highlights" },
        ],
      },
      { key: "exposure", kind: "number", label: "Exposure (%)", hint: "Effect strength.", min: 0, max: 100, step: 1, def: 50 },
    ],
  },
  { id: "auto-contrast", title: "Auto Contrast", hint: "Stretches each channel to use the full 0-255 range.", theme: "colors", params: [] },
  {
    id: "cartoon",
    title: "Cartoon",
    hint: "Darkens edges so the image looks hand-inked.",
    theme: "artistic",
    params: [{ key: "amount", kind: "number", label: "Amount (%)", hint: "How dark the edges get.", min: 0, max: 100, step: 1, def: 50 }],
  },
  { id: "laplace", title: "Laplace Edges", hint: "Fixed 3x3 second-derivative edge detection.", theme: "edge", params: [] },
  {
    id: "difference-of-gaussians",
    title: "Difference of Gaussians",
    hint: "Subtracts two blurs: fine detail on mid-gray.",
    theme: "edge",
    params: [
      { key: "radius1", kind: "number", label: "Radius 1", hint: "Detail blur in pixels.", min: 0.5, max: 20, step: 0.5, def: 1 },
      { key: "radius2", kind: "number", label: "Radius 2", hint: "Background blur in pixels.", min: 0.5, max: 20, step: 0.5, def: 3 },
    ],
  },
  {
    id: "hurl",
    title: "Hurl",
    hint: "Scatters random pixels (same seed replays).",
    theme: "noise",
    params: [
      {
        key: "mode",
        kind: "enum",
        label: "Mode",
        hint: "Random colors or random neighbors.",
        def: "random",
        options: [
          { value: "random", label: "Random colors" },
          { value: "neighbor", label: "Random neighbors" },
        ],
      },
      { key: "amount", kind: "number", label: "Amount (%)", hint: "How many pixels to replace.", min: 0, max: 100, step: 1, def: 10 },
      { key: "seed", kind: "number", label: "Seed", hint: "Random seed.", min: 1, max: 9999, step: 1, def: 1 },
    ],
  },
  {
    id: "slope-offset-power",
    title: "Slope, Offset, Power",
    hint: "ASC-CDL grading: out = (in * slope + offset) ^ power, per channel.",
    theme: "colors",
    params: [
      { key: "slopeR", kind: "number", label: "Slope red", hint: "Red multiplier.", min: 0, max: 2, step: 0.01, def: 1 },
      { key: "slopeG", kind: "number", label: "Slope green", hint: "Green multiplier.", min: 0, max: 2, step: 0.01, def: 1 },
      { key: "slopeB", kind: "number", label: "Slope blue", hint: "Blue multiplier.", min: 0, max: 2, step: 0.01, def: 1 },
      { key: "offsetR", kind: "number", label: "Offset red", hint: "Red lift.", min: -1, max: 1, step: 0.01, def: 0 },
      { key: "offsetG", kind: "number", label: "Offset green", hint: "Green lift.", min: -1, max: 1, step: 0.01, def: 0 },
      { key: "offsetB", kind: "number", label: "Offset blue", hint: "Blue lift.", min: -1, max: 1, step: 0.01, def: 0 },
      { key: "powerR", kind: "number", label: "Power red", hint: "Red gamma.", min: 0, max: 4, step: 0.01, def: 1 },
      { key: "powerG", kind: "number", label: "Power green", hint: "Green gamma.", min: 0, max: 4, step: 0.01, def: 1 },
      { key: "powerB", kind: "number", label: "Power blue", hint: "Blue gamma.", min: 0, max: 4, step: 0.01, def: 1 },
    ],
  },
  {
    id: "mono-mixer",
    title: "Mono Mixer",
    hint: "Mixes the three channels into one gray value.",
    theme: "colors",
    params: [
      { key: "red", kind: "number", label: "Red (%)", hint: "Red channel weight.", min: 0, max: 100, step: 1, def: 34 },
      { key: "green", kind: "number", label: "Green (%)", hint: "Green channel weight.", min: 0, max: 100, step: 1, def: 33 },
      { key: "blue", kind: "number", label: "Blue (%)", hint: "Blue channel weight.", min: 0, max: 100, step: 1, def: 33 },
      { key: "preserve", kind: "boolean", label: "Preserve luminosity", hint: "Keep the original brightness.", def: true },
    ],
  },
  { id: "maximize-channel", title: "Maximize Channel", hint: "Sets every channel to the brightest of the three.", theme: "colors", params: [] },
  { id: "minimize-channel", title: "Minimize Channel", hint: "Sets every channel to the darkest of the three.", theme: "colors", params: [] },
  { id: "normalize", title: "Normalize", hint: "Stretches all channels together to use the full 0-255 range.", theme: "colors", params: [] },
  {
    id: "box-blur",
    title: "Box Blur",
    hint: "Single-pass mean blur (harsher than gaussian).",
    theme: "blur",
    params: [{ key: "radius", kind: "number", label: "Radius", hint: "Blur radius in pixels.", min: 1, max: 50, step: 1, def: 3 }],
  },
  {
    id: "snn-mean",
    title: "SNN Mean",
    hint: "Symmetric nearest-neighbor smoothing that keeps edges.",
    theme: "enhance",
    params: [{ key: "radius", kind: "number", label: "Radius", hint: "Neighborhood radius in pixels.", min: 1, max: 5, step: 1, def: 1 }],
  },
  {
    id: "high-pass",
    title: "High Pass",
    hint: "Keeps only fine detail on mid-gray.",
    theme: "enhance",
    params: [
      { key: "radius", kind: "number", label: "Radius", hint: "Detail cutoff in pixels.", min: 0.5, max: 20, step: 0.5, def: 5 },
      { key: "contrast", kind: "number", label: "Contrast", hint: "Detail boost.", min: 1, max: 10, step: 1, def: 5 },
    ],
  },
  {
    id: "emboss-fixed",
    title: "Fixed Emboss",
    hint: "Classic fixed 3x3 relief kernels.",
    theme: "edge",
    params: [
      {
        key: "direction",
        kind: "enum",
        label: "Direction",
        hint: "Relief orientation.",
        def: "all",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
          { value: "all", label: "All directions" },
        ],
      },
    ],
  },
  { id: "antialias", title: "Antialias", hint: "Smooths only pixels that differ from their neighborhood.", theme: "enhance", params: [] },
  {
    id: "round-corners",
    title: "Round Corners",
    hint: "Cuts transparent rounded corners.",
    theme: "decor",
    params: [{ key: "radius", kind: "number", label: "Radius", hint: "Corner radius in pixels.", min: 1, max: 128, step: 1, def: 16 }],
  },
  {
    id: "video-degradation",
    title: "Video Degradation",
    hint: "Retro video artifacts: scanlines, checker or shifted rows.",
    theme: "decor",
    params: [
      {
        key: "pattern",
        kind: "enum",
        label: "Pattern",
        hint: "Artifact style.",
        def: "scanlines",
        options: [
          { value: "scanlines", label: "Scanlines" },
          { value: "checker", label: "Checkerboard" },
          { value: "shift", label: "Shifted lines" },
        ],
      },
      { key: "strength", kind: "number", label: "Strength (%)", hint: "Artifact intensity.", min: 0, max: 100, step: 1, def: 50 },
    ],
  },
];

export function getFilterDef(id: string): GnumarusFilterDef | undefined {
  return GNUMARUS_FILTERS.find((def) => def.id === id);
}

/** Run a filter kernel over a full buffer with validated params. */
export function runFilterKernel(
  id: string,
  src: Uint8ClampedArray,
  width: number,
  height: number,
  values: GnumarusFilterValues,
): Uint8ClampedArray | null {
  const def = getFilterDef(id);
  if (def === undefined || width < 1 || height < 1 || src.length !== width * height * 4) {
    return null;
  }
  const v = normalizeFilterValues(def, values);
  switch (id) {
    case "gaussian-blur":
      return kernelGaussianBlur(src, width, height, v);
    case "motion-blur":
      return kernelMotionBlur(src, width, height, v);
    case "pixelize":
      return kernelPixelize(src, width, height, v);
    case "unsharp-mask":
      return kernelUnsharpMask(src, width, height, v);
    case "sharpen":
      return kernelSharpen(src, width, height);
    case "despeckle":
      return kernelDespeckle(src, width, height, v);
    case "oilify":
      return kernelOilify(src, width, height, v);
    case "emboss":
      return kernelEmboss(src, width, height, v);
    case "sobel":
      return kernelSobel(src, width, height, v);
    case "neon":
      return kernelNeon(src, width, height, v);
    case "rgb-noise":
      return kernelRgbNoise(src, width, height, v);
    case "posterize":
      return kernelPosterize(src, width, height, v);
    case "threshold":
      return kernelThreshold(src, width, height, v);
    case "invert":
      return kernelInvert(src, width, height);
    case "desaturate":
      return kernelDesaturate(src, width, height, v);
    case "color-to-alpha":
      return kernelColorToAlpha(src, width, height, v);
    case "color-balance":
      return kernelColorBalance(src, width, height, v);
    case "channel-mixer":
      return kernelChannelMixer(src, width, height, v);
    case "colorize":
      return kernelColorize(src, width, height, v);
    case "sepia":
      return kernelSepia(src, width, height, v);
    case "exposure":
      return kernelExposure(src, width, height, v);
    case "saturation":
      return kernelSaturation(src, width, height, v);
    case "dodge-burn":
      return kernelDodgeBurn(src, width, height, v);
    case "auto-contrast":
      return kernelAutoContrast(src, width, height);
    case "cartoon":
      return kernelCartoon(src, width, height, v);
    case "laplace":
      return kernelLaplace(src, width, height);
    case "difference-of-gaussians":
      return kernelDifferenceOfGaussians(src, width, height, v);
    case "hurl":
      return kernelHurl(src, width, height, v);
    case "slope-offset-power":
      return kernelSlopeOffsetPower(src, width, height, v);
    case "mono-mixer":
      return kernelMonoMixer(src, width, height, v);
    case "maximize-channel":
      return kernelMaximizeChannel(src, width, height);
    case "minimize-channel":
      return kernelMinimizeChannel(src, width, height);
    case "normalize":
      return kernelNormalize(src, width, height);
    case "box-blur":
      return kernelBoxBlur(src, width, height, v);
    case "snn-mean":
      return kernelSnnMean(src, width, height, v);
    case "high-pass":
      return kernelHighPass(src, width, height, v);
    case "emboss-fixed":
      return kernelEmbossFixed(src, width, height, v);
    case "antialias":
      return kernelAntialias(src, width, height);
    case "round-corners":
      return kernelRoundCorners(src, width, height, v);
    case "video-degradation":
      return kernelVideoDegradation(src, width, height, v);
    default:
      return null;
  }
}
