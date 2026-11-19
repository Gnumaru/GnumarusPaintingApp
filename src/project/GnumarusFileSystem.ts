import {
  classifyDiscoveredContentFile,
  collectProjectFileReferences,
  decodeProjectArchive,
  GNUMARUS_PROJECT_ARCHIVE_FILE,
  GNUMARUS_PROJECT_CONTENT_DIRS,
  GNUMARUS_PROJECT_FILE,
  parseModel3dExtension,
  parseProject,
  type GnumarusDiscoveredContentKind,
  type GnumarusProjectMeta,
} from "./GnumarusProjectFormat";
import { unzipSync } from "fflate";

interface GnumarusWritableStream {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

interface GnumarusPickedFile {
  readonly name: string;
  readonly size: number;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface GnumarusFileHandle {
  getFile(): Promise<GnumarusPickedFile>;
  createWritable(): Promise<GnumarusWritableStream>;
}

interface GnumarusDirectoryHandle {
  readonly name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<GnumarusFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<GnumarusDirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  /** Directory listing (native `values()`); absent on handles that cannot list. */
  values?: () => AsyncIterable<{ kind: string; name: string }>;
}

interface GnumarusOpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}

interface GnumarusSaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}

interface GnumarusPickerWindow {
  showDirectoryPicker?: (options?: { mode?: string }) => Promise<GnumarusDirectoryHandle>;
  showOpenFilePicker?: (options?: GnumarusOpenFilePickerOptions) => Promise<GnumarusFileHandle[]>;
  showSaveFilePicker?: (options?: GnumarusSaveFilePickerOptions) => Promise<GnumarusFileHandle>;
}

function pickerWindow(): GnumarusPickerWindow {
  return window as unknown as GnumarusPickerWindow;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof pickerWindow().showDirectoryPicker === "function";
}

export function isFilePickerSupported(): boolean {
  return typeof pickerWindow().showOpenFilePicker === "function";
}

export function isFileSaveSupported(): boolean {
  return typeof pickerWindow().showSaveFilePicker === "function";
}

export async function pickProjectDirectory(): Promise<GnumarusDirectoryHandle> {
  const showPicker = pickerWindow().showDirectoryPicker;
  if (showPicker === undefined) {
    throw new Error("File System Access API is only available in Chromium derivatives.");
  }
  return showPicker.call(window, { mode: "readwrite" });
}

/**
 * Open the operating system file dialog to pick an Aseprite, Photoshop or
 * GIMP file. Returns null when the dialog supports it; throws
 * AbortError when the user cancels (callers treat cancellation as silent).
 */
export async function pickImportFile(): Promise<GnumarusFileHandle | null> {
  const showPicker = pickerWindow().showOpenFilePicker;
  if (showPicker === undefined) {
    throw new Error("File System Access API is only available in Chromium derivatives.");
  }
  const handles = await showPicker.call(window, {
    multiple: false,
    types: [
      {
        description: "Aseprite, Photoshop, GIMP or Krita files",
        accept: {
          "application/octet-stream": [".ase", ".aseprite"],
          "image/vnd.adobe.photoshop": [".psd"],
          "image/x-xcf": [".xcf"],
          "application/x-kra": [".kra"],
          "application/x-krita-archive": [".krz"],
        },
      },
    ],
  });
  return handles[0] ?? null;
}

/**
 * Open the operating system file dialog to pick an SVG vector graphic
 * (plain `.svg` or gzipped `.svgz`). Returns null when the dialog API is
 * missing; throws AbortError when the user cancels (silent for callers).
 */
export async function pickSvgFile(): Promise<GnumarusFileHandle | null> {
  const showPicker = pickerWindow().showOpenFilePicker;
  if (showPicker === undefined) {
    return null;
  }
  const handles = await showPicker.call(window, {
    multiple: false,
    types: [
      {
        description: "SVG vector graphics",
        accept: {
          "image/svg+xml": [".svg", ".svgz"],
        },
      },
    ],
  });
  return handles[0] ?? null;
}

/**
 * Open the operating system file dialog to pick a 3D model file in any
 * format three.js loads natively (glb/gltf/obj/stl/ply/fbx/dae/3mf/amf).
 * Returns null when the dialog API is missing; throws AbortError when the
 * user cancels (silent for callers).
 */
