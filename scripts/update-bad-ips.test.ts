import { describe, expect, it } from "bun:test";
import {
  aggregateRanges,
  cidrContainsIp,
  filterKnownGood,
  findCandidates,
  isProbePath,
  fetchListItems,
  formatCandidateReport,
  mapTrafficGroups,
  mergeListItems,
  parseArgs,
  subnet24,
  waitForBulkOperation,
} from "./update-bad-ips";

const probes = ["/.env", "/.git/config", "/wp-login.php", "/xmlrpc.php"];

function eventsFor(ip: string, paths: string[], extra = {}) {
  return paths.map((path) => ({ ip, path, status: 404, count: 2, ...extra }));
}

describe("isProbePath", () => {
  it("matches known probe paths and rejects normal pages", () => {
    expect(isProbePath("/.env")).toBe(true);
    expect(isProbePath("/.git/config")).toBe(true);
    expect(isProbePath("/blog/my-post")).toBe(false);
    expect(isProbePath("/generators/npc")).toBe(false);
  });

  it("does not match ordinary routes that merely resemble probe paths", () => {
    expect(isProbePath("/xenv")).toBe(false);
    expect(isProbePath("/xgit")).toBe(false);
    expect(isProbePath("/xaws")).toBe(false);
    expect(isProbePath("/xsvn")).toBe(false);
    expect(isProbePath("/.environment-guide")).toBe(false);
  });
});

describe("formatCandidateReport", () => {
  it("totals requests and sorts busiest first", () => {
    const candidates = findCandidates([
      ...eventsFor("185.177.72.49", probes),
      ...eventsFor("203.0.113.20", probes, { count: 9 }),
    ]);
    const report = formatCandidateReport(candidates);
    expect(report).toContain("2 IP(s), 44 total request(s).");
    expect(report.indexOf("203.0.113.20")).toBeLessThan(
      report.indexOf("185.177.72.49"),
    );
    expect(report).toContain("distinctProbePaths=4");
  });
});

describe("mapTrafficGroups", () => {
  it("maps paid-plan fields, numeric ASN and verified bots", () => {
    const [event] = mapTrafficGroups([
      {
        count: 4,
        dimensions: {
          clientIP: "185.177.72.49",
          clientRequestPath: "/.env",
          clientAsn: 211590,
          edgeResponseStatus: 404,
          botManagementDecision: "verified_bot",
        },
      },
    ]);
    expect(event).toEqual({
      ip: "185.177.72.49",
      path: "/.env",
      status: 404,
      count: 4,
      asn: "211590",
      verifiedBot: true,
    });
  });

  it("maps the free-plan shape: no ASN, verifiedBotCategory as bot signal", () => {
    const [bot, human] = mapTrafficGroups([
      {
        count: 1,
        dimensions: {
          clientIP: "66.249.66.1",
          clientRequestPath: "/",
          verifiedBotCategory: "Search Engine Crawler",
        },
      },
      {
        count: 1,
        dimensions: { clientIP: "203.0.113.9", clientRequestPath: "/" },
      },
    ]);
    expect(bot.verifiedBot).toBe(true);
    expect(bot.asn).toBeUndefined();
    expect(human.verifiedBot).toBe(false);
  });
});

describe("findCandidates", () => {
  it("flags an IP hitting several distinct probe paths", () => {
    const candidates = findCandidates(eventsFor("185.177.72.49", probes));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].ip).toBe("185.177.72.49");
    expect(candidates[0].probePaths).toHaveLength(4);
  });

  it("does not flag normal browsing or a single probe path", () => {
    expect(
      findCandidates(eventsFor("203.0.113.9", ["/", "/blog", "/about"])),
    ).toHaveLength(0);
    expect(findCandidates(eventsFor("203.0.113.9", ["/.env"]))).toHaveLength(0);
  });

  it("never flags verified bots or allowlisted IPs", () => {
    expect(
      findCandidates(eventsFor("66.249.66.1", probes, { verifiedBot: true })),
    ).toHaveLength(0);
    expect(
      findCandidates(eventsFor("66.249.66.1", probes), {
        neverBlock: ["66.249.64.0/19"],
      }),
    ).toHaveLength(0);
  });

  it("flags a high-404 scanner even with one probe path", () => {
    const events = [
      ...eventsFor("198.51.100.7", ["/.env"]),
      { ip: "198.51.100.7", path: "/nope", status: 404, count: 60 },
    ];
    expect(findCandidates(events)).toHaveLength(1);
  });
});

