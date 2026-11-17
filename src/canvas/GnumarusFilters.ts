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

export type GnumarusFilterTheme = "blur" | "enhance" | "artistic" | "edge" | "noise" | "colors";

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
    default:
      return null;
  }
}
