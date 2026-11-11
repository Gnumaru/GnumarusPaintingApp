/**
 * Rasterize laid-out rich text onto a 2D canvas at the requested scale.
 * Browser-only (needs a real canvas); layout itself stays canvas-free.
 */
import { GNUMARUS_TEXT_RASTER_SCALE, type GnumarusTextEntry } from "./GnumarusText";
import { layoutTextDocument, parseTextDocument, textRunFont, type GnumarusLaidOutText } from "./GnumarusTextLayout";

export interface GnumarusRasterizedText {
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}

/** Layout the entry's HTML with canvas metrics (for sizing and raster). */
export function measureTextDocument(
  entry: GnumarusTextEntry,
  measure: (text: string, font: string) => number,
  maxWidth = 4096,
): GnumarusLaidOutText {
  return layoutTextDocument(parseTextDocument(entry.document.html), measure, maxWidth);
}

/**
 * Rasterize laid-out text. Returns null for empty layouts or invalid
 * contexts; dimensions are layout pixels times the raster scale.
 */
export function rasterizeLaidOutText(
  context: CanvasRenderingContext2D,
  laidOut: GnumarusLaidOutText,
  scale = GNUMARUS_TEXT_RASTER_SCALE,
): GnumarusRasterizedText | null {
  const width = Math.max(1, Math.round(laidOut.width * scale));
  const height = Math.max(1, Math.round(laidOut.height * scale));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null;
  }
  context.clearRect(0, 0, width, height);
  context.textBaseline = "alphabetic";
  for (const line of laidOut.lines) {
    for (const run of line.runs) {
      if (run.text === "") {
        continue;
      }
      const fontSize = run.fontSize * scale;
      context.font = textRunFont({ ...run, fontSize });
      context.fillStyle = run.color;
      const x = run.x * scale;
      // Baseline sits one full line height below the line top.
      const y = (line.y + line.height) * scale;
      context.fillText(run.text, x, y);
      if (run.underline) {
        const underlineY = Math.round(y + Math.max(1, fontSize / 12));
        context.fillRect(x, underlineY, run.width * scale, Math.max(1, scale));
      }
    }
  }
  const image = context.getImageData(0, 0, width, height);
  return { width, height, buffer: new Uint8ClampedArray(image.data) };
}
