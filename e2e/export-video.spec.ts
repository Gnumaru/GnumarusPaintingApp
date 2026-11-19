import { expect, test } from "@playwright/test";
import { addFrames, loadBlankProject, paintLayerRect, stubSaveFilePicker } from "./e2e-helpers";

async function exportAnimatedVideo(
  page: import("@playwright/test").Page,
  format: "webm-video" | "mkv-video" | "mp4-video",
): Promise<{ fileName: string | null; type: string; bytes: number[] }> {
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Export animation" }).click();
  await dialog.locator("select#exportAnimatedFormat").selectOption(format);
  await dialog.locator("#exportAnimatedOk").click();
  await expect(page.locator("gnumarus-shell")).toContainText("Exported");
  const result = await page.evaluate(() => {
    const root = window as unknown as { __gnumarusExportTest?: { fileName: string | null; blob: Blob | null } };
    const state = root.__gnumarusExportTest;
    if (state?.blob == null) {
      return null;
    }
    return state.blob.arrayBuffer().then((buffer) => ({
      fileName: state.fileName,
      type: state.blob?.type ?? "",
      bytes: Array.from(new Uint8Array(buffer)),
    }));
  });
  expect(result).not.toBeNull();
  return result as { fileName: string | null; type: string; bytes: number[] };
}

async function paintSolidFrames(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await addFrames(page, 1);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
  await page.locator('gnumarus-shell [data-testid="anim-frame"][data-frame="1"]').click();
  await paintLayerRect(page, "#0000ff", 0, 0, 63, 63);
}

/** Pixels of a single-frame export sampled at the ended state. Headless
 * Chromium only hands drawable frames to canvas readback once playback
 * settles, so the ended frame is the deterministic sampling point (two
 * red/blue frames verified red [254,0,0] here; multi-frame order is
 * covered by structural asserts plus ffprobe decode, see PLAN 220). */
async function endedFrameAverage(page: import("@playwright/test").Page, bytes: number[], mime: string): Promise<[number, number, number]> {
  return page.evaluate(async ([data, type]: [number[], string]) => {
    const blob = new Blob([new Uint8Array(data)], { type });
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    document.body.appendChild(video);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("no first frame")), 15000);
        video.addEventListener("loadeddata", () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
        video.addEventListener("error", () => {
          window.clearTimeout(timer);
          reject(new Error("video error"));
        }, { once: true });
      });
      await video.play().catch(() => undefined);
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => resolve(), 10000);
        video.addEventListener("ended", () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (context === null) {
        throw new Error("no 2d context");
      }
      context.drawImage(video, 0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return [pixel[0] as number, pixel[1] as number, pixel[2] as number];
    } finally {
      video.remove();
      URL.revokeObjectURL(url);
    }
  }, [bytes, mime] as [number[], string]);
}

/** Browser-decoded metadata for an exported video blob. */
async function videoMetadata(page: import("@playwright/test").Page, bytes: number[], mime: string): Promise<{ width: number; height: number; duration: number }> {
  return page.evaluate(async ([data, type]: [number[], string]) => {
    const blob = new Blob([new Uint8Array(data)], { type });
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    document.body.appendChild(video);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("no metadata")), 15000);
        video.addEventListener("loadedmetadata", () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
        video.addEventListener("error", () => {
          window.clearTimeout(timer);
          reject(new Error("video error"));
        }, { once: true });
      });
      return { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
    } finally {
      video.remove();
      URL.revokeObjectURL(url);
    }
  }, [bytes, mime] as [number[], string]);
}

async function paintSingleRedFrame(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await paintLayerRect(page, "#ff0000", 0, 0, 63, 63);
}

