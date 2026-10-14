import { describe, it, expect } from "vitest";
import {
  SYSTEM_NEUTRAL_ID,
  TOV_SYSTEM_ID,
  SYSTEM_NEUTRAL_PROFILE,
  TOV_SYSTEM_PROFILE,
  GameSystemRegistry,
  gameSystemRegistry,
  resolveGameSystemProfile,
  GameSystemProfileSchema,
} from "./game-system";
import { EntitySchema } from "./entity";

describe("GameSystemProfile & Registry", () => {
  it("defines valid default neutral and Tales of the Valiant profiles", () => {
    expect(SYSTEM_NEUTRAL_PROFILE.id).toBe(SYSTEM_NEUTRAL_ID);
    expect(SYSTEM_NEUTRAL_PROFILE.isDefault).toBe(true);
    expect(SYSTEM_NEUTRAL_PROFILE.capabilities.hasLuck).toBe(false);

    expect(TOV_SYSTEM_PROFILE.id).toBe(TOV_SYSTEM_ID);
    expect(TOV_SYSTEM_PROFILE.isDefault).toBe(false);
    expect(TOV_SYSTEM_PROFILE.capabilities.hasLuck).toBe(true);
    expect(TOV_SYSTEM_PROFILE.capabilities.hasDoom).toBe(true);
    expect(TOV_SYSTEM_PROFILE.capabilities.supportedResources).toContain(
      "luck",
    );
    expect(TOV_SYSTEM_PROFILE.provenance?.license).toBe("CC-BY-4.0");

    expect(GameSystemProfileSchema.parse(SYSTEM_NEUTRAL_PROFILE)).toBeDefined();
    expect(GameSystemProfileSchema.parse(TOV_SYSTEM_PROFILE)).toBeDefined();
  });

  it("lists all registered profiles with system-neutral default", () => {
    const list = gameSystemRegistry.list();
    expect(list.some((p) => p.id === SYSTEM_NEUTRAL_ID)).toBe(true);
    expect(list.some((p) => p.id === TOV_SYSTEM_ID)).toBe(true);
  });

  it("returns system-neutral profile for undefined, null, or empty string", () => {
    expect(gameSystemRegistry.get(undefined).id).toBe(SYSTEM_NEUTRAL_ID);
    expect(gameSystemRegistry.get(null).id).toBe(SYSTEM_NEUTRAL_ID);
    expect(gameSystemRegistry.get("").id).toBe(SYSTEM_NEUTRAL_ID);
    expect(gameSystemRegistry.get("   ").id).toBe(SYSTEM_NEUTRAL_ID);
    expect(gameSystemRegistry.get("generic").id).toBe(SYSTEM_NEUTRAL_ID);
    expect(gameSystemRegistry.get("neutral").id).toBe(SYSTEM_NEUTRAL_ID);
  });

  it("returns registered profile when requested by ID", () => {
    const tov = gameSystemRegistry.get(TOV_SYSTEM_ID);
    expect(tov.id).toBe(TOV_SYSTEM_ID);
    expect(tov.label).toBe("Tales of the Valiant");
    expect(tov.capabilities.hasLuck).toBe(true);
  });

  it("gracefully handles unknown/custom system IDs without rewriting or corrupting", () => {
    const custom = gameSystemRegistry.get("homebrew-space-opera");
    expect(custom.id).toBe("homebrew-space-opera");
    expect(custom.label).toBe("homebrew-space-opera");
    expect(custom.isDefault).toBe(false);
    expect(custom.capabilities.hasLuck).toBe(false);
  });

  it("allows registering custom and future system profiles dynamically", () => {
    const registry = new GameSystemRegistry();
    registry.register({
      id: "pf2e",
      label: "Pathfinder 2e",
      description: "Pathfinder Second Edition system profile",
      isDefault: false,
      capabilities: {
        supportedResources: ["hp", "focus"],
        hasLuck: false,
        hasDoom: false,
      },
    });

    expect(registry.has("pf2e")).toBe(true);
    const pf2e = registry.get("pf2e");
    expect(pf2e.label).toBe("Pathfinder 2e");
    expect(pf2e.capabilities.supportedResources).toContain("focus");
  });

  describe("Resolution Precedence: entity > vault > neutral", () => {
    it("resolves to entity system ID when entity has explicit systemId", () => {
      const resolved = resolveGameSystemProfile({
        entitySystemId: TOV_SYSTEM_ID,
        vaultSystemId: "generic",
      });
      expect(resolved.id).toBe(TOV_SYSTEM_ID);
    });

    it("resolves to vault system ID when entity has no systemId", () => {
      const resolved = resolveGameSystemProfile({
        entitySystemId: null,
        vaultSystemId: TOV_SYSTEM_ID,
      });
      expect(resolved.id).toBe(TOV_SYSTEM_ID);
    });

    it("prefers explicit entity override over different vault system", () => {
      const resolved = resolveGameSystemProfile({
        entitySystemId: "pf2e",
        vaultSystemId: TOV_SYSTEM_ID,
      });
      expect(resolved.id).toBe("pf2e");
    });

    it("falls back to system neutral when neither entity nor vault specifies a profile", () => {
      expect(resolveGameSystemProfile().id).toBe(SYSTEM_NEUTRAL_ID);
      expect(
        resolveGameSystemProfile({
          entitySystemId: undefined,
          vaultSystemId: undefined,
        }).id,
      ).toBe(SYSTEM_NEUTRAL_ID);
      expect(
        resolveGameSystemProfile({
          entitySystemId: "",
          vaultSystemId: "   ",
        }).id,
      ).toBe(SYSTEM_NEUTRAL_ID);
    });
  });

  describe("EntitySchema systemId integration", () => {
    it("validates entities with optional systemId", () => {
      const parsed = EntitySchema.parse({
        id: "hero-1",
        title: "Aric",
        type: "character",
        systemId: TOV_SYSTEM_ID,
      });
      expect(parsed.systemId).toBe(TOV_SYSTEM_ID);
    });

    it("preserves backward compatibility for entities without systemId", () => {
      const parsed = EntitySchema.parse({
        id: "lore-1",
        title: "Ancient Ruins",
        type: "location",
      });
      expect(parsed.systemId).toBeUndefined();
    });
  });
});
