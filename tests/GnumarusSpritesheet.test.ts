import { describe, expect, it } from "vitest";
import {
  composeSheet,
  computeSheetGeometry,
  GNUMARUS_SHEET_LAYOUTS,
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
    const line = computeSheetGeometry(strips([0, 1], [2]), "line", 1);
    expect(line.cols).toBe(3);
    expect(line.rows).toBe(1);
    expect(line.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 1, row: 0, frame: 1 },
      { col: 2, row: 0, frame: 2 },
    ]);
    const column = computeSheetGeometry(strips([0, 1], [2]), "column", 1);
    expect(column.cols).toBe(1);
    expect(column.rows).toBe(3);
    expect(column.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 0, row: 1, frame: 1 },
      { col: 0, row: 2, frame: 2 },
    ]);
  });

  it("keeps one animation per line or column with ragged edges", () => {
    const perLine = computeSheetGeometry(strips([0, 1], [2]), "per-line", 1);
    expect(perLine.cols).toBe(2);
    expect(perLine.rows).toBe(2);
    expect(perLine.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 1, row: 0, frame: 1 },
      { col: 0, row: 1, frame: 2 },
    ]);
    const perColumn = computeSheetGeometry(strips([0, 1], [2]), "per-column", 1);
    expect(perColumn.cols).toBe(2);
    expect(perColumn.rows).toBe(2);
    expect(perColumn.cells).toEqual([
      { col: 0, row: 0, frame: 0 },
      { col: 0, row: 1, frame: 1 },
      { col: 1, row: 0, frame: 2 },
    ]);
  });

  it("packs 40 frames into 6 columns and 7 rows", () => {
    const frames = Array.from({ length: 40 }, (_, index) => index);
    const packed = computeSheetGeometry(strips(frames), "packed", 1);
    expect(packed.cols).toBe(6);
    expect(packed.rows).toBe(7);
    expect(packed.cells).toHaveLength(40);
    expect(packed.cells[6]).toEqual({ col: 0, row: 1, frame: 6 });
    expect(packed.cells[39]).toEqual({ col: 3, row: 6, frame: 39 });
  });

  it("sizes fixed lines and columns to fit every frame", () => {
    const frames = [0, 1, 2, 3, 4];
    const rows = computeSheetGeometry(strips(frames), "fixed-rows", 2);
    expect(rows.rows).toBe(2);
    expect(rows.cols).toBe(3);
    // Column-major fill: frames run down each column first.
    expect(rows.cells.map((cell) => cell.frame)).toEqual([0, 1, 2, 3, 4]);
    expect(rows.cells[2]).toEqual({ col: 1, row: 0, frame: 2 });
    const cols = computeSheetGeometry(strips(frames), "fixed-cols", 3);
    expect(cols.cols).toBe(3);
    expect(cols.rows).toBe(2);
    expect(cols.cells[3]).toEqual({ col: 0, row: 1, frame: 3 });
  });

  it("rejects empty strips and bad fixed counts", () => {
    expect(() => computeSheetGeometry([], "line", 1)).toThrow(/at least one frame/);
    expect(() => computeSheetGeometry(strips([]), "packed", 1)).toThrow(/at least one frame/);
    expect(() => computeSheetGeometry(strips([0]), "fixed-rows", 0)).toThrow(/line count/);
    expect(() => computeSheetGeometry(strips([0]), "fixed-cols", -2)).toThrow(/column count/);
    expect(() => computeSheetGeometry(strips([0]), "fixed-rows", Number.NaN)).toThrow(/line count/);
  });

  it("blits frames side by side with exact pixels", () => {
    const geometry = computeSheetGeometry(strips([0, 1]), "line", 1);
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
    const geometry = computeSheetGeometry(strips([0, 1], [2]), "per-line", 1);
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
    const geometry = computeSheetGeometry(strips([0, 1]), "line", 1);
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
});