export async function pickModel3dFile(): Promise<GnumarusFileHandle | null> {
  const showPicker = pickerWindow().showOpenFilePicker;
  if (showPicker === undefined) {
    return null;
  }
  const handles = await showPicker.call(window, {
    multiple: false,
    types: [
      {
        description: "3D models (three.js formats)",
        accept: {
          "model/gltf-binary": [".glb"],
          "model/gltf+json": [".gltf"],
          "model/obj": [".obj"],
          "model/stl": [".stl"],
          "model/ply": [".ply"],
          "application/octet-stream": [".fbx", ".dae", ".3mf", ".amf", ".blend"],
        },
      },
    ],
  });
  return handles[0] ?? null;
}

/**
 * Raster extensions accepted both by the image file picker and by
 * drag-and-drop onto the app (anything the browser decodes natively).
 */
export const GNUMARUS_RASTER_DROP_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"];

/** MIME types accepted for drops, mirroring the image file picker. */
const GNUMARUS_RASTER_DROP_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"];

/** True for dropped files the app can import as raster images. */
export function isRasterDropFile(fileName: string, mimeType: string): boolean {
  if (GNUMARUS_RASTER_DROP_MIMES.includes(mimeType.toLowerCase())) {
    return true;
  }
  const lower = fileName.toLowerCase();
  return GNUMARUS_RASTER_DROP_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Vector extensions accepted by the SVG file picker (plain or gzipped). */
export const GNUMARUS_VECTOR_DROP_EXTENSIONS = [".svg", ".svgz"];

/** True for dropped files the app can import as vector graphics. */
export function isVectorDropFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return GNUMARUS_VECTOR_DROP_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Text extensions imported as rich-text contents. */
export const GNUMARUS_TEXT_DROP_EXTENSIONS = [".html", ".htm"];

/** True for dropped files the app can import as rich text. */
export function isTextDropFile(fileName: string, mimeType: string): boolean {
  if (mimeType.toLowerCase() === "text/html") {
    return true;
  }
  const lower = fileName.toLowerCase();
  return GNUMARUS_TEXT_DROP_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** True for dropped files the app can import as 3D models. */
export function isModel3dDropFile(fileName: string): boolean {
  return parseModel3dExtension(fileName) !== null;
}
export type GnumarusProjectDropKind = "psd" | "xcf" | "kra" | "ase";

/** Project-file kind by extension for drag-and-drop imports, if any. */
export function projectDropKind(fileName: string): GnumarusProjectDropKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".psd")) {
    return "psd";
  }
  if (lower.endsWith(".xcf")) {
    return "xcf";
  }
  if (lower.endsWith(".kra") || lower.endsWith(".krz")) {
    return "kra";
  }
  if (lower.endsWith(".ase") || lower.endsWith(".aseprite")) {
    return "ase";
  }
  return null;
}

/**
 * Open the operating system file dialog to pick a raster image (PNG, JPEG,
 * WebP, GIF or BMP — anything the browser decodes natively). Returns null
 * when the dialog API is missing; throws AbortError when the user cancels
 * (silent for callers).
 */
export async function pickImageFile(): Promise<GnumarusFileHandle | null> {
  const showPicker = pickerWindow().showOpenFilePicker;
  if (showPicker === undefined) {
    return null;
  }
  const handles = await showPicker.call(window, {
    multiple: false,
    types: [
      {
        description: "Raster images",
        accept: {
          "image/png": [".png"],
          "image/jpeg": [".jpg", ".jpeg"],
          "image/webp": [".webp"],
          "image/gif": [".gif"],
          "image/bmp": [".bmp"],
        },
      },
    ],
  });
  return handles[0] ?? null;
}

/**
 * Save one blob through the OS save dialog. Returns the written handle, or
 * null when the API is missing (callers fall back to a plain download).
 * Throws AbortError when the user cancels (callers treat it as silent).
 */
export async function pickSaveFile(
  suggestedName: string,
  description: string,
  accept: Record<string, string[]>,
): Promise<GnumarusFileHandle | null> {
  const showPicker = pickerWindow().showSaveFilePicker;
  if (showPicker === undefined) {
    return null;
  }
  return showPicker.call(window, { suggestedName, types: [{ description, accept }] });
}

