import { describe, expect, it, vi } from "vitest";
import {
  MyStuffService,
  ANSWER_FEEDBACK_PREFIX,
  LOCAL_SHARES_KEY,
  MANAGEMENT_TOKENS_KEY,
} from "./my-stuff-service";
import type { StorageLike } from "$lib/utils/runtime-deps";
import type { AnswerConfig } from "$lib/content/answers/schema";

class MockStorage implements StorageLike {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    const keys = Array.from(this.map.keys());
    return keys[index] ?? null;
  }
}

const mockAnswer: AnswerConfig = {
  slug: "how-do-you-run-a-mystery-without-railroading",
  kind: "how-to",
  category: "session-prep",
  question: "How do you run a mystery without railroading?",
  shortAnswer: "Use the three-clue rule.",
  publishedAt: "2026-09-08",
  seo: {
    title: "How to Run a Mystery Without Railroading",
    description:
      "Structure RPG investigations with multiple clues per deduction.",
  },
  sections: [
    {
      kind: "list",
      heading: "The Three Clue Rule",
      items: [{ term: "Redundancy", text: "Always provide multiple leads." }],
    },
  ],
  codexConnection: {
    heading: "Visualise clues",
    paragraphs: ["Map clues on the graph."],
    linkText: "Try the campaign manager",
    href: "/solutions/campaign-manager",
  },
  relatedAnswers: [],
  relatedTools: [],
  relatedForPages: [],
  labels: [],
};

