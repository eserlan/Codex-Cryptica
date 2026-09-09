import { describe, it, expect } from "vitest";
import {
  CONTENT_CLUSTER_SLUGS,
  HUB_THEME_SLUGS,
  PUBLIC_LABELS,
  PublicLabelSchema,
  isContentClusterSlug,
  isPublicLabel,
  labelHref,
} from "./labels";
import {
  getPublicContentByLabel,
  groupPublicLabelResults,
} from "./labels/aggregate";

describe("public label vocabulary (#2762, #2863)", () => {
  it("defines curated content cluster slugs", () => {
    expect(CONTENT_CLUSTER_SLUGS).toContain("heist");
    expect(CONTENT_CLUSTER_SLUGS).toContain("rumour");
    expect(CONTENT_CLUSTER_SLUGS).toContain("religion");
  });

  it("validates content cluster slugs with isContentClusterSlug", () => {
    expect(isContentClusterSlug("heist")).toBe(true);
    expect(isContentClusterSlug("rumour")).toBe(true);
    expect(isContentClusterSlug("religion")).toBe(true);
    expect(isContentClusterSlug("cyberpunk")).toBe(false);
    expect(isContentClusterSlug("arbitrary-tag")).toBe(false);
  });

  it("combines theme hubs and content clusters in PUBLIC_LABELS", () => {
    for (const hub of HUB_THEME_SLUGS) {
      expect(PUBLIC_LABELS).toContain(hub);
    }
    for (const cluster of CONTENT_CLUSTER_SLUGS) {
      expect(PUBLIC_LABELS).toContain(cluster);
    }
  });

  it("validates public labels with isPublicLabel", () => {
    expect(isPublicLabel("cyberpunk")).toBe(true);
    expect(isPublicLabel("fantasy")).toBe(true);
    expect(isPublicLabel("heist")).toBe(true);
    expect(isPublicLabel("rumour")).toBe(true);
    expect(isPublicLabel("religion")).toBe(true);

    expect(isPublicLabel("unknown")).toBe(false);
    expect(isPublicLabel("__proto__")).toBe(false);
    expect(isPublicLabel("constructor")).toBe(false);
  });

  it("formats /explore destination href with labelHref", () => {
    expect(labelHref("heist")).toBe("/explore?label=heist");
    expect(labelHref("space western")).toBe("/explore?label=space%20western");
  });

  it("parses valid labels and rejects invalid ones using PublicLabelSchema", () => {
    expect(PublicLabelSchema.parse("heist")).toBe("heist");
    expect(PublicLabelSchema.parse("cyberpunk")).toBe("cyberpunk");
    expect(() => PublicLabelSchema.parse("invalid-label")).toThrow();
  });
});

describe("public label content aggregation (#2762, #2863)", () => {
  it("aggregates all heist cluster resources", () => {
    const results = getPublicContentByLabel("heist");
    expect(results.length).toBeGreaterThanOrEqual(6);

    const paths = results.map((r) => r.href);
    expect(paths).toContain("/generators/heist");
    expect(paths).toContain(
      "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    );
    expect(paths).toContain(
      "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
    );
    expect(paths).toContain(
      "/examples/the-breakwater-vault-space-western-heist",
    );
    expect(paths).toContain("/examples/the-dawnheart-diadem-fantasy-heist");
    expect(paths).toContain("/examples/the-quell-extraction-cyberpunk-heist");

    const groups = groupPublicLabelResults(results);
    expect(groups.get("generator")?.length).toBe(1);
    expect(groups.get("answer")?.length).toBe(2);
    expect(groups.get("example")?.length).toBe(3);
  });

  it("aggregates all rumour cluster resources", () => {
    const results = getPublicContentByLabel("rumour");
    expect(results.length).toBeGreaterThanOrEqual(4);

    const paths = results.map((r) => r.href);
    expect(paths).toContain("/generators/rumour");
    expect(paths).toContain("/answers/how-do-you-generate-useful-rpg-rumours");
    expect(paths).toContain(
      "/answers/how-to-create-rumours-for-a-fantasy-town",
    );
    expect(paths).toContain("/examples/lowmere-six-words-rumour-table");

    const groups = groupPublicLabelResults(results);
    expect(groups.get("generator")?.length).toBe(1);
    expect(groups.get("answer")?.length).toBe(2);
    expect(groups.get("example")?.length).toBe(1);
  });

  it("aggregates all religion cluster resources", () => {
    const results = getPublicContentByLabel("religion");
    expect(results.length).toBeGreaterThanOrEqual(3);

    const paths = results.map((r) => r.href);
    expect(paths).toContain("/generators/pantheon-generator");
    expect(paths).toContain(
      "/answers/how-do-you-create-a-believable-fictional-religion",
    );
    expect(paths).toContain(
      "/examples/the-eel-wyrm-classic-fantasy-constellation",
    );

    const groups = groupPublicLabelResults(results);
    expect(groups.get("generator")?.length).toBe(1);
    expect(groups.get("answer")?.length).toBe(1);
    expect(groups.get("example")?.length).toBe(1);
  });

  it("aggregates genre theme content", () => {
    const results = getPublicContentByLabel("fantasy");
    expect(results.length).toBeGreaterThan(0);
    const kinds = new Set(results.map((r) => r.kind));
    expect(kinds.has("answer")).toBe(true);
    expect(kinds.has("example")).toBe(true);
    expect(kinds.has("for")).toBe(true);
  });

  it("returns empty array for non-existent label", () => {
    expect(getPublicContentByLabel("non-existent-label-123")).toEqual([]);
  });

  it("does not expose internal taxonomy or uncurated example kinds via explore", () => {
    // Internal discovery cluster not in PUBLIC_LABELS
    expect(getPublicContentByLabel("adventure-mapping")).toEqual([]);
    expect(getPublicContentByLabel("quest-design")).toEqual([]);
    // Example kind not in PUBLIC_LABELS
    expect(getPublicContentByLabel("character")).toEqual([]);
    expect(getPublicContentByLabel("location")).toEqual([]);
  });

  it("groups public label results by kind accurately", () => {
    const results = getPublicContentByLabel("heist");
    const grouped = groupPublicLabelResults(results);
    expect(grouped instanceof Map).toBe(true);
    const totalCount = Array.from(grouped.values()).reduce(
      (sum, list) => sum + list.length,
      0,
    );
    expect(totalCount).toBe(results.length);
  });
});
