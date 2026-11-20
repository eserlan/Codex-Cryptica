import type {
  PdfTextItemLike,
  VisualLine,
} from "../../src/source-package/pdf-text-lines";

export function textItem(
  str: string,
  x: number,
  y: number,
  fontSize = 10,
  width = str.length * 5,
): PdfTextItemLike {
  return {
    str,
    transform: [fontSize, 0, 0, fontSize, x, y],
    width,
    height: fontSize,
  };
}

export function visualLine(
  text: string,
  overrides: Partial<VisualLine> = {},
): VisualLine {
  return { text, fontSize: 10, pageNumber: 1, y: 700, x: 54, ...overrides };
}
