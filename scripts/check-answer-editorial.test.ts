import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import {
  applyBaseline,
  BASELINE_PATH,
  buildBaseline,
  checkAnswer,
  checkPublishedAt,
  escapeWorkflowCommandData,
  findBaselineIncreases,
  findStaleBaseline,
  locateLine,
  PAGES_DIR,
  slugsForChangedFiles,
  type EditorialBaseline,
  type EditorialFinding,
} from "./check-answer-editorial";
import { answers } from "../apps/web/src/lib/content/answers/pages";
import type { AnswerConfigInput } from "../apps/web/src/lib/content/answers/schema";

const DM_SLUG = "what-are-the-pros-and-cons-of-becoming-a-dungeon-master";

const cleanAnswer = (
  overrides: Partial<AnswerConfigInput> = {},
): AnswerConfigInput => ({
  slug: "how-do-i-test-an-answer",
  question: "How do I test an answer?",
  kind: "comparison",
  category: "session-prep",
  publishedAt: "2026-10-01",
  shortAnswer:
    "Check the copy against the rules a machine can decide, then leave the rest to an editor. A first-session, step-by-step pass costs 2-3 minutes.",
  sections: [
    {
      kind: "prose",
      heading: "Why",
      paragraphs: [
        "A 1st-level party moves 30 ft. per round; −2 is a penalty.",
      ],
      cta: {
        text: "Open the tool",
        href: "/tools/session-prep-builder",
        disclosure: "Free, no sign-up.",
      },
    },
    {
      kind: "list",
      heading: "Notation",
      intro: "Shorthand worth keeping:",
      items: [
        { term: "★ Person", text: "Someone worth remembering." },
        { term: "✓ Resolved", text: "Done → archived. D&D™ © Wizards." },
      ],
    },
    {
      kind: "example",
      heading: "At the table",
      paragraphs: ["The party reaches the ford at dusk."],
      items: [{ term: "Cost", text: "Time, or the rope." }],
    },
    {
      kind: "checklist",
      heading: "Before play",
      items: ["Read the scene.", "Note one complication."],
    },
    {
      kind: "table",
      heading: "Compared",
      headers: ["System", "Best fit"],
      rows: [
        ["Stonetop", "Home-base play"],
        ["Blades in the Dark", "Crew downtime"],
      ],
    },
  ],
  codexConnection: {
    heading: "Where Codex fits",
    paragraphs: ["Keep the notes linked to the places they concern."],
    linkText: "Try it",
    href: "/for/game-masters",
  },
  systemsThatSupportThis: [
    {
      system: "Blades in the Dark",
      rationale: "Clocks give the job a visible timer.",
      href: "https://bladesinthedark.com/a–b—c",
    },
  ],
  relatedTools: [
    {
      title: "Prep builder",
      description: "Builds a one-page prep sheet.",
      href: "/tools/a—b",
    },
  ],
  discovery: {
    parentCluster: "session-prep",
    primaryIntent: "how to test — an answer",
    uniqueValue: "Dashes here are registry metadata – not copy.",
  },
  seo: {
    title: "How do I test an answer?",
    description: "A practical way to test an answer.",
    canonical: "/answers/how-do-i-test-an-answer",
    image: "https://assets.codexcryptica.com/og/test.jpg",
    imageAlt: "A game master checking notes by lamplight",
  },
  ...overrides,
});

const rulesAt = (findings: EditorialFinding[]) =>
  findings.map((finding) => [finding.rule, finding.field]);

