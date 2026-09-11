/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { isToolActive, isViewActive, matchesPath, navItems } from "./nav-items";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";

describe("nav items", () => {
  beforeEach(() => {
    sessionModeStore.isGuestMode = false;
    discoveryPolicyStore.aiDisabled = false;
    vault.isInitialized = true;
    vaultRegistry.activeVaultId = "vault-1";
    vault.status = "idle";
  });

  const byId = (id: string) => navItems().find((i) => i.id === id);

  describe("matchesPath", () => {
    it("matches a path exactly", () => {
      expect(matchesPath("/map", "/map")).toBe(true);
    });

    it("matches a nested path", () => {
      expect(matchesPath("/map", "/map/atlas")).toBe(true);
    });

    // The bug this replaced: /tables starts with /table.
    it("does not match a longer sibling segment", () => {
      expect(matchesPath("/table", "/tables")).toBe(false);
      expect(matchesPath("/deck", "/decks")).toBe(false);
    });

    it("ignores trailing slashes on either side", () => {
      expect(matchesPath("/decks/", "/decks")).toBe(true);
      expect(matchesPath("/decks", "/decks/")).toBe(true);
    });

    // The root has no segment to anchor on, so a prefix test matches the
    // entire app.
    it("matches the app root only at the root, not every route beneath it", () => {
      expect(matchesPath("/", "/")).toBe(true);
      expect(matchesPath("/", "/map")).toBe(false);
      expect(matchesPath("/", "/tables/deep")).toBe(false);
    });
  });

  describe("placement", () => {
    it("demotes the items that lose least from a second tap", () => {
      const overflow = navItems()
        .filter((i) => i.placement === "overflow")
        .map((i) => i.id);

      expect(overflow).toEqual([
        "adventure",
        "random",
        "generators",
        "shelf",
        "quicknote",
        "guest-chat",
      ]);
    });

    it("keeps the primary views in the bar", () => {
      const bar = navItems()
        .filter((i) => i.group === "view" && i.placement === "bar")
        .map((i) => i.id);

      expect(bar).toEqual(["graph", "map", "canvas", "timeline", "table"]);
    });

    it("drops the vault-only tools in guest mode", () => {
      sessionModeStore.isGuestMode = true;

      const ids = navItems().map((i) => i.id);

      expect(ids).not.toContain("generators");
      expect(ids).not.toContain("shelf");
      expect(ids).not.toContain("quicknote");
    });

    it("drops generators when no vault is initialized", () => {
      vault.isInitialized = false;

      const ids = navItems().map((i) => i.id);

      expect(ids).not.toContain("generators");
      expect(ids).toContain("shelf");
      expect(ids).toContain("quicknote");
    });

    it("drops generators while the active vault is loading", () => {
      vault.status = "loading";

      expect(navItems().map((item) => item.id)).not.toContain("generators");
    });

    it("drops generators when there is no active vault", () => {
      vaultRegistry.activeVaultId = null;

      expect(navItems().map((item) => item.id)).not.toContain("generators");
    });
  });

  describe("active state", () => {
    it("lights the random slot from either of its routes", () => {
      const random = byId("random")!;

      expect(isViewActive(random, "/tables")).toBe(true);
      expect(isViewActive(random, "/decks")).toBe(true);
      expect(isViewActive(random, "/table")).toBe(false);
    });

    it("does not light the entity table from the random tables route", () => {
      expect(isViewActive(byId("table")!, "/tables")).toBe(false);
      expect(isViewActive(byId("table")!, "/table")).toBe(true);
    });

    it("lights the graph at the root but nowhere else", () => {
      expect(isViewActive(byId("graph")!, "/")).toBe(true);
      expect(isViewActive(byId("graph")!, "/map")).toBe(false);
    });

    it("lights Play only for the dedicated adventure workspace", () => {
      const adventure = byId("adventure")!;

      expect(isViewActive(adventure, "/adventure")).toBe(true);
      expect(isViewActive(adventure, "/oracle")).toBe(false);
    });

    it("never lights a tool by path", () => {
      expect(isViewActive(byId("oracle")!, "/oracle")).toBe(false);
    });
  });

  describe("tool active state", () => {
    it("lights generators when generatorWorkflow is open", () => {
      const gen = byId("generators")!;
      modalUIStore.closeGeneratorWorkflow();
      expect(isToolActive(gen)).toBe(false);

      modalUIStore.openGeneratorWorkflow();
      expect(isToolActive(gen)).toBe(true);

      modalUIStore.closeGeneratorWorkflow();
      expect(isToolActive(gen)).toBe(false);
    });

    it("toggles the generator workflow when action is invoked", () => {
      const gen = byId("generators")!;
      modalUIStore.closeGeneratorWorkflow();

      gen.action?.();
      expect(modalUIStore.generatorWorkflow.open).toBe(true);

      gen.action?.();
      expect(modalUIStore.generatorWorkflow.open).toBe(false);
    });
  });
});
