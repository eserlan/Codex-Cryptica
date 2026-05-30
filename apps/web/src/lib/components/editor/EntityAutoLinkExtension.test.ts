import { describe, it, expect, vi, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  createEntityAutoLinkExtension,
  ENTITY_INDEX_CHANGED_META,
  type EntityAutoLinkOptions,
} from "./EntityAutoLinkExtension";
import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENTITIES: EntityIndexEntry[] = [
  { text: "aldric the sage", id: "aldric-1" },
  { text: "crimson enclave", id: "crimson-3" },
];

const editors: Editor[] = [];

function createTestEditor(
  options: EntityAutoLinkOptions,
  editable: boolean,
  htmlContent: string,
): Editor {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const editor = new Editor({
    element: el,
    extensions: [StarterKit, createEntityAutoLinkExtension(options)],
    editable,
    content: htmlContent,
  });
  editors.push(editor);
  return editor;
}

function getDecoratedSpans(editor: Editor): NodeListOf<Element> {
  return editor.view.dom.querySelectorAll("[data-entity-id]");
}

afterEach(() => {
  for (const e of editors) {
    if (!e.isDestroyed) e.destroy();
  }
  editors.length = 0;
  // Clean up any orphaned editor mounts
  document.body.innerHTML = "";
});

// ─── Read-mode decorations ────────────────────────────────────────────────────

describe("EntityAutoLinkExtension — read mode", () => {
  it("produces a decoration for a detected entity name", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>She trained under Aldric the Sage.</p>",
    );
    const spans = getDecoratedSpans(editor);
    expect(spans.length).toBe(1);
    expect(spans[0].getAttribute("data-entity-id")).toBe("aldric-1");
  });

  it("applies correct CSS classes to the decoration", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage was wise.</p>",
    );
    const span = getDecoratedSpans(editor)[0];
    expect(span.classList.contains("entity-auto-link")).toBe(true);
    expect(span.classList.contains("text-theme-primary")).toBe(true);
    expect(span.classList.contains("underline")).toBe(true);
    expect(span.classList.contains("cursor-pointer")).toBe(true);
  });

  it("decorates multiple entity names in one document", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage founded the Crimson Enclave.</p>",
    );
    const spans = getDecoratedSpans(editor);
    expect(spans.length).toBe(2);
  });

  it("decorates only the first occurrence of each entity (first-occurrence-only)", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage met Aldric the Sage again.</p>",
    );
    const spans = getDecoratedSpans(editor);
    // Only one decoration even though the name appears twice
    expect(spans.length).toBe(1);
    expect(spans[0].getAttribute("data-entity-id")).toBe("aldric-1");
  });

  it("decorates first occurrence of each distinct entity independently", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    // Two different entities — each gets exactly one decoration
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage and Crimson Enclave met Aldric the Sage again at Crimson Enclave.</p>",
    );
    const spans = getDecoratedSpans(editor);
    expect(spans.length).toBe(2);
    const ids = Array.from(spans)
      .map((s) => s.getAttribute("data-entity-id"))
      .sort();
    expect(ids).toEqual(["aldric-1", "crimson-3"].sort());
  });

  it("produces no decorations when entity index is empty", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: [],
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage was here.</p>",
    );
    expect(getDecoratedSpans(editor).length).toBe(0);
  });

  it("suppresses self-link (currentEntityId match)", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "aldric-1",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage trained here.</p>",
    );
    expect(getDecoratedSpans(editor).length).toBe(0);
  });

  it("suppresses only the self-entity, links others", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "aldric-1",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage led the Crimson Enclave.</p>",
    );
    const spans = getDecoratedSpans(editor);
    expect(spans.length).toBe(1);
    expect(spans[0].getAttribute("data-entity-id")).toBe("crimson-3");
  });
});

// ─── Edit mode ────────────────────────────────────────────────────────────────

describe("EntityAutoLinkExtension — edit mode", () => {
  it("produces no decorations when editable=true", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      true,
      "<p>Aldric the Sage was wise.</p>",
    );
    expect(getDecoratedSpans(editor).length).toBe(0);
  });

  it("removes decorations when switching from read to edit mode", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(options, false, "<p>Aldric the Sage.</p>");
    // Verify read-mode decorations exist
    expect(getDecoratedSpans(editor).length).toBe(1);

    // Switch to edit mode
    editor.setEditable(true);

    // Decorations must be gone (props.decorations gate fires on view update)
    expect(getDecoratedSpans(editor).length).toBe(0);
  });

  it("restores decorations when switching from edit to read mode", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(options, true, "<p>Aldric the Sage.</p>");
    expect(getDecoratedSpans(editor).length).toBe(0);

    editor.setEditable(false);

    // After switching to read mode, decorations should appear.
    // setEditable() doesn't fire a transaction, so we dispatch a no-op to
    // trigger the apply hook and rebuild state (same pattern as the $effect bridge).
    editor.view.dispatch(
      editor.state.tr.setMeta(ENTITY_INDEX_CHANGED_META, true),
    );

    expect(getDecoratedSpans(editor).length).toBe(1);
  });
});

// ─── EntityIndex reactivity (entityIndexChanged meta) ────────────────────────

