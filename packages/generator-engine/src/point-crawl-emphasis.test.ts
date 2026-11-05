import { describe, expect, it } from "vitest";
import {
  buildPointCrawlSaveDrafts,
  generatePointCrawlNetworkLocal,
  renderPointCrawlGmSheet,
  renderPointCrawlMarkdown,
  renderPointCrawlRouteSummary,
  type PointCrawlNetwork,
} from "./index";
import { emphasisePointCrawlCues } from "./point-crawl-emphasis";

const MATCHING: ReadonlyArray<[string, string]> = [
  ["DC 13", "**DC 13**"],
  ["DC 13 Intelligence", "**DC 13 Intelligence**"],
  [
    "DC 13 Intelligence (Investigation)",
    "**DC 13 Intelligence (Investigation)**",
  ],
  [
    "Make a DC 13 Intelligence (Investigation) check.",
    "Make a **DC 13 Intelligence (Investigation)** check.",
  ],
  ["Climb with a DC 15 check.", "Climb with a **DC 15** check."],
  ["DC 13 to climb", "**DC 13** to climb"],
  ["At hour 12: the gate seals.", "**At hour 12:** the gate seals."],
  ["At minute 5: the lamps fail.", "**At minute 5:** the lamps fail."],
  ["At day 3: the tide turns.", "**At day 3:** the tide turns."],
  [
    "At hour 2: wardens arrive; a DC 14 Wisdom (Perception) check spots them.",
    "**At hour 2:** wardens arrive; a **DC 14 Wisdom (Perception)** check spots them.",
  ],
  [
    "Skip `DC 10` but bold DC 12 Strength (Athletics).",
    "Skip `DC 10` but bold **DC 12 Strength (Athletics)**.",
  ],
];

const UNCHANGED: readonly string[] = [
  "a DC of cards",
  "DCs",
  "adc",
  "At hour",
  "At hour 12",
  "`DC 13`",
  "**DC 13 Intelligence (Investigation)**",
  "**At hour 12:**",
  "The bridge sways over a misty gorge.",
  "",
];

describe("emphasisePointCrawlCues", () => {
  it.each(MATCHING)("emphasises %j", (input, expected) => {
    expect(emphasisePointCrawlCues(input)).toBe(expected);
  });

  it.each(UNCHANGED.map((input) => [input]))("leaves %j unchanged", (input) => {
    expect(emphasisePointCrawlCues(input)).toBe(input);
  });

  it.each(MATCHING)("is idempotent for %j", (input) => {
    const once = emphasisePointCrawlCues(input);
    expect(emphasisePointCrawlCues(once)).toBe(once);
  });
});

describe("point crawl rendering with emphasised cues", () => {
  const CHECK = "A sentry calls for a DC 13 Wisdom (Perception) check.";
  const BOLD_CHECK = "**DC 13 Wisdom (Perception)**";
  const EXPIRY = "At hour 12: the vault doors seal for good.";
  const BOLD_EXPIRY = "**At hour 12:**";

  function buildCrawl(): PointCrawlNetwork {
    const base = generatePointCrawlNetworkLocal({ pointCount: 6 });
    return {
      ...base,
      nodes: base.nodes.map((node, idx) =>
        idx === 0 ? { ...node, encounterOrHazard: CHECK } : node,
      ),
      routes: base.routes.map((route, idx) =>
        idx === 0 ? { ...route, risk: CHECK } : route,
      ),
      adventurePlan: {
        ...base.adventurePlan!,
        clock: {
          label: "The vault closes",
          startsAt: "crawl-start",
          budget: { value: 48, unit: "hour" },
          expiry: EXPIRY,
        },
      },
    };
  }

  it("bolds checks and clock triggers in the Markdown and GM sheet", () => {
    const crawl = buildCrawl();
    const markdown = renderPointCrawlMarkdown(crawl);
    expect(markdown).toContain(
      `Encounter / Complication:** A sentry calls for a ${BOLD_CHECK} check.`,
    );
    expect(markdown).toContain(
      `**Risk:** A sentry calls for a ${BOLD_CHECK} check.`,
    );
    expect(markdown).toContain(`Expiry: ${BOLD_EXPIRY} the vault doors seal`);
    expect(renderPointCrawlGmSheet(crawl)).toContain(
      `Expiry: ${BOLD_EXPIRY} the vault doors seal`,
    );
  });

  it("bolds the route risk in the route summary", () => {
    const crawl = buildCrawl();
    const nodesById = new Map(crawl.nodes.map((node) => [node.id, node]));
    expect(renderPointCrawlRouteSummary(crawl.routes[0]!, nodesById)).toContain(
      `**Risk:** A sentry calls for a ${BOLD_CHECK} check.`,
    );
  });

  it("bolds the encounter in the saved location lore", () => {
    const crawl = buildCrawl();
    const drafts = buildPointCrawlSaveDrafts(crawl);
    const location = drafts.find(
      (draft) => draft.sourceNodeId === crawl.nodes[0]!.id,
    );
    expect(location?.lore).toContain(
      `A sentry calls for a ${BOLD_CHECK} check.`,
    );
  });

  it("does not mutate the source crawl", () => {
    const crawl = buildCrawl();
    renderPointCrawlMarkdown(crawl);
    renderPointCrawlGmSheet(crawl);
    buildPointCrawlSaveDrafts(crawl);
    expect(crawl.nodes[0]!.encounterOrHazard).toBe(CHECK);
    expect(crawl.routes[0]!.risk).toBe(CHECK);
    expect(crawl.adventurePlan?.clock?.expiry).toBe(EXPIRY);
  });
});
