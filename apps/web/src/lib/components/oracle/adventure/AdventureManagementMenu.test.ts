/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureManagementMenu from "./AdventureManagementMenu.svelte";

function manager(overrides: Record<string, unknown> = {}) {
  return {
    session: { title: "The Drowned March" },
    readOnly: false,
    end: vi.fn(),
    ...overrides,
  } as any;
}

describe("AdventureManagementMenu", () => {
  it("renders nothing when there is no active session", () => {
    render(AdventureManagementMenu, {
      props: { manager: manager({ session: null }) },
    });

    expect(screen.queryByTestId("adventure-management-menu-button")).toBeNull();
  });

  it("renders nothing when the tab is read-only", () => {
    render(AdventureManagementMenu, {
      props: { manager: manager({ readOnly: true }) },
    });

    expect(screen.queryByTestId("adventure-management-menu-button")).toBeNull();
  });

  it("ends the adventure from the menu", async () => {
    const m = manager();
    render(AdventureManagementMenu, { props: { manager: m } });

    await fireEvent.click(
      screen.getByTestId("adventure-management-menu-button"),
    );
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /end adventure/i }),
    );

    expect(m.end).toHaveBeenCalledOnce();
  });

  it("opens with ArrowDown and returns focus to the trigger on Escape", async () => {
    render(AdventureManagementMenu, { props: { manager: manager() } });
    const trigger = screen.getByTestId("adventure-management-menu-button");
    trigger.focus();
    await fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: /end adventure/i }),
      ),
    );
    await fireEvent.keyDown(screen.getByTestId("adventure-management-menu"), {
      key: "Escape",
    });
    await waitFor(() => {
      expect(screen.queryByTestId("adventure-management-menu")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
