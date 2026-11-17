import { CANONICAL_CONVERSION_PROMPT } from "../conversion-guide.js";

// fallow-ignore-next-line unused-export
export const prerender = true;

/**
 * The canonical conversion prompt as plain text, for assistants that can open
 * a URL but would struggle to pull the prompt out of the HTML guide (#4906).
 * Generated from the same constant as the page and its copy button.
 */
export function GET() {
  return new Response(`${CANONICAL_CONVERSION_PROMPT}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
