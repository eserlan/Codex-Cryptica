import { afterEach, describe, expect, it, vi } from "vitest";
import { createProviderResolver } from "./provider-resolver";

afterEach(() => vi.unstubAllGlobals());

describe("createProviderResolver", () => {
  it("resolves an operation through the registry's default provider", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "hello" } }],
            usage: { prompt_tokens: 3, completion_tokens: 1 },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const resolver = createProviderResolver({
      GEMINI_API_KEY: "",
      OPENAI_API_KEY: "test-key",
    });
    const outcome = await resolver.resolve(
      {
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      },
      "public",
    );

    expect(outcome.result.ok).toBe(true);
    expect(outcome.modelKey).toBe("luna-fast");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports failure when no provider can serve the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const resolver = createProviderResolver({ GEMINI_API_KEY: "" });
    const outcome = await resolver.resolve(
      {
        operation: "freeform-generation",
        messages: [{ role: "user", content: "hi" }],
      },
      "public",
    );
    expect(outcome.result.ok).toBe(false);
  });
});
