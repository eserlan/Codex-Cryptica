import { vault } from "$lib/stores/vault.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { base } from "$app/paths";
import type { IDemoActions } from "$lib/types/demo";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { onboardingFunnel } from "$lib/app/onboarding/onboarding-funnel";

class DemoService implements IDemoActions {
  async startDemo(theme: string): Promise<void> {
    try {
      // 1. Map theme aliases to JSON files and Svelte themes
      const themeConfig: Record<string, { json: string; theme: string }> = {
        fantasy: { json: "fantasy", theme: "fantasy" },
        vampire: { json: "vampire", theme: "horror" },
        wasteland: { json: "wasteland", theme: "apocalyptic" },
        "sci-fi": { json: "scifi", theme: "scifi" },
        cyberpunk: { json: "cyberpunk", theme: "cyberpunk" },
        modern: { json: "modern", theme: "modern" },
        "space opera": { json: "starwars", theme: "scifi" },
        starfleet: { json: "startrek", theme: "scifi" },
        "stellar fleet": { json: "startrek", theme: "scifi" },
        "post-nuclear": { json: "fallout", theme: "fallout" },
      };

      const config = themeConfig[theme];
      if (!config) {
        throw new Error(`Unsupported demo theme: ${theme}`);
      }

      const { json: jsonName, theme: themeName } = config;

      // 2. Set UI State synchronously to lock out persistent init
      sessionModeStore.isDemoMode = true;
      sessionModeStore.activeDemoTheme = themeName;
      onboardingStore.dismissedLandingPage = true;
      sessionModeStore.wasConverted = false;
      onboardingFunnel.track("demo_started");

      // 3. Fetch sample data
      const response = await fetch(`${base}/vault-samples/${jsonName}.json`);
      if (!response.ok)
        throw new Error(`Failed to load demo data for ${theme}`);
      const data = await response.json();

      // 4. Set Theme (Note: themeStore.setTheme will check isDemoMode)
      await themeStore.setTheme(themeName as any);

      // 5. Load into Vault
      const demoName = `${theme.charAt(0).toUpperCase() + theme.slice(1)} Demo`;

      // Ensure registry is initialized so we have rootHandle for OPFS operations (e.g. Map uploads)
      await vaultRegistry.init();

      const entities = (data as any).entities || data;
      await vault.loadDemoData(demoName, entities);
    } catch (err) {
      console.error("[DemoService] Failed to start demo:", err);
      notificationStore.setGlobalError("Failed to start demo session.");
    }
  }

  async convertToWorld(): Promise<string> {
    try {
      const theme = sessionModeStore.activeDemoTheme || "fantasy";
      const name = `My ${theme.charAt(0).toUpperCase() + theme.slice(1)} World`;

      // 1. Create a real vault
      const vaultId = await vaultRegistry.createVault(name);

      // 2. Persist transient data to it
      await vault.persistToIndexedDB(vaultId);

      // 3. Cleanup demo state
      sessionModeStore.isDemoMode = false;
      const activeTheme = sessionModeStore.activeDemoTheme;
      sessionModeStore.activeDemoTheme = null;
      sessionModeStore.wasConverted = true;

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

      notificationStore.notify("Campaign saved successfully!");

      return vaultId;
    } catch (err) {
      console.error("[DemoService] Conversion failed:", err);
      throw err;
    }
  }

  exitDemo(): void {
    sessionModeStore.isDemoMode = false;
    sessionModeStore.activeDemoTheme = null;
    onboardingStore.dismissedLandingPage = false;
    vault.demoVaultName = null;

    // Reload to clear transient state safely
    if (typeof window !== "undefined") {
      window.location.href = base || "/";
    }
  }

  get marketingPrompt(): string {
    const theme = sessionModeStore.activeDemoTheme || "fantasy";
    const prompts: Record<string, string> = {
      fantasy: "Ready to build your own epic world? Start your journey here.",
      vampire: "Crave a world of darkness? Build your Vampire campaign now.",
      horror: "Crave a world of darkness? Build your Vampire campaign now.",
      scifi: "The future is yours to write. Launch your Sci-Fi universe.",
      cyberpunk: "Neon lights, dark secrets. Engineer your Cyberpunk city.",
      wasteland: "Survive and thrive. Document your post-apocalyptic saga.",
      apocalyptic: "Survive and thrive. Document your post-apocalyptic saga.",
      modern: "Capture the present. Map your modern thriller or drama.",
      fallout:
        "War never changes. Document your Pip-Boy logs and Vault-Tec secrets.",
    };
    return prompts[theme] || prompts.fantasy;
  }
}

export const demoService = new DemoService();
