import { vault } from "$lib/stores/vault.svelte";
import { uiStore } from "$lib/stores/ui.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { base } from "$app/paths";
import type { IDemoActions } from "$lib/types/demo";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";

class DemoService implements IDemoActions {
  async startDemo(theme: string): Promise<void> {
    try {
      // 1. Map theme aliases
      const themeMap: Record<string, string> = {
        vampire: "horror",
        wasteland: "apocalyptic",
      };
      const actualTheme = themeMap[theme] || theme;

      // Allowlist of supported demo themes (after alias mapping)
      const allowedThemes = new Set([
        "fantasy",
        "horror",
        "apocalyptic",
        "scifi",
        "cyberpunk",
        "modern",
      ]);

      if (!allowedThemes.has(actualTheme)) {
        throw new Error(`Unsupported demo theme: ${theme}`);
      }

      // 2. Set UI State synchronously to lock out persistent init
      uiStore.isDemoMode = true;
      uiStore.activeDemoTheme = actualTheme;
      uiStore.dismissedLandingPage = true;
      uiStore.wasConverted = false;

      // 3. Fetch sample data
      const response = await fetch(`${base}/vault-samples/${theme}.json`);
      if (!response.ok)
        throw new Error(`Failed to load demo data for ${theme}`);
      const data = await response.json();

      // 4. Set Theme (Note: themeStore.setTheme will check isDemoMode)
      await themeStore.setTheme(actualTheme as any);

      // 5. Load into Vault
      const demoName = `${actualTheme.charAt(0).toUpperCase() + actualTheme.slice(1)} Demo`;
      await vault.loadDemoData(data, demoName);
    } catch (err) {
      console.error("[DemoService] Failed to start demo:", err);
      uiStore.setGlobalError("Failed to start demo session.");
    }
  }

  async convertToCampaign(): Promise<string> {
    try {
      const theme = uiStore.activeDemoTheme || "fantasy";
      const name = `My ${theme.charAt(0).toUpperCase() + theme.slice(1)} Campaign`;

      // 1. Create a real vault
      const vaultId = await vaultRegistry.createVault(name);

      // 2. Persist transient data to it
      await vault.persistToIndexedDB(vaultId);

      // 3. Cleanup demo state
      uiStore.isDemoMode = false;
      const activeTheme = uiStore.activeDemoTheme;
      uiStore.activeDemoTheme = null;
      uiStore.wasConverted = true;

      // Clear URL parameter to prevent re-triggering
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("demo");
        window.history.replaceState({}, "", url.toString());
      }

      // 4. Re-apply theme while NOT in demo mode to ensure it persists to IndexedDB
      if (activeTheme) {
        await themeStore.setTheme(activeTheme as any);
      }

      uiStore.notify("Campaign saved successfully!");

      return vaultId;
    } catch (err) {
      console.error("[DemoService] Conversion failed:", err);
      throw err;
    }
  }

  exitDemo(): void {
    uiStore.isDemoMode = false;
    uiStore.activeDemoTheme = null;
    uiStore.dismissedLandingPage = false;
    vault.demoVaultName = null;

    // Reload to clear transient state safely
    if (typeof window !== "undefined") {
      window.location.href = base || "/";
    }
  }

  get marketingPrompt(): string {
    const theme = uiStore.activeDemoTheme || "fantasy";
    const prompts: Record<string, string> = {
      fantasy: "Ready to build your own epic world? Start your journey here.",
      vampire: "Crave a world of darkness? Build your Vampire campaign now.",
      horror: "Crave a world of darkness? Build your Vampire campaign now.",
      scifi: "The future is yours to write. Launch your Sci-Fi universe.",
      cyberpunk: "Neon lights, dark secrets. Engineer your Cyberpunk city.",
      wasteland: "Survive and thrive. Document your post-apocalyptic saga.",
      apocalyptic: "Survive and thrive. Document your post-apocalyptic saga.",
      modern: "Capture the present. Map your modern thriller or drama.",
    };
    return prompts[theme] || prompts.fantasy;
  }
}

export const demoService = new DemoService();
