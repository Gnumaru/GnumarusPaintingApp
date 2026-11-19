/**
 * Platform video encoding for animation export (WebCodecs, no
 * dependencies). Frames go in as RGBA pixels and come out as codec
 * packets that GnumarusVideoMux assembles into WebM, MKV or MP4.
 * Everything asynchronous is confined here; the muxer stays pure.
 */

export type GnumarusVideoCodec = "vp9" | "vp8" | "avc";

export interface GnumarusVideoEncodeRequest {
  /** One RGBA buffer per frame, export size. */
  frames: Uint8ClampedArray[];
  width: number;
  height: number;
  codec: GnumarusVideoCodec;
  /** Per-frame display time in milliseconds. */
  delaysMs: number[];
  /** Quality 0..1 (maps to bitrate; lossy codecs only). */
  quality01: number;
}

export interface GnumarusEncodedVideoChunk {
  data: Uint8Array;
  key: boolean;
  timestampUs: number;
  durationUs: number;
  /** Codec private data (carried by the first keyframe, if any). */
  description: Uint8Array | null;
}

export interface GnumarusEncodedVideo {
  chunks: GnumarusEncodedVideoChunk[];
  width: number;
  height: number;
  codec: GnumarusVideoCodec;
  /** First keyframe description, or null when the codec sent none. */
  description: Uint8Array | null;
  totalDurationMs: number;
}

/** WebCodecs codec string per container codec. */
export function videoCodecString(codec: GnumarusVideoCodec): string {
  if (codec === "vp8") {
    return "vp8";
  }
  if (codec === "avc") {
    return "avc1.42E028";
  }
  return "vp09.00.41.08";
}

/** Bitrate for a quality 0..1 slider value (pure, unit-tested). */
export function videoBitrateForQuality(width: number, height: number, fps: number, quality01: number): number {
  const quality = Number.isFinite(quality01) ? Math.min(1, Math.max(0, quality01)) : 0.75;
  const pixels = Math.max(1, Math.floor(width) * Math.floor(height));
  const rate = Number.isFinite(fps) ? Math.min(120, Math.max(1, Math.round(fps))) : 30;
  const bitsPerPixel = 0.02 + 0.28 * quality;
  return Math.min(60000000, Math.max(50000, Math.round(pixels * rate * bitsPerPixel)));
}

export interface GnumarusVideoCodecSupport {
  vp9: boolean;
  vp8: boolean;
  avc: boolean;
}

/** Which container codecs the browser can encode (all false without WebCodecs). */
export async function queryVideoCodecSupport(
  width = 1280,
  height = 720,
): Promise<GnumarusVideoCodecSupport> {
  const none = { vp9: false, vp8: false, avc: false };
  try {
    if (typeof VideoEncoder === "undefined") {
      return none;
    }
  } catch {
    return none;
  }
  const probe = async (codec: GnumarusVideoCodec): Promise<boolean> => {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: videoCodecString(codec),
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
        bitrate: 1000000,
        framerate: 30,
      });
      return support.supported === true;
    } catch {
      return false;
    }
  };
  const [vp9, vp8, avc] = await Promise.all([probe("vp9"), probe("vp8"), probe("avc")]);
  return { vp9, vp8, avc };
}

/** Total animation length in milliseconds from per-frame delays. */
export function videoTotalDurationMs(delaysMs: number[]): number {
  let total = 0;
  for (const delay of delaysMs) {
    if (Number.isFinite(delay) && delay > 0) {
      total += delay;
    }
  }
  return total;
}

/**
 * Pad RGBA frames to even dimensions by replicating the edge row and
 * column (pure). H.264 requires even width and height; VP9 accepts odd
 * sizes, so callers only pad for the AVC path.
 */