describe("filterKnownGood", () => {
  it("drops RIOT/benign actors and keeps malicious/unknown ones", () => {
    const candidates = findCandidates([
      ...eventsFor("185.177.72.49", probes),
      ...eventsFor("203.0.113.20", probes),
    ]);
    const kept = filterKnownGood(
      candidates,
      new Map([
        ["185.177.72.49", { classification: "malicious" }],
        ["203.0.113.20", { classification: "riot" }],
      ]),
    );
    expect(kept.map((c) => c.ip)).toEqual(["185.177.72.49"]);
  });
});

describe("aggregateRanges", () => {
  it("collapses 3+ candidates in one /24 into a range and suggests busy ASNs", () => {
    const candidates = [".49", ".13", ".38", ".7", ".99"].flatMap((suffix) =>
      findCandidates(
        eventsFor(`185.177.72${suffix}`, probes, { asn: "211590" }),
      ),
    );
    const { entries, suggestedAsns } = aggregateRanges(candidates);
    expect(entries).toHaveLength(1);
    expect(entries[0].ip).toBe("185.177.72.0/24");
    expect(suggestedAsns[0]).toMatchObject({ asn: "211590" });
  });

  it("keeps singles when fewer than 3 share a /24", () => {
    const candidates = [".49", ".13"].flatMap((suffix) =>
      findCandidates(eventsFor(`185.177.72${suffix}`, probes)),
    );
    const { entries } = aggregateRanges(candidates);
    expect(entries.map((e) => e.ip).sort()).toEqual([
      "185.177.72.13",
      "185.177.72.49",
    ]);
  });
});

describe("subnet and CIDR helpers", () => {
  it("derives the /24 network and tests containment", () => {
    expect(subnet24("185.177.72.49")).toBe("185.177.72.0/24");
    expect(cidrContainsIp("185.177.72.0/24", "185.177.72.200")).toBe(true);
    expect(cidrContainsIp("185.177.72.0/24", "185.177.73.1")).toBe(false);
    expect(cidrContainsIp("185.177.72.49", "185.177.72.49")).toBe(true);
    expect(cidrContainsIp("not-a-cidr", "185.177.72.49")).toBe(false);
  });
});

describe("fetchListItems", () => {
  it("follows cursor pagination and never sends a page parameter", async () => {
    const original = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/rules/lists?")) {
        return Response.json({
          success: true,
          result: [{ id: "list-1", name: "bad_ips" }],
        });
      }
      if (url.includes("cursor=c2")) {
        return Response.json({
          success: true,
          result: [{ ip: "2.2.2.2" }],
          result_info: { cursors: { after: null } },
        });
      }
      return Response.json({
        success: true,
        result: [{ ip: "1.1.1.1", comment: "bad ip" }],
        result_info: { cursors: { after: "c2" } },
      });
    }) as typeof fetch;
    try {
      const { listId, items } = await fetchListItems("t", "acct", "bad_ips");
      expect(listId).toBe("list-1");
      expect(items).toEqual([
        { ip: "1.1.1.1", comment: "bad ip" },
        { ip: "2.2.2.2", comment: undefined },
      ]);
      expect(urls.some((u) => u.includes("cursor=c2"))).toBe(true);
      expect(urls.every((u) => !/[?&]page=/.test(u))).toBe(true);
      expect(urls.every((u) => !u.includes("per_page=1000"))).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("waitForBulkOperation", () => {
  function stubFetch(status: string) {
    const original = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return Response.json({
        success: true,
        result: { status, error: "boom" },
      });
    }) as typeof fetch;
    return {
      urls,
      restore: () => {
        globalThis.fetch = original;
      },
    };
  }

  it("resolves when the operation completes", async () => {
    const { urls, restore } = stubFetch("completed");
    try {
      await waitForBulkOperation("t", "acct", "op-1", 1_000, 1);
      expect(urls[0]).toContain("/rules/lists/bulk_operations/op-1");
      expect(urls[0]).not.toContain("bulk-operations");
    } finally {
      restore();
    }
  });

  it("rejects when the operation fails", async () => {
    const { restore } = stubFetch("failed");
    try {
      await expect(
        waitForBulkOperation("t", "acct", "op-2", 1_000, 1),
      ).rejects.toThrow("failed: boom");
    } finally {
      restore();
    }
  });

  it("rejects when the operation never completes in time", async () => {
    const { restore } = stubFetch("running");
    try {
      await expect(
        waitForBulkOperation("t", "acct", "op-3", 5, 1),
      ).rejects.toThrow("did not complete");
    } finally {
      restore();
    }
  });
});