describe("checkAnswer on #4008", () => {
  const live = answers[DM_SLUG] as AnswerConfigInput;

  test("detects the two em-dash patterns from #4008 by field", () => {
    const findings = checkAnswer(
      cleanAnswer({
        sections: [
          {
            kind: "prose",
            heading: "NPCs",
            paragraphs: ["A few optional NPCs—for example, an innkeeper."],
          },
          {
            kind: "prose",
            heading: "Developments",
            paragraphs: ["Possible developments—for example, continued rain."],
          },
        ],
      }),
      { asOf: "2026-10-12" },
    );
    const errors = findings.filter((finding) => finding.severity === "error");

    expect(rulesAt(errors)).toEqual([
      ["prohibited-dash", "sections[0].paragraphs[0]"],
      ["prohibited-dash", "sections[1].paragraphs[0]"],
    ]);
    expect(errors[0].excerpt).toContain("optional NPCs—for example");
  });

  test("locates a finding on its source line", () => {
    const source =
      'shortAnswer: "A few optional NPCs—for example, an innkeeper."';
    const finding = checkAnswer(
      cleanAnswer({
        shortAnswer: "A few optional NPCs—for example, an innkeeper.",
      }),
      { asOf: "2026-10-12" },
    )[0];

    expect(locateLine(source, finding)).toBe(1);
  });

  test("passes the corrected copy with no errors", () => {
    const findings = checkAnswer(live, { asOf: "2026-10-13" });
    expect(findings).toEqual([]);
  });
});

describe("checkAnswer", () => {
  test("stays silent on a clean answer with URLs, metadata and notation symbols", () => {
    expect(checkAnswer(cleanAnswer(), { asOf: "2026-10-12" })).toEqual([]);
  });

  test("flags dashes in nested list, example, checklist, table and link fields", () => {
    const base = cleanAnswer();
    const answer = cleanAnswer({
      sections: [
        base.sections[0],
        {
          kind: "list",
          intro: "Intro – here",
          items: [{ term: "Scale —", text: "fine" }],
          outro: "Out—ro",
        },
        {
          kind: "example",
          heading: "Example",
          paragraphs: ["fine"],
          items: [{ text: "nested — item" }],
        },
        { kind: "checklist", heading: "Check", items: ["ok", "not—ok"] },
        {
          kind: "table",
          headers: ["System", "Best – fit"],
          rows: [["Stonetop", "Home—base"]],
        },
      ],
      relatedTopics: [
        { title: "Topic", description: "A — description", href: "/topics/x" },
      ],
      seo: { ...base.seo, imageAlt: "A lamplit desk — with notes" },
    });

    const fields = checkAnswer(answer, { asOf: "2026-10-12" })
      .map((finding) => finding.field)
      .sort();
    expect(fields).toEqual(
      [
        "sections[1].intro",
        "sections[1].items[0].term",
        "sections[1].outro",
        "sections[2].items[0].text",
        "sections[3].items[1]",
        "sections[4].headers[1]",
        "sections[4].rows[0][1]",
        "relatedTopics[0].description",
        "seo.imageAlt",
      ].sort(),
    );
  });

  test("flags emoji in copy but not plain notation symbols", () => {
    const findings = checkAnswer(
      cleanAnswer({ shortAnswer: "Roll well 🎲 and enjoy ✨ the ❤️ game." }),
      { asOf: "2026-10-12" },
    );
    expect(findings.map((finding) => finding.message)).toEqual([
      'Remove the emoji "🎲".',
      'Remove the emoji "✨".',
      'Remove the emoji "❤️".',
    ]);
  });

  test("flags a blank heading and an image with no alt text", () => {
    const base = cleanAnswer();
    const findings = checkAnswer(
      cleanAnswer({
        sections: [{ kind: "prose", heading: "   ", paragraphs: ["Text"] }],
        seo: { ...base.seo, imageAlt: undefined },
      }),
      { asOf: "2026-10-12" },
    );
    expect(rulesAt(findings)).toEqual([
      ["blank-text", "sections[0].heading"],
      ["image-alt-missing", "seo.imageAlt"],
    ]);
  });
});

describe("checkPublishedAt", () => {
  const at = (publishedAt: string, asOf: string) =>
    checkPublishedAt({ slug: "x", publishedAt }, asOf);

  test("accepts today and past dates", () => {
    expect(at("2026-10-12", "2026-10-12")).toEqual([]);
    expect(at("2025-01-01", "2026-10-12")).toEqual([]);
  });

  test("warns, without failing, for the #4008 next-day release date", () => {
    expect(at("2026-10-13", "2026-10-12")).toMatchObject([
      { rule: "future-date", severity: "warning" },
    ]);
    expect(at("2026-10-13", "2026-10-13")).toEqual([]);
  });

  test("fails a date more than the grace window ahead", () => {
    expect(at("2026-10-19", "2026-10-12")[0].severity).toBe("warning");
    expect(at("2026-10-20", "2026-10-12")).toMatchObject([
      { rule: "future-date", severity: "error" },
    ]);
  });

  test("fails a date that does not exist on the calendar", () => {
    expect(at("2026-02-30", "2026-10-12")).toMatchObject([
      { rule: "invalid-date", severity: "error" },
    ]);
  });
});

