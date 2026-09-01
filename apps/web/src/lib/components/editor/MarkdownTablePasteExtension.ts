import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMParser as ProseMirrorDOMParser } from "@tiptap/pm/model";

export const MARKDOWN_TABLE_PASTE_KEY = new PluginKey("markdownTablePaste");

/**
 * A GFM table's separator row: `| --- | :--- | ---: |` (leading/trailing
 * pipes optional, alignment colons optional, at least 3 dashes per column
 * per the spec — 2 is also common in the wild, so this is lenient).
 */
const SEPARATOR_ROW = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/;

/**
 * Whether pasted plain text looks like a GFM pipe table: a header row
 * followed immediately by a separator row. Deliberately narrow — this only
 * has to catch the shape `marked`/markdown-it themselves would recognize as
 * a table, not validate full GFM table syntax.
 */
export function looksLikeMarkdownTable(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return false;
  return lines[0].includes("|") && SEPARATOR_ROW.test(lines[1]);
}

/**
 * `tiptap-markdown`'s built-in paste transform (transformPastedText) is
 * disabled in MarkdownEditor.svelte, and turning it on wouldn't fix tables
 * anyway: it parses pasted text with `{ inline: true }` (see tiptap-markdown's
 * own MarkdownClipboard extension), which never runs markdown-it's
 * block-level table rule. Without conversion, a pasted GFM table lands as
 * literal `| a | b |` paragraph text — worse, once saved, tiptap-markdown's
 * paragraph serializer joins each line with a blank line, which then makes
 * the *stored* text invalid table syntax too, even on a later re-render (#2635).
 *
 * This extension narrowly detects table-shaped pasted text and runs it
 * through the editor's own block-level markdown parser (no `inline: true`),
 * then hands the resulting HTML to ProseMirror's schema-aware DOM parser so
 * it becomes real table/tableRow/tableHeader/tableCell nodes — the same node
 * types `@tiptap/extension-table` already renders and `tiptap-markdown`
 * already knows how to serialize back to valid adjacent-line pipe syntax.
 * Anything that isn't table-shaped returns false and falls through to the
 * editor's normal, unaffected paste handling.
 */
export const MarkdownTablePasteExtension = Extension.create({
  name: "markdownTablePaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: MARKDOWN_TABLE_PASTE_KEY,
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            if (!text || !looksLikeMarkdownTable(text)) return false;

            // `markdown` isn't in TipTap's Storage type — it's added dynamically
            // by the Markdown extension, same as MarkdownEditor.svelte's own
            // `(editor.storage as any).markdown.getMarkdown()` cast.
            const markdownStorage = (editor.storage as any).markdown as
              { parser: { parse: (source: string) => string } } | undefined;
            if (!markdownStorage) return false;

            const html = markdownStorage.parser.parse(text);
            const dom = new window.DOMParser().parseFromString(
              `<body>${html}</body>`,
              "text/html",
            );
            const slice = ProseMirrorDOMParser.fromSchema(
              editor.schema,
            ).parseSlice(dom.body, { preserveWhitespace: true });

            const { state, dispatch } = view;
            dispatch(state.tr.replaceSelection(slice));
            return true;
          },
        },
      }),
    ];
  },
});
