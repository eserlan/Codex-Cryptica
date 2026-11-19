import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import {
  ADVENTURE_JSON_VALIDATION_ERROR_CODES,
  validateAdventureJson,
  type AdventureJsonV1,
} from "@codex/adventure-engine";
import AdventureImportValidationErrors from "#lib/components/oracle/adventure/AdventureImportValidationErrors.svelte";
import Page from "./+page.svelte";
import { TROUBLESHOOTING_ERRORS } from "./conversion-guide.js";
import referenceRaw from "../../../../../../fixtures/adventures/reference-one-shot/adventure.v1.json?raw";

afterEach(() => cleanup());

function baseDocument(): AdventureJsonV1 {
  return JSON.parse(referenceRaw) as AdventureJsonV1;
}

describe("troubleshooting codes match the validator", () => {
  it("only names codes the validator emits", () => {
    for (const entry of TROUBLESHOOTING_ERRORS) {
      for (const code of entry.codes) {
        expect(ADVENTURE_JSON_VALIDATION_ERROR_CODES).toContain(code);
      }
    }
  });

  it("covers every validator code exactly once", () => {
    const named = TROUBLESHOOTING_ERRORS.flatMap((entry) => [...entry.codes]);
    for (const code of ADVENTURE_JSON_VALIDATION_ERROR_CODES) {
      expect(named.filter((name) => name === code)).toHaveLength(1);
    }
    expect(named).toHaveLength(ADVENTURE_JSON_VALIDATION_ERROR_CODES.length);
  });

  it("gives every entry a cause and a fix", () => {
    for (const entry of TROUBLESHOOTING_ERRORS) {
      expect(entry.cause.trim()).not.toBe("");
      expect(entry.fix.trim()).not.toBe("");
    }
  });

  it("renders only validator codes in the troubleshooting headings", () => {
    const { container } = render(Page);
    const section = container
      .querySelector("#troubleshooting-heading")
      ?.closest("section");
    expect(section).toBeTruthy();
    const headings = [...section!.querySelectorAll("h3")].map(
      (h) => h.textContent ?? "",
    );
    expect(headings.length).toBe(TROUBLESHOOTING_ERRORS.length);
    for (const heading of headings) {
      for (const word of heading.match(/\b[A-Z][A-Z_]{3,}\b/g) ?? []) {
        expect(
          ADVENTURE_JSON_VALIDATION_ERROR_CODES as readonly string[],
        ).toContain(word);
      }
    }
  });
});

describe("importer errors, validator and guide show the same code", () => {
  const cases: [string, () => AdventureJsonV1][] = [
    [
      "HIERARCHY_CYCLE",
      () => {
        const doc = baseDocument();
        doc.locations[0]!.parentLocationId = doc.locations[1]!.id;
        return doc;
      },
    ],
    [
      "DEAD_END_CYCLE",
      () => {
        const doc = baseDocument();
        const scene = (id: string, target: string) => ({
          id,
          title: id,
          summary: "Loops with no exit",
          branches: [{ targetSceneId: target, description: "Go" }],
          visibility: "player-visible" as const,
          epistemicStatus: "explicit" as const,
        });
        doc.scenes = [scene("scene-a", "scene-b"), scene("scene-b", "scene-a")];
        doc.encounters = [];
        doc.clues = [];
        doc.secrets = [];
        return doc;
      },
    ],
    [
      "INVALID_VISIBILITY",
      () => {
        const doc = baseDocument();
        doc.secrets = [
          {
            ...doc.secrets[0]!,
            visibility: "player-visible",
          } as unknown as AdventureJsonV1["secrets"][number],
        ];
        return doc;
      },
    ],
    [
      "UNRESOLVED_REFERENCE",
      () => {
        const doc = baseDocument();
        doc.locations[0]!.parentLocationId = "loc-does-not-exist";
        return doc;
      },
    ],
  ];

  for (const [code, build] of cases) {
    it(code, () => {
      const result = validateAdventureJson(build());
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const error = result.errors.find((e) => e.code === code);
      expect(error).toBeTruthy();
      expect(error!.path).toBeTruthy();

      render(AdventureImportValidationErrors, {
        props: { errors: [error!] },
      });
      const list = screen.getByTestId("adventure-import-error-list");
      expect(list.textContent).toContain(code);
      expect(list.textContent).toContain(`path: ${error!.path}`);

      expect(
        TROUBLESHOOTING_ERRORS.some((entry) =>
          (entry.codes as readonly string[]).includes(code),
        ),
      ).toBe(true);
    });
  }
});
