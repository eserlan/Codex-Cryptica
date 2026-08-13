import { describe, it, expect, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

import { useGlobalShortcuts } from "./useGlobalShortcuts.svelte";

describe("useGlobalShortcuts", () => {
  it("should return a handleKeydown function", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext);
    expect(typeof handleKeydown).toBe("function");
  });

  it("should toggle search on Cmd+K", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });

    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    handleKeydown(event);

    expect(mockContext.searchStore.toggle).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("should toggle quicknote on Cmd+I", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    const event = new KeyboardEvent("keydown", {
      key: "i",
      metaKey: true,
    });

    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    handleKeydown(event);

    expect(mockContext.quickNoteStore.toggle).toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("should not toggle search when guest access disables it", () => {
    const mockContext = {
      canUseSearch: false,
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });

    handleKeydown(event);

    expect(mockContext.searchStore.toggle).not.toHaveBeenCalled();
  });

  it("should not toggle quicknote when guest access disables it", () => {
    const mockContext = {
      canUseQuickNote: false,
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    const event = new KeyboardEvent("keydown", {
      key: "i",
      metaKey: true,
    });

    handleKeydown(event);

    expect(mockContext.quickNoteStore.toggle).not.toHaveBeenCalled();
  });

  it("should close search on Escape if open", () => {
    const mockContext = {
      searchStore: { isOpen: true, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
    });

    handleKeydown(event);

    expect(mockContext.searchStore.close).toHaveBeenCalled();
  });

  it("should close quicknote on Escape if open", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: true, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
    });

    handleKeydown(event);

    expect(mockContext.quickNoteStore.close).toHaveBeenCalled();
  });

  it("should close settings on Escape if open and search is closed", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: true, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
    });

    handleKeydown(event);

    expect(mockContext.modalUIStore.closeSettings).toHaveBeenCalled();
  });

  it("should ignore shortcuts when typing in inputs", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;

    // Mock active element
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
    });

    handleKeydown(event);

    expect(mockContext.searchStore.toggle).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
