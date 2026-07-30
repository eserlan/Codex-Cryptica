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

// Some browser/platform combinations (notably Firefox on certain Linux
// distro builds) return a null blob for image/webp instead of throwing, so a
// null result isn't necessarily fatal — retry with PNG before giving up.
async function encodeCanvasBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number,
): Promise<Blob> {
  const encode = (type: string): Promise<Blob | null> =>
    "toBlob" in canvas
      ? new Promise<Blob | null>((r) =>
          (canvas as HTMLCanvasElement).toBlob(r, type, quality),
        )
      : (canvas as OffscreenCanvas).convertToBlob({ type, quality });

  const webp = await encode("image/webp");
  if (webp) return webp;

  const png = await encode("image/png");
  if (png) return png;

  throw new Error("Canvas toBlob failed for both image/webp and image/png");
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

  encodeCanvasBlob(canvas, 0.75).then(resolve).catch(reject);
}

export async function convertToWebP(
  blob: Blob,
  quality: number = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas =
        typeof OffscreenCanvas !== "undefined"
          ? new OffscreenCanvas(img.width, img.height)
          : document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(
          new Error("Failed to initialize canvas context for WebP conversion"),
        );
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      (ctx as CanvasRenderingContext2D).drawImage(img, 0, 0);

      encodeCanvasBlob(canvas, quality).then(resolve).catch(reject);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
