import { vi } from "vitest";

/**
 * A `fetch` stub that answers with the response shape the *called* provider
 * expects, decided by the outgoing URL rather than by the test.
 *
 * Tests that pin a provider-specific body break silently when routing changes:
 * the adaptor for the newly-selected provider reads a body it does not
 * understand, extracts empty content, and any assertion that only looks at log
 * fields or the status code still passes. Using this keeps a test exercising a
 * real response through whichever adaptor actually runs.
 */
export function respondPerProvider(content = "hi") {
  return vi.fn(async (url: string) =>
    String(url).includes("chat/completions")
      ? new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
          status: 200,
        })
      : new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: content }] } }],
          }),
          { status: 200 },
        ),
  );
}
