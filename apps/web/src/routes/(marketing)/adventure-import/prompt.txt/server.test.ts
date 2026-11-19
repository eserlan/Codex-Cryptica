import { describe, expect, it } from "vitest";
import { CANONICAL_CONVERSION_PROMPT } from "../conversion-guide.js";
import { GET } from "./+server.js";

describe("/adventure-import/prompt.txt", () => {
  it("serves the canonical prompt verbatim as plain text", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect((await response.text()).trimEnd()).toBe(CANONICAL_CONVERSION_PROMPT);
  });

  it("keeps absolute schema and guide URLs and no HTML", async () => {
    const text = await GET().text();

    expect(text).toContain(
      "https://codexcryptica.com/schemas/adventure-json/v1.json",
    );
    expect(text).toContain("https://codexcryptica.com/adventure-import");
    expect(text).not.toMatch(/<\/?[a-z][^>]*>/i);
  });

  it("includes the revisions and stable IDs rule", async () => {
    expect(await GET().text()).toContain("9. Revisions and stable IDs");
  });

  it("includes the game mechanics and maps rule", async () => {
    expect(await GET().text()).toContain("10. Game mechanics and maps");
  });

  it("is excluded from search indexes", () => {
    expect(GET().headers.get("x-robots-tag")).toBe("noindex");
  });
});
