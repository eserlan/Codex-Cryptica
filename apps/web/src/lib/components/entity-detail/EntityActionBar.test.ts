/** @vitest-environment jsdom */
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import EntityActionBar from "./EntityActionBar.svelte";
import type { EntityAction } from "./entity-actions.svelte.js";

const action = (
  id: string,
  extra: Partial<EntityAction> = {},
): EntityAction => ({
  id,
  label: `Label ${id}`,
  icon: `icon-[lucide--${id}]`,
  run: vi.fn(async () => {}),
  placement: "primary",
  tone: "default",
  testId: `${id}-button`,
  ...extra,
});

afterEach(cleanup);

describe("EntityActionBar", () => {
  it("renders primary actions with text, aria-label and title", () => {
    const { getByTestId } = render(EntityActionBar, {
      actions: [action("edit"), action("expand")],
    });
    for (const id of ["edit", "expand"]) {
      const button = getByTestId(`${id}-button`);
      expect(button.textContent).toContain(`Label ${id}`);
      expect(button.getAttribute("aria-label")).toBe(`Label ${id}`);
      expect(button.getAttribute("title")).toBe(`Label ${id}`);
    }
  });

  it("never hides Edit's text at narrow widths, but hides the others'", () => {
    const { getByTestId } = render(EntityActionBar, {
      actions: [action("edit"), action("expand")],
    });
    const text = (id: string) =>
      getByTestId(`${id}-button`).querySelector("span:not([aria-hidden])")!;
    expect(text("edit").className).not.toContain("hidden");
    expect(text("expand").className).toContain("@max-[300px]:hidden");
  });

  it("in compact mode keeps only Edit on the bar, icon-only, and moves the rest into More", () => {
    const { getByTestId } = render(EntityActionBar, {
      compact: true,
      actions: [action("edit"), action("expand")],
    });
    const text = getByTestId("edit-button").querySelector(
      "span:not([aria-hidden])",
    )!;
    expect(text.className).toContain("sr-only");
    expect(getByTestId("expand-button").getAttribute("role")).toBe("menuitem");
    expect(getByTestId("entity-actions-more-button")).toBeTruthy();
  });

  it("runs an action when pressed", async () => {
    const edit = action("edit");
    const { getByTestId } = render(EntityActionBar, { actions: [edit] });
    await fireEvent.click(getByTestId("edit-button"));
    expect(edit.run).toHaveBeenCalledTimes(1);
  });

  it("puts menu actions behind More, and shows no More when there are none", () => {
    const withMenu = render(EntityActionBar, {
      actions: [action("edit"), action("shelf", { placement: "menu" })],
    });
    expect(withMenu.getByTestId("entity-actions-more-button")).toBeTruthy();
    cleanup();
    const without = render(EntityActionBar, { actions: [action("edit")] });
    expect(without.queryByTestId("entity-actions-more-button")).toBeNull();
  });
});
