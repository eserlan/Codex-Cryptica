/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/svelte";

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/environment", () => ({ browser: true }));

import Page from "./+page.svelte";
import {
  myStuffService,
  ANSWER_FEEDBACK_PREFIX,
  MANAGEMENT_TOKENS_KEY,
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

  it("publishes Open Graph and Twitter social preview metadata", () => {
    render(Page);

    const expectedImage =
      "https://assets.codexcryptica.com/screenshots/feature-connect.jpg";

    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).toBe(expectedImage);
    expect(
      document
        .querySelector('meta[property="og:image:alt"]')
        ?.getAttribute("content"),
    ).toBe("Codex Cryptica personal library and connected workspace");
    expect(
      document
        .querySelector('meta[property="og:image:width"]')
        ?.getAttribute("content"),
    ).toBe("1600");
    expect(
      document
        .querySelector('meta[property="og:image:height"]')
        ?.getAttribute("content"),
    ).toBe("1000");
    expect(
      document
        .querySelector('meta[name="twitter:image"]')
        ?.getAttribute("content"),
    ).toBe(expectedImage);
    expect(
      document
        .querySelector('meta[name="twitter:image:alt"]')
        ?.getAttribute("content"),
    ).toBe("Codex Cryptica personal library and connected workspace");
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe("https://codexcryptica.com/my-stuff");
    expect(
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute("content"),
    ).toBe("https://codexcryptica.com/my-stuff");

    // Negative assertions: ensure not falling back to the generic root card or leaving tags empty
    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).not.toBe("https://codexcryptica.com/og-image.png");
    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).not.toBe("");
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
    expect(
      screen.getByRole("link", {
        name: "View Haunted Crypt of Moria (Dungeon Generator)",
      }),
    ).toBeTruthy();
  });

  it("uses the generic link label for token-only legacy shares", async () => {
    localStorage.setItem(
      MANAGEMENT_TOKENS_KEY,
      JSON.stringify({ "legacy-share-1": "private-token" }),
    );

    render(Page);

    const sharedTab = screen.getByRole("tab", { name: /Shared Results/i });
    await fireEvent.click(sharedTab);

    expect(screen.getByRole("link", { name: "View Shared Page" })).toBeTruthy();
    expect(
      screen.queryByRole("link", {
        name: /View Shared Result \(generator\)/,
      }),
    ).toBeNull();
  });
});
