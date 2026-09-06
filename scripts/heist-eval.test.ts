import { describe, expect, it, vi } from "vitest";
import {
  gradeHeist,
  generateViaProxy,
  splitSections,
  wordCount,
  type HeistDraft,
} from "./heist-eval";
import { generateHeistLocal } from "../packages/generator-engine/src/public-heist";
import { heistStateCases } from "./fixtures/heist-state-cases";

describe("heist evaluation pipeline", () => {
  it("evaluates the reviewed output and sends the original as chat history", async () => {
    const initial = generateHeistLocal({ heistType: "Rescue" }, () => 0.9);
    const final = {
      ...initial,
      title: "Reviewed Rescue",
      content: initial.content.replace(
        "### The Score",
        "### The Score\nReviewed success condition.",
      ),
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ content: JSON.stringify(initial) }),
      )
      .mockResolvedValueOnce(Response.json({ content: JSON.stringify(final) }));
    const output = await generateViaProxy(
      "http://localhost:8787",
      "Rescue",
      "Classic Fantasy",
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    const sent = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(sent.messages[2]).toEqual({
      role: "assistant",
      content: JSON.stringify(initial),
    });
    expect(sent.messages[3].content).toContain(
      "silently reconstruct its sequence of states",
    );
    expect(output.content).toContain("Reviewed success condition");
    expect(output.review?.status).toBe("accepted");
  });

  it("reports a failed review while retaining the original", async () => {
    const initial = generateHeistLocal({ heistType: "Theft" }, () => 0.5);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ content: JSON.stringify(initial) }),
      )
      .mockRejectedValueOnce(new Error("offline"));
    const output = await generateViaProxy(
      "http://localhost:8787",
      "Theft",
      "Classic Fantasy",
      fetcher,
    );
    expect(output.review?.status).toBe("failed");
    expect(output.content).toContain("### The Score");
  });

  it("replays each synthetic case in one review call and preserves its human rubric", async () => {
    const fixtures = heistStateCases();
    expect(fixtures).toHaveLength(5);
    for (const fixture of fixtures) {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ content: JSON.stringify(fixture.draft) }),
        );
      const output = await generateViaProxy(
        "http://localhost:8787",
        fixture.prompt.resolved.heistType,
        fixture.prompt.resolved.genre,
        fetcher,
        fixture,
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(output.review?.criteria).toEqual(fixture.criteria);
      expect(output.review?.original.lore).toBe(fixture.draft.lore);
    }
  });
});

/**
 * A draft that satisfies the contract. Each test bends exactly one thing, so
 * a failure names the rule that broke rather than "the fixture is wrong".
 */
function goodDraft(overrides: Partial<HeistDraft> = {}): HeistDraft {
  return {
    heistType: "Theft",
    genre: "Classic Fantasy",
    content: [
      "### The Score",
      "One night to lift it.",
      "",
      "### The Prize",
      "A glass tablet.",
      "- **The catch**: Fragile — a hard knock ruins it and the job pays nothing.",
      "- **Pressure**: Three marks and it is ruined.",
      "",
      "### Casing the Target",
      "- **Entry vector**: A side door.",
    ].join("\n"),
    lore: [
      "### GM Quick Reference",
      "- **Objective**: Lift the tablet.",
      "",
      "### The Hidden Factor",
      "A deacon sleeps downstairs.",
      "",
      "### Security Rings",
      "- **Perimeter**: Wardens.",
      "",
      "### Alarm Track",
      "- **0 — Quiet**: calm",
      "- **1 — Suspicion**: a warden doubles back",
      "- **2 — Alert**: doors watched",
      "- **3 — Lockdown**: bars drop",
      "- **4 — Lethal Response**: the guard wakes",
      "",
      "### Complications",
      "- **The buyer is early (default)**: He waits in the nave.",
      "",
      "### When the Prize Is Taken",
      "The bells ring.",
      "",
      "### The Getaway",
      "The way in is gone.",
      "",
      "### Flashback Opportunities",
      "- A bribed chorister",
      "- Forged papers",
      "- A cached crowbar",
      "- Prior reconnaissance",
    ].join("\n"),
    ...overrides,
  };
}

