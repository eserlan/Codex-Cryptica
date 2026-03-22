import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

// Mock OPFS utils
const mockOpfsMethods = vi.hoisted(() => ({
  getOpfsRoot: vi.fn(),
  getVaultDir: vi.fn(),
  readFileAsText: vi.fn(),
  writeOpfsFile: vi.fn(),
}));

vi.mock("../utils/opfs", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getOpfsRoot: mockOpfsMethods.getOpfsRoot,
    getVaultDir: mockOpfsMethods.getVaultDir,
    readFileAsText: mockOpfsMethods.readFileAsText,
    writeOpfsFile: mockOpfsMethods.writeOpfsFile,
  };
});

import { themeStore } from "./theme.svelte";
import { DEFAULT_JARGON } from "schema";
import { vault } from "./vault.svelte";

describe("ThemeStore Jargon", () => {
  beforeEach(() => {
    themeStore.setTheme("fantasy");
    themeStore.previewTheme(null);
  });

  it("should provide default jargon when no theme jargon is defined", () => {
    // Modern theme currently has no jargon defined
    themeStore.setTheme("modern");
    expect(themeStore.jargon.vault).toBe(DEFAULT_JARGON.vault);
    expect(themeStore.resolveJargon("save")).toBe(DEFAULT_JARGON.save);
  });

  it("should provide theme-specific jargon when defined", () => {
    themeStore.setTheme("fantasy");
    expect(themeStore.jargon.vault).toBe("Archive");
    expect(themeStore.jargon.lore_header).toBe("Ancient Inscription");
    expect(themeStore.jargon.tab_status).toBe("Attributes");
    expect(themeStore.resolveJargon("save")).toBe("Inscribe");
  });

  it("should handle pluralization correctly", () => {
    themeStore.setTheme("fantasy");
    // Fantasy entity is "Chronicle", plural "Chronicles"
    expect(themeStore.resolveJargon("entity", 1)).toBe("Chronicle");
    expect(themeStore.resolveJargon("entity", 5)).toBe("Chronicles");
    expect(themeStore.resolveJargon("entity", 0)).toBe("Chronicles");
  });

  it("should fallback to singular if plural key is missing", () => {
    themeStore.setTheme("modern");
    // If we only have 'save' and ask for 'save_plural' (not that we would),
    // but testing the fallback logic in resolveJargon
    expect(themeStore.resolveJargon("save", 5)).toBe("Save");
  });
});

describe("ThemeStore Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    themeStore.setTheme("fantasy");
  });

  it("should save theme to localStorage", () => {
    themeStore.setTheme("scifi");
    expect(localStorage.getItem("codex-cryptica-active-theme")).toBe("scifi");
  });

  it("should use localStorage on init if no vault active", async () => {
    localStorage.setItem("codex-cryptica-active-theme", "cyberpunk");
    await themeStore.init();
    expect(themeStore.currentThemeId).toBe("cyberpunk");
  });

  it("should load vault-specific theme and update localStorage", async () => {
    const { getDB } = await import("../utils/idb");
    const db = await getDB();
    await db.put("settings", "modern", "theme_my-vault");

    // Set to scifi first
    await themeStore.setTheme("scifi");

    await themeStore.loadForVault("my-vault");

    expect(themeStore.currentThemeId).toBe("modern");
    expect(localStorage.getItem("codex-cryptica-active-theme")).toBe("modern");
  });

  it("should NOT reset to default if vault theme is missing", async () => {
    // Set to cyberpunk first
    await themeStore.setTheme("cyberpunk");

    // Load for a vault that doesn't exist/has no theme
    await themeStore.loadForVault("non-existent");

    expect(themeStore.currentThemeId).toBe("cyberpunk");
    expect(localStorage.getItem("codex-cryptica-active-theme")).toBe(
      "cyberpunk",
    );
  });
});

describe("ThemeStore OPFS Persistence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("should load theme from OPFS config.json", async () => {
    mockOpfsMethods.getOpfsRoot.mockResolvedValue({});
    mockOpfsMethods.getVaultDir.mockResolvedValue({});
    mockOpfsMethods.readFileAsText.mockResolvedValue(
      JSON.stringify({ theme: "scifi" }),
    );

    await themeStore.loadForVault("vault-1");

    expect(themeStore.currentThemeId).toBe("scifi");
    expect(localStorage.getItem("codex-cryptica-active-theme")).toBe("scifi");
  });

  it("should fallback to IDB if OPFS config is missing", async () => {
    mockOpfsMethods.getOpfsRoot.mockResolvedValue({});
    mockOpfsMethods.getVaultDir.mockResolvedValue({});
    mockOpfsMethods.readFileAsText.mockRejectedValue(new Error("Not found"));

    const { getDB } = await import("../utils/idb");
    const db = await getDB();
    await db.put("settings", "horror", "theme_vault-2");

    await themeStore.loadForVault("vault-2");

    expect(themeStore.currentThemeId).toBe("horror");
  });

  it("should save theme to both IDB and OPFS", async () => {
    mockOpfsMethods.getOpfsRoot.mockResolvedValue({});
    mockOpfsMethods.getVaultDir.mockResolvedValue({});
    mockOpfsMethods.readFileAsText.mockRejectedValue(new Error("Not found")); // First save

    // Set active vault so setTheme knows where to save
    vi.spyOn(vault, "activeVaultId", "get").mockReturnValue("vault-3");

    await themeStore.setTheme("cyberpunk");

    // Verify IDB
    const { getDB } = await import("../utils/idb");
    const db = await getDB();
    const idbStored = await db.get("settings", "theme_vault-3");
    expect(idbStored).toBe("cyberpunk");

    // Verify OPFS call
    expect(mockOpfsMethods.writeOpfsFile).toHaveBeenCalledWith(
      [".codex", "config.json"],
      expect.stringContaining('"theme": "cyberpunk"'),
      expect.any(Object),
      "vault-3",
    );
  });
});
