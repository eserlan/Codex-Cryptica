import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ARTWORK_CUES,
  buildArtworkCoverageReport,
  PR_4841_ROLE_CUES,
  TRACKED_PENDING_ROLE_GAPS,
  type ArtworkAsset,
} from "../src";
import { seedArtwork } from "../src/catalogue/seed";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CATALOG_DOC_PATH = resolve(
  REPO_ROOT,
  "docs/ADVENTURE_ARTWORK_CATALOG.md",
);

function makeAsset(overrides: Partial<ArtworkAsset> = {}): ArtworkAsset {
  return {
    id: "npc-fantasy-test-01",
    version: 1,
    type: "npc",
    genres: ["fantasy"],
    primaryCues: ["innkeeper"],
    settingCues: ["tavern"],
    moodCues: ["busy"],
    timeCues: [],
    excludes: [],
    alt: "Test portrait",
    variants: {
      preview: {
        url: "https://assets.codexcryptica.com/adventure-artwork/npc-fantasy-test-01-preview-000000000000.webp",
        mime: "image/webp",
        width: 240,
        height: 320,
        bytes: 1000,
        sha256: "a".repeat(64),
      },
      display: {
        url: "https://assets.codexcryptica.com/adventure-artwork/npc-fantasy-test-01-display-000000000000.webp",
        mime: "image/webp",
        width: 768,
        height: 1024,
        bytes: 10000,
        sha256: "b".repeat(64),
      },
    },
    origin: "team-generated-ai",
    provenance: {
      tool: "generator",
      model: "model",
      generatedAt: "2026-11-15",
      prompt: "test",
      creator: "team",
      distributionBasis: "team-created",
      referencePermissions: "none",
      attribution: "Codex Cryptica",
    },
    review: {
      status: "approved",
      reviewer: "reviewer",
      date: "2026-11-15",
      notes: "ok",
    },
    ...overrides,
  };
}