test("animated export dialog lists the video formats @recent", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  await loadBlankProject(page, 64);
  await stubSaveFilePicker(page);
  await page.getByRole("button", { name: "File" }).click();
  await page.locator('gnumarus-shell .menubar .dropdown').getByRole("button", { name: "Export" }).click();
  const dialog = page.locator("gnumarus-shell dialog#exportDialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Export animation" }).click();
  const format = dialog.locator("select#exportAnimatedFormat");
  await expect(format.locator('option[value="webm-video"]')).toHaveText("WebM video");
  await expect(format.locator('option[value="mkv-video"]')).toHaveText("MKV video");
  await expect(format.locator('option[value="mp4-video"]')).toHaveText("MP4 video");
  const support = await page.evaluate(() => {
    const w = window as unknown as { VideoEncoder?: { isConfigSupported(c: { codec: string; width?: number; height?: number; bitrate?: number; framerate?: number }): Promise<{ supported: boolean }> } };
    if (typeof w.VideoEncoder === "undefined") {
      return { vp9: false, avc: false };
    }
    return Promise.all([
      w.VideoEncoder.isConfigSupported({ codec: "vp09.00.41.08", width: 64, height: 64, bitrate: 1000000, framerate: 30 }).then((r) => r.supported).catch(() => false),
      w.VideoEncoder.isConfigSupported({ codec: "avc1.42E028", width: 64, height: 64, bitrate: 1000000, framerate: 30 }).then((r) => r.supported).catch(() => false),
    ]).then(([vp9, avc]) => ({ vp9, avc }));
  });
  if (support.vp9) {
    await expect(format.locator('option[value="webm-video"]')).toBeEnabled();
    await expect(format.locator('option[value="mkv-video"]')).toBeEnabled();
  } else {
    await expect(format.locator('option[value="webm-video"]')).toBeDisabled();
    await expect(format.locator('option[value="mkv-video"]')).toBeDisabled();
  }
  if (support.avc) {
    await expect(format.locator('option[value="mp4-video"]')).toBeEnabled();
  } else {
    await expect(format.locator('option[value="mp4-video"]')).toBeDisabled();
  }
});

test("webm animation exports playable video with the right frames @recent", async ({ page }) => {
  await paintSolidFrames(page);
  const webm = await exportAnimatedVideo(page, "webm-video");
  expect(webm.fileName).toMatch(/\.webm$/);
  expect(webm.type).toBe("video/webm");
  // EBML magic + webm DocType.
  expect(webm.bytes.slice(0, 4)).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  expect(webm.bytes.length).toBeGreaterThan(100);
  const meta = await videoMetadata(page, webm.bytes, "video/webm");
  expect(meta.width).toBe(64);
  expect(meta.height).toBe(64);
  expect(meta.duration).toBeGreaterThan(0.2);
  // Pixel proof on a single red frame (ended state is the deterministic
  // sampling point in headless Chromium; red/blue order via ffprobe).
  await paintSingleRedFrame(page);
  const red = await exportAnimatedVideo(page, "webm-video");
  const [r, g, b] = await endedFrameAverage(page, red.bytes, "video/webm");
  expect(r).toBeGreaterThan(150);
  expect(g).toBeLessThan(120);
  expect(b).toBeLessThan(120);
});

test("mp4 animation exports a valid fragmented mp4 @recent", async ({ page }) => {
  await paintSolidFrames(page);
  const mp4 = await exportAnimatedVideo(page, "mp4-video");
  expect(mp4.fileName).toMatch(/\.mp4$/);
  expect(mp4.type).toBe("video/mp4");
  const view = new DataView(new Uint8Array(mp4.bytes).buffer);
  expect(mp4.bytes[4]).toBe(0x66);
  expect(mp4.bytes[5]).toBe(0x74);
  expect(mp4.bytes[6]).toBe(0x79);
  expect(mp4.bytes[7]).toBe(0x70);
  // Box walk stays inside the file and finds moov + a single mdat.
  let at = 0;
  const types: string[] = [];
  while (at + 8 <= mp4.bytes.length) {
    const size = view.getUint32(at);
    if (size < 8 || at + size > mp4.bytes.length) {
      break;
    }
    types.push(String.fromCharCode(mp4.bytes[at + 4] as number, mp4.bytes[at + 5] as number, mp4.bytes[at + 6] as number, mp4.bytes[at + 7] as number));
    at += size;
  }
  expect(at).toBe(mp4.bytes.length);
  expect(types).toEqual(["ftyp", "moov", "mdat"]);
  const meta = await videoMetadata(page, mp4.bytes, "video/mp4");
  expect(meta.width).toBe(64);
  expect(meta.height).toBe(64);
  expect(meta.duration).toBeGreaterThan(0.2);
  await paintSingleRedFrame(page);
  const red = await exportAnimatedVideo(page, "mp4-video");
  const [r, g, b] = await endedFrameAverage(page, red.bytes, "video/mp4");
  expect(r).toBeGreaterThan(150);
  expect(g).toBeLessThan(120);
  expect(b).toBeLessThan(120);
});

test("mkv animation exports a valid matroska @recent", async ({ page }) => {
  await paintSolidFrames(page);
  const mkv = await exportAnimatedVideo(page, "mkv-video");
  expect(mkv.fileName).toMatch(/\.mkv$/);
  expect(mkv.type).toBe("video/x-matroska");
  expect(mkv.bytes.slice(0, 4)).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  const text = String.fromCharCode(...mkv.bytes.slice(0, 64));
  expect(text).toContain("matroska");
});
