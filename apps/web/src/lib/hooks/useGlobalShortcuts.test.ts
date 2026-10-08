import { describe, it, expect, vi } from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
}));

import { useGlobalShortcuts } from "./useGlobalShortcuts.svelte";

describe("useGlobalShortcuts", () => {
  it("should undo the latest action with Ctrl+Z outside text fields", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn(), redo: vi.fn() },
    };
    const handleKeydown = useGlobalShortcuts(mockContext)!;
    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    handleKeydown(event);

    expect(mockContext.oracle.undo).toHaveBeenCalledOnce();
    expect(preventDefaultSpy).toHaveBeenCalledOnce();
  });

  it("should preserve Ctrl+Z in text fields", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn(), redo: vi.fn() },
    };
    const handleKeydown = useGlobalShortcuts(mockContext)!;
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      cancelable: true,
    });

    handleKeydown(event);

    expect(mockContext.oracle.undo).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("should leave Ctrl+Z inside the Oracle window to its own handler", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn() },
    };
    const handleKeydown = useGlobalShortcuts(mockContext)!;
    const oracleWindow = document.createElement("div");
    oracleWindow.className = "oracle-window-container";
    const target = document.createElement("div");
    oracleWindow.appendChild(target);
    document.body.appendChild(oracleWindow);
    const event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
      cancelable: true,
      bubbles: true,
    });
    target.dispatchEvent(event);

    handleKeydown(event);

    expect(mockContext.oracle.undo).not.toHaveBeenCalled();
    document.body.removeChild(oracleWindow);
  });

  it("should return a handleKeydown function", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext);
    expect(typeof handleKeydown).toBe("function");
  });

  it("should toggle search on Cmd+K", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn() },
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
      oracle: { undo: vi.fn() },
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
      oracle: { undo: vi.fn() },
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
      oracle: { undo: vi.fn() },
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
      oracle: { undo: vi.fn() },
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
      oracle: { undo: vi.fn() },
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
      oracle: { undo: vi.fn() },
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
      oracle: { undo: vi.fn() },
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

  it("should safely ignore events where key is undefined without throwing", () => {
    const mockContext = {
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn() },
    };

    const handleKeydown = useGlobalShortcuts(mockContext)!;
    const event = new KeyboardEvent("keydown");
    Object.defineProperty(event, "key", { value: undefined });

    expect(() => handleKeydown(event)).not.toThrow();
    expect(mockContext.searchStore.toggle).not.toHaveBeenCalled();
    expect(mockContext.quickNoteStore.toggle).not.toHaveBeenCalled();
    expect(mockContext.modalUIStore.closeSettings).not.toHaveBeenCalled();
  });

  describe("shared play with p", () => {
    const baseContext = () => ({
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn() },
    });

    it("toggles shared play on 'p' through the solo guard", () => {
      const sharedMode = { toggle: vi.fn(() => true) };
      const handleKeydown = useGlobalShortcuts({
        ...baseContext(),
        sharedMode,
      })!;
      handleKeydown(new KeyboardEvent("keydown", { key: "p" }));
      expect(sharedMode.toggle).toHaveBeenCalledOnce();
    });

    it("still calls the guard when it refuses, and does not throw", () => {
      // The guard explains a refusal itself; the hook only asks.
      const sharedMode = { toggle: vi.fn(() => false) };
      const handleKeydown = useGlobalShortcuts({
        ...baseContext(),
        sharedMode,
      })!;
      expect(() =>
        handleKeydown(new KeyboardEvent("keydown", { key: "p" })),
      ).not.toThrow();
      expect(sharedMode.toggle).toHaveBeenCalledOnce();
    });

    it("ignores 'p' typed into a text field, and Ctrl/Cmd/Alt+p", () => {
      const sharedMode = { toggle: vi.fn(() => true) };
      const handleKeydown = useGlobalShortcuts({
        ...baseContext(),
        sharedMode,
      })!;
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      handleKeydown(new KeyboardEvent("keydown", { key: "p" }));
      input.blur();
      input.remove();
      handleKeydown(new KeyboardEvent("keydown", { key: "p", ctrlKey: true }));
      handleKeydown(new KeyboardEvent("keydown", { key: "p", metaKey: true }));
      handleKeydown(new KeyboardEvent("keydown", { key: "p", altKey: true }));
      expect(sharedMode.toggle).not.toHaveBeenCalled();
    });

    it("does nothing with 'p' when no shared-play control is given", () => {
      const handleKeydown = useGlobalShortcuts(baseContext())!;
      expect(() =>
        handleKeydown(new KeyboardEvent("keydown", { key: "p" })),
      ).not.toThrow();
    });
  });

  it("ignores 'p' while a control has focus or a dialog is open", () => {
    const sharedMode = { toggle: vi.fn(() => true) };
    const handleKeydown = useGlobalShortcuts({
      searchStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      modalUIStore: { showSettings: false, closeSettings: vi.fn() },
      quickNoteStore: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
      oracle: { undo: vi.fn() },
      sharedMode,
    })!;

    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();
    handleKeydown(new KeyboardEvent("keydown", { key: "p" }));
    button.blur();
    button.remove();

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    handleKeydown(new KeyboardEvent("keydown", { key: "p" }));
    dialog.remove();

    expect(sharedMode.toggle).not.toHaveBeenCalled();
    handleKeydown(new KeyboardEvent("keydown", { key: "p" }));
    expect(sharedMode.toggle).toHaveBeenCalledOnce();
  });
});