describe("parseArgs", () => {
  it("defaults to dry-run and honours flags", () => {
    expect(parseArgs([])).toEqual({ apply: false, days: 1, maxNew: 100 });
    expect(parseArgs(["--apply", "--days", "7", "--max-new", "5"])).toEqual({
      apply: true,
      days: 7,
      maxNew: 5,
      file: undefined,
    });
    expect(parseArgs(["--apply", "--dry-run"]).apply).toBe(false);
  });
});

describe("mergeListItems", () => {
  const now = new Date("2026-11-02T00:00:00Z");

  it("preserves manual entries, adds auto entries with expiry, prunes expired auto entries", () => {
    const existing = [
      { ip: "41.194.168.122", comment: "bad ip" },
      { ip: "203.0.113.1", comment: "auto:probe-scan; expires=2026-01-01" },
      { ip: "203.0.113.2", comment: "auto:probe-scan; expires=2026-12-01" },
    ];
    const additions = [
      { ip: "185.177.72.0/24", reason: "probe-scan-range", sourceIps: [] },
    ];
    const result = mergeListItems(existing, additions, { now });
    const ips = result.items.map((i) => i.ip);
    expect(ips).toContain("41.194.168.122");
    expect(ips).toContain("203.0.113.2");
    expect(ips).not.toContain("203.0.113.1");
    expect(ips).toContain("185.177.72.0/24");
    const added = result.items.find((i) => i.ip === "185.177.72.0/24");
    expect(added?.comment).toContain("expires=2027-01-01");
    expect(result.added).toHaveLength(1);
  });

  it("drops auto singles covered by a new range but keeps manual ones", () => {
    const existing = [
      { ip: "185.177.72.10", comment: "auto:probe-scan; expires=2026-12-01" },
      { ip: "185.177.72.11", comment: "manual note" },
    ];
    const result = mergeListItems(
      existing,
      [{ ip: "185.177.72.0/24", reason: "probe-scan-range", sourceIps: [] }],
      { now },
    );
    const ips = result.items.map((i) => i.ip);
    expect(ips).not.toContain("185.177.72.10");
    expect(ips).toContain("185.177.72.11");
  });

  it("prunes expired auto entries even with no new additions", () => {
    const existing = [
      { ip: "203.0.113.1", comment: "auto:probe-scan; expires=2026-01-01" },
      { ip: "41.194.168.122", comment: "bad ip" },
    ];
    const result = mergeListItems(existing, [], { now });
    expect(result.items.map((i) => i.ip)).toEqual(["41.194.168.122"]);
    expect(result.removedExpired).toHaveLength(1);
  });

  it("caps new entries per run", () => {
    const additions = ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((ip) => ({
      ip,
      reason: "probe-scan",
      sourceIps: [ip],
    }));
    const result = mergeListItems([], additions, { now, maxNew: 2 });
    expect(result.added).toHaveLength(2);
    expect(result.items).toHaveLength(2);
  });
});
