import {
  collectProjectFileReferences,
  decodeProjectArchive,
  GNUMARUS_PROJECT_ARCHIVE_FILE,
  GNUMARUS_PROJECT_FILE,
  parseProject,
  type GnumarusProjectMeta,
} from "./GnumarusProjectFormat";

interface GnumarusWritableStream {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

interface GnumarusPickedFile {
  readonly name: string;
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

export type { GnumarusDirectoryHandle };
