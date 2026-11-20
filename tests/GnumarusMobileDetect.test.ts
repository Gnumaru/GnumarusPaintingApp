import { describe, expect, it } from "vitest";
import {
  isPhoneUserAgent,
  isTabletUserAgent,
  loadUiModeOverride,
  resolveUiMode,
  saveUiModeOverride,
} from "../src/mobile/GnumarusMobileDetect";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const DESKTOP_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

describe("isTabletUserAgent", () => {
  it("flags tablets (which keep the desktop UI)", () => {
    expect(isTabletUserAgent(IPAD_UA)).toBe(true);
    expect(isTabletUserAgent(ANDROID_TABLET_UA)).toBe(true);
    expect(isTabletUserAgent(IPHONE_UA)).toBe(false);
    expect(isTabletUserAgent(ANDROID_PHONE_UA)).toBe(false);
    expect(isTabletUserAgent(DESKTOP_UA)).toBe(false);
    expect(isTabletUserAgent(null)).toBe(false);
    expect(isTabletUserAgent("")).toBe(false);
  });
});

describe("isPhoneUserAgent", () => {
  it("flags phones but never tablets", () => {
    expect(isPhoneUserAgent(IPHONE_UA)).toBe(true);
    expect(isPhoneUserAgent(ANDROID_PHONE_UA)).toBe(true);
    expect(isPhoneUserAgent(ANDROID_TABLET_UA)).toBe(false);
    expect(isPhoneUserAgent(IPAD_UA)).toBe(false);
    expect(isPhoneUserAgent(DESKTOP_UA)).toBe(false);
    expect(isPhoneUserAgent(IPAD_DESKTOP_UA)).toBe(false);
  });
});

describe("resolveUiMode", () => {
  it("prefers the explicit override above every signal", () => {
    expect(resolveUiMode({ override: "mobile", userAgent: DESKTOP_UA })).toBe("mobile");
    expect(resolveUiMode({ override: "desktop", userAgent: IPHONE_UA })).toBe("desktop");
  });

  it("keeps tablets on desktop even with a mobile client hint", () => {
    expect(
      resolveUiMode({ override: "auto", userAgent: ANDROID_TABLET_UA, clientHintMobile: true }),
    ).toBe("desktop");
  });

  it("uses Client Hints, then phone UA, then desktop fallback", () => {
    expect(resolveUiMode({ userAgent: IPHONE_UA })).toBe("mobile");
    expect(resolveUiMode({ userAgent: ANDROID_PHONE_UA })).toBe("mobile");
    expect(resolveUiMode({ userAgent: DESKTOP_UA })).toBe("desktop");
    expect(resolveUiMode({})).toBe("desktop");
    expect(resolveUiMode({ clientHintMobile: false, userAgent: IPHONE_UA })).toBe("mobile");
  });
});

describe("ui mode override storage", () => {
  function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
      getItem: (key: string): string | null => data.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        data.set(key, value);
      },
      removeItem: (key: string): void => {
        data.delete(key);
      },
      clear: (): void => {
        data.clear();
      },
      key: (index: number): string | null => [...data.keys()][index] ?? null,
      get length(): number {
        return data.size;
      },
    };
  }

  it("round-trips mobile/desktop/auto", () => {
    const storage = memoryStorage();
    expect(loadUiModeOverride(storage)).toBe("auto");
    saveUiModeOverride("mobile", storage);
    expect(loadUiModeOverride(storage)).toBe("mobile");
    saveUiModeOverride("desktop", storage);
    expect(loadUiModeOverride(storage)).toBe("desktop");
    saveUiModeOverride("auto", storage);
    expect(loadUiModeOverride(storage)).toBe("auto");
  });
});