describe("adventure artwork coverage report", () => {
  it("reports exact live seedArtwork counts and PR #4841 role cue eligibility", () => {
    const report = buildArtworkCoverageReport({
      assets: seedArtwork,
      cues: ARTWORK_CUES,
    });

    expect(report.totalAssets).toBe(133);
    expect(report.totalCues).toBe(85);
    expect(report.countsByType).toEqual({
      location: 43,
      npc: 68,
      scene: 6,
      atmosphere: 16,
    });
    expect(report.countsByGenreAndType.fantasy).toEqual({
      location: 25,
      npc: 48,
      scene: 6,
      atmosphere: 3,
    });
    expect(report.countsByGenreAndType.contemporary).toEqual({
      location: 5,
      npc: 20,
      scene: 0,
      atmosphere: 2,
    });
    expect(report.countsByGenreAndType["science-fiction"]).toEqual({
      location: 5,
      npc: 0,
      scene: 0,
      atmosphere: 2,
    });
    expect(report.countsByGenreAndType.horror).toEqual({
      location: 4,
      npc: 0,
      scene: 0,
      atmosphere: 3,
    });
    expect(report.countsByGenreAndType.neutral).toEqual({
      location: 4,
      npc: 0,
      scene: 0,
      atmosphere: 6,
    });

    const roleByCue = new Map(
      report.roleCues.map((entry) => [entry.cue, entry]),
    );
    expect(roleByCue.get("innkeeper")?.eligibleAssetIds).toEqual([
      "npc-fantasy-merchant-02",
    ]);
    expect(roleByCue.get("healer")?.eligibleAssetIds).toEqual([
      "npc-contemporary-medic-01",
      "npc-contemporary-medic-02",
      "npc-fantasy-cleric-01",
      "npc-fantasy-worker-02",
    ]);
    expect(roleByCue.get("smith")?.eligibleAssetIds).toEqual([
      "npc-fantasy-worker-01",
    ]);
    expect(roleByCue.get("elder")?.eligibleAssetIds).toEqual([
      "npc-fantasy-elder-01",
    ]);
    expect(roleByCue.get("official")?.eligibleAssetIds).toEqual([
      "npc-fantasy-official-01",
    ]);
    expect(roleByCue.get("urchin")?.eligibleAssetIds).toEqual([
      "npc-fantasy-urchin-01",
    ]);
    expect(roleByCue.get("goblin")?.eligibleAssetIds).toEqual([
      "npc-fantasy-goblin-01",
    ]);

    for (const cue of PR_4841_ROLE_CUES) {
      expect(roleByCue.has(cue)).toBe(true);
    }

    for (const gapCue of TRACKED_PENDING_ROLE_GAPS) {
      const entry = roleByCue.get(gapCue);
      expect(entry?.state).toBe("no image produced");
      expect(entry?.trackedPendingGap).toBe(true);
      expect(entry?.eligibleAssetIds).toEqual([]);
    }
    for (const publishedCue of ["elder", "official", "urchin", "goblin"]) {
      expect(roleByCue.get(publishedCue)?.trackedPendingGap).toBe(false);
    }

    expect(report.undocumentedRoleGaps).toEqual([]);
  });

  it("ignores alt text and URL filenames when determining cue eligibility", () => {
    const disguised = makeAsset({
      id: "npc-fantasy-unrelated-01",
      primaryCues: ["scholar"],
      alt: "Old village elder witch informant with necromancer staff",
      variants: {
        preview: {
          ...makeAsset().variants.preview,
          url: "https://assets.codexcryptica.com/adventure-artwork/npc-fantasy-elder-witch-preview-000000000000.webp",
        },
        display: {
          ...makeAsset().variants.display,
          url: "https://assets.codexcryptica.com/adventure-artwork/npc-fantasy-elder-witch-display-000000000000.webp",
        },
      },
    });

    const report = buildArtworkCoverageReport({
      assets: [disguised],
      cues: ["scholar", "elder", "witch", "informant", "necromancer"],
    });
    const roleByCue = new Map(
      report.roleCues.map((entry) => [entry.cue, entry]),
    );

    expect(roleByCue.get("scholar")?.eligibleAssetIds).toEqual([
      "npc-fantasy-unrelated-01",
    ]);
    expect(roleByCue.get("elder")?.eligibleAssetIds).toEqual([]);
    expect(roleByCue.get("witch")?.eligibleAssetIds).toEqual([]);
    expect(roleByCue.get("informant")?.eligibleAssetIds).toEqual([]);
    expect(roleByCue.get("necromancer")?.eligibleAssetIds).toEqual([]);
  });

  it("classifies all four coverage states deterministically", () => {
    const validAsset = makeAsset({
      id: "npc-fantasy-valid-01",
      primaryCues: ["innkeeper"],
    });
    const failedRemoteAsset = makeAsset({
      id: "npc-fantasy-unverified-01",
      primaryCues: ["smith"],
    });
    const mismatchedCueAsset = makeAsset({
      id: "npc-fantasy-witch-01",
      primaryCues: ["scholar"],
      excludes: ["scholar"],
    });

    // Offline (remote verification skipped) -> metadata-eligible assets are R2 unverified
    const offlineReport = buildArtworkCoverageReport({
      assets: [validAsset, failedRemoteAsset, mismatchedCueAsset],
      cues: ["innkeeper", "smith", "witch", "elder"],
      expectedRoleAssets: { witch: ["npc-fantasy-witch-01"] },
    });
    const offlineByAsset = new Map(
      offlineReport.assets.map((entry) => [entry.id, entry]),
    );
    expect(offlineByAsset.get("npc-fantasy-valid-01")).toMatchObject({
      metadataEligible: true,
      remoteStatus: "skipped",
      state: "R2 URL missing or unverified",
    });
    expect(offlineByAsset.get("npc-fantasy-witch-01")).toMatchObject({
      state: "image registered without matching cue",
    });

    const offlineRoles = new Map(
      offlineReport.roleCues.map((entry) => [entry.cue, entry]),
    );
    expect(offlineRoles.get("witch")).toMatchObject({
      state: "image registered without matching cue",
    });
    expect(offlineRoles.get("elder")).toMatchObject({
      state: "no image produced",
    });

    // Remote verification provided -> passing is valid, failing is unverified
    const verifiedReport = buildArtworkCoverageReport({
      assets: [validAsset, failedRemoteAsset, mismatchedCueAsset],
      cues: ["innkeeper", "smith", "witch", "elder"],
      remoteVerification: new Map([
        [
          "npc-fantasy-valid-01",
          { assetId: "npc-fantasy-valid-01", verified: true },
        ],
        [
          "npc-fantasy-unverified-01",
          {
            assetId: "npc-fantasy-unverified-01",
            verified: false,
            error: "HTTP 404",
          },
        ],
      ]),
    });
    const verifiedByAsset = new Map(
      verifiedReport.assets.map((entry) => [entry.id, entry]),
    );
    expect(verifiedByAsset.get("npc-fantasy-valid-01")).toMatchObject({
      state: "valid image in catalogue",
      remoteStatus: "verified",
    });
    expect(verifiedByAsset.get("npc-fantasy-unverified-01")).toMatchObject({
      state: "R2 URL missing or unverified",
      remoteStatus: "failed",
    });
    expect(verifiedByAsset.get("npc-fantasy-witch-01")).toMatchObject({
      state: "image registered without matching cue",
    });
  });

  it("guards against undocumented NPC role cues with zero eligible assets", () => {
    const report = buildArtworkCoverageReport({
      assets: seedArtwork,
      cues: ARTWORK_CUES,
      trackedPendingRoleGaps: TRACKED_PENDING_ROLE_GAPS.filter(
        (cue) => cue !== "informant",
      ),
    });

    expect(report.undocumentedRoleGaps).toEqual(["informant"]);
  });

  it("keeps docs/ADVENTURE_ARTWORK_CATALOG.md synchronized with seedArtwork and ARTWORK_CUES", () => {
    const doc = readFileSync(CATALOG_DOC_PATH, "utf8");

    expect(doc).toContain(
      "## 1. Live Inventory (133 Assets: 43 Locations, 68 NPCs, 6 Scenes, 16 Atmospheres)",
    );
    expect(doc).toContain(
      "([`cues.ts`](../packages/adventure-artwork-engine/src/cues.ts))",
    );
    expect(doc).toContain("(85 cues)");
    expect(doc).toContain("**NPC Ancestries & Classes (20)**");
    expect(doc).toContain("**NPC Roles & Archetypes (18)**");
    expect(doc).toContain("**Places / Biomes / Structures (29)**");
    expect(doc).toContain("| **Total**");
    expect(doc).toContain("**43 / 106**");
    expect(doc).toContain("**68 / 127**");
    expect(doc).toContain("**6 / 36**");
    expect(doc).toContain("**16 / 24**");
    expect(doc).toContain("**133 / 293**");
    expect(doc).toContain("48 / 53");
    expect(doc).toContain("**82 / 87**");

    const section1 = doc.slice(
      doc.indexOf("## 1. Live Inventory"),
      doc.indexOf("## 2. Locations Roadmap"),
    );
    const section1Ids = new Set(
      [...section1.matchAll(/`((?:loc|npc|scene|atmo)-[a-z0-9-]+)`/g)].map(
        (m) => m[1],
      ),
    );
    const seedIds = new Set(seedArtwork.map((asset) => asset.id));
    expect(section1Ids).toEqual(seedIds);

    const section3 = doc.slice(
      doc.indexOf("## 3. Characters / NPC Portraits Roadmap"),
      doc.indexOf("## 4. Scenes & Atmospheres Roadmap"),
    );
    expect(section3).not.toContain("npc-fantasy-guard-03");
    expect(section3).not.toContain("npc-fantasy-worker-03");
    for (const gapCue of TRACKED_PENDING_ROLE_GAPS) {
      expect(section3).toContain(`npc-fantasy-${gapCue}-01`);
    }
    for (const publishedCue of ["elder", "official", "urchin", "goblin"]) {
      expect(section3).not.toContain(`npc-fantasy-${publishedCue}-01`);
    }

    const section4 = doc.slice(
      doc.indexOf("## 4. Scenes & Atmospheres Roadmap"),
      doc.indexOf("## 5. Additional Theme & Genre Packs"),
    );
    expect(section4).toContain(
      '### Atmospheres (`type: "atmosphere"`, 16 / 16 Published)',
    );
    expect(section4).toContain(
      '### Scene Beats (`type: "scene"`, 6 / 22 Published, 16 Needed)',
    );
    for (const asset of seedArtwork) {
      if (asset.type === "atmosphere" || asset.type === "scene") {
        expect(section4).toMatch(
          new RegExp(`\\|\\s*\`${asset.id}\`\\s*\\|\\s*Published\\s*\\|`),
        );
      }
    }
  });
});
