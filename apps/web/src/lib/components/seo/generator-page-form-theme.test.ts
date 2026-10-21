import { describe, expect, it, vi } from "vitest";
import {
  createKnownGenreThemeChangeHandler,
  createPageGenreChangeHandlers,
  createMappedThemeChangeHandler,
} from "./generator-page-form-theme";

describe("generator page form theme handlers", () => {
  it("updates the theme only for an established genre", () => {
    const setActiveTheme = vi.fn();
    const handleGenreChange = createKnownGenreThemeChangeHandler(
      setActiveTheme,
      ["Fantasy", "Horror"],
    );

    handleGenreChange("Horror");
    handleGenreChange("Custom genre");

    expect(setActiveTheme).toHaveBeenCalledOnce();
    expect(setActiveTheme).toHaveBeenCalledWith("Horror");
  });

  it("applies mapped themes and ignores unmapped genres", () => {
    const setActiveTheme = vi.fn();
    const handleGenreChange = createMappedThemeChangeHandler(
      setActiveTheme,
      (genre) => (genre === "Cyberpunk" ? "Cyberpunk / Corporate" : null),
    );

    handleGenreChange("Cyberpunk");
    handleGenreChange("Custom genre");

    expect(setActiveTheme).toHaveBeenCalledOnce();
    expect(setActiveTheme).toHaveBeenCalledWith("Cyberpunk / Corporate");
  });

  it("preserves direct genre assignment for un-mapped form genres", () => {
    const setActiveTheme = vi.fn();
    const handleGenreChange = createMappedThemeChangeHandler(
      setActiveTheme,
      (genre) => genre,
    );

    handleGenreChange("Custom genre");

    expect(setActiveTheme).toHaveBeenCalledWith("Custom genre");
  });
});

describe("page genre handler assembly", () => {
  it.each(["personality", "business", "rumour", "puzzle"] as const)(
    "preserves known and custom %s genres",
    (key) => {
      const setTheme = vi.fn();
      const handlers = createPageGenreChangeHandlers(setTheme);
      handlers[key]("Classic Fantasy");
      handlers[key]("My own genre");
      expect(setTheme).toHaveBeenCalledExactlyOnceWith("Classic Fantasy");
    },
  );

  it.each([
    ["ship", "Fantasy", "Classic Fantasy"],
    ["world", "Lancer", "Lancer"],
    ["starSystem", "Cyberpunk", "Cyberpunk / Corporate"],
    ["alienRace", "Cyberpunk", "Cyberpunk / Corporate"],
    ["creature", "My own genre", "My own genre"],
  ] as const)("maps the %s genre to the visible theme", (key, genre, theme) => {
    const setTheme = vi.fn();
    createPageGenreChangeHandlers(setTheme)[key](genre);
    expect(setTheme).toHaveBeenCalledExactlyOnceWith(theme);
  });
});
