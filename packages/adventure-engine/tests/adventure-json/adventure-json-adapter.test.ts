import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  adventureSourcePackageToAdventureJson,
  validateAdventureJson,
} from "../../src/adventure-json";
import {
  approveAdventurePackage,
  parseAdventureMarkdown,
  type AdventureSourcePackage,
} from "../../src/source-package";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const REFERENCE_MD_PATH = resolve(
  REPO_ROOT,
  "fixtures/adventures/reference-one-shot/adventure.md",
);
const CONTRADICTORY_MD_PATH = resolve(
  REPO_ROOT,
  "fixtures/adventures/reference-one-shot/variants/contradictory.md",
);

describe("AdventureSourcePackage -> AdventureJsonV1 adapter", () => {
  it("converts an approved AdventureSourcePackage into a valid AdventureJsonV1 document", async () => {
    const markdown = readFileSync(REFERENCE_MD_PATH, "utf8");
    const parsed = await parseAdventureMarkdown(markdown, {
      fileName: "adventure.md",
      title: "The Last Grind",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const approved = approveAdventurePackage(parsed.package);
    const v1 = adventureSourcePackageToAdventureJson(approved);
    const validation = validateAdventureJson(v1);

    expect(validation.ok).toBe(true);
    expect(v1.formatVersion).toBe("adventure-json/v1");
    expect(v1.source.documentHash).toBe(approved.documentHash);
    expect(v1.scenes.length).toBe(approved.scenes.length);
    expect(v1.actors.length).toBe(approved.npcs.length);
    expect(v1.secrets.every((s) => s.visibility === "gm-only")).toBe(true);
    expect(v1.endings.length).toBe(approved.endings.length);
  });

  it("preserves unresolved ambiguities and epistemic status without fabricating details", async () => {
    const markdown = readFileSync(CONTRADICTORY_MD_PATH, "utf8");
    const parsed = await parseAdventureMarkdown(markdown, {
      fileName: "contradictory.md",
      title: "Contradictory Variant",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const v1 = adventureSourcePackageToAdventureJson(parsed.package);
    const validation = validateAdventureJson(v1);

    expect(validation.ok).toBe(true);
    expect(v1.unresolved.length).toBeGreaterThan(0);
    expect(v1.unresolved.every((u) => u.epistemicStatus === "unresolved")).toBe(
      true,
    );
  });

  it("handles empty or minimal AdventureSourcePackage records without failing validation", () => {
    const minimal: AdventureSourcePackage = {
      schemaVersion: 1,
      status: "approved",
      documentHash: "a".repeat(64),
      sourceIdentity: { fileName: "minimal.md" },
      importMethod: "markdown",
      importVersion: "1.0.0",
      sections: [
        {
          sourceId: "sec-1",
          title: "Minimal",
          level: 1,
          body: "Minimal adventure body.",
          gmOnly: false,
          provenance: "source-grounded",
        },
      ],
      scenes: [],
      npcs: [],
      clues: [],
      encounters: [],
      secrets: [],
      endings: [],
      ambiguities: [],
    };

    const v1 = adventureSourcePackageToAdventureJson(minimal);
    const validation = validateAdventureJson(v1);
    expect(validation.ok).toBe(true);
  });

  it("preserves unknown progression and unmappable branches in unresolved without inventing transitions", () => {
    const pkg: AdventureSourcePackage = {
      schemaVersion: 1,
      status: "approved",
      documentHash: "b".repeat(64),
      sourceIdentity: { fileName: "disconnected.md" },
      importMethod: "markdown",
      importVersion: "1.0.0",
      sections: [
        {
          sourceId: "scene-1",
          title: "Dockside",
          level: 1,
          body: "Arrival at the foggy quay.",
          gmOnly: false,
          provenance: "source-grounded",
        },
        {
          sourceId: "scene-2",
          title: "Hidden Crypt",
          level: 2,
          body: "A disconnected crypt scene.",
          gmOnly: false,
          provenance: "source-grounded",
        },
      ],
      scenes: [
        {
          sourceId: "scene-1",
          title: "Dockside",
          conditions: [],
          branches: [
            {
              description: "Follow the courier into an unknown alley",
            },
            {
              description: "Board the missing ferry",
              targetSourceId: "missing-scene",
            },
          ],
          provenance: "source-grounded",
        },
        {
          sourceId: "scene-2",
          title: "Hidden Crypt",
          conditions: [],
          branches: [],
          provenance: "source-grounded",
        },
      ],
      npcs: [],
      clues: [],
      encounters: [],
      secrets: [],
      endings: [],
      ambiguities: [],
    };

    const v1 = adventureSourcePackageToAdventureJson(pkg);
    expect(v1.scenes[0]?.branches).toBeUndefined();
    expect(v1.scenes[1]?.epistemicStatus).toBe("ambiguous");
    expect(v1.unresolved.map((u) => u.code)).toEqual([
      "UNRESOLVED_BRANCH_TARGET",
      "UNRESOLVED_BRANCH_TARGET",
      "UNKNOWN_SCENE_PROGRESSION",
    ]);
    expect(v1.unresolved[0]?.message).toBe(
      "Follow the courier into an unknown alley",
    );
    expect(v1.unresolved[1]?.context).toBe("missing-scene");
    expect(validateAdventureJson(v1).ok).toBe(true);
  });
});
