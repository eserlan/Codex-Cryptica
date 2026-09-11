import { describe, expect, it, vi, beforeEach } from "vitest";

const { focusEntityMock, notifyMock } = vi.hoisted(() => ({
  focusEntityMock: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock("$lib/stores/ui/navigation", () => ({
  focusEntity: focusEntityMock,
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: notifyMock },
}));

import { openSavedEntityInEditor } from "./generator-save-handoff";

describe("openSavedEntityInEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("focuses the entity when in focus mode", () => {
    const selectEntity = vi.fn();
    openSavedEntityInEditor("e1", "Title", {
      isFocusMode: true,
      selectEntity,
    });

    expect(focusEntityMock).toHaveBeenCalledWith("e1");
    expect(selectEntity).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("selects the entity when not in focus mode", () => {
    const selectEntity = vi.fn();
    openSavedEntityInEditor("e1", "Title", {
      isFocusMode: false,
      selectEntity,
    });

    expect(selectEntity).toHaveBeenCalledWith("e1");
    expect(focusEntityMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("surfaces a persistent error toast instead of throwing when navigation fails", () => {
    const selectEntity = vi.fn(() => {
      throw new Error("editor pane unavailable");
    });

    expect(() =>
      openSavedEntityInEditor("e1", "The Observatory", {
        isFocusMode: false,
        selectEntity,
      }),
    ).not.toThrow();

    expect(notifyMock).toHaveBeenCalledWith(
      expect.stringContaining("The Observatory"),
      "error",
      true,
    );
  });
});
