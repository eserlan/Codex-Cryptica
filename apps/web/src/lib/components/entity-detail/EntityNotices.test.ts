/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import EntityNotices from "./EntityNotices.svelte";

describe("EntityNotices", () => {
  it("shows the demo notice", () => {
    render(EntityNotices, { isDemoMode: true });
    expect(screen.getByRole("status").textContent?.trim()).toBe(
      "Demo: changes are not saved",
    );
  });

  it("renders nothing outside demo mode", () => {
    render(EntityNotices, { isDemoMode: false });
    expect(screen.queryByRole("status")).toBeNull();
  });
});
