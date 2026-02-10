export async function generateThumbnail(
  blob: Blob,
  size: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Creating a temporary canvas is negligible compared to image decoding overhead.
      // This avoids race conditions inherent in pooling a single canvas for async operations.
      const canvas =
        typeof OffscreenCanvas !== "undefined"
          ? new OffscreenCanvas(size, size)
          : document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(
          new Error(
            "Failed to initialize canvas context for thumbnail generation",
          ),
        );
        return;
      }

      drawOnCanvas(img, canvas, ctx as any, size, resolve, reject);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

function drawOnCanvas(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  size: number,
  resolve: (blob: Blob) => void,
  reject: (err: Error) => void,
) {
  // Calculate dimensions to maintain aspect ratio
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > size) {
      height *= size / width;
      width = size;
    }
  } else {
    if (height > size) {
      width *= size / height;
      height = size;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const blobPromise =
    "toBlob" in canvas
      ? new Promise<Blob | null>((r) =>
          (canvas as HTMLCanvasElement).toBlob(r, "image/webp", 0.75),
        )
      : (canvas as OffscreenCanvas).convertToBlob({
          type: "image/webp",
          quality: 0.75,
        });

  blobPromise
    .then((result) => {
      if (result) resolve(result);
      else reject(new Error("Canvas toBlob failed"));
    })
    .catch(reject);
}