export async function writeBlobToFile(handle: GnumarusFileHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(blob);
  } finally {
    await writable.close();
  }
}

export async function writeBlobToDirectory(
  root: GnumarusDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<void> {
  const handle = await resolveFile(root, fileName, true);
  await writeBlobToFile(handle, blob);
}

/** Read one file as bytes, or null when it does not exist. Other errors throw. */
export async function readFileBytes(
  root: GnumarusDirectoryHandle,
  path: string,
): Promise<Uint8Array | null> {
  const missing = (error: unknown): boolean =>
    error instanceof DOMException && error.name === "NotFoundError";
  let handle: GnumarusFileHandle;
  try {
    handle = await resolveFile(root, path, false);
  } catch (error) {
    if (missing(error)) {
      return null;
    }
    throw error;
  }
  try {
    return new Uint8Array(await (await handle.getFile()).arrayBuffer());
  } catch (error) {
    if (missing(error)) {
      return null;
    }
    throw error;
  }
}

/** Read one file's byte size without loading its contents, or null when missing. Other errors throw. */
export async function readFileSize(root: GnumarusDirectoryHandle, path: string): Promise<number | null> {
  const missing = (error: unknown): boolean =>
    error instanceof DOMException && error.name === "NotFoundError";
  let handle: GnumarusFileHandle;
  try {
    handle = await resolveFile(root, path, false);
  } catch (error) {
    if (missing(error)) {
      return null;
    }
    throw error;
  }
  try {
    return (await handle.getFile()).size;
  } catch (error) {
    if (missing(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Read and parse the project data file, preferring the zipped archive and
 * falling back to plain JSON, throwing a clear error when missing or corrupt.
 */
export async function readProjectMeta(root: GnumarusDirectoryHandle): Promise<GnumarusProjectMeta> {
  const archived = await readFileBytes(root, GNUMARUS_PROJECT_ARCHIVE_FILE);
  if (archived !== null) {
    return parseProject(decodeProjectArchive(archived));
  }
  const plain = await readFileBytes(root, GNUMARUS_PROJECT_FILE);
  if (plain === null) {
    throw new Error(`${GNUMARUS_PROJECT_ARCHIVE_FILE} or ${GNUMARUS_PROJECT_FILE} is missing from this folder`);
  }
  return parseProject(new TextDecoder().decode(plain));
}

/**
 * Best-effort union of every file referenced by the previously saved project
 * data files (`project.gpa` and `project.json`): data file paths that exist
 * plus their texture/cell references (with JPEG alpha companions). Unreadable
 * or unparsable files contribute nothing (or just their own path when the
 * bytes exist), so this never blocks a save.
 */
export async function readOldProjectFileReferences(root: GnumarusDirectoryHandle): Promise<Set<string>> {
  const out = new Set<string>();
  let archived: Uint8Array | null = null;
  let plain: Uint8Array | null = null;
  try {
    archived = await readFileBytes(root, GNUMARUS_PROJECT_ARCHIVE_FILE);
  } catch {
    archived = null;
  }
  try {
    plain = await readFileBytes(root, GNUMARUS_PROJECT_FILE);
  } catch {
    plain = null;
  }
  if (archived !== null) {
    out.add(GNUMARUS_PROJECT_ARCHIVE_FILE);
    try {
      for (const file of collectProjectFileReferences(parseProject(decodeProjectArchive(archived)))) {
        out.add(file);
      }
    } catch {
      // Corrupt archives contribute only their own path; the save still proceeds.
    }
  }
  if (plain !== null) {
    out.add(GNUMARUS_PROJECT_FILE);
    try {
      for (const file of collectProjectFileReferences(parseProject(new TextDecoder().decode(plain)))) {
        out.add(file);
      }
    } catch {
      // Corrupt JSON contributes only its own path; the save still proceeds.
    }
  }
  return out;
}

/**
 * Delete one file, silently ignoring a missing file. Other errors throw.
 */
export async function removeProjectFile(root: GnumarusDirectoryHandle, path: string): Promise<void> {
  const parts = path.split("/").filter((part) => part.length > 0);
  const fileName = parts.pop();
  if (fileName === undefined) {
    throw new Error(`Invalid project path: ${path}`);
  }
  let dir = root;
  try {
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: false });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return;
    }
    throw error;
  }
  try {
    await dir.removeEntry(fileName, { recursive: false });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return;
    }
    throw error;
  }
}

/** Plain object-URL download fallback when the File System Access API is missing. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

async function resolveFile(
  root: GnumarusDirectoryHandle,
  path: string,
  create: boolean,
): Promise<GnumarusFileHandle> {
  const parts = path.split("/").filter((part) => part.length > 0);
  const fileName = parts.pop();
  if (fileName === undefined) {
    throw new Error(`Invalid project path: ${path}`);
  }
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create });
  }
  return dir.getFileHandle(fileName, { create });
}

export async function readProjectFiles(root: GnumarusDirectoryHandle): Promise<{
  project: GnumarusProjectMeta;
  fileBlobs: Map<string, Blob>;
}> {
  const project = await readProjectMeta(root);
  const fileBlobs = new Map<string, Blob>();
  for (const texture of project.animation.textures) {
    if (fileBlobs.has(texture.file)) {
      continue;
    }
    const handle = await resolveFile(root, texture.file, false);
    const buffer = await (await handle.getFile()).arrayBuffer();
    fileBlobs.set(texture.file, new Blob([buffer], { type: "image/png" }));
  }
  for (const text of project.animation.texts) {
    if (text.file === undefined || fileBlobs.has(text.file)) {
      continue;
    }
    const handle = await resolveFile(root, text.file, false);
    const buffer = await (await handle.getFile()).arrayBuffer();
    fileBlobs.set(text.file, new Blob([buffer], { type: "text/html" }));
  }
  for (const vector of project.animation.svgs) {
    if (vector.file === undefined || fileBlobs.has(vector.file)) {
      continue;
    }
    const handle = await resolveFile(root, vector.file, false);
    const buffer = await (await handle.getFile()).arrayBuffer();
    fileBlobs.set(vector.file, new Blob([buffer], { type: "image/svg+xml" }));
  }
  for (const model of project.animation.models3d) {
    if (fileBlobs.has(model.file)) {
      continue;
    }
    const handle = await resolveFile(root, model.file, false);
    const buffer = await (await handle.getFile()).arrayBuffer();
    fileBlobs.set(model.file, new Blob([buffer], { type: "application/octet-stream" }));
  }
  for (const layer of project.layers) {
    for (const cell of layer.cells ?? []) {
      if (fileBlobs.has(cell.file)) {
        continue;
      }
      const handle = await resolveFile(root, cell.file, false);
      const buffer = await (await handle.getFile()).arrayBuffer();
      fileBlobs.set(cell.file, new Blob([buffer], { type: "image/png" }));
    }
  }
  return { project, fileBlobs };
}

export async function writeProjectFiles(
  root: GnumarusDirectoryHandle,
  files: Map<string, Blob>,
): Promise<void> {
  for (const [path, blob] of files) {
    const handle = await resolveFile(root, path, true);
    const writable = await handle.createWritable();
    try {
      await writable.write(blob);
    } finally {
      await writable.close();
    }
  }
}

/**
 * Create every project content directory (`textures/`, `texts/`, `svgs/`,
 * `3dmodels/`), even when nothing is stored inside, so users always have a
 * stable place to drop files for content-manager discovery.
 */
export async function ensureProjectContentDirs(root: GnumarusDirectoryHandle): Promise<void> {
  for (const dir of GNUMARUS_PROJECT_CONTENT_DIRS) {
    await root.getDirectoryHandle(dir, { create: true });
  }
}

export interface GnumarusDiscoveredContentFile {
  kind: GnumarusDiscoveredContentKind;
  /** Project-relative path (`textures/extra.png`). */
  file: string;
}

/**
 * Scan the project content directories for files the project does not
 * reference yet. Only the right type in the right directory counts
 * (companions, wrong extensions and wrong directories are ignored),
 * independent of the current storage settings. Unlistable or missing
 * directories contribute nothing. Throws only when `root` itself is
 * unusable; per-entry I/O errors are skipped.
 */
export async function scanProjectContentFiles(
  root: GnumarusDirectoryHandle,
  referenced: ReadonlySet<string>,
): Promise<GnumarusDiscoveredContentFile[]> {
  const found: GnumarusDiscoveredContentFile[] = [];
  for (const dir of GNUMARUS_PROJECT_CONTENT_DIRS) {
    let handle: GnumarusDirectoryHandle;
    try {
      handle = await root.getDirectoryHandle(dir, { create: false });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") {
        continue;
      }
      throw error;
    }
    if (typeof handle.values !== "function") {
      continue;
    }
    for await (const entry of handle.values()) {
      if (entry === null || typeof entry !== "object" || entry.kind !== "file" || typeof entry.name !== "string") {
        continue;
      }
      if (entry.name === "" || entry.name === "." || entry.name === ".." || entry.name.includes("/")) {
        continue;
      }
      const file = `${dir}/${entry.name}`;
      if (referenced.has(file)) {
        continue;
      }
      const kind = classifyDiscoveredContentFile(file);
      if (kind === null) {
        continue;
      }
      found.push({ kind, file });
    }
  }
  found.sort((left, right) => left.file.localeCompare(right.file));
  return found;
}

