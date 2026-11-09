import {
  GNUMARUS_PROJECT_FILE,
  parseProject,
  serializeProject,
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
  const metaHandle = await resolveFile(root, GNUMARUS_PROJECT_FILE, false);
  const metaText = await (await metaHandle.getFile()).text();
  const project = parseProject(metaText);
  const fileBlobs = new Map<string, Blob>();
  for (const texture of project.animation.textures) {
    if (fileBlobs.has(texture.file)) {
      continue;
    }
    const handle = await resolveFile(root, texture.file, false);
    const buffer = await (await handle.getFile()).arrayBuffer();
    fileBlobs.set(texture.file, new Blob([buffer], { type: "image/png" }));
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
  project: GnumarusProjectMeta,
  cellBlobs: Map<string, Blob>,
): Promise<void> {
  const metaHandle = await resolveFile(root, GNUMARUS_PROJECT_FILE, true);
  const metaWritable = await metaHandle.createWritable();
  try {
    await metaWritable.write(serializeProject(project));
  } finally {
    await metaWritable.close();
  }
  for (const [path, blob] of cellBlobs) {
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
