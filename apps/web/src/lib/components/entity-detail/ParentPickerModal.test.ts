/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ParentPickerModal from "./ParentPickerModal.svelte";
import { vault } from "$lib/stores/vault.svelte";

// A three-deep line — Keep is nested under Citadel, which is nested under
// Realm — so descendants can be told apart from unrelated entities.
const ENTITIES: Record<string, any> = {
  realm: { id: "realm", title: "Sunken Realm", type: "location" },
  citadel: {
    id: "citadel",
    title: "Drowned Citadel",
    type: "location",
    parent: "realm",
  },
  keep: {
    id: "keep",
    title: "Tidewatch Keep",
    type: "location",
    parent: "citadel",
  },
  warden: {
    id: "warden",
    title: "The Warden",
    type: "character",
    aliases: ["Old Salt"],
  },
};

const notify = vi.fn();
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: (...args: unknown[]) => notify(...args) },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    updateEntity: vi.fn(),
    get entities() {
      return ENTITIES;
    },
    get allEntities() {
      return Object.values(ENTITIES);
    },
  },
}));

const open = (entityId: string) =>
  render(ParentPickerModal, {
    isOpen: true,
    entityId,
    onClose: vi.fn(),
  });

const optionTitles = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll('[data-testid="parent-picker-option-title"]'),
  ).map((el) => el.textContent?.trim());

describe("ParentPickerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.animate = vi.fn().mockReturnValue({
      finished: Promise.resolve(),
      cancel: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
    } as any);
  });

  it("lists every entity the subject could be nested under", () => {
    const { container } = open("warden");
    expect(optionTitles(container)).toEqual([
      "Sunken Realm",
      "Drowned Citadel",
      "Tidewatch Keep",
    ]);
  });

  it("never offers the entity itself or anything below it", () => {
    // Nesting Citadel under its own child Keep would close the tree into a
    // loop, and the explorer's drag-nesting refuses the same move.
    const { container } = open("citadel");
    expect(optionTitles(container)).toEqual(["Sunken Realm", "The Warden"]);
  });

  it("finds a parent by alias, not just title", async () => {
    const { container, getByTestId } = open("realm");
    await fireEvent.input(getByTestId("parent-picker-search"), {
      target: { value: "old salt" },
    });
    expect(optionTitles(container)).toEqual(["The Warden"]);
  });

  it("records the chosen parent and closes", async () => {
    const onClose = vi.fn();
    const { container } = render(ParentPickerModal, {
      isOpen: true,
      entityId: "warden",
      onClose,
    });

    const options = container.querySelectorAll(
      '[data-testid="parent-picker-option"]',
    );
    await fireEvent.click(options[1]);

    expect(vault.updateEntity).toHaveBeenCalledWith("warden", {
      parent: "citadel",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("lifts an entity back to the top level", async () => {
    const { getByTestId } = open("keep");
    await fireEvent.click(getByTestId("parent-picker-remove"));

    expect(vault.updateEntity).toHaveBeenCalledWith("keep", {
      parent: undefined,
    });
  });

  it("offers nothing to remove when there is no parent yet", () => {
    const { queryByTestId } = open("warden");
    expect(queryByTestId("parent-picker-remove")).toBeNull();
  });

  it("marks the parent already in place", () => {
    const { container } = open("keep");
    const current = Array.from(
      container.querySelectorAll('[data-testid="parent-picker-option"]'),
    ).find((el) => el.textContent?.includes("Current"));
    expect(current?.textContent).toContain("Drowned Citadel");
  });

  it("leaves Enter alone when a button holds focus", async () => {
    // Otherwise preventDefault suppresses the button's own activation and the
    // highlighted row is re-parented instead — Cancel would move the entity.
    const onClose = vi.fn();
    const { getByText } = render(ParentPickerModal, {
      isOpen: true,
      entityId: "warden",
      onClose,
    });

    const cancel = getByText("Cancel") as HTMLButtonElement;
    cancel.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    cancel.dispatchEvent(event);
    await Promise.resolve();

    expect(event.defaultPrevented).toBe(false);
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });

  it("reports a failed write instead of closing on a move that did not happen", async () => {
    (vault.updateEntity as any).mockRejectedValueOnce(new Error("disk full"));
    const onClose = vi.fn();
    const { container } = render(ParentPickerModal, {
      isOpen: true,
      entityId: "warden",
      onClose,
    });

    const options = container.querySelectorAll(
      '[data-testid="parent-picker-option"]',
    );
    await fireEvent.click(options[0]);
    await Promise.resolve();

    expect(notify).toHaveBeenCalledWith("Could not set the parent.", "error");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("returns focus to whatever opened it", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(ParentPickerModal, {
      isOpen: true,
      entityId: "warden",
      onClose: vi.fn(),
    });
    unmount();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("says how many matches are hidden when the list is capped", async () => {
    const many: Record<string, any> = {};
    for (let i = 0; i < 45; i++) {
      many[`e${i}`] = { id: `e${i}`, title: `Entity ${i}`, type: "location" };
    }
    many.subject = { id: "subject", title: "Subject", type: "note" };
    const original = { ...ENTITIES };
    for (const key of Object.keys(ENTITIES)) delete ENTITIES[key];
    Object.assign(ENTITIES, many);
    try {
      const { getByTestId } = open("subject");
      expect(getByTestId("parent-picker-truncation").textContent).toContain(
        "Showing 40 of 45",
      );
    } finally {
      for (const key of Object.keys(ENTITIES)) delete ENTITIES[key];
      Object.assign(ENTITIES, original);
    }
  });

  it("exposes the highlighted row to assistive technology", async () => {
    const { getByTestId, container } = open("warden");
    await fireEvent.keyDown(window, { key: "ArrowDown" });

    expect(
      getByTestId("parent-picker-search").getAttribute("aria-activedescendant"),
    ).toBe("parent-picker-option-1");
    const options = container.querySelectorAll('[role="option"]');
    expect(options[1].getAttribute("aria-selected")).toBe("true");
    expect(options[0].getAttribute("aria-selected")).toBe("false");
  });

  it("closes on Escape without touching the hierarchy", async () => {
    const onClose = vi.fn();
    render(ParentPickerModal, {
      isOpen: true,
      entityId: "warden",
      onClose,
    });

    await fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
    expect(vault.updateEntity).not.toHaveBeenCalled();
  });

  it("picks the highlighted result with the keyboard", async () => {
    const { getByTestId } = open("warden");
    const search = getByTestId("parent-picker-search");

    await fireEvent.keyDown(window, { key: "ArrowDown" });
    // Enter is dispatched from the search field, as a real keystroke would be.
    await fireEvent.keyDown(search, { key: "Enter" });

    expect(vault.updateEntity).toHaveBeenCalledWith("warden", {
      parent: "citadel",
    });
  });

  it("stays out of the way while closed", () => {
    const { queryByTestId } = render(ParentPickerModal, {
      isOpen: false,
      entityId: "warden",
      onClose: vi.fn(),
    });
    expect(queryByTestId("parent-picker-modal")).toBeNull();
  });
});
