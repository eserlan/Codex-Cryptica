import { toBlob } from "html-to-image";

const excludedSelectors = [
  ".svelte-flow__controls",
  ".svelte-flow__minimap",
  ".svelte-flow__attribution",
  ".svelte-flow__selection",
];

function includeInExport(node: HTMLElement): boolean {
  return !excludedSelectors.some((selector) => node.matches?.(selector));
}

function exportBackground(element: HTMLElement): string {
  const surface = element.querySelector<HTMLElement>(".svelte-flow") ?? element;
  const color = getComputedStyle(surface).backgroundColor;
  return color && color !== "rgba(0, 0, 0, 0)" ? color : "rgb(24, 20, 18)";
}

export async function exportCanvasImage(
  element: HTMLElement,
  fitGraph: () => Promise<void | (() => Promise<void>)>,
): Promise<Blob> {
  const restoreViewport = await fitGraph();
  try {
    const blob = await toBlob(element, {
      backgroundColor: exportBackground(element),
      cacheBust: true,
      filter: includeInExport,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (!blob) {
      throw new Error("The canvas image could not be rendered.");
    }
    return blob;
  } finally {
    await restoreViewport?.();
  }
}
