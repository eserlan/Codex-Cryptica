/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureEntryChoices from "./AdventureEntryChoices.svelte";

describe("AdventureEntryChoices", () => {
  it("opens the existing rumour generator from Discover an Adventure", async () => {
    const onDiscover = vi.fn();
    const onOwnPremise = vi.fn();
    render(AdventureEntryChoices, {
      props: { onDiscover, onOwnPremise },
    });

    await fireEvent.click(screen.getByTestId("adventure-discover"));

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onOwnPremise).not.toHaveBeenCalled();
    expect(screen.getByText(/Get six rumours instantly/)).toBeTruthy();
  });

  it("opens the existing manual premise form without generating anything", async () => {
    const onDiscover = vi.fn();
    const onOwnPremise = vi.fn();
    render(AdventureEntryChoices, {
      props: { onDiscover, onOwnPremise },
    });

    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    expect(onOwnPremise).toHaveBeenCalledTimes(1);
    expect(onDiscover).not.toHaveBeenCalled();
  });

  it("disables discovery until a Vault is ready but keeps manual entry available", async () => {
    const onDiscover = vi.fn();
    const onOwnPremise = vi.fn();
    render(AdventureEntryChoices, {
      props: { onDiscover, onOwnPremise, canDiscover: false },
    });

    const discover = screen.getByTestId(
      "adventure-discover",
    ) as HTMLButtonElement;
    expect(discover.disabled).toBe(true);
    await fireEvent.click(discover);
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    expect(onDiscover).not.toHaveBeenCalled();
    expect(onOwnPremise).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/fully loaded Vault/)).toBeTruthy();
  });

  it("shows Enter Your World as planned, never an actionable button", () => {
    render(AdventureEntryChoices, {
      props: { onDiscover: vi.fn(), onOwnPremise: vi.fn() },
    });

    const planned = screen.getByTestId("adventure-enter-world-planned");
    expect(planned.textContent).toContain("Enter Your World");
    expect(planned.textContent).toContain("Coming later");
    expect(planned.tagName).toBe("DIV");
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("uses touch-sized cards in a single-column mobile layout", () => {
    render(AdventureEntryChoices, {
      props: { onDiscover: vi.fn(), onOwnPremise: vi.fn() },
    });

    expect(screen.getByTestId("adventure-entry-choices").textContent).toContain(
      "Where will your story begin?",
    );
    for (const id of ["adventure-discover", "adventure-own-premise"]) {
      const button = screen.getByTestId(id);
      expect(button.className).toContain("min-h-44");
      expect(button.className).toContain("text-left");
    }
  });
});