const kinds = (draft: HeistDraft) => gradeHeist(draft).map((f) => f.kind);

describe("splitSections", () => {
  it("splits on markdown headings and keeps their bodies", () => {
    const sections = splitSections("### A\none\n\n### B\ntwo");
    expect(sections.map((s) => s.heading)).toEqual(["A", "B"]);
    expect(sections[0].body.trim()).toBe("one");
  });

  it("ignores text before the first heading", () => {
    expect(splitSections("preamble\n### A\nbody")).toHaveLength(1);
  });
});

describe("gradeHeist", () => {
  it("passes a draft that meets the contract", () => {
    expect(gradeHeist(goodDraft())).toEqual([]);
  });

  it("catches a repeated heading", () => {
    const draft = goodDraft();
    draft.lore += "\n\n### Security Rings\n- **Perimeter**: again";
    expect(kinds(draft)).toContain("duplicate-section");
  });

  it("catches a heading with nothing under it", () => {
    const draft = goodDraft();
    draft.lore += "\n\n### Aftermath\n";
    expect(kinds(draft)).toContain("empty-section");
  });

  it("catches a missing required section", () => {
    const draft = goodDraft();
    draft.lore = draft.lore.replace(/### Flashback Opportunities[\s\S]*$/, "");
    expect(kinds(draft)).toContain("missing-section");
  });

  it("catches the wrong point-of-no-return heading for the type", () => {
    const draft = goodDraft({ heistType: "Plant Evidence" });
    expect(kinds(draft)).toContain("moment-heading");
    expect(kinds(draft)).toContain("theft-terminology");
  });

  it("catches a catch drawn from the wrong pool", () => {
    const draft = goodDraft({ heistType: "Assassination" });
    // "Fragile" is an object catch; an assassination draws from the deed pool.
    expect(kinds(draft)).toContain("catch-kind");
  });

  it("catches one game system's mechanics in neutral output", () => {
    const draft = goodDraft();
    draft.lore = draft.lore.replace(
      "The bells ring.",
      "The bells ring for one round.",
    );
    expect(kinds(draft)).toContain("system-mechanics");
  });

  it("catches removal wording on a job that removes nothing", () => {
    const draft = goodDraft({ heistType: "Sabotage" });
    draft.content = draft.content.replace(
      "A glass tablet.",
      "The prize sits in its cradle.",
    );
    expect(kinds(draft)).toContain("removal-wording");
  });

  it("catches the same sentence under two headings", () => {
    const draft = goodDraft();
    const repeated =
      "The sacristan drinks before he locks the choristers' side door.";
    draft.lore = draft.lore
      .replace("A deacon sleeps downstairs.", repeated)
      .replace("The way in is gone.", repeated);
    expect(kinds(draft)).toContain("verbatim-repeat");
  });

  it("catches a missing alarm level and a miscounted default marker", () => {
    const draft = goodDraft();
    draft.lore = draft.lore.replace("- **3 — Lockdown**: bars drop\n", "");
    draft.lore += "\n- **Another (default)**: second marker";
    expect(kinds(draft)).toContain("alarm-level");
    expect(kinds(draft)).toContain("default-marker");
  });

  it("catches a flashback list outside four to six entries", () => {
    const draft = goodDraft();
    draft.lore += "\n- five\n- six\n- seven";
    expect(kinds(draft)).toContain("flashback-count");
  });
});

describe("wordCount", () => {
  it("counts both fields together", () => {
    expect(
      wordCount({
        heistType: "Theft",
        genre: "x",
        content: "a b",
        lore: "c d e",
      }),
    ).toBe(5);
  });
});
