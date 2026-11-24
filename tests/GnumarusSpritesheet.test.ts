import { describe, expect, it } from "vitest";
import {
  buildPackedSheetAnimationData,
  buildSheetAnimationData,
  composePackedSheet,
  composeSheet,
  computeSheetGeometry,
  cropPixels,
  frameContentBox,
  GNUMARUS_SHEET_LAYOUTS,
  packSheetRects,
  uniformCropBox,
  type GnumarusSheetPacking,
  type GnumarusSheetStrip,
} from "../src/export/GnumarusSpritesheet";

function strips(...lists: number[][]): GnumarusSheetStrip[] {
  return lists.map((frames) => ({ frames }));
}

function solidFrame(width: number, height: number, value: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 4] = value;
    pixels[i * 4 + 1] = value;
    pixels[i * 4 + 2] = value;
    pixels[i * 4 + 3] = 255;
  }
  return pixels;
}

describe("GnumarusSpritesheet", () => {
  it("lists all seven sheet layouts", () => {
    expect(GNUMARUS_SHEET_LAYOUTS.map((entry) => entry.value)).toEqual([
      "line",
      "column",
      "per-line",
      "per-column",
      "packed",
      "fixed-rows",
      "fixed-cols",
    ]);
  });

  it("lays flat strips in one line or one column", () => {
    const line = computeSheetGeometry(strips([0, 1], [2]), "line", 1, true);
    expect(line.cols).toBe(3);
    expect(line.rows).toBe(1);
    expect(line.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 1, row: 0, frame: 1 },
      { col: 2, row: 0, frame: 2 },
    ]);
    const column = computeSheetGeometry(strips([0, 1], [2]), "column", 1, true);
    expect(column.cols).toBe(1);
    expect(column.rows).toBe(3);
    expect(column.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 0, row: 1, frame: 1 },
      { col: 0, row: 2, frame: 2 },
    ]);
  });

  it("keeps one animation per line or column with ragged edges", () => {
    const perLine = computeSheetGeometry(strips([0, 1], [2]), "per-line", 1, true);
    expect(perLine.cols).toBe(2);
    expect(perLine.rows).toBe(2);
    expect(perLine.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 1, row: 0, frame: 1 },
      { col: 0, row: 1, frame: 2 },
    ]);
    const perColumn = computeSheetGeometry(strips([0, 1], [2]), "per-column", 1, true);
    expect(perColumn.cols).toBe(2);
    expect(perColumn.rows).toBe(2);
    expect(perColumn.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 0, row: 1, frame: 1 },
      { col: 1, row: 0, frame: 2 },
    ]);
  });

  it("packs 40 frames into 6 columns and 7 rows when narrow", () => {
    const frames = Array.from({ length: 40 }, (_, index) => index);
    const packed = computeSheetGeometry(strips(frames), "packed", 1, false);
    expect(packed.cols).toBe(6);
    expect(packed.rows).toBe(7);
    expect(packed.cells).toHaveLength(40);
    expect(packed.cells[6]).toEqual({ col: 0, row: 1, frame: 6 });
    expect(packed.cells[39]).toEqual({ col: 3, row: 6, frame: 39 });
  });

  it("packs wide by rounding the column count up", () => {
    const frames = Array.from({ length: 40 }, (_, index) => index);
    const packed = computeSheetGeometry(strips(frames), "packed", 1, true);
    expect(packed.cols).toBe(7);
    expect(packed.rows).toBe(6);
    expect(packed.cells).toHaveLength(40);
    expect(packed.cells[7]).toEqual({ col: 0, row: 1, frame: 7 });
    expect(packed.cells[39]).toEqual({ col: 4, row: 5, frame: 39 });
    // 1..3 frames: a single column when narrow, two columns when wide.
    expect(computeSheetGeometry(strips([0]), "packed", 1, false)).toMatchObject({ cols: 1, rows: 1 });
    expect(computeSheetGeometry(strips([0]), "packed", 1, true)).toMatchObject({ cols: 1, rows: 1 });
    expect(computeSheetGeometry(strips([0, 1, 2]), "packed", 1, false)).toMatchObject({ cols: 1, rows: 3 });
    expect(computeSheetGeometry(strips([0, 1, 2]), "packed", 1, true)).toMatchObject({ cols: 2, rows: 2 });
  });

  it("sizes fixed lines and columns to fit every frame", () => {
    const frames = [0, 1, 2, 3, 4];
    const rows = computeSheetGeometry(strips(frames), "fixed-rows", 2, true);
    expect(rows.rows).toBe(2);
    expect(rows.cols).toBe(3);
    // Column-major fill: frames run down each column first.
    expect(rows.cells.map((cell) => cell.frame)).toEqual([0, 1, 2, 3, 4]);
    expect(rows.cells[2]).toEqual({ col: 1, row: 0, frame: 2 });
    const cols = computeSheetGeometry(strips(frames), "fixed-cols", 3, true);
    expect(cols.cols).toBe(3);
    expect(cols.rows).toBe(2);
    expect(cols.cells[3]).toEqual({ col: 0, row: 1, frame: 3 });
  });

  it("treats the fixed count as a maximum unless full size is ensured", () => {
    // One frame in a 9-column grid: exact grid when ensured, single cell otherwise.
    const full = computeSheetGeometry(strips([0]), "fixed-cols", 9, true, true);
    expect(full).toMatchObject({ cols: 9, rows: 1 });
    expect(full.cells).toHaveLength(1);
    const maxed = computeSheetGeometry(strips([0]), "fixed-cols", 9, true, false);
    expect(maxed).toMatchObject({ cols: 1, rows: 1 });
    // Same for lines: 1 frame in 10 lines shrinks to one cell by default.
    const fullRows = computeSheetGeometry(strips([0]), "fixed-rows", 10, true, true);
    expect(fullRows).toMatchObject({ cols: 1, rows: 10 });
    const maxedRows = computeSheetGeometry(strips([0]), "fixed-rows", 10, true);
    expect(maxedRows).toMatchObject({ cols: 1, rows: 1 });
    // Partial grids still round up the open side in both modes.
    expect(computeSheetGeometry(strips([0, 1, 2]), "fixed-cols", 5, true, true)).toMatchObject({
      cols: 5,
      rows: 1,
    });
    expect(computeSheetGeometry(strips([0, 1, 2]), "fixed-cols", 5, true, false)).toMatchObject({
      cols: 3,
      rows: 1,
    });
  });

  it("rejects empty strips and bad fixed counts", () => {
    expect(() => computeSheetGeometry([], "line", 1, true)).toThrow(/at least one frame/);
    expect(() => computeSheetGeometry(strips([]), "packed", 1, true)).toThrow(/at least one frame/);
    expect(() => computeSheetGeometry(strips([0]), "fixed-rows", 0, true)).toThrow(/line count/);
    expect(() => computeSheetGeometry(strips([0]), "fixed-cols", -2, true)).toThrow(/column count/);
    expect(() => computeSheetGeometry(strips([0]), "fixed-rows", Number.NaN, true)).toThrow(/line count/);
  });

  it("blits frames side by side with exact pixels", () => {
    const geometry = computeSheetGeometry(strips([0, 1]), "line", 1, true);
    const frames = new Map([
      [0, solidFrame(2, 2, 10)],
      [1, solidFrame(2, 2, 200)],
    ]);
    const sheet = composeSheet(frames, geometry, 2, 2);
    expect(sheet.width).toBe(4);
    expect(sheet.height).toBe(2);
    // Left frame pixels.
    expect(Array.from(sheet.buffer.slice(0, 4))).toEqual([10, 10, 10, 255]);
    // Right frame pixels start at x=2.
    expect(Array.from(sheet.buffer.slice(8, 12))).toEqual([200, 200, 200, 255]);
  });

  it("leaves ragged cells transparent", () => {
    const geometry = computeSheetGeometry(strips([0, 1], [2]), "per-line", 1, true);
    const frames = new Map([
      [0, solidFrame(1, 1, 10)],
      [1, solidFrame(1, 1, 20)],
      [2, solidFrame(1, 1, 30)],
    ]);
    const sheet = composeSheet(frames, geometry, 1, 1);
    expect(sheet.width).toBe(2);
    expect(sheet.height).toBe(2);
    expect(Array.from(sheet.buffer)).toEqual([
      10, 10, 10, 255, 20, 20, 20, 255,
      30, 30, 30, 255, 0, 0, 0, 0,
    ]);
  });

  it("rejects missing or mis-sized frame pixels", () => {
    const geometry = computeSheetGeometry(strips([0, 1]), "line", 1, true);
    expect(() => composeSheet(new Map([[0, solidFrame(2, 2, 1)]]), geometry, 2, 2)).toThrow(
      /Missing pixels/,
    );
    expect(() =>
      composeSheet(
        new Map([
          [0, solidFrame(2, 2, 1)],
          [1, solidFrame(3, 3, 1)],
        ]),
        geometry,
        2,
        2,
      ),
    ).toThrow(/Invalid pixels/);
    expect(() => composeSheet(new Map(), geometry, 0, 2)).toThrow(/frame size/);
    expect(() => composeSheet(new Map(), { cols: 0, rows: 1, cells: [] }, 2, 2)).toThrow(/geometry/);
  });

  it("builds the animation-data sidecar with 1-based frames", () => {
    const geometry = computeSheetGeometry(strips([0, 1, 2]), "line", 1, true);
    const data = buildSheetAnimationData({
      sheetWidth: 48,
      sheetHeight: 16,
      frameWidth: 16,
      frameHeight: 16,
      cells: geometry.cells,
      animations: [
        {
          name: "walk",
          sequence: [
            { frame: 0, secs: 0.2 },
            { frame: 1, secs: 0.25 },
            { frame: 0, secs: 0.2 },
          ],
        },
      ],
    });
    expect(data).toEqual({
      texture: { w: 48, h: 16 },
      frames: {
        "1": { x: 0, y: 0, w: 16, h: 16, ox: 0, oy: 0 },
        "2": { x: 16, y: 0, w: 16, h: 16, ox: 0, oy: 0 },
        "3": { x: 32, y: 0, w: 16, h: 16, ox: 0, oy: 0 },
      },
      animations: {
        walk: {
          name: "walk",
          frames: [
            { frame: 1, secs: 0.2 },
            { frame: 2, secs: 0.25 },
            { frame: 1, secs: 0.2 },
          ],
        },
      },
    });
    expect(() => JSON.parse(JSON.stringify(data))).not.toThrow();
  });

  it("keeps the first cell when a frame repeats and allows empty animations", () => {
    const data = buildSheetAnimationData({
      sheetWidth: 32,
      sheetHeight: 16,
      frameWidth: 16,
      frameHeight: 16,
      cells: [
        { col: 0, row: 0, frame: 0 },
        { col: 1, row: 0, frame: 1 },
        { col: 0, row: 1, frame: 0 },
      ],
      animations: [],
    });
    expect(data.frames).toEqual({
      "1": { x: 0, y: 0, w: 16, h: 16, ox: 0, oy: 0 },
      "2": { x: 16, y: 0, w: 16, h: 16, ox: 0, oy: 0 },
    });
    expect(data.animations).toEqual({});
  });

  it("rejects degenerate frame sizes for the sidecar", () => {
    expect(() =>
      buildSheetAnimationData({
        sheetWidth: 16,
        sheetHeight: 16,
        frameWidth: 0,
        frameHeight: 16,
        cells: [],
        animations: [],
      }),
    ).toThrow(/frame size/);
  });

  it("stores per-frame crop offsets in the sidecar, defaulting to zero", () => {
    const geometry = computeSheetGeometry(strips([0, 1]), "line", 1, true);
    const data = buildSheetAnimationData({
      sheetWidth: 32,
      sheetHeight: 16,
      frameWidth: 16,
      frameHeight: 16,
      cells: geometry.cells,
      animations: [],
      offsets: { "1": { ox: 3, oy: 4 }, "2": { ox: 3, oy: 4 } },
    });
    expect(data.frames).toEqual({
      "1": { x: 0, y: 0, w: 16, h: 16, ox: 3, oy: 4 },
      "2": { x: 16, y: 0, w: 16, h: 16, ox: 3, oy: 4 },
    });
  });
});

