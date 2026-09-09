/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
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
});
