import { describe, expect, it } from "bun:test";
import {
  projectGmHistoricalAnchor,
  projectPlayerHistoricalAnchor,
} from "../src/historical-anchor-projections";
import { HISTORICAL_ANCHOR_TITLE_SECRET_ID } from "../src/historical-anchor-types";
import { anchorSession, startDate } from "./historical-anchor-fixtures";
import { session } from "./reducer-fixtures";

describe("historical anchor projections", () => {
  it("returns no projection for sessions without an anchor", () => {
    expect(projectPlayerHistoricalAnchor(session())).toBeUndefined();
    expect(projectGmHistoricalAnchor(session())).toBeUndefined();
  });

  it("projects only explicitly revealed facts and title for players", () => {
    const anchored = anchorSession({
      documentedFacts: ["Known fact.", "Hidden fact."],
      relevantEntityRefs: [{ recordId: "secret-actor", displayName: "Killer" }],
    });
    const anchor = anchored.historicalAnchor!;
    anchor.revealedFactIds = ["anchor-fact-1"];
    anchor.progress.reason = "Hidden cause";

    const hiddenTitle = projectPlayerHistoricalAnchor(anchored)!;
    expect(hiddenTitle.revealedFacts).toEqual([
      { id: "anchor-fact-1", text: "Known fact." },
    ]);
    expect(hiddenTitle.title).toBeUndefined();
    expect(hiddenTitle).not.toHaveProperty("eventInterval");
    expect(hiddenTitle).not.toHaveProperty("relevantEntityRefs");
    expect(hiddenTitle.progress).not.toHaveProperty("reason");
    expect(hiddenTitle.progress).not.toHaveProperty("causalRefs");
    expect(JSON.stringify(hiddenTitle)).not.toContain("Hidden fact.");

    anchor.revealedFactIds.push(HISTORICAL_ANCHOR_TITLE_SECRET_ID);
    expect(projectPlayerHistoricalAnchor(anchored)?.title).toBe(
      anchor.baseline.title,
    );
    hiddenTitle.startDate.year = 999;
    expect(anchor.startDate).toEqual(startDate);
  });

  it("includes GM evidence and annotates reveals without changing the anchor", () => {
    const anchored = anchorSession({
      documentedFacts: ["Known fact.", "Hidden fact."],
      relevantEntityRefs: [{ recordId: "secret-actor", displayName: "Killer" }],
    });
    const anchor = anchored.historicalAnchor!;
    anchor.revealedFactIds = [
      "anchor-fact-1",
      HISTORICAL_ANCHOR_TITLE_SECRET_ID,
    ];
    const before = structuredClone(anchored);
    const gm = projectGmHistoricalAnchor(anchored)!;
    expect(gm.titleRevealed).toBe(true);
    expect(gm.documentedFacts.map((fact) => fact.revealed)).toEqual([
      true,
      false,
    ]);
    expect(gm.eventInterval).toEqual(anchor.eventInterval);
    expect(gm.relevantEntityRefs).toEqual(anchor.baseline.relevantEntityRefs);
    expect(gm.progress).toEqual(anchor.progress);
    expect(gm.drift).toEqual(anchor.drift);
    expect(anchored).toEqual(before);
  });
});
