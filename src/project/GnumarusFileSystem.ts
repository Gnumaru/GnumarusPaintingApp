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

interface GnumarusPickerWindow {
  showDirectoryPicker?: (options?: { mode?: string }) => Promise<GnumarusDirectoryHandle>;
  showOpenFilePicker?: (options?: GnumarusOpenFilePickerOptions) => Promise<GnumarusFileHandle[]>;
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

export async function pickProjectDirectory(): Promise<GnumarusDirectoryHandle> {
  const showPicker = pickerWindow().showDirectoryPicker;
  if (showPicker === undefined) {
    throw new Error("File System Access API is only available in Chromium derivatives.");
  }
  return showPicker.call(window, { mode: "readwrite" });
}

/**
 * Open the operating system file dialog to pick a single Aseprite file.
 * Returns null when the dialog supports it; throws AbortError when the
 * user cancels (callers treat cancellation as silent).
 */
export async function pickAsepriteFile(): Promise<GnumarusFileHandle | null> {
  const showPicker = pickerWindow().showOpenFilePicker;
  if (showPicker === undefined) {
    throw new Error("File System Access API is only available in Chromium derivatives.");
  }
  const handles = await showPicker.call(window, {
    multiple: false,
    types: [{ description: "Aseprite files", accept: { "application/octet-stream": [".ase", ".aseprite"] } }],
  });
  return handles[0] ?? null;
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
