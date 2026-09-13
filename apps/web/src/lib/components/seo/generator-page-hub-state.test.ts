import { describe, expect, it } from "vitest";
import { UIPersistence } from "$lib/stores/ui/persistence";
import {
  getHubMountPatch,
  resolveInitialActiveTheme,
} from "./generator-page-hub-state";

function memoryPersistence(
  entries: Record<string, string> = {},
): UIPersistence {
  const store = new Map(Object.entries(entries));
  return new UIPersistence({
    storage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
}

describe("resolveInitialActiveTheme", () => {
  it("prefers themed URL world theme over stored theme", () => {
    const p = memoryPersistence({ "codex-cryptica-active-theme": "fantasy" });
    expect(
      resolveInitialActiveTheme({
        urlHubTheme: "fantasy",
        slug: "npc",
        persistence: p,
        browser: true,
        fallbackTheme: "Classic Fantasy",
      }),
    ).toBe("Classic Fantasy"); // fantasy hub maps to Classic Fantasy via SOCIAL_HUB_GENRE
  });

  it("uses stored theme when no urlHubTheme and slug uses stored theme", () => {
    const p = memoryPersistence({ "codex-cryptica-active-theme": "pirate" });
    expect(
      resolveInitialActiveTheme({
        slug: "npc",
        persistence: p,
        browser: true,
        fallbackTheme: "Classic Fantasy",
      }),
    ).toBe("Pirate");
  });

  it("falls back to fallbackTheme when no url or stored theme", () => {
    const p = memoryPersistence();
    expect(
      resolveInitialActiveTheme({
        slug: "quest",
        persistence: p,
        browser: true,
        fallbackTheme: "Classic Fantasy",
      }),
    ).toBe("Classic Fantasy");
  });

  it("does not read persistence when browser is false", () => {
    const p = memoryPersistence({ "codex-cryptica-active-theme": "pirate" });
    expect(
      resolveInitialActiveTheme({
        slug: "npc",
        persistence: p,
        browser: false,
        fallbackTheme: "Classic Fantasy",
      }),
    ).toBe("Classic Fantasy");
  });

  it("maps vampire hub to horror-themed initial theme", () => {
    const p = memoryPersistence();
    expect(
      resolveInitialActiveTheme({
        urlHubTheme: "vampire",
        slug: "npc",
        persistence: p,
        browser: true,
        fallbackTheme: "Classic Fantasy",
      }),
    ).toBe("Vampire / Gothic Noir");
  });
});

describe("getHubMountPatch", () => {
  it("returns settlement patch with remapped genre for Lancer", () => {
    const patch = getHubMountPatch({ slug: "settlement", hubTheme: "lancer" });
    expect(patch?.settlement?.genre).toBe("Sci-Fi");
    expect(patch?.activeTheme).toBe("Lancer");
  });

  it("returns settlement patch for fantasy hub", () => {
    const patch = getHubMountPatch({ slug: "settlement", hubTheme: "fantasy" });
    expect(patch?.settlement?.genre).toBe("Fantasy");
    expect(patch?.activeTheme).toBe("Classic Fantasy");
  });

  it("returns nation patch with genre and theme", () => {
    const patch = getHubMountPatch({ slug: "nation", hubTheme: "cyberpunk" });
    expect(patch?.nation?.genre).toBe("Cyberpunk");
    expect(patch?.activeTheme).toBe("Cyberpunk / Corporate");
  });

  it("returns ship patch with mapped genre and role", () => {
    const patch = getHubMountPatch({
      slug: "ship-generator",
      hubTheme: "fantasy",
    });
    expect(patch?.ship?.genre).toBe("Fantasy");
    expect(typeof patch?.ship?.role).toBe("string");
    expect(patch?.activeTheme).toBe("Classic Fantasy");
  });

  it("returns world patch with world genre", () => {
    const patch = getHubMountPatch({ slug: "world", hubTheme: "lancer" });
    expect(patch?.world?.genre).toBe("Lancer");
    expect(patch?.activeTheme).toBe("Lancer");
  });

  it("returns fixed theme for vampire-clan", () => {
    const patch = getHubMountPatch({
      slug: "vampire-clan",
      hubTheme: null,
    });
    expect(patch?.activeTheme).toBe("Vampire / Gothic Noir");
  });

  it("returns pantheon patch using currentState", () => {
    const patch = getHubMountPatch({
      slug: "pantheon-generator",
      hubTheme: null,
      currentState: { pantheonGenre: "Horror" },
    });
    expect(patch?.activeTheme).toBe("Horror");
  });

  it("returns star-system patch only when hub genre is supported", () => {
    const supported = getHubMountPatch({
      slug: "star-system",
      hubTheme: "cyberpunk",
      currentState: { starSystemGenre: "Hard Sci-Fi" },
    });
    expect(supported?.starSystem?.genre).toBe("Cyberpunk");
    const unsupported = getHubMountPatch({
      slug: "star-system",
      hubTheme: "fantasy",
      currentState: { starSystemGenre: "Hard Sci-Fi" },
    });
    // Fantasy is not in starSystemConfig.genres, so no genre patch, only theme
    expect(unsupported?.starSystem).toBeUndefined();
    expect(unsupported?.activeTheme).toBeDefined();
  });

  it("returns news-sheet patch with genre and publicationType when supported", () => {
    const patch = getHubMountPatch({
      slug: "news-sheet-generator",
      hubTheme: "fantasy",
      currentState: { newsSheetGenre: "Fantasy" },
    });
    expect(patch?.newsSheet?.genre).toBe("Fantasy");
    expect(patch?.activeTheme).toBe("Classic Fantasy");
  });

  it("returns language patch only for compatible mapped genres", () => {
    const patch = getHubMountPatch({
      slug: "language-generator",
      hubTheme: "fantasy",
    });
    expect(patch?.language?.genre).toBe("Classic Fantasy");
    const incompatible = getHubMountPatch({
      slug: "language-generator",
      hubTheme: "western",
    });
    // Western maps to Western / Frontier which is not in languageConfig.genres
    expect(incompatible).toBeNull();
  });

  it("returns stored theme for generic slug on flat URL", () => {
    const p = memoryPersistence({ "codex-cryptica-active-theme": "pirate" });
    const patch = getHubMountPatch({
      slug: "quest",
      hubTheme: null,
      urlHubTheme: null,
      persistence: p,
      browser: true,
    });
    expect(patch?.activeTheme).toBe("Pirate");
  });
});
