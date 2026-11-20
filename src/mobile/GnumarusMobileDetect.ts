/**
 * Mobile/desktop UI mode detection.
 *
 * Phones get the touch-optimized mobile shell; tablets count as desktop (by
 * product decision: an iPad with keyboard/mouse and a desktop UA should keep
 * the full interface). Detection is layered because no single signal is
 * reliable on its own: an explicit user override wins, then Client Hints,
 * then UA tokens, and anything ambiguous falls back to desktop.
 */

export type GnumarusUiMode = "desktop" | "mobile";

export const UI_MODE_STORAGE_KEY = "gnumarus.uiMode";

export type GnumarusUiModeOverride = "auto" | GnumarusUiMode;

/** Signals available for mode resolution (kept injectable for unit tests). */
export interface GnumarusUiModeSignals {
  /** Stored user override ("auto" = follow detection). */
  override?: string | null;
  /** `navigator.userAgentData.mobile`, when the browser exposes Client Hints. */
  clientHintMobile?: boolean;
  /** Full `navigator.userAgent` string. */
  userAgent?: string;
  /** `navigator.maxTouchPoints` (0 = no touch screen). */
  maxTouchPoints?: number;
}

/** UA fragments that identify tablets/desktops (never mobile, even with touch). */
const TABLET_TOKENS = [
  "ipad",
  "tablet",
  "sm-t", // Samsung Galaxy Tab (SM-Txxx)
  "sm-x", // Samsung Galaxy Tab (SM-Xxxx)
  "sm-p", // Samsung Galaxy Note tablets (SM-Pxxx)
  "kfapwi", // Kindle Fire
  "silk", // Silk browser (Fire tablets)
  "playbook",
  "kindle",
  "nexus 7",
  "nexus 9",
  "nexus 10",
  "xoom",
];

/** UA fragments that identify phones (not tablets). */
const PHONE_TOKENS = [
  "iphone",
  "ipod",
  "android.*mobile", // Android phones carry "Mobile"; Android tablets do not
  "mobile",
  "blackberry",
  "bb10",
  "windows phone",
  "iemobile",
  "opera mini",
  "opera mobi",
];

/**
 * Whether a UA string belongs to a tablet (or another large touch device
 * that must keep the desktop interface).
 */
export function isTabletUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua === "") {
    return false;
  }
  return TABLET_TOKENS.some((token) => ua.includes(token));
}

/**
 * Whether a UA string belongs to a phone. Tablets are excluded even when
 * their UA also contains a generic "mobile"-ish fragment.
 */
export function isPhoneUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua === "" || isTabletUserAgent(userAgent)) {
    return false;
  }
  return PHONE_TOKENS.some((token) => {
    if (token.includes(".*")) {
      const [before, after] = token.split(".*");
      const index = ua.indexOf(before);
      return index >= 0 && ua.slice(index).includes(after);
    }
    return ua.includes(token);
  });
}

/**
 * Resolve the UI mode from the available signals. Precedence: explicit
 * override > tablet (always desktop) > Client Hints mobile flag > phone UA >
 * desktop fallback.
 */
export function resolveUiMode(signals: GnumarusUiModeSignals = {}): GnumarusUiMode {
  if (signals.override === "mobile") {
    return "mobile";
  }
  if (signals.override === "desktop") {
    return "desktop";
  }
  if (isTabletUserAgent(signals.userAgent)) {
    return "desktop";
  }
  if (signals.clientHintMobile === true) {
    return "mobile";
  }
  if (isPhoneUserAgent(signals.userAgent)) {
    return "mobile";
  }
  return "desktop";
}

/** Read the persisted override ("auto" when absent or unreadable). */
export function loadUiModeOverride(storage?: Storage | null): GnumarusUiModeOverride {
  try {
    const raw =
      storage ??
      (typeof localStorage !== "undefined" ? localStorage : null);
    const value = raw?.getItem(UI_MODE_STORAGE_KEY);
    return value === "mobile" || value === "desktop" ? value : "auto";
  } catch {
    return "auto";
  }
}

/** Persist the override (best effort: private mode may throw). */
export function saveUiModeOverride(
  mode: GnumarusUiModeOverride,
  storage?: Storage | null,
): void {
  try {
    const store =
      storage ??
      (typeof localStorage !== "undefined" ? localStorage : null);
    if (store === null) {
      return;
    }
    if (mode === "auto") {
      store.removeItem(UI_MODE_STORAGE_KEY);
    } else {
      store.setItem(UI_MODE_STORAGE_KEY, mode);
    }
  } catch {
    // Private-mode storage failures must never break the UI.
  }
}

function readNavigatorSignals(): GnumarusUiModeSignals {
  if (typeof navigator === "undefined") {
    return {};
  }
  const withHints = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  return {
    override: loadUiModeOverride(),
    clientHintMobile: withHints.userAgentData?.mobile,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

/** Resolve the UI mode from the live browser environment. */
export function detectUiMode(): GnumarusUiMode {
  return resolveUiMode(readNavigatorSignals());
}
