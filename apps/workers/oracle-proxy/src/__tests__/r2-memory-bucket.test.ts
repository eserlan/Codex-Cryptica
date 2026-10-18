import { describe, expect, it } from "vitest";
import { Bucket } from "./r2-memory-bucket";

describe("test bucket", () => {
  it("counts operations and can reset them", async () => {
    const b = new Bucket();
    await b.put("a", "1");
    await b.get("a");
    await b.head("a");
    await b.list({ prefix: "" });
    await b.delete("a");
    expect(b.ops).toEqual({ get: 1, head: 1, put: 1, delete: 1, list: 1 });
    expect(b.totalOps()).toBe(5);
    b.resetOps();
    expect(b.totalOps()).toBe(0);
  });

  it("only writes when the etag still matches", async () => {
    const b = new Bucket();
    await b.put("k", "v1");
    const first = await b.get("k");
    expect(
      await b.put("k", "v2", { onlyIf: { etagMatches: first!.etag } }),
    ).not.toBeNull();
    expect(
      await b.put("k", "v3", { onlyIf: { etagMatches: first!.etag } }),
    ).toBeNull();
    expect(await (await b.get("k"))!.text()).toBe("v2");
  });

  it("fails a conditional write for a missing key and injected conflicts", async () => {
    const b = new Bucket();
    expect(
      await b.put("missing", "x", { onlyIf: { etagMatches: "nope" } }),
    ).toBeNull();
    await b.put("k", "v");
    const { etag } = (await b.get("k"))!;
    b.injectConflicts(1);
    expect(await b.put("k", "x", { onlyIf: { etagMatches: etag } })).toBeNull();
    expect(
      await b.put("k", "y", { onlyIf: { etagMatches: etag } }),
    ).not.toBeNull();
  });

  it("supports create-only writes", async () => {
    const b = new Bucket();
    expect(
      await b.put("new", "1", { onlyIf: { etagDoesNotMatch: "*" } }),
    ).not.toBeNull();
    expect(
      await b.put("new", "2", { onlyIf: { etagDoesNotMatch: "*" } }),
    ).toBeNull();
  });

  it("pages a listing with a cursor", async () => {
    const b = new Bucket();
    for (const k of ["p/1", "p/2", "p/3", "q/1"]) await b.put(k, "x");
    const page1 = await b.list({ prefix: "p/", limit: 2 });
    expect(page1.objects.map((o) => o.key)).toEqual(["p/1", "p/2"]);
    expect(page1.truncated).toBe(true);
    const page2 = await b.list({
      prefix: "p/",
      limit: 2,
      cursor: page1.cursor,
    });
    expect(page2.objects.map((o) => o.key)).toEqual(["p/3"]);
    expect(page2.truncated).toBe(false);
  });
});
