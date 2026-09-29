import { describe, expect, it } from "vitest";
import { Bucket } from "./r2-memory-bucket";
import { call, makeEnv, seedEntityListing } from "./entity-template-fixtures";

/**
 * The in-memory bucket has no latency and no Worker subrequest limit, so wall
 * time cannot show the real cost of browse. The check that matters is how many
 * bucket operations a request needs: it must not grow with the listing count.
 */
describe("entity template browse at scale", () => {
  it("costs at most five bucket operations over 1,000 listings", async () => {
    const bucket = new Bucket();
    for (let i = 0; i < 1000; i++) {
      await seedEntityListing(bucket, {
        id: `l${i}`,
        title: `Template ${i}`,
        entityType: i % 3 ? "location" : "faction",
        labels: [i % 2 ? "Fantasy" : "Sci-fi"],
        updated: new Date(2026, 0, 1, 0, 0, i).toISOString(),
      });
    }
    const env = makeEnv(bucket);
    const timings: number[] = [];
    for (const query of [
      "",
      "&q=Template%20999",
      "&entityType=faction",
      "&labels=Fantasy&entityType=location&limit=50",
      "&q=none",
    ]) {
      bucket.resetOps();
      const started = performance.now();
      const res = await call(
        env,
        "GET",
        `/api/template-directory/listings?kind=entity${query}`,
      );
      timings.push(performance.now() - started);
      expect(res.status).toBe(200);
      expect(bucket.totalOps()).toBeLessThanOrEqual(5);
    }
    expect(Math.max(...timings)).toBeLessThan(2000);
  }, 30_000);
});
