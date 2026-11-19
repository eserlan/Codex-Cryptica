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

  it("does not copy GM-only section text into unclassified premise fields", () => {
    const pkg: AdventureSourcePackage = {
      schemaVersion: 1,
      status: "approved",
      documentHash: "c".repeat(64),
      sourceIdentity: { fileName: "secrets.md" },
      importMethod: "markdown",
      importVersion: "1.0.0",
      sections: [
        {
          sourceId: "overview-secret",
          title: "Overview",
          level: 1,
          body: "GM overview secret.",
          gmOnly: true,
          provenance: "source-grounded",
        },
        {
          sourceId: "opening-secret",
          title: "Opening Scene",
          level: 2,
          body: "GM opening secret.",
          gmOnly: true,
          provenance: "source-grounded",
        },
        {
          sourceId: "public-summary",
          title: "Public Summary",
          level: 1,
          body: "A public summary.",
          gmOnly: false,
          provenance: "source-grounded",
        },
      ],
      scenes: [
        {
          sourceId: "opening-secret",
          title: "Opening Scene",
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
    expect(v1.premise.background).toBe("A public summary.");
    expect(v1.premise.hook).toBe("A public summary.");
    expect(JSON.stringify(v1.premise)).not.toContain("secret");
  });

  it("maps optionalBranch to scene optionality, not to every outgoing edge", () => {
    const pkg: AdventureSourcePackage = {
      schemaVersion: 1,
      status: "approved",
      documentHash: "d".repeat(64),
      sourceIdentity: { fileName: "optional-scene.md" },
      importMethod: "markdown",
      importVersion: "1.0.0",
      sections: [],
      scenes: [
        {
          sourceId: "optional-scene",
          title: "Optional Scene",
          conditions: [],
          branches: [
            { targetSourceId: "next-scene", description: "Continue onward." },
          ],
          optionalBranch: true,
          provenance: "source-grounded",
        },
        {
          sourceId: "next-scene",
          title: "Next Scene",
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
    expect(v1.scenes[0]?.optional).toBe(true);
    expect(v1.scenes[0]?.branches?.[0]?.optional).toBeUndefined();
  });

  it("keeps actor IDs tied to source-local IDs when names or record order change", () => {
    const pkg: AdventureSourcePackage = {
      schemaVersion: 1,
      status: "approved",
      documentHash: "e".repeat(64),
      sourceIdentity: { fileName: "actors.md" },
      importMethod: "markdown",
      importVersion: "1.0.0",
      sections: [],
      scenes: [],
      npcs: [
        {
          sourceId: "npc-a",
          name: "Mira",
          motivation: "Find the key.",
          provenance: "source-grounded",
        },
        {
          sourceId: "npc-b",
          name: "Mira",
          motivation: "Guard the door.",
          provenance: "source-grounded",
        },
      ],
      clues: [],
      encounters: [],
      secrets: [],
      endings: [],
      ambiguities: [],
    };

    const original = adventureSourcePackageToAdventureJson(pkg);
    const changed = adventureSourcePackageToAdventureJson({
      ...pkg,
      npcs: [
        { ...pkg.npcs[1]!, name: "Mira the Keeper" },
        { ...pkg.npcs[0]!, name: "Mira of Greywater" },
      ],
    });
    const originalIds = new Map(
      original.actors.map((actor) => [actor.sourceRef?.anchor, actor.id]),
    );
    const changedIds = new Map(
      changed.actors.map((actor) => [actor.sourceRef?.anchor, actor.id]),
    );

    expect(changedIds).toEqual(originalIds);
    expect(changedIds.get("npc-a")).toBe("actor-npc-a");
    expect(changedIds.get("npc-b")).toBe("actor-npc-b");
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
