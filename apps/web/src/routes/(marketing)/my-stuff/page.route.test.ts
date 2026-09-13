/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/svelte";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/environment", () => ({ browser: true }));

import Page from "./+page.svelte";
import {
  myStuffService,
  ANSWER_FEEDBACK_PREFIX,
} from "$lib/services/my-stuff/my-stuff-service";

describe("/my-stuff route", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    document.head.innerHTML = "";
  });

  it("renders page header, privacy notice, and noindex robots meta", () => {
    render(Page);

    expect(document.title).toBe("My Stuff | Codex Cryptica");
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute("content"),
    ).toBe("noindex, follow");

    expect(
      screen.getByRole("heading", { level: 1, name: "My Stuff" }),
    ).toBeTruthy();
    expect(screen.getByText("Stored on this browser only")).toBeTruthy();
  });

  it("renders empty states when no content has been liked or shared", () => {
    render(Page);

    expect(screen.getByText("No liked answers yet")).toBeTruthy();

    const sharedTab = screen.getByRole("tab", { name: /Shared Results/i });
    fireEvent.click(sharedTab);

    expect(screen.getByText("No shared results yet")).toBeTruthy();
  });

  it("renders liked answers and allows removing them", async () => {
    localStorage.setItem(
      `${ANSWER_FEEDBACK_PREFIX}how-do-you-run-a-mystery-without-railroading`,
      JSON.stringify({ value: "yes" }),
    );

    render(Page);

    const questionTitle = await screen.findByText(
      "How do you run a mystery without railroading?",
    );
    expect(questionTitle).toBeTruthy();

    const removeBtn = screen.getByRole("button", { name: "Remove from saved" });
    await fireEvent.click(removeBtn);

    expect(
      screen.queryByText("How do you run a mystery without railroading?"),
    ).toBeNull();
    expect(screen.getByText("No liked answers yet")).toBeTruthy();
  });

  it("renders shared creations on the shared tab", async () => {
    myStuffService.recordSharedGenerator({
      shareId: "test-share-1",
      title: "Haunted Crypt of Moria",
      generatorId: "dungeon",
      generatorTitle: "Dungeon Generator",
      createdAt: new Date().toISOString(),
      url: "https://codexcryptica.com/share/test-share-1",
    });

    render(Page);

    const sharedTab = screen.getByRole("tab", { name: /Shared Results/i });
    await fireEvent.click(sharedTab);

    expect(screen.getByText("Haunted Crypt of Moria")).toBeTruthy();
    expect(screen.getByText("Dungeon Generator")).toBeTruthy();
  });

  it("prevents a second share revoke while the first is pending", async () => {
    myStuffService.recordSharedGenerator({
      shareId: "pending-share-1",
      title: "First Share",
      generatorId: "dungeon",
      createdAt: "2026-09-14T00:00:00.000Z",
      url: "https://codexcryptica.com/share/pending-share-1",
    });
    myStuffService.recordSharedGenerator({
      shareId: "pending-share-2",
      title: "Second Share",
      generatorId: "dungeon",
      createdAt: "2026-09-13T00:00:00.000Z",
      url: "https://codexcryptica.com/share/pending-share-2",
    });

    const revoke = vi
      .spyOn(myStuffService, "revokeSharedGenerator")
      .mockReturnValue(new Promise<boolean>(() => {}));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      render(Page);
      await fireEvent.click(
        screen.getByRole("tab", { name: /Shared Results/i }),
      );

      const revokeButtons = screen.getAllByRole("button", { name: "Revoke" });
      await fireEvent.click(revokeButtons[0]);
      expect(revoke).toHaveBeenCalledTimes(1);
      expect((revokeButtons[0] as HTMLButtonElement).disabled).toBe(true);
      expect((revokeButtons[1] as HTMLButtonElement).disabled).toBe(true);

      await fireEvent.click(revokeButtons[1]);
      expect(revoke).toHaveBeenCalledTimes(1);
    } finally {
      revoke.mockRestore();
      vi.restoreAllMocks();
    }
  });
});