export type { GnumarusDirectoryHandle };

/**
 * A project store is the unit the shell opens and saves: a display name plus
 * the directory its files live in. The native backend is a user-picked folder
 * (File System Access API); the embedded backend is an OPFS subdirectory.
 * Every file operation (`readFileBytes`, `writeProjectFiles`, ...) takes a
 * plain `GnumarusDirectoryHandle`, so both backends share the exact same
 * call path — only how the root handle is obtained differs.
 */
export interface GnumarusProjectStore {
  readonly name: string;
  readonly root: GnumarusDirectoryHandle;
  /** True when the root is an OPFS subdirectory (embedded project). */
  readonly embedded: boolean;
}

export function nativeProjectStore(root: GnumarusDirectoryHandle): GnumarusProjectStore {
  return { name: root.name, root, embedded: false };
}

export function embeddedProjectStore(name: string, root: GnumarusDirectoryHandle): GnumarusProjectStore {
  return { name, root, embedded: true };
}

interface GnumarusOpfsStorage {
  getDirectory?: () => Promise<GnumarusDirectoryHandle>;
}

function opfsStorage(): GnumarusOpfsStorage | null {
  const nav = navigator as unknown as { storage?: GnumarusOpfsStorage };
  return nav.storage ?? null;
}

/** True when the Origin Private File System is reachable (Firefox, Safari, Chromium). */
export function isOpfsSupported(): boolean {
  return typeof opfsStorage()?.getDirectory === "function";
}

