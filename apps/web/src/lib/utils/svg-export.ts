/**
 * Rasterizes a live, on-page `<svg>` element to a PNG blob. A bare
 * `data:image/svg+xml` has no access to the page's Tailwind stylesheet, so
 * every element's computed fill/stroke is inlined onto a clone first —
 * otherwise the exported image would render with no colors at all.
 */
export async function svgToPngBlob(
  svg: SVGSVGElement,
  width: number,
  height: number,
  scale = 2,
): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const liveNodes = svg.querySelectorAll("*");
  const cloneNodes = clone.querySelectorAll("*");
  liveNodes.forEach((liveNode, i) => {
    const cloneNode = cloneNodes[i];
    if (!(liveNode instanceof SVGElement) || !(cloneNode instanceof SVGElement))
      return;
    const computed = getComputedStyle(liveNode);
    if (computed.fill && computed.fill !== "none") {
      cloneNode.setAttribute("fill", computed.fill);
    }
    if (computed.stroke && computed.stroke !== "none") {
      cloneNode.setAttribute("stroke", computed.stroke);
    }
  });
  clone.setAttribute(
    "style",
    `background:${getComputedStyle(svg.parentElement ?? svg).backgroundColor}`,
  );

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load SVG as image"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Wraps a rasterized blob as a `File`, ready for upload flows that expect one. */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/** Converts a rasterized blob to a `data:` URL string, for handoff through localStorage. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob as data URL"));
    reader.readAsDataURL(blob);
  });
}

/** Reverses {@link blobToDataUrl}, wrapping the decoded bytes as a `File`. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}