describe("GitHub Actions annotations", () => {
  test("escapes untrusted line breaks in annotation data", () => {
    expect(
      escapeWorkflowCommandData(
        'publishedAt: "bad\n::error file=spoofed::forged\r\n% value"',
      ),
    ).toBe('publishedAt: "bad%0A::error file=spoofed::forged%0D%0A%25 value"');
  });
});

describe("baseline", () => {
  const dash = (slug: string): EditorialFinding => ({
    rule: "prohibited-dash",
    severity: "error",
    slug,
    field: "shortAnswer",
    message: "",
  });

  test("tolerates legacy counts but blocks any increase or new file", () => {
    const baseline: EditorialBaseline = { legacy: { "prohibited-dash": 2 } };

    expect(
      applyBaseline([dash("legacy"), dash("legacy")], baseline).blocking,
    ).toEqual([]);
    expect(
      applyBaseline([dash("legacy"), dash("legacy"), dash("legacy")], baseline)
        .blocking,
    ).toHaveLength(3);
    expect(applyBaseline([dash("fresh")], baseline).blocking).toHaveLength(1);
  });

  test("always blocks a far-future date, even when the baseline lists it", () => {
    const future = checkPublishedAt(
      { slug: "legacy", publishedAt: "2026-10-30" },
      "2026-10-12",
    );
    const { blocking } = applyBaseline(future, {
      legacy: { "future-date": 5 },
    });
    expect(blocking).toHaveLength(1);
  });

  test("reports a checked answer whose legacy count dropped below its baseline", () => {
    const baseline: EditorialBaseline = {
      fixed: { "prohibited-dash": 3 },
      unchanged: { "prohibited-dash": 1 },
      unchecked: { "prohibited-dash": 4 },
    };
    expect(
      findStaleBaseline(
        ["fixed", "unchanged"],
        [dash("fixed"), dash("unchanged")],
        baseline,
      ),
    ).toEqual([
      "fixed: baseline allows 3 prohibited-dash but the file now has 1.",
    ]);
  });

  test("never records warnings or future dates", () => {
    expect(
      buildBaseline([
        dash("a"),
        { ...dash("a"), rule: "future-date", field: "publishedAt" },
        { ...dash("b"), severity: "warning" },
      ]),
    ).toEqual({ a: { "prohibited-dash": 1 } });
  });

  test("rejects baseline updates that increase an allowance", () => {
    expect(
      findBaselineIncreases(
        { legacy: { "prohibited-dash": 2 } },
        {
          legacy: { "prohibited-dash": 3 },
          "newly-broken": { emoji: 1 },
        },
      ),
    ).toEqual([
      "legacy: prohibited-dash would increase from 2 to 3.",
      "newly-broken: emoji would increase from 0 to 1.",
    ]);
    expect(
      findBaselineIncreases(
        { legacy: { "prohibited-dash": 2 } },
        { legacy: { "prohibited-dash": 1 } },
      ),
    ).toEqual([]);
  });

  test("covers every published answer, so only new violations fail", () => {
    const registry = answers as Record<string, AnswerConfigInput>;
    const latest = Object.values(registry)
      .map((answer) => answer.publishedAt)
      .sort()
      .at(-1)!;
    const findings = Object.values(registry).flatMap((answer) =>
      checkAnswer(answer, { asOf: latest }),
    );
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));

    expect(applyBaseline(findings, baseline).blocking).toEqual([]);
  });
});

describe("slugsForChangedFiles", () => {
  test("keeps only registered answer page files", () => {
    expect(
      slugsForChangedFiles(
        [
          `${PAGES_DIR}/known.ts`,
          `${PAGES_DIR}/index.ts`,
          "apps/web/src/lib/content/answers/schema.ts",
          `${PAGES_DIR}/unregistered.ts`,
        ],
        new Set(["known"]),
      ),
    ).toEqual(["known"]);
  });
});