/** OPFS root handle. Every subdirectory is one embedded project (except the `brushes/` app cache). */
export async function opfsRoot(): Promise<GnumarusDirectoryHandle> {
  const storage = opfsStorage();
  if (typeof storage?.getDirectory !== "function") {
    throw new Error("The Origin Private File System is not available in this browser.");
  }
  return storage.getDirectory();
}

/** Directories reserved by the app itself inside OPFS (never listed as projects). */
export const GNUMARUS_OPFS_RESERVED_DIRS: readonly string[] = ["brushes"];

/**
 * Validate an embedded project name (also an OPFS subdirectory name):
 * trimmed 1..64 chars, not `.`/`..`, no slashes or control characters.
 * Returns the trimmed name, or null when invalid.
 */
export function sanitizeEmbeddedProjectName(name: string): string | null {
  const clean = name.trim();
  if (clean.length === 0 || clean.length > 64 || clean === "." || clean === "..") {
    return null;
  }
  for (const char of clean) {
    const code = char.codePointAt(0) ?? 0;
    if (char === "/" || char === "\\" || code < 32 || code === 127) {
      return null;
    }
  }
  return clean;
}

/** Sorted names of every embedded project (every OPFS root dir except app caches). */
export async function listEmbeddedProjects(): Promise<string[]> {
  const root = await opfsRoot();
  if (typeof root.values !== "function") {
    return [];
  }
  const out: string[] = [];
  for await (const entry of root.values()) {
    if (entry === null || typeof entry !== "object" || entry.kind !== "directory") {
      continue;
    }
    const name = (entry as { name?: unknown }).name;
    if (typeof name !== "string" || name === "" || GNUMARUS_OPFS_RESERVED_DIRS.includes(name)) {
      continue;
    }
    out.push(name);
  }
  out.sort((left, right) => left.localeCompare(right));
  return out;
}

