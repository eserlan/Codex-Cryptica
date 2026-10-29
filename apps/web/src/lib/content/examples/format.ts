/**
 * Helper utilities for formatting and tokenising example content.
 */

export interface InlineMarkupSegment {
  text: string;
  bold: boolean;
}

/**
 * Parses inline markdown bold markup (`**text**`) into typed segments for safe Svelte rendering
 * without HTML injection or DOMPurify dependencies during SSR/prerender.
 */
export function parseInlineMarkup(text: string): InlineMarkupSegment[] {
  if (!text) return [];
  const regex = /(\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return { text: part.slice(2, -2), bold: true };
      }
      return { text: part, bold: false };
    });
}
