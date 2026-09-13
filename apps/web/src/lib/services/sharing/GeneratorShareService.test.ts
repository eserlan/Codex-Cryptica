import { describe, expect, it, vi } from "vitest";
import { GeneratorShareService } from "./GeneratorShareService";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const share = {
  shareId: "00000000-0000-4000-8000-000000000001",
  generatorId: "npc",
  title: "Mara Venn",
  content: "# Mara Venn\n\nA guide.",
  metadata: { generatorPath: "/generators/npc", description: "A guide." },
  createdAt: "2026-09-13T12:00:00.000Z",
};

describe("GeneratorShareService", () => {
  it("creates a share, stores its private token, and returns a public URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ share, managementToken: "private-token" }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const service = new GeneratorShareService({
      fetch: fetcher,
      baseUrl: "https://proxy.example",
      storage: storage(),
    });

    const result = await service.create({
      generatorId: "npc",
      title: share.title,
      content: share.content,
      metadata: share.metadata,
    });

    expect(result.url).toBe(
      "https://codexcryptica.com/share/00000000-0000-4000-8000-000000000001",
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://proxy.example/api/generator-shares",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces a server failure without pretending a share exists", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Too large" } }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const service = new GeneratorShareService({
      fetch: fetcher,
      baseUrl: "https://proxy.example",
      storage: storage(),
    });

    await expect(
      service.create({
        generatorId: "npc",
        title: share.title,
        content: share.content,
        metadata: share.metadata,
      }),
    ).rejects.toThrow("Too large");
  });

  it("revokes a locally managed share and removes the token", async () => {
    const store = storage();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ share, managementToken: "private-token" }),
          {
            status: 201,
          },
        ),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const service = new GeneratorShareService({
      fetch: fetcher,
      baseUrl: "https://proxy.example",
      storage: store,
    });
    await service.create({
      generatorId: "npc",
      title: share.title,
      content: share.content,
      metadata: share.metadata,
    });
    expect(service.hasManagementToken(share.shareId)).toBe(true);
    await service.revoke(share.shareId);
    expect(service.hasManagementToken(share.shareId)).toBe(false);
    expect(fetcher.mock.calls[1][1]).toEqual({
      method: "DELETE",
      headers: { Authorization: "Bearer private-token" },
    });
  });
});