/** Open an existing embedded project by name. Throws when missing or invalid. */
export async function openEmbeddedProjectStore(name: string): Promise<GnumarusProjectStore> {
  const clean = sanitizeEmbeddedProjectName(name);
  if (clean === null) {
    throw new Error(`Invalid project name: ${name}`);
  }
  const root = await opfsRoot();
  const dir = await root.getDirectoryHandle(clean, { create: false });
  return embeddedProjectStore(clean, dir);
}

/**
 * Create a new embedded project directory. Throws on invalid names and when
 * a project with the same name already exists (names are unique by construction).
 */
export async function createEmbeddedProjectStore(name: string): Promise<GnumarusProjectStore> {
  const clean = sanitizeEmbeddedProjectName(name);
  if (clean === null) {
    throw new Error(`Invalid project name: ${name}`);
  }
  const existing = await listEmbeddedProjects();
  if (existing.includes(clean)) {
    throw new Error(`Project "${clean}" already exists`);
  }
  const root = await opfsRoot();
  const dir = await root.getDirectoryHandle(clean, { create: true });
  return embeddedProjectStore(clean, dir);
}

export interface GnumarusGppContents {
  /** Top-level directory inside the archive (the project name). */
  projectName: string;
  /** Project-relative paths (`project.gpa`, `textures/t1.jxl`, ...) to raw bytes. */
  files: Map<string, Uint8Array>;
}

/**
 * Unpack a `.gpp` archive (a zip holding exactly one root directory with the
 * normal project layout inside). Throws on multi-root archives, files outside
 * the single directory, missing project data files, or invalid names.
 */
export function parseGppArchive(bytes: Uint8Array): GnumarusGppContents {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes) as Record<string, Uint8Array>;
  } catch (error) {
    throw new Error(`Invalid project package: ${error instanceof Error ? error.message : String(error)}`);
  }
  const names = Object.keys(entries).filter((name) => !name.endsWith("/"));
  if (names.length === 0) {
    throw new Error("Invalid project package: the archive is empty");
  }
  const roots = new Set<string>();
  for (const name of names) {
    const slash = name.indexOf("/");
    if (slash <= 0) {
      throw new Error("Invalid project package: it must contain exactly one directory at its root");
    }
    roots.add(name.slice(0, slash));
  }
  if (roots.size !== 1) {
    throw new Error("Invalid project package: it must contain exactly one directory at its root");
  }
  const projectName = [...roots][0] as string;
  if (sanitizeEmbeddedProjectName(projectName) === null) {
    throw new Error(`Invalid project package: invalid project name "${projectName}"`);
  }
  const files = new Map<string, Uint8Array>();
  for (const name of names) {
    files.set(name.slice(projectName.length + 1), entries[name] as Uint8Array);
  }
  if (!files.has(GNUMARUS_PROJECT_ARCHIVE_FILE) && !files.has(GNUMARUS_PROJECT_FILE)) {
    throw new Error(`Invalid project package: ${GNUMARUS_PROJECT_ARCHIVE_FILE} or ${GNUMARUS_PROJECT_FILE} is missing`);
  }
  return { projectName, files };
}

/**
 * Unpack a `.gpp` archive into a new OPFS embedded project directory and
 * return its store. Throws when a project with the same name already exists.
 */
export async function unpackGppToEmbedded(bytes: Uint8Array): Promise<GnumarusProjectStore> {
  const gpp = parseGppArchive(bytes);
  const store = await createEmbeddedProjectStore(gpp.projectName);
  const blobs = new Map<string, Blob>();
  for (const [path, data] of gpp.files) {
    blobs.set(path, new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" }));
  }
  await writeProjectFiles(store.root, blobs);
  await ensureProjectContentDirs(store.root);
  return store;
}
