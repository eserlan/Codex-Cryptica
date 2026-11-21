import { describe, expect, it } from "bun:test";
import {
  collectUnexpectedReveals,
  escapeMarkdownOutput,
  formatHardFailuresBlock,
  reportMarkdown,
} from "./adventure-effort-eval";

describe("adventure-effort-eval markdown escaping", () => {
  it("escapes markdown images, HTML tags, and backslashes before image markers", () => {
    expect(
      escapeMarkdownOutput(
        '![ping](https://evil.example/a.png) \\![bypass](https://evil.example/b.png) <img src="https://evil.example/c.png">',
      ),
    ).toBe(
      '\\![ping](https://evil.example/a.png) \\\\\\![bypass](https://evil.example/b.png) &lt;img src="https://evil.example/c.png"&gt;',
    );
  });

  it("returns no hard-failure block when hardFailures is empty", () => {
    expect(formatHardFailuresBlock([])).toEqual([]);
  });

  it("keeps image payloads in revealSecretIds as literal escaped text in results.md", () => {
    const hardFailures: string[] = [];
    const mdImagePayload = "![leak](https://evil.example/reveal.png)";
    const htmlImagePayload = '<img src="https://evil.example/reveal.svg">';
    const step = {
      id: "step-1-dock",
      sourceRefs: [],
      expectedBeats: [],
      revealOnSuccess: ["sec-allowed"],
    };

    const unexpected = collectUnexpectedReveals(
      step,
      [],
      {
        kind: "complete",
        narration: "You inspect the ledger.",
        revealSecretIds: ["sec-allowed", mdImagePayload, htmlImagePayload],
      },
      hardFailures,
    );

    expect(unexpected).toEqual([mdImagePayload, htmlImagePayload]);
    expect(hardFailures).toHaveLength(1);

    const markdown = reportMarkdown(
      {
        id: "test-fixture",
        title: "Test Adventure: Luna effort comparison",
        playerCharacter: { name: "Vale", description: "Scout" },
        rollOutcome: { kind: "total", value: 14, label: "Success" },
        runs: [step],
        scoringGuidance: { hardFailures: [] },
      },
      [
        {
          effort: "low",
          repeat: 1,
          passed: false,
          rubric: { passed: true },
          hardFailures,
          calls: [{ requestedEffort: "low", elapsedMs: 120 }],
          turns: [
            {
              id: "step-1-dock",
              playerAction: "Check the ledger.",
              narration: "You inspect the ledger.",
              proposal: {
                kind: "complete",
                narration: "You inspect the ledger.",
              },
              expectedBeats: [],
              forbiddenFactLeaks: [],
              unexpectedRevealIds: unexpected,
              committed: true,
              repairCount: 0,
              calls: [{ requestedEffort: "low", elapsedMs: 120 }],
            },
          ],
        },
      ],
      "http://127.0.0.1:8787",
      "https://codexcryptica.com",
      { rollOutcome: { kind: "total", value: 14, label: "Success" } },
      "2026-11-21T00:00:00.000Z",
    );

    expect(markdown).toContain("### Hard failures");
    expect(markdown).toContain("\\![leak](https://evil.example/reveal.png)");
    expect(markdown).toContain(
      '&lt;img src="https://evil.example/reveal.svg"&gt;',
    );
    expect(markdown).not.toMatch(/(^|[^\\])!\[leak\]/);
    expect(markdown).not.toContain("<img");
  });
});
