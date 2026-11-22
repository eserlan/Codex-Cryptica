import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { topicEntries } from "../discovery/entries/topics";
import { listGovernedPaths } from "../discovery/governed-routes";
import type { DiscoveryEntryInput } from "../discovery/schema";
import {
  TOPIC_LISTINGS,
  buildTopicList,
  listLiveTopics,
  type TopicListing,
} from "./directory";

const ROUTES = resolve(__dirname, "../../../routes/(marketing)/topics");

const entry = (
  id: string,
  over: Partial<DiscoveryEntryInput> = {},
): DiscoveryEntryInput =>
  ({
    id,
    pageKind: "hub",
    canonicalPath: `/topics/${id}`,
    indexable: true,
    status: "live",
    ...over,
  }) as DiscoveryEntryInput;

const listing = (discoveryId: string, order: number): TopicListing => ({
  discoveryId,
  title: discoveryId,
  summary: "s",
  icon: "icon-[lucide--lock]",
  order,
});

describe("topic directory registry", () => {
  it("has exactly one listing per live indexable hub and no dangling ids", () => {
    const hubs = topicEntries.filter(
      (e) => e.pageKind === "hub" && e.status === "live" && e.indexable,
    );
    for (const hub of hubs) {
      expect(
        TOPIC_LISTINGS.filter((l) => l.discoveryId === hub.id),
      ).toHaveLength(1);
    }
    const ids = new Set(topicEntries.map((e) => e.id));
    for (const l of TOPIC_LISTINGS) expect(ids.has(l.discoveryId)).toBe(true);
  });

  it("lists hrefs that resolve to real, governed routes", () => {
    const governed = listGovernedPaths();
    for (const { href } of listLiveTopics()) {
      expect(
        existsSync(resolve(ROUTES, href.split("/")[2], "+page.svelte")),
      ).toBe(true);
      expect(governed).toContain(href);
    }
  });

  it("lists the eight expected topics in order and never the index", () => {
    expect(listLiveTopics().map((t) => t.href)).toEqual([
      "/topics/heists",
      "/topics/puzzles",
      "/topics/pirates",
      "/topics/solo-rpg",
      "/topics/dnd",
      "/topics/new-gm",
      "/topics/dnd-beginners",
      "/topics/star-systems",
    ]);
  });
});

describe("buildTopicList", () => {
  it("includes a new live, indexable entry with its listing", () => {
    const items = buildTopicList([listing("a", 1)], [entry("a")]);
    expect(items).toEqual([
      {
        href: "/topics/a",
        title: "a",
        summary: "s",
        icon: "icon-[lucide--lock]",
      },
    ]);
  });

  it.each([
    ["planned", { status: "planned" }],
    ["retired", { status: "retired" }],
    ["non-indexable", { indexable: false }],
  ] as const)("excludes %s entries", (_name, over) => {
    expect(
      buildTopicList(
        [listing("a", 1)],
        [entry("a", over as Partial<DiscoveryEntryInput>)],
      ),
    ).toEqual([]);
  });

  it("skips listings with no matching entry", () => {
    expect(buildTopicList([listing("missing", 1)], [entry("a")])).toEqual([]);
  });

  it("sorts by order, not array position", () => {
    const items = buildTopicList(
      [listing("b", 2), listing("a", 1)],
      [entry("a"), entry("b")],
    );
    expect(items.map((i) => i.href)).toEqual(["/topics/a", "/topics/b"]);
  });
});
