import { describe, expect, it, vi } from "vitest";
import {
  VaultInventoryError,
  VaultInventoryService,
  formatLastActive,
  formatMegabytes,
  sortVaults,
  summarise,
  type VaultInventoryRow,
} from "./vault-inventory";

const row = (
  id: string,
  overrides: Partial<VaultInventoryRow> = {},
): VaultInventoryRow => ({
  id,
  title: `Vault ${id}`,
  sizeBytes: 1024 * 1024,
  entityCount: 10,
  createdAt: null,
  lastActiveAt: "2026-10-20T10:00:00.000Z",
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("VaultInventoryService", () => {
  it("sends the token and follows cursors until the last page", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ vaults: [row("a")], cursor: "c 1" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ vaults: [row("b")], cursor: null }),
      );
    const service = new VaultInventoryService(fetchImpl, "https://w.test");
    const progress = vi.fn();

    const rows = await service.fetchAll("backups", "tok", progress);

    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://w.test/api/admin/vaults/backups",
      { headers: { Authorization: "Bearer tok" } },
    );
    expect(fetchImpl.mock.calls[1][0]).toBe(
      "https://w.test/api/admin/vaults/backups?cursor=c%201",
    );
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it("explains a 404, other failures and an unreachable worker", async () => {
    const make = (impl: () => Promise<Response>) =>
      new VaultInventoryService(vi.fn(impl), "https://w.test");
    await expect(
      make(async () => jsonResponse({}, 404)).fetchPage("published", "x"),
    ).rejects.toThrow(/wrong token/);
    await expect(
      make(async () => jsonResponse({}, 500)).fetchPage("published", "x"),
    ).rejects.toThrow("Request failed (500).");
    await expect(
      make(async () => {
        throw new TypeError("offline");
      }).fetchPage("published", "x"),
    ).rejects.toBeInstanceOf(VaultInventoryError);
  });
});

describe("sortVaults", () => {
  const rows = [
    row("a", { title: "beta", sizeBytes: 3, entityCount: null }),
    row("b", { title: "Alpha", sizeBytes: 1, entityCount: 5 }),
    row("c", { title: "gamma", sizeBytes: 2, entityCount: 9 }),
  ];

  it("sorts numbers and text case-insensitively in both directions", () => {
    expect(sortVaults(rows, "sizeBytes", "desc").map((r) => r.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(sortVaults(rows, "title", "asc").map((r) => r.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("keeps missing values last whichever way it sorts, without mutating", () => {
    expect(sortVaults(rows, "entityCount", "asc").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sortVaults(rows, "entityCount", "desc").map((r) => r.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});

describe("formatting", () => {
  it("shows megabytes, including tiny and large vaults", () => {
    expect(formatMegabytes(0)).toBe("0.00 MB");
    expect(formatMegabytes(500)).toBe("<0.01 MB");
    expect(formatMegabytes(2.5 * 1024 * 1024)).toBe("2.50 MB");
    expect(formatMegabytes(250 * 1024 * 1024)).toBe("250 MB");
  });

  it("shows the date and how long ago, and a dash when unknown", () => {
    const now = new Date("2026-10-23T12:00:00.000Z");
    expect(formatLastActive("2026-10-23T08:00:00.000Z", now)).toBe(
      "2026-10-23 (today)",
    );
    expect(formatLastActive("2026-10-22T08:00:00.000Z", now)).toBe(
      "2026-10-22 (yesterday)",
    );
    expect(formatLastActive("2026-10-13T12:00:00.000Z", now)).toBe(
      "2026-10-13 (10 days ago)",
    );
    expect(formatLastActive(null, now)).toBe("—");
    expect(formatLastActive("not a date", now)).toBe("—");
  });

  it("totals size and entities, counting unknown entities as zero", () => {
    expect(
      summarise([row("a"), row("b", { entityCount: null, sizeBytes: 1 })]),
    ).toEqual({ count: 2, totalBytes: 1024 * 1024 + 1, totalEntities: 10 });
  });
});
