import { describe, expect, it, vi } from "vitest";
import { PublicDirectoryService } from "./PublicDirectoryService";

describe("PublicDirectoryService", () => {
  it("loads an existing public listing", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            schemaVersion: 1,
            publishId: "pub-123",
            guestUrl: "/guest/pub-123",
            title: "Night Market",
            description: "Find smugglers and rumors.",
            labels: ["cyberpunk"],
            visibleEntityCount: 1,
            snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
            listingCreatedAt: "2026-06-30T12:00:00.000Z",
            listingUpdatedAt: "2026-06-30T12:00:00.000Z",
          }),
        ),
    );
    const service = new PublicDirectoryService({
      fetch: fetchMock as unknown as typeof fetch,
      baseUrl: "https://mock-proxy.local",
    });

    const listing = await service.getPublicListing("pub-123");
    expect(listing?.publishId).toBe("pub-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mock-proxy.local/api/published/pub-123/listing",
    );
  });

  it("saves a public listing with the publish write token", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            schemaVersion: 1,
            publishId: "pub-123",
            guestUrl: "/guest/pub-123",
            title: "Night Market",
            description: "Find smugglers and rumors.",
            labels: ["cyberpunk"],
            visibleEntityCount: 1,
            snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
            listingCreatedAt: "2026-06-30T12:00:00.000Z",
            listingUpdatedAt: "2026-06-30T12:00:00.000Z",
          }),
        ),
    );
    const service = new PublicDirectoryService({
      fetch: fetchMock as unknown as typeof fetch,
      baseUrl: "https://mock-proxy.local",
    });

    const listing = await service.enablePublicListing(
      "pub-123",
      {
        title: "Night Market",
        description: "Find smugglers and rumors.",
        labels: ["cyberpunk"],
      },
      "write-token-123",
    );

    expect(listing.title).toBe("Night Market");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mock-proxy.local/api/published/pub-123/listing",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer write-token-123",
        }),
      }),
    );
  });

  it("hydrates a saved listing draft instead of mirroring later world changes", () => {
    const service = new PublicDirectoryService();

    const draft = service.createListingDraft({
      publishId: "pub-123",
      vaultTitle: "Current Vault Name",
      existingListing: {
        schemaVersion: 1,
        publishId: "pub-123",
        guestUrl: "/guest/pub-123",
        title: "Saved Public Name",
        description: "Saved public description",
        labels: ["cyberpunk"],
        visibleEntityCount: 1,
        snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
        listingCreatedAt: "2026-06-30T12:00:00.000Z",
        listingUpdatedAt: "2026-06-30T12:00:00.000Z",
      },
    });

    expect(draft.title).toBe("Saved Public Name");
    expect(draft.description).toBe("Saved public description");
    expect(draft.labels).toEqual(["cyberpunk"]);
  });

  it("returns null when no public listing exists yet", async () => {
    const service = new PublicDirectoryService({
      fetch: vi.fn(
        async () => new Response(null, { status: 404 }),
      ) as unknown as typeof fetch,
      baseUrl: "https://mock-proxy.local",
    });

    await expect(service.getPublicListing("pub-123")).resolves.toBeNull();
  });

  it("lists public directory with query serialization parameters", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            results: [],
            nextCursor: "5",
          }),
        ),
    );
    const service = new PublicDirectoryService({
      fetch: fetchMock as unknown as typeof fetch,
      baseUrl: "https://mock-proxy.local",
    });

    const result = await service.listPublicDirectory({
      q: "smugglers",
      labels: ["cyberpunk", "intrigue"],
      cursor: "2",
      limit: 10,
    });

    expect(result.nextCursor).toBe("5");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mock-proxy.local/api/directory/listings?q=smugglers&labels=cyberpunk%2Cintrigue&cursor=2&limit=10",
    );
  });

  it("creates a listing draft within the 200ms performance target", () => {
    const service = new PublicDirectoryService();

    const startTime = performance.now();
    const draft = service.createListingDraft({
      publishId: "pub-123",
      vaultTitle: "Current Vault Name",
      existingListing: {
        schemaVersion: 1,
        publishId: "pub-123",
        guestUrl: "/guest/pub-123",
        title: "Saved Public Name",
        description: "Saved public description",
        labels: ["cyberpunk"],
        visibleEntityCount: 1,
        snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
        listingCreatedAt: "2026-06-30T12:00:00.000Z",
        listingUpdatedAt: "2026-06-30T12:00:00.000Z",
      },
    });
    const duration = performance.now() - startTime;

    expect(draft.title).toBe("Saved Public Name");
    expect(duration).toBeLessThan(200);
  });
});
