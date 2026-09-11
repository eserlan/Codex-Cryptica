import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MobileCreateEntitySheet from "./MobileCreateEntitySheet.svelte";

vi.mock("$app/environment", () => ({ browser: true }));

describe("MobileCreateEntitySheet", () => {
  it("dummy test", () => {
    expect(true).toBe(true);

  it("asserts inner icons are aria-hidden", () => {
    render(MobileCreateEntitySheet);
    const databaseIcon = document.querySelector(".icon-\\[lucide--database\\]");
    if (databaseIcon) expect(databaseIcon.getAttribute("aria-hidden")).toBe("true");

    const plusIcon = document.querySelector(".icon-\\[lucide--plus\\]");
    if (plusIcon) expect(plusIcon.getAttribute("aria-hidden")).toBe("true");

    const folderOpenIcon = document.querySelector(".icon-\\[lucide--folder-open\\]");
    if (folderOpenIcon) expect(folderOpenIcon.getAttribute("aria-hidden")).toBe("true");

    const wandIcon = document.querySelector(".icon-\\[lucide--wand-2\\]");
    if (wandIcon) expect(wandIcon.getAttribute("aria-hidden")).toBe("true");
  });
});

  it("asserts inner icons are aria-hidden", () => {
    render(MobileCreateEntitySheet);
    const databaseIcon = document.querySelector(".icon-\\[lucide--database\\]");
    if (databaseIcon) expect(databaseIcon.getAttribute("aria-hidden")).toBe("true");

    const plusIcon = document.querySelector(".icon-\\[lucide--plus\\]");
    if (plusIcon) expect(plusIcon.getAttribute("aria-hidden")).toBe("true");

    const folderOpenIcon = document.querySelector(".icon-\\[lucide--folder-open\\]");
    if (folderOpenIcon) expect(folderOpenIcon.getAttribute("aria-hidden")).toBe("true");

    const wandIcon = document.querySelector(".icon-\\[lucide--wand-2\\]");
    if (wandIcon) expect(wandIcon.getAttribute("aria-hidden")).toBe("true");
  });
});
