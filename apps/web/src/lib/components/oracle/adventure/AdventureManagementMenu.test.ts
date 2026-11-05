/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureManagementMenu from "./AdventureManagementMenu.svelte";

function manager(overrides: Record<string, unknown> = {}) {
  return {
    session: { title: "The Drowned March" },
    readOnly: false,
    end: vi.fn(),
    forceEnd: vi.fn(),
    close: vi.fn(),
    ...overrides,
  } as any;
}

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: {
    confirm: vi.fn().mockResolvedValue(true),
    notify: vi.fn(),
  },
}));

describe("AdventureManagementMenu", () => {
  it("renders nothing when there is no active session", () => {
    render(AdventureManagementMenu, {
      props: { manager: manager({ session: null }) },
    });

    expect(screen.queryByTestId("adventure-management-menu-button")).toBeNull();
  });

  it("offers a recovery action instead of End adventure when the tab is read-only", async () => {
    const m = manager({ readOnly: true });
    render(AdventureManagementMenu, { props: { manager: m } });

    expect(screen.getByTestId("adventure-management-menu-button")).toBeTruthy();
    await fireEvent.click(
      screen.getByTestId("adventure-management-menu-button"),
    );

    expect(
      screen.queryByRole("menuitem", { name: /end adventure/i }),
    ).toBeNull();
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /force end stuck adventure/i }),
    );

    expect(m.forceEnd).toHaveBeenCalledOnce();
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

  it("leaves the adventure from the menu", async () => {
    const m = manager();
    render(AdventureManagementMenu, { props: { manager: m } });

    await fireEvent.click(
      screen.getByTestId("adventure-management-menu-button"),
    );
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /leave adventure/i }),
    );

    expect(m.close).toHaveBeenCalledOnce();
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

  describe("switching adventures", () => {
    const entry = (
      id: string,
      title: string,
      over: Record<string, unknown> = {},
    ) => ({
      id,
      title,
      status: "active",
      loadCondition: "normal",
      ...over,
    });

    it("lists the other playable adventures and switches to the chosen one", async () => {
      const list = vi.fn(async () => ({
        effectiveActiveId: "a",
        entries: [
          entry("a", "The Drowned March"),
          entry("b", "The Salt Road"),
          entry("c", "Old Tale", { status: "archived" }),
          entry("d", "Broken", { loadCondition: "unreadable" }),
        ],
      }));
      const onSwitch = vi.fn(async () => {});
      render(AdventureManagementMenu, {
        props: {
          manager: manager({
            session: { id: "a", title: "The Drowned March" },
          }),
          repository: { list } as any,
          vaultId: "vault-1",
          onSwitch,
        },
      });
      await fireEvent.click(
        screen.getByTestId("adventure-management-menu-button"),
      );
      const item = await screen.findByRole("menuitem", {
        name: /switch to the salt road/i,
      });
      expect(
        screen.queryByRole("menuitem", { name: /old tale|broken/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("menuitem", {
          name: /switch to the drowned march/i,
        }),
      ).toBeNull();
      await fireEvent.click(item);
      expect(onSwitch).toHaveBeenCalledWith("b");
    });

    it("shows no switch entries when the lookup fails", async () => {
      render(AdventureManagementMenu, {
        props: {
          manager: manager({ session: { id: "a", title: "T" } }),
          repository: {
            list: vi.fn(async () => Promise.reject(new Error("x"))),
          } as any,
          vaultId: "vault-1",
          onSwitch: vi.fn(),
        },
      });
      await fireEvent.click(
        screen.getByTestId("adventure-management-menu-button"),
      );
      await screen.findByRole("menuitem", { name: /leave adventure/i });
      expect(screen.queryByRole("menuitem", { name: /switch to/i })).toBeNull();
    });
  });
});
