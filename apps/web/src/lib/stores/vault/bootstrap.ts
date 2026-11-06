import { asset } from "$app/paths";
import { vaultRegistry } from "../vault-registry.svelte";
import { themeStore } from "../theme.svelte";
import { debugStore } from "../debug.svelte";
import { getDB } from "../../utils/idb";
import { migrateStructure } from "./migration";
import { sessionModeStore } from "../ui/session-mode.svelte";
import { statSheetTemplates } from "../stat-sheet-templates.svelte";
import { presentationTemplates } from "../presentation-templates.svelte";
import { entityTemplateStore } from "../entity-templates/entity-template-store.svelte";
import type { VaultStore } from "../vault.svelte";
import type { VaultLifecycleManager } from "./lifecycle";

type BootstrapVault = Pick<
  VaultStore,
  | "isInitialized"
  | "defaultVisibility"
  | "migrationRequired"
  | "activeVaultId"
  | "loadFiles"
  | "status"
  | "errorMessage"
  | "loadDemoData"
>;

export class VaultBootstrap {
  constructor(
    private vault: BootstrapVault,
    private lifecycle: Pick<
      VaultLifecycleManager,
      "runMigration" | "loadEntityTemplates"
    >,
  ) {}
  async init() {
    // Guest popout tabs pre-populate the vault via applyGuestPayload before
    // this runs — skip full init so loadFiles() doesn't overwrite that data.
    if (sessionModeStore.isGuestMode) {
      this.vault.isInitialized = true;
      return;
    }

    try {
      await vaultRegistry.init();

      await this.loadPreferences();

      if (sessionModeStore.isDemoMode) {
        this.vault.isInitialized = true;
        return;
      }

      await this.migrateStorage();
      await this.loadActiveVault();
      this.notifyVaultSwitched();
      this.vault.isInitialized = true;
    } catch (err: any) {
      await this.fallBackToGuest(err);
    }
  }

  private async loadPreferences() {
    const db = await getDB();
    const pref = await db.get("settings", "defaultVisibility");
    if (pref) this.vault.defaultVisibility = pref as any;
  }

  private async migrateStorage() {
    this.vault.migrationRequired =
      (await this.lifecycle.runMigration()) ?? false;

    const opfsRoot = vaultRegistry.rootHandle;
    if (opfsRoot) {
      await migrateStructure(opfsRoot);
    }
  }

  private async loadActiveVault() {
    if (this.vault.activeVaultId) {
      const vaultId = this.vault.activeVaultId;
      // The graph is styled from the theme, so it is loaded first. Templates
      // are not needed to show the vault and load alongside its files.
      await themeStore.loadForVault(vaultId);
      await Promise.all([
        statSheetTemplates.loadForVault(vaultId),
        presentationTemplates.loadForVault(vaultId),
        this.lifecycle.loadEntityTemplates(vaultId),
        this.vault.loadFiles(),
      ]);
    }
  }

  private notifyVaultSwitched() {
    if (typeof window !== "undefined" && this.vault.activeVaultId) {
      window.dispatchEvent(
        new CustomEvent("vault-switched", {
          detail: { id: this.vault.activeVaultId },
        }),
      );
    }
  }

  private async fallBackToGuest(err: any) {
    debugStore.error("[VaultStore] Init failed", err);
    console.warn("[VaultStore] Init failed, falling back to Guest Mode", err);

    entityTemplateStore.clearForGuest();
    sessionModeStore.isGuestMode = true;
    this.vault.status = "idle";
    this.vault.errorMessage =
      err?.name === "QuotaExceededError"
        ? "Storage full. Running in Guest Mode (changes will not be saved)."
        : "Storage access denied. Running in Guest Mode.";

    try {
      const response = await fetch(asset("vault-samples/fantasy.json"));
      if (!response.ok) {
        console.warn("Failed to load fallback demo data");
        return;
      }
      const data = await response.json();
      await this.vault.loadDemoData("Welcome", (data as any).entities || data);
    } catch (fallbackErr) {
      console.warn("Failed to load fallback demo data", fallbackErr);
    } finally {
      this.vault.isInitialized = true;
      this.vault.status = "idle";
    }
  }
}