/** Opaque rect frame: transparent everywhere except [x0..x1]x[y0..y1]. */
function rectFrame(width: number, height: number, x0: number, y0: number, x1: number, y1: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

/** Packing invariant: every rect inside the bin and pairwise disjoint. */
function expectValidPacking(packing: GnumarusSheetPacking, rects: Array<{ frame: number; w: number; h: number }>): void {
  expect(packing.placements).toHaveLength(rects.length);
  const byFrame = new Map(packing.placements.map((placement) => [placement.frame, placement]));
  for (const rect of rects) {
    const placement = byFrame.get(rect.frame);
    expect(placement).toBeDefined();
    expect(placement?.w).toBe(rect.w);
    expect(placement?.h).toBe(rect.h);
    expect(placement?.x).toBeGreaterThanOrEqual(0);
    expect(placement?.y).toBeGreaterThanOrEqual(0);
    expect((placement?.x ?? 0) + (placement?.w ?? 0)).toBeLessThanOrEqual(packing.width);
    expect((placement?.y ?? 0) + (placement?.h ?? 0)).toBeLessThanOrEqual(packing.height);
  }
  for (let i = 0; i < packing.placements.length; i += 1) {
    for (let j = i + 1; j < packing.placements.length; j += 1) {
      const a = packing.placements[i] as { x: number; y: number; w: number; h: number };
      const b = packing.placements[j] as { x: number; y: number; w: number; h: number };
      const overlap =
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      expect(overlap).toBe(false);
    }
  }
}

describe("GnumarusSpritesheetTrim", () => {
  it("finds the tight box of non-transparent pixels", () => {
    expect(frameContentBox(new Uint8ClampedArray(10 * 10 * 4), 10, 10)).toBeNull();
    expect(frameContentBox(solidFrame(10, 10, 7), 10, 10)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
    expect(frameContentBox(rectFrame(10, 10, 2, 3, 2, 3), 10, 10)).toEqual({ x: 2, y: 3, w: 1, h: 1 });
    expect(frameContentBox(rectFrame(10, 10, 1, 2, 4, 6), 10, 10)).toEqual({ x: 1, y: 2, w: 4, h: 5 });
    // A single transparent hole does not split the box.
    const pixels = solidFrame(4, 4, 9);
    pixels[(1 * 4 + 1) * 4 + 3] = 0;
    expect(frameContentBox(pixels, 4, 4)).toEqual({ x: 0, y: 0, w: 4, h: 4 });
    expect(() => frameContentBox(new Uint8ClampedArray(8), 2, 2)).toThrow(/Invalid pixels/);
  });

  it("unions content boxes across frames for uniform trim", () => {
    // The spec example: 100x100 project, frame one opaque from (1,1) to
    // (98,98), frame two opaque from (50,50) to (98,98). The smallest crop
    // holding both is 98x98 at offset (1,1).
    const first = frameContentBox(rectFrame(100, 100, 1, 1, 98, 98), 100, 100);
    const second = frameContentBox(rectFrame(100, 100, 50, 50, 98, 98), 100, 100);
    expect(first).toEqual({ x: 1, y: 1, w: 98, h: 98 });
    expect(second).toEqual({ x: 50, y: 50, w: 49, h: 49 });
    expect(uniformCropBox([first, second], 100, 100)).toEqual({ x: 1, y: 1, w: 98, h: 98 });
    // Transparent frames contribute nothing; all-empty keeps the frame.
    expect(uniformCropBox([null, second], 100, 100)).toEqual({ x: 50, y: 50, w: 49, h: 49 });
    expect(uniformCropBox([null, null], 100, 100)).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    expect(() => uniformCropBox([], 0, 100)).toThrow(/frame size/);
  });

  it("crops full-frame pixels to a box with exact bytes", () => {
    const pixels = rectFrame(10, 10, 1, 2, 4, 6);
    const cropped = cropPixels(pixels, 10, { x: 1, y: 2, w: 4, h: 5 });
    expect(cropped).toHaveLength(4 * 5 * 4);
    expect(Array.from(cropped.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(() => cropPixels(pixels, 10, { x: 8, y: 8, w: 4, h: 4 })).toThrow(/crop box/);
    expect(() => cropPixels(new Uint8ClampedArray(10), 10, { x: 0, y: 0, w: 1, h: 1 })).toThrow(/pixels/);
  });

  it("packs four squares into their optimal 20x20 texture", () => {
    const rects = [0, 1, 2, 3].map((frame) => ({ frame, w: 10, h: 10 }));
    const packing = packSheetRects(rects);
    expect(packing.width * packing.height).toBe(400);
    expectValidPacking(packing, rects);
  });

  it("packs the two uniform-trim frames without overlap", () => {
    const rects = [
      { frame: 0, w: 98, h: 98 },
      { frame: 1, w: 49, h: 49 },
    ];
    const packing = packSheetRects(rects);
    expectValidPacking(packing, rects);
    const area = packing.width * packing.height;
    expect(area).toBeLessThanOrEqual(98 * 196);
    expect(area).toBeGreaterThanOrEqual(98 * 98 + 49 * 49);
  });

  it("never packs worse than a shelf and stays deterministic", () => {
    const rects = [
      { frame: 0, w: 60, h: 20 },
      { frame: 1, w: 30, h: 40 },
      { frame: 2, w: 25, h: 25 },
      { frame: 3, w: 10, h: 70 },
      { frame: 4, w: 45, h: 15 },
    ];
    const shelfArea = 60 * (20 + 40 + 25 + 70 + 15);
    const packing = packSheetRects(rects);
    expectValidPacking(packing, rects);
    expect(packing.width * packing.height).toBeLessThanOrEqual(shelfArea);
    expect(packSheetRects(rects)).toEqual(packing);
  });

  it("packs 200 rects inside the time budget with a valid result", () => {
    let seed = 123456789;
    const next = (max: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return 1 + (seed % max);
    };
    const rects = Array.from({ length: 200 }, (_, frame) => ({ frame, w: next(120), h: next(120) }));
    const started = Date.now();
    const packing = packSheetRects(rects, 1500);
    expect(Date.now() - started).toBeLessThan(2000);
    expectValidPacking(packing, rects);
  });

  it("rejects bad pack rects and handles the empty set", () => {
    expect(packSheetRects([])).toEqual({ width: 0, height: 0, placements: [] });
    expect(() => packSheetRects([{ frame: 0, w: 0, h: 5 }])).toThrow(/pack rect/);
    expect(() => packSheetRects([{ frame: 0, w: 2.5, h: 5 }])).toThrow(/pack rect/);
  });

  it("blits packed crops at their placements", () => {
    const packing = packSheetRects([
      { frame: 0, w: 2, h: 1 },
      { frame: 1, w: 1, h: 2 },
    ]);
    const frames = new Map([
      { frame: 0, entry: { pixels: solidFrame(2, 1, 10), w: 2, h: 1 } },
      { frame: 1, entry: { pixels: solidFrame(1, 2, 200), w: 1, h: 2 } },
    ].map(({ frame, entry }) => [frame, entry] as const));
    const sheet = composePackedSheet(frames, packing);
    expect(sheet.width).toBe(packing.width);
    expect(sheet.height).toBe(packing.height);
    // Every placed pixel round-trips through the texture.
    for (const placement of packing.placements) {
      const entry = frames.get(placement.frame) as { pixels: Uint8ClampedArray; w: number; h: number };
      for (let y = 0; y < placement.h; y += 1) {
        for (let x = 0; x < placement.w; x += 1) {
          const expected = Array.from(entry.pixels.slice((y * placement.w + x) * 4, (y * placement.w + x) * 4 + 4));
          const actual = Array.from(
            sheet.buffer.slice(
              ((placement.y + y) * sheet.width + placement.x + x) * 4,
              ((placement.y + y) * sheet.width + placement.x + x) * 4 + 4,
            ),
          );
          expect(actual).toEqual(expected);
        }
      }
    }
    expect(() => composePackedSheet(new Map(), packing)).toThrow(/Missing pixels/);
    expect(() => composePackedSheet(frames, { width: 0, height: 4, placements: [] })).toThrow(/packed spritesheet size/);
  });

  it("builds the packed sidecar with per-frame sizes and offsets", () => {
    const data = buildPackedSheetAnimationData({
      sheetWidth: 147,
      sheetHeight: 98,
      placements: [
        { frame: 0, x: 0, y: 0, w: 98, h: 98, ox: 1, oy: 1 },
        { frame: 1, x: 98, y: 0, w: 49, h: 49, ox: 50, oy: 50 },
      ],
      animations: [{ name: "spin", sequence: [{ frame: 1, secs: 0.5 }, { frame: 0, secs: 0.5 }] }],
    });
    expect(data.texture).toEqual({ w: 147, h: 98 });
    expect(data.frames).toEqual({
      "1": { x: 0, y: 0, w: 98, h: 98, ox: 1, oy: 1 },
      "2": { x: 98, y: 0, w: 49, h: 49, ox: 50, oy: 50 },
    });
    expect(data.animations.spin?.frames).toEqual([
      { frame: 2, secs: 0.5 },
      { frame: 1, secs: 0.5 },
    ]);
    expect(() => buildPackedSheetAnimationData({ sheetWidth: 0, sheetHeight: 8, placements: [], animations: [] })).toThrow(
      /packed spritesheet size/,
    );
  });
});