export function padFramesToEven(
  frames: Uint8ClampedArray[],
  width: number,
  height: number,
): { frames: Uint8ClampedArray[]; width: number; height: number } {
  const paddedWidth = width + (width % 2);
  const paddedHeight = height + (height % 2);
  if (paddedWidth === width && paddedHeight === height) {
    return { frames, width, height };
  }
  const padded = frames.map((frame) => {
    const out = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);
    for (let y = 0; y < paddedHeight; y += 1) {
      const srcY = Math.min(y, height - 1);
      for (let x = 0; x < paddedWidth; x += 1) {
        const srcX = Math.min(x, width - 1);
        const src = (srcY * width + srcX) * 4;
        const dst = (y * paddedWidth + x) * 4;
        out[dst] = frame[src] as number;
        out[dst + 1] = frame[src + 1] as number;
        out[dst + 2] = frame[src + 2] as number;
        out[dst + 3] = frame[src + 3] as number;
      }
    }
    return out;
  });
  return { frames: padded, width: paddedWidth, height: paddedHeight };
}

/**
 * Encode RGBA frames to codec packets with exact timestamps. Throws a
 * plain Error with the encoder's message on failure (the shell surfaces
 * it through the existing export-failed toast path).
 */
export async function encodeAnimationVideo(request: GnumarusVideoEncodeRequest): Promise<GnumarusEncodedVideo> {
  const width = Math.max(1, Math.floor(request.width));
  const height = Math.max(1, Math.floor(request.height));
  if (request.frames.length === 0) {
    throw new Error("cannot encode an animation with no frames");
  }
  if (request.frames.length !== request.delaysMs.length) {
    throw new Error("frame and delay counts differ");
  }
  if (typeof VideoEncoder === "undefined") {
    throw new Error("this browser cannot encode video (WebCodecs unavailable)");
  }
  const totalMs = videoTotalDurationMs(request.delaysMs);
  const fps = totalMs > 0 ? (request.frames.length * 1000) / totalMs : 30;
  const padded = request.codec === "avc" ? padFramesToEven(request.frames, width, height) : { frames: request.frames, width, height };
  const codec = videoCodecString(request.codec);
  const quality = Number.isFinite(request.quality01) ? Math.min(1, Math.max(0, request.quality01)) : 0.75;
  const chunks: GnumarusEncodedVideoChunk[] = [];
  let description: Uint8Array | null = null;
  let encodeError: Error | null = null;
  let encoder: VideoEncoder | null = null;
  try {
    encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        const details = metadata?.decoderConfig?.description;
        if (description === null && details !== undefined) {
          if (details instanceof ArrayBuffer) {
            description = new Uint8Array(details.slice(0));
          } else if (ArrayBuffer.isView(details)) {
            const view = details as Uint8Array;
            description = view.slice();
          }
        }
        chunks.push({
          data,
          key: chunk.type === "key",
          timestampUs: chunk.timestamp ?? 0,
          durationUs: Math.max(1, chunk.duration ?? 0),
          description: null,
        });
      },
      error: (error: Error) => {
        if (encodeError === null) {
          encodeError = error instanceof Error ? error : new Error(String(error));
        }
      },
    });
    encoder.configure({
      codec,
      width: padded.width,
      height: padded.height,
      bitrate: videoBitrateForQuality(padded.width, padded.height, fps, quality),
      framerate: Math.min(120, Math.max(1, Math.round(fps))),
    });
    let timestampUs = 0;
    for (let index = 0; index < padded.frames.length; index += 1) {
      const buffer = padded.frames[index];
      if (buffer === undefined) {
        throw new Error(`missing pixels for frame ${index}`);
      }
      const delayMs = request.delaysMs[index] ?? 0;
      const durationUs = Math.max(1, Math.round((Number.isFinite(delayMs) ? delayMs : 0) * 1000));
      const frame = new VideoFrame(buffer, {
        format: "RGBA",
        codedWidth: padded.width,
        codedHeight: padded.height,
        timestamp: timestampUs,
        duration: durationUs,
      });
      timestampUs += durationUs;
      encoder.encode(frame, { keyFrame: index === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 8) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }
    await encoder.flush();
  } finally {
    if (encoder !== null && encoder.state !== "closed") {
      try {
        encoder.close();
      } catch {
        // Already closed by a failure path; the queued error below wins.
      }
    }
  }
  if (encodeError !== null) {
    throw encodeError;
  }
  if (chunks.length === 0) {
    throw new Error("the video encoder produced no output");
  }
  return { chunks, width: padded.width, height: padded.height, codec: request.codec, description, totalDurationMs: totalMs };
}