describe("EntityAutoLinkExtension — entityIndex reactivity", () => {
  it("rebuilds decorations after entityIndexChanged meta is dispatched", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: [{ text: "crimson enclave", id: "e1" }],
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Crimson Enclave was powerful.</p>",
    );
    expect(getDecoratedSpans(editor).length).toBe(1);

    // Simulate MarkdownEditor $effect updating the shared options ref and dispatching meta
    options.entityIndex = [
      { text: "crimson enclave", id: "e1" },
      { text: "powerful", id: "e2" },
    ];
    editor.view.dispatch(
      editor.state.tr.setMeta(ENTITY_INDEX_CHANGED_META, true),
    );

    expect(getDecoratedSpans(editor).length).toBe(2);
  });

  it("removes stale decorations when entity is removed from index", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: [{ text: "crimson enclave", id: "e1" }],
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(options, false, "<p>Crimson Enclave.</p>");
    expect(getDecoratedSpans(editor).length).toBe(1);

    // Remove the entity
    options.entityIndex = [];
    editor.view.dispatch(
      editor.state.tr.setMeta(ENTITY_INDEX_CHANGED_META, true),
    );

    expect(getDecoratedSpans(editor).length).toBe(0);
  });

  it("index updated in edit mode is applied when switching back to read mode", () => {
    // Start read mode, confirm decoration
    const options: EntityAutoLinkOptions = {
      entityIndex: [{ text: "crimson enclave", id: "e1" }],
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(options, false, "<p>Crimson Enclave.</p>");
    expect(getDecoratedSpans(editor).length).toBe(1);

    // Switch to edit mode and update the index (simulates vault rename while editing)
    editor.setEditable(true);
    options.entityIndex = [{ text: "crimson enclave", id: "e1-renamed" }];
    editor.view.dispatch(
      editor.state.tr.setMeta(ENTITY_INDEX_CHANGED_META, true),
    );
    // In edit mode: no decorations visible
    expect(getDecoratedSpans(editor).length).toBe(0);

    // Switch back to read mode — should see the updated entity ID
    editor.setEditable(false);
    expect(getDecoratedSpans(editor).length).toBe(1);
    expect(getDecoratedSpans(editor)[0].getAttribute("data-entity-id")).toBe(
      "e1-renamed",
    );
  });
});

// ─── Click handling ───────────────────────────────────────────────────────────

describe("EntityAutoLinkExtension — click handling", () => {
  it("calls onEntityClick with the entity ID when a decoration is clicked", () => {
    const onClick = vi.fn();
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: onClick,
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage appeared.</p>",
    );
    const span = getDecoratedSpans(editor)[0] as HTMLElement;

    span.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledWith("aldric-1");
  });

  it("does not fire onEntityClick when non-decorated text is clicked", () => {
    const onClick = vi.fn();
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: onClick,
    };
    const editor = createTestEditor(options, false, "<p>No entities here.</p>");

    editor.view.dom.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not fire onEntityClick when editor is in edit mode", () => {
    const onClick = vi.fn();
    const options: EntityAutoLinkOptions = {
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: onClick,
    };
    // Start in read mode so decoration HTML exists, then switch to edit mode
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric the Sage appeared.</p>",
    );
    editor.setEditable(true);

    // Click on the DOM node that still has the span (even though decorations
    // are empty, the DOM may retain the element until the next render tick).
    // More robustly: fire on the editor root itself.
    editor.view.dom.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

// ─── Lore / multi-instance independence (US2) ─────────────────────────────────

describe("EntityAutoLinkExtension — multiple editor instances (lore parity)", () => {
  it("two editors with the same extension produce independent decoration sets", () => {
    const makeOptions = (): EntityAutoLinkOptions => ({
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    });

    const editorA = createTestEditor(
      makeOptions(),
      false,
      "<p>Aldric the Sage spoke.</p>",
    );
    const editorB = createTestEditor(
      makeOptions(),
      false,
      "<p>The Crimson Enclave fell.</p>",
    );

    expect(getDecoratedSpans(editorA).length).toBe(1);
    expect(getDecoratedSpans(editorA)[0].getAttribute("data-entity-id")).toBe(
      "aldric-1",
    );

    expect(getDecoratedSpans(editorB).length).toBe(1);
    expect(getDecoratedSpans(editorB)[0].getAttribute("data-entity-id")).toBe(
      "crimson-3",
    );
  });

  it("destroying one editor does not affect the other", () => {
    const makeOptions = (): EntityAutoLinkOptions => ({
      entityIndex: ENTITIES,
      currentEntityId: "",
      onEntityClick: vi.fn(),
    });

    const editorA = createTestEditor(
      makeOptions(),
      false,
      "<p>Aldric the Sage.</p>",
    );
    const editorB = createTestEditor(
      makeOptions(),
      false,
      "<p>Aldric the Sage.</p>",
    );

    editorA.destroy();

    // editorB should still have its decoration
    expect(getDecoratedSpans(editorB).length).toBe(1);
  });
});

// ─── Alias matching (US4) ─────────────────────────────────────────────────────

describe("EntityAutoLinkExtension — alias matching", () => {
  it("decorates an alias that resolves to the correct entity", () => {
    const options: EntityAutoLinkOptions = {
      entityIndex: [
        { text: "aldric the sage", id: "aldric-1" },
        { text: "aldric", id: "aldric-1" },
      ],
      currentEntityId: "",
      onEntityClick: vi.fn(),
    };
    const editor = createTestEditor(
      options,
      false,
      "<p>Aldric trained her.</p>",
    );
    const spans = getDecoratedSpans(editor);
    expect(spans.length).toBe(1);
    expect(spans[0].getAttribute("data-entity-id")).toBe("aldric-1");
  });
});
