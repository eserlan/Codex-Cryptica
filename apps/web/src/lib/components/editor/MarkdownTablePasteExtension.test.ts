import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import {
  MarkdownTablePasteExtension,
  MARKDOWN_TABLE_PASTE_KEY,
  looksLikeMarkdownTable,
} from "./MarkdownTablePasteExtension";

// ─── looksLikeMarkdownTable ──────────────────────────────────────────────────

describe("looksLikeMarkdownTable", () => {
  it("recognises a standard GFM table", () => {
    expect(
      looksLikeMarkdownTable(
        "| Name | Role | Attitude |\n| --- | --- | --- |\n| Mira Voss | Captain | Suspicious |",
      ),
    ).toBe(true);
  });

  it("recognises alignment colons in the separator row", () => {
    expect(
      looksLikeMarkdownTable(
        "| Name | Role |\n| :--- | ---: |\n| Mira Voss | Captain |",
      ),
    ).toBe(true);
  });

  it("recognises a table without leading/trailing pipes", () => {
    expect(
      looksLikeMarkdownTable("Name | Role\n--- | ---\nMira Voss | Captain"),
    ).toBe(true);
  });

  it("rejects a single line", () => {
    expect(looksLikeMarkdownTable("| Name | Role | Attitude |")).toBe(false);
  });

  it("rejects plain prose with a pipe character", () => {
    expect(
      looksLikeMarkdownTable("This costs 5 | 10 gold depending on the day."),
    ).toBe(false);
  });

  it("rejects two lines that aren't a header/separator pair", () => {
    expect(
      looksLikeMarkdownTable("| Name | Role |\n| Mira Voss | Captain |"),
    ).toBe(false);
  });

  it("rejects empty input", () => {
    expect(looksLikeMarkdownTable("")).toBe(false);
    expect(looksLikeMarkdownTable("   \n  \n")).toBe(false);
  });
});

// ─── Paste integration ───────────────────────────────────────────────────────

const editors: Editor[] = [];

function createTestEditor(): Editor {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const editor = new Editor({
    element: el,
    extensions: [
      StarterKit,
      Markdown.configure({ html: true, transformPastedText: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      MarkdownTablePasteExtension,
    ],
    content: "<p>Existing paragraph.</p>",
  });
  editors.push(editor);
  return editor;
}

/** Invokes the extension's own handlePaste prop directly — jsdom has no
 *  ClipboardEvent/DataTransfer, so a real paste event can't be dispatched. */
function paste(editor: Editor, plainText: string): boolean {
  const plugin = MARKDOWN_TABLE_PASTE_KEY.get(editor.state);
  const handlePaste = (plugin as any)?.props?.handlePaste;
  const fakeEvent = {
    clipboardData: {
      getData: (type: string) => (type === "text/plain" ? plainText : ""),
    },
  };
  return handlePaste(editor.view, fakeEvent);
}

afterEach(() => {
  for (const e of editors) {
    if (!e.isDestroyed) e.destroy();
  }
  editors.length = 0;
  document.body.innerHTML = "";
});

describe("MarkdownTablePasteExtension — paste handling", () => {
  it("converts a pasted GFM table into real table nodes", () => {
    const editor = createTestEditor();
    editor.commands.focus("end");

    const handled = paste(
      editor,
      "| Name | Role | Attitude |\n| --- | --- | --- |\n| Mira Voss | Captain | Suspicious |\n| Oren Vale | Factor | Friendly |",
    );

    expect(handled).toBe(true);
    const dom = editor.view.dom;
    expect(dom.querySelectorAll("table")).toHaveLength(1);
    expect(dom.querySelectorAll("tr")).toHaveLength(3);
    const headerCells = Array.from(dom.querySelectorAll("th")).map((c) =>
      c.textContent?.trim(),
    );
    expect(headerCells).toEqual(["Name", "Role", "Attitude"]);
    const bodyCells = Array.from(dom.querySelectorAll("td")).map((c) =>
      c.textContent?.trim(),
    );
    expect(bodyCells).toEqual([
      "Mira Voss",
      "Captain",
      "Suspicious",
      "Oren Vale",
      "Factor",
      "Friendly",
    ]);
  });

  it("round-trips the pasted table back to adjacent-line GFM markdown, with no blank lines between rows", () => {
    const editor = createTestEditor();
    editor.commands.focus("end");
    paste(editor, "| Name | Role |\n| --- | --- |\n| Mira Voss | Captain |");

    const markdown = (editor.storage as any).markdown.getMarkdown();
    // The bug this extension fixes: a table entered without conversion
    // serializes with a blank line between every row, which breaks GFM
    // table syntax on save. Assert that specifically does not happen.
    expect(markdown).not.toMatch(/\|\s*\n\s*\n\s*\|/);
    expect(markdown).toContain("| Name | Role |");
    expect(markdown).toMatch(/\| --- \| --- \|/);
    expect(markdown).toContain("| Mira Voss | Captain |");
  });

  it("parses pre-existing table markdown on load, independent of the paste fix", () => {
    // Content already stored as valid GFM table markdown (e.g. AI-generated,
    // imported, or a prior save from this extension) must render as a real
    // table when the entity is opened — this path goes through tiptap-markdown's
    // full block-level parser on `content:`, not through handlePaste at all.
    const el = document.createElement("div");
    document.body.appendChild(el);
    const editor = new Editor({
      element: el,
      extensions: [
        StarterKit,
        Markdown.configure({ html: true, transformPastedText: false }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        MarkdownTablePasteExtension,
      ],
      content: "| Name | Role |\n| --- | --- |\n| Mira Voss | Captain |",
    });
    editors.push(editor);

    expect(editor.view.dom.querySelectorAll("table")).toHaveLength(1);
    expect(editor.view.dom.querySelectorAll("tr")).toHaveLength(2);
  });

  it("leaves non-table pastes to the editor's normal handling", () => {
    const editor = createTestEditor();
    editor.commands.focus("end");

    const handled = paste(editor, "Just a line of prose, not a table.");

    expect(handled).toBe(false);
    expect(editor.view.dom.querySelectorAll("table")).toHaveLength(0);
  });
});
