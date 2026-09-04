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
  // OffscreenCanvas is the only one of the two with convertToBlob, so check
  // for that first — some browsers (Firefox) also expose a deprecated toBlob
  // on OffscreenCanvas, which would otherwise win this check and log a
  // deprecation warning on every encode.
  const encode = (type: string): Promise<Blob | null> =>
    "convertToBlob" in canvas
      ? (canvas as OffscreenCanvas).convertToBlob({ type, quality })
      : new Promise<Blob | null>((r) =>
          (canvas as HTMLCanvasElement).toBlob(r, type, quality),
        );

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

// Small pre-drawn map tiles (e.g. geomorph line-art) are often authored at a
// native resolution that makes each grid square only a handful of pixels
// once "fit grid to map" divides it up. Below this size (larger dimension,
// in px) we upscale on upload so grid cells come out usable.
const SMALL_MAP_UPSCALE_THRESHOLD = 1000;
const SMALL_MAP_UPSCALE_FACTOR = 2;

export async function convertToWebP(
  blob: Blob,
  quality: number = 0.8,
  { autoUpscaleSmall = false }: { autoUpscaleSmall?: boolean } = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale =
        autoUpscaleSmall &&
        Math.max(img.width, img.height) < SMALL_MAP_UPSCALE_THRESHOLD
          ? SMALL_MAP_UPSCALE_FACTOR
          : 1;
      const width = img.width * scale;
      const height = img.height * scale;

      const canvas =
        typeof OffscreenCanvas !== "undefined"
          ? new OffscreenCanvas(width, height)
          : document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(
          new Error("Failed to initialize canvas context for WebP conversion"),
        );
        return;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx2d = ctx as CanvasRenderingContext2D;
      if (scale !== 1) {
        // Nearest-neighbor upscale keeps pre-drawn grid/hex lines crisp
        // instead of blurring them the way smoothed scaling would.
        ctx2d.imageSmoothingEnabled = false;
      }
      ctx2d.drawImage(img, 0, 0, width, height);

      encodeCanvasBlob(canvas, quality).then(resolve).catch(reject);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
