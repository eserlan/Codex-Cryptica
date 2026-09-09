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

  it("cannot be dismissed by clicking the backdrop — the send keeps running regardless", async () => {
    const { getByLabelText } = render(MonsterLabsSendingModal, {
      open: true,
    });

    const backdrop = getByLabelText("Preparing MonsterLabs instruction");
    await backdrop.click();

    // Still open: onClose is intentionally a no-op, since dismissing the
    // notice should not appear to cancel a send that has no cancellation
    // path.
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
