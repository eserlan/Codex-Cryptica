import { describe, expect, it, vi } from "vitest";
import {
  resolveSocialAsset,
  type ImageDependencies,
} from "./release-comms-image.ts";

const item = {
  kind: "answer" as const,
  title: "How do I balance RPG combat encounters without a TPK?",
  url: "https://codexcryptica.com/answers/encounter-balance",
  sourcePath: "apps/web/src/lib/content/answers/pages/encounter-balance.ts",
};

describe("resolveSocialAsset", () => {
  it("uses a source card without checking or generating another image", async () => {
    const fetch = vi.fn();
    await expect(
      resolveSocialAsset(
        {
          ...item,
          imageUrl: "https://assets.codexcryptica.com/og/encounter-balance.jpg",
          imageAlt: "Adventurers studying a tactical bridge map",
        },
        { fetch: fetch as never },
      ),
    ).resolves.toMatchObject({
      imageAlt: "Adventurers studying a tactical bridge map",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reuses a generated deterministic R2 card without another generation", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    await expect(
      resolveSocialAsset(item, { fetch: fetch as never }),
    ).resolves.toMatchObject({
      imageUrl: "https://assets.codexcryptica.com/og/encounter-balance.jpg",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]).toEqual({ method: "HEAD" });
  });

  it("generates, converts and uploads a missing card then removes temporary files", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: { image: Buffer.from("png").toString("base64") },
          }),
          { status: 200 },
        ),
      );
    const run = vi.fn(() => "");
    await expect(
      resolveSocialAsset(item, {
        fetch: fetch as never,
        run: run as never,
      } satisfies Partial<ImageDependencies>),
    ).resolves.toMatchObject({
      imageUrl: "https://assets.codexcryptica.com/og/encounter-balance.jpg",
    });
    expect(fetch.mock.calls[1][0]).toContain("/v1/images/generations");
    expect(run.mock.calls[0][0]).toBe("magick");
    expect(run.mock.calls[1][0]).toBe("bunx");
    expect(run.mock.calls[1][1]).toContain(
      "codex-cryptica-statics/og/encounter-balance.jpg",
    );
  });

  it("refuses to publish when image generation fails", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response("no", { status: 429 }));
    await expect(
      resolveSocialAsset(item, { fetch: fetch as never }),
    ).rejects.toThrow("Could not generate social image");
  });
});
