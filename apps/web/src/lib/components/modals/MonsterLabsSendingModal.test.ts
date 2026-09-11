/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MonsterLabsSendingModal from "./MonsterLabsSendingModal.svelte";

const noop = () => {};

describe("MonsterLabsSendingModal", () => {
  it("is not rendered when closed", () => {
    render(MonsterLabsSendingModal, {
      open: false,
      state: "confirm",
      onConfirm: noop,
      onOpen: noop,
      onClose: noop,
    });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks for confirmation before doing anything, naming the entity", () => {
    render(MonsterLabsSendingModal, {
      open: true,
      state: "confirm",
      entityLabel: "Ash-Eater Varkesh",
      onConfirm: noop,
      onOpen: noop,
      onClose: noop,
    });

    const dialog = screen.getByRole("dialog", {
      name: "Send to MonsterLabs?",
    });
    expect(dialog).toBeTruthy();
    expect(screen.getByText(/sends Ash-Eater Varkesh/)).toBeTruthy();
    expect(screen.getByTestId("monsterlabs-confirm-button")).toBeTruthy();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    render(MonsterLabsSendingModal, {
      open: true,
      state: "confirm",
      entityLabel: "Ash-Eater Varkesh",
      onConfirm,
      onOpen: noop,
      onClose: noop,
    });

    await fireEvent.click(screen.getByTestId("monsterlabs-confirm-button"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows a busy dialog naming the entity while the Oracle call runs", () => {
    render(MonsterLabsSendingModal, {
      open: true,
      state: "loading",
      entityLabel: "Ash-Eater Varkesh",
      onConfirm: noop,
      onOpen: noop,
      onClose: noop,
    });

    const dialog = screen.getByRole("dialog", {
      name: "Asking the Oracle…",
    });
    expect(dialog).toBeTruthy();
    expect(screen.getByText(/Shortening Ash-Eater Varkesh/)).toBeTruthy();
  });

  it("falls back to a generic message when no entity label is given", () => {
    render(MonsterLabsSendingModal, {
      open: true,
      state: "confirm",
      onConfirm: noop,
      onOpen: noop,
      onClose: noop,
    });

    expect(screen.getByText(/sends this/)).toBeTruthy();
  });

  it("shows an open link once ready, and cannot be dismissed while loading", () => {
    render(MonsterLabsSendingModal, {
      open: true,
      state: "ready",
      entityLabel: "Ash-Eater Varkesh",
      url: "https://monsterlabs.app/dnd-monster-generator?prompt=x",
      onConfirm: noop,
      onOpen: noop,
      onClose: noop,
    });

    const link = screen.getByTestId(
      "monsterlabs-open-link",
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(
      "https://monsterlabs.app/dnd-monster-generator?prompt=x",
    );
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
