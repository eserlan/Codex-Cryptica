/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MonsterLabsSendingModal from "./MonsterLabsSendingModal.svelte";

describe("MonsterLabsSendingModal", () => {
  it("is not rendered when closed", () => {
    render(MonsterLabsSendingModal, { open: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a busy dialog naming the entity while sending", () => {
    render(MonsterLabsSendingModal, {
      open: true,
      entityLabel: "Ash-Eater Varkesh",
    });

    const dialog = screen.getByRole("dialog", {
      name: "Preparing MonsterLabs instruction…",
    });
    expect(dialog).toBeTruthy();
    expect(
      screen.getByText(/Getting Ash-Eater Varkesh ready for MonsterLabs\./),
    ).toBeTruthy();
  });

  it("falls back to a generic message when no entity label is given", () => {
    render(MonsterLabsSendingModal, { open: true });

    expect(
      screen.getByText(/Getting this ready for MonsterLabs\./),
    ).toBeTruthy();
  });

  it("renders a non-interactive backdrop with no dismiss control", () => {
    render(MonsterLabsSendingModal, { open: true });

    // The backdrop must not be exposed as an actionable control — an
    // accessible no-op button would confuse screen-reader users.
    expect(
      screen.queryByLabelText("Preparing MonsterLabs instruction"),
    ).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("switches to a manual open link once blockedUrl is set", () => {
    render(MonsterLabsSendingModal, {
      open: true,
      entityLabel: "Ash-Eater Varkesh",
      blockedUrl: "https://monsterlabs.app/dnd-monster-generator?prompt=x",
    });

    expect(screen.queryByText("Preparing MonsterLabs instruction…")).toBeNull();
    const link = screen.getByText("Open MonsterLabs") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(
      "https://monsterlabs.app/dnd-monster-generator?prompt=x",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("calls onOpenBlocked when the manual link is followed", async () => {
    const onOpenBlocked = vi.fn();
    render(MonsterLabsSendingModal, {
      open: true,
      blockedUrl: "https://monsterlabs.app/dnd-monster-generator?prompt=x",
      onOpenBlocked,
    });

    await fireEvent.click(screen.getByText("Open MonsterLabs"));

    expect(onOpenBlocked).toHaveBeenCalledTimes(1);
  });
});
