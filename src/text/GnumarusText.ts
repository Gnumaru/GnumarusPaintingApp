/**
 * Rich text model: a text entry holds one sanitized canonical HTML document.
 * The HTML subset is defined by the sanitizer (`GnumarusTextSanitize.ts`);
 * layout and rasterization consume it through `GnumarusTextLayout.ts`.
 */
export interface GnumarusTextDocument {
  /** Sanitized canonical HTML (see `sanitizeTextHtml`). */
  html: string;
}

export interface GnumarusTextEntry {
  id: string;
  name: string;
  document: GnumarusTextDocument;
}

/** Hard cap on stored HTML length (characters), guarding RAM and raster size. */
export const GNUMARUS_TEXT_MAX_HTML_LENGTH = 100_000;

/** Raster supersampling over CSS layout pixels (crispness vs RAM). */
export const GNUMARUS_TEXT_RASTER_SCALE = 2;

/** Maximum raster dimension in pixels; larger layouts are clipped. */
export const GNUMARUS_TEXT_MAX_RASTER_DIMENSION = 4096;

/** Default document for newly created text contents. */
export function defaultTextDocument(): GnumarusTextDocument {
  return { html: "<div>Text</div>" };
}

/** True for a document with no visible text. */
export function isEmptyTextDocument(document: GnumarusTextDocument): boolean {
  return document.html.replace(/<[^>]*>/g, "").replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, " ").trim() === "";
}