describe("MyStuffService", () => {
  it("discovers liked answers from localStorage and sorts them", () => {
    const storage = new MockStorage();
    storage.setItem(
      `${ANSWER_FEEDBACK_PREFIX}how-do-you-run-a-mystery-without-railroading`,
      JSON.stringify({ value: "yes" }),
    );
    storage.setItem(
      `${ANSWER_FEEDBACK_PREFIX}unliked-slug`,
      JSON.stringify({ value: "no", reason: "Too long" }),
    );
    storage.setItem("unrelated_key", "value");

    const service = new MyStuffService({
      storage,
      getAnswerFn: (slug) =>
        slug === mockAnswer.slug ? mockAnswer : undefined,
    });

    const liked = service.getLikedAnswers();
    expect(liked).toHaveLength(1);
    expect(liked[0].slug).toBe("how-do-you-run-a-mystery-without-railroading");
    expect(liked[0].question).toBe(
      "How do you run a mystery without railroading?",
    );
    expect(liked[0].categoryLabel).toBe("Session Prep");
    expect(liked[0].href).toBe(
      "/answers/how-do-you-run-a-mystery-without-railroading",
    );
  });

  it("gracefully ignores unparseable storage values or missing answers", () => {
    const storage = new MockStorage();
    storage.setItem(`${ANSWER_FEEDBACK_PREFIX}corrupted`, "not valid json");
    storage.setItem(
      `${ANSWER_FEEDBACK_PREFIX}missing-answer`,
      JSON.stringify({ value: "yes" }),
    );

    const service = new MyStuffService({
      storage,
      getAnswerFn: () => undefined,
    });

    const liked = service.getLikedAnswers();
    expect(liked).toEqual([]);
  });

  it("removes a liked answer from storage", () => {
    const storage = new MockStorage();
    const key = `${ANSWER_FEEDBACK_PREFIX}how-do-you-run-a-mystery-without-railroading`;
    storage.setItem(key, JSON.stringify({ value: "yes" }));

    const service = new MyStuffService({ storage });
    service.removeLikedAnswer("how-do-you-run-a-mystery-without-railroading");

    expect(storage.getItem(key)).toBeNull();
  });

  it("records and retrieves shared generator results", () => {
    const storage = new MockStorage();
    const service = new MyStuffService({ storage });

    service.recordSharedGenerator({
      shareId: "share-123",
      title: "Cursed Crypt of Moria",
      generatorId: "dungeon-generator",
      generatorTitle: "Dungeon Generator",
      createdAt: "2026-09-14T00:00:00.000Z",
      url: "https://codexcryptica.com/share/share-123",
      managementToken: "tok-abc",
    });

    const shares = service.getSharedGenerators();
    expect(shares).toHaveLength(1);
    expect(shares[0].shareId).toBe("share-123");
    expect(shares[0].title).toBe("Cursed Crypt of Moria");
    expect(shares[0].managementToken).toBe("tok-abc");
  });

  it("includes shares discovered via management tokens from #2916", () => {
    const storage = new MockStorage();
    storage.setItem(
      MANAGEMENT_TOKENS_KEY,
      JSON.stringify({ "legacy-share-999": "secret-token-xyz" }),
    );

    const service = new MyStuffService({ storage });
    const shares = service.getSharedGenerators();

    expect(shares).toHaveLength(1);
    expect(shares[0].shareId).toBe("legacy-share-999");
    expect(shares[0].managementToken).toBe("secret-token-xyz");
    expect(shares[0].hasDescriptiveMetadata).toBe(false);

    service.recordSharedGenerator(shares[0]);
    expect(service.getSharedGenerators()[0].hasDescriptiveMetadata).toBe(false);
  });

  it("does not treat incomplete local share metadata as descriptive", () => {
    const storage = new MockStorage();
    storage.setItem(
      LOCAL_SHARES_KEY,
      JSON.stringify([{ shareId: "incomplete-share", managementToken: "tok" }]),
    );

    const service = new MyStuffService({ storage });

    expect(service.getSharedGenerators()[0]).toMatchObject({
      title: "Shared Generator Snapshot",
      generatorId: "generator",
      hasDescriptiveMetadata: false,
    });
  });

  it("revokes shared generator remotely and cleans up locally", async () => {
    const storage = new MockStorage();
    storage.setItem(
      LOCAL_SHARES_KEY,
      JSON.stringify([
        {
          shareId: "share-to-revoke",
          title: "Abandoned Mine",
          generatorId: "dungeon",
          createdAt: "2026-09-14T00:00:00.000Z",
          url: "https://codexcryptica.com/share/share-to-revoke",
          managementToken: "token-revoke-123",
        },
      ]),
    );
    storage.setItem(
      MANAGEMENT_TOKENS_KEY,
      JSON.stringify({ "share-to-revoke": "token-revoke-123" }),
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const service = new MyStuffService({
      storage,
      fetch: fetchMock as any,
      baseUrl: "https://mock-proxy.workers.dev",
    });

    const success = await service.revokeSharedGenerator("share-to-revoke");
    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mock-proxy.workers.dev/api/generator-shares/share-to-revoke",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer token-revoke-123" },
      }),
    );

    expect(service.getSharedGenerators()).toHaveLength(0);
    const tokens = JSON.parse(storage.getItem(MANAGEMENT_TOKENS_KEY) || "{}");
    expect(tokens["share-to-revoke"]).toBeUndefined();
  });

  it("keeps a share and token when remote revocation is rejected", async () => {
    const storage = new MockStorage();
    storage.setItem(
      LOCAL_SHARES_KEY,
      JSON.stringify([
        {
          shareId: "share-fail",
          title: "Failed Share",
          generatorId: "dungeon",
          createdAt: "2026-09-14T00:00:00.000Z",
          url: "https://codexcryptica.com/share/share-fail",
          managementToken: "tok",
        },
      ]),
    );

    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const service = new MyStuffService({
      storage,
      fetch: fetchMock as any,
    });

    const success = await service.revokeSharedGenerator("share-fail");
    expect(success).toBe(false);
    expect(service.getSharedGenerators()).toHaveLength(1);
  });

  it("keeps a share when remote revocation cannot reach the service", async () => {
    const storage = new MockStorage();
    storage.setItem(
      LOCAL_SHARES_KEY,
      JSON.stringify([
        {
          shareId: "share-offline",
          title: "Offline Share",
          generatorId: "dungeon",
          createdAt: "2026-09-14T00:00:00.000Z",
          managementToken: "tok-offline",
        },
      ]),
    );
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network offline"));
    const service = new MyStuffService({ storage, fetch: fetchMock as any });

    await expect(service.revokeSharedGenerator("share-offline")).resolves.toBe(
      false,
    );
    expect(service.getSharedGenerators()).toHaveLength(1);
  });

  it("keeps an unmanaged share instead of claiming it was revoked", async () => {
    const storage = new MockStorage();
    storage.setItem(
      LOCAL_SHARES_KEY,
      JSON.stringify([
        {
          shareId: "share-without-token",
          title: "Unmanaged Share",
          generatorId: "dungeon",
          createdAt: "2026-09-14T00:00:00.000Z",
        },
      ]),
    );
    const fetchMock = vi.fn();
    const service = new MyStuffService({ storage, fetch: fetchMock as any });

    await expect(
      service.revokeSharedGenerator("share-without-token"),
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.getSharedGenerators()).toHaveLength(1);
  });

  it("ignores malformed stored fields instead of crashing sorting", () => {
    const storage = new MockStorage();
    storage.setItem(
      LOCAL_SHARES_KEY,
      JSON.stringify([
        {
          shareId: "malformed-share",
          title: { unexpected: true },
          generatorId: 42,
          createdAt: { unexpected: true },
          url: "javascript:alert(1)",
          excerpt: ["not text"],
        },
      ]),
    );
    const service = new MyStuffService({ storage });

    expect(() => service.getSharedGenerators()).not.toThrow();
    expect(service.getSharedGenerators()[0]).toMatchObject({
      shareId: "malformed-share",
      title: "Shared Generator Snapshot",
      generatorId: "generator",
      url: expect.stringContaining("/share/malformed-share"),
    });
  });
});
