import { describe, expect, it } from "vitest";
import { FEATURE_HINTS, HINT_KEYS } from "./help-feature-hints";
import * as publicHelp from "./help-content";

describe("feature hints", () => {
  it("preserves the public catalogue and renders every hint by its id", () => {
    expect(publicHelp.FEATURE_HINTS).toBe(FEATURE_HINTS);
    for (const [id, hint] of Object.entries(FEATURE_HINTS)) {
      expect(hint.id).toBe(id);
      expect(hint.title.trim()).not.toBe("");
      expect(hint.content.trim()).not.toBe("");
      expect(hint.icon).toMatch(/^icon-\[lucide--[a-z0-9-]+\]$/);
    }
  });

  it("does not invent a hint for an unknown feature", () => {
    expect(FEATURE_HINTS["unknown-feature"]).toBeUndefined();
  });

  it("preserves unique device-local dismissal keys", () => {
    expect(publicHelp.HINT_KEYS).toBe(HINT_KEYS);
    expect(HINT_KEYS).toEqual({
      ORACLE_CONNECTION: "oracle-hint-seen",
      IN_APP_GENERATORS: "in-app-generators-hint-seen",
      ORACLE_MENTIONS: "oracle-mention-hint-seen",
      CREATURE_PACKS: "creature-packs-hint-seen",
      ADVENTURE: "adventure-hint-seen",
      HEX_CRAWL_AI_NOTICE: "hex-crawl-ai-notice-seen",
      HEX_REGION_HINT: "hex-region-hint-seen",
      BIOME_AI_NOTICE: "biome-ai-notice-seen",
    });
    expect(new Set(Object.values(HINT_KEYS)).size).toBe(
      Object.keys(HINT_KEYS).length,
    );
  });
});
