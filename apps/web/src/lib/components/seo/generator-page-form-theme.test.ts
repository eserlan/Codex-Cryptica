import { describe, expect, it, vi } from "vitest";
import {
  createKnownGenreThemeChangeHandler,
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
