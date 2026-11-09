import { expect, test } from "@playwright/test";

interface JxlTestCodec {
  jxl_decode_js(data: Uint8Array): { ok: boolean; width?: number; height?: number; buffer?: Uint8Array };
  jxl_encode_js(pixels: Uint8Array, w: number, h: number, lossless: boolean, quality: number): {
    ok: boolean;
    data?: Uint8Array;
  };
}

/**
 * Browser smoke test for the Emscripten libjxl module: loads the real
 * .js + .wasm in Chromium, round-trips RGBA losslessly and rejects
 * garbage. This guards the bundling/serving path (MIME, locateFile),
 * which unit tests cannot cover.
 */
test("jxl codec round-trips pixels in the browser", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("gnumarus-shell canvas");
  const result = await page.evaluate(async (): Promise<{ ok: boolean; diff?: number; badOk?: boolean }> => {
    const shimUrl = "/src/codec/jxl/jxl_shim.js";
    const ns: unknown = await import(/* @vite-ignore */ shimUrl);
    const factory = (ns as { default: (overrides?: { wasmBinary?: Uint8Array }) => Promise<JxlTestCodec> }).default;
    const wasm = new Uint8Array(await (await fetch("/src/codec/jxl/jxl_shim.wasm")).arrayBuffer());
    const codec = await factory({ wasmBinary: wasm });
    const pixels = new Uint8Array(8 * 8 * 4);
    for (let i = 0; i < pixels.length; i += 1) {
      pixels[i] = (i * 7 + 3) % 256;
    }
    const encoded = codec.jxl_encode_js(pixels, 8, 8, true, 90);
    if (!encoded.ok || !(encoded.data instanceof Uint8Array)) {
      return { ok: false };
    }
    const decoded = codec.jxl_decode_js(encoded.data);
    if (!decoded.ok || decoded.width !== 8 || decoded.height !== 8 || !(decoded.buffer instanceof Uint8Array)) {
      return { ok: false };
    }
    let diff = 0;
    for (let i = 0; i < pixels.length; i += 1) {
      diff += Math.abs((pixels[i] ?? 0) - (decoded.buffer[i] ?? 0));
    }
    const bad = codec.jxl_decode_js(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    return { ok: true, diff, badOk: bad.ok };
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.diff).toBe(0);
    expect(result.badOk).toBe(false);
  }
});
