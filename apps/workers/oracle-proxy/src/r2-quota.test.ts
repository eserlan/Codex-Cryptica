import { describe, expect, it } from "vitest";
import { releaseQuota, reserveQuota } from "./r2-quota";
import { fakeBucket } from "./__tests__/fake-r2";

describe("reserveQuota", () => {
  it("reserves slots up to the limit and then reports full", async () => {
    const bucket = fakeBucket();
    expect(await reserveQuota(bucket as never, "q", 2)).toBe("reserved");
    expect(await reserveQuota(bucket as never, "q", 2)).toBe("reserved");
    expect(await reserveQuota(bucket as never, "q", 2)).toBe("full");
    expect(JSON.parse(bucket.store.get("q")!.text).count).toBe(2);
  });

  it("never exceeds the limit under concurrent requests", async () => {
    const bucket = fakeBucket();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => reserveQuota(bucket as never, "q", 3)),
    );
    expect(results.filter((r) => r === "reserved")).toHaveLength(3);
    expect(JSON.parse(bucket.store.get("q")!.text).count).toBe(3);
  });

  it("keeps the fail-open path for an unreadable counter", async () => {
    const bucket = fakeBucket();
    bucket.store.set("q", { text: "not json", etag: "bad" });
    expect(await reserveQuota(bucket as never, "q", 2)).toBe("reserved");
  });

  it("throws once the compare-and-set keeps losing", async () => {
    const bucket = fakeBucket();
    bucket.put = async () => null;
    await expect(reserveQuota(bucket as never, "q", 2)).rejects.toThrow(
      "Could not reserve a quota slot.",
    );
  });
});

describe("releaseQuota", () => {
  it("gives a slot back so a retry can use it", async () => {
    const bucket = fakeBucket();
    await reserveQuota(bucket as never, "q", 1);
    expect(await reserveQuota(bucket as never, "q", 1)).toBe("full");
    expect(await releaseQuota(bucket as never, "q")).toBe(true);
    expect(await reserveQuota(bucket as never, "q", 1)).toBe("reserved");
  });

  it("never goes below zero, and does nothing for a missing counter", async () => {
    const bucket = fakeBucket();
    expect(await releaseQuota(bucket as never, "missing")).toBe(false);
    await reserveQuota(bucket as never, "q", 5);
    await releaseQuota(bucket as never, "q");
    await releaseQuota(bucket as never, "q");
    expect(JSON.parse(bucket.store.get("q")!.text).count).toBe(0);
  });
});
