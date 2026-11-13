/** @vitest-environment jsdom */
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import EntityActionMenu from "./EntityActionMenu.svelte";
import type { EntityAction } from "./entity-actions.svelte.js";

const action = (
  id: string,
  extra: Partial<EntityAction> = {},
): EntityAction => ({
  id,
  label: `Do ${id}`,
  icon: `icon-[lucide--${id}]`,
  run: vi.fn(async () => {}),
  placement: "menu",
  tone: "default",
  testId: `${id}-button`,
  ...extra,
});

const open = async (getByTestId: (id: string) => HTMLElement) => {
  const more = getByTestId("entity-actions-more-button");
  await fireEvent.keyDown(more, { key: "ArrowDown" });
  return more;
};

afterEach(cleanup);

describe("EntityActionMenu", () => {
  it("opens on ArrowDown focusing the first item, and arrows wrap", async () => {
    const { getByTestId } = render(EntityActionMenu, {
      items: [action("a"), action("b"), action("c")],
    });
    const more = await open(getByTestId);
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(getByTestId("a-button")),
    );
    expect(more.getAttribute("aria-expanded")).toBe("true");

    await fireEvent.keyDown(getByTestId("a-button"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(getByTestId("c-button"));
    await fireEvent.keyDown(getByTestId("c-button"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(getByTestId("a-button"));
  });

  it("opens on ArrowUp focusing the last item", async () => {
    const { getByTestId } = render(EntityActionMenu, {
      items: [action("a"), action("b")],
    });
    await fireEvent.keyDown(getByTestId("entity-actions-more-button"), {
      key: "ArrowUp",
    });
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(getByTestId("b-button")),
    );
  });

  it("closes on Escape, returns focus to More, and keeps the key from the window", async () => {
    const onWindowKey = vi.fn();
    window.addEventListener("keydown", onWindowKey);
    const { getByTestId } = render(EntityActionMenu, { items: [action("a")] });
    const more = await open(getByTestId);
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(getByTestId("a-button")),
    );

    onWindowKey.mockClear();
    await fireEvent.keyDown(getByTestId("a-button"), { key: "Escape" });

    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(getByTestId("entity-actions-menu").hasAttribute("hidden")).toBe(
      true,
    );
    expect(document.activeElement).toBe(more);
    expect(onWindowKey).not.toHaveBeenCalled();
    window.removeEventListener("keydown", onWindowKey);
  });

  it("lets Escape through when the menu is closed", async () => {
    const onWindowKey = vi.fn();
    window.addEventListener("keydown", onWindowKey);
    const { getByTestId } = render(EntityActionMenu, { items: [action("a")] });
    await fireEvent.keyDown(getByTestId("entity-actions-more-button"), {
      key: "Escape",
    });
    expect(onWindowKey).toHaveBeenCalled();
    window.removeEventListener("keydown", onWindowKey);
  });

  it("closes on a pointerdown outside", async () => {
    const { getByTestId } = render(EntityActionMenu, { items: [action("a")] });
    const more = await open(getByTestId);
    expect(more.getAttribute("aria-expanded")).toBe("true");

    await fireEvent.pointerDown(document.body);

    expect(more.getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open on a pointerdown inside the menu", async () => {
    const { getByTestId } = render(EntityActionMenu, { items: [action("a")] });
    const more = await open(getByTestId);
    await fireEvent.pointerDown(getByTestId("a-button"));
    expect(more.getAttribute("aria-expanded")).toBe("true");
  });

  it("runs the chosen item and closes the menu", async () => {
    const item = action("a");
    const { getByTestId } = render(EntityActionMenu, { items: [item] });
    const more = await open(getByTestId);

    await fireEvent.click(getByTestId("a-button"));

    expect(item.run).toHaveBeenCalledTimes(1);
    expect(more.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps items in the DOM, hidden, while closed", () => {
    const { getByTestId } = render(EntityActionMenu, { items: [action("a")] });
    expect(getByTestId("a-button")).toBeTruthy();
    expect(getByTestId("entity-actions-menu").hasAttribute("hidden")).toBe(
      true,
    );
  });

  it("sets the danger item apart in the danger colour", () => {
    const { getByTestId, container } = render(EntityActionMenu, {
      items: [action("a"), action("delete", { tone: "danger" })],
    });
    expect(getByTestId("delete-button").className).toContain(
      "text-theme-danger",
    );
    expect(container.querySelector('[role="separator"]')).toBeTruthy();
  });

  it("renders no More button without items", () => {
    const { queryByTestId } = render(EntityActionMenu, { items: [] });
    expect(queryByTestId("entity-actions-more-button")).toBeNull();
  });
});
