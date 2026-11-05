export async function encodeBufferToPngBlob(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("2D canvas is unavailable for PNG encoding.");
  }
  const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
  context.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (blob === null) {
    throw new Error("Failed to encode PNG.");
  }
  return blob;
}

export async function decodePngToBuffer(blob: Blob): Promise<{
  width: number;
  height: number;
  buffer: Uint8ClampedArray;
}> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    bitmap.close();
    throw new Error("2D canvas is unavailable for PNG decoding.");
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, buffer: imageData.data };
}
