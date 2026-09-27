import { tick } from "svelte";

/**
 * Pure text-editing operations behind basic Markdown formatting controls
 * (#3481): wrap a selection in an inline marker (bold/italic), or toggle a
 * line-start marker (bullets) across every line the selection touches.
 *
 * These operate on plain (text, selectionStart, selectionEnd) and return the
 * same shape, so a caller wires them to its own textarea without this module
 * touching the DOM. `apps/web/src/lib/components/vtt/TokenNoteEditor.svelte`
 * has an equivalent pair inlined against its own textarea ref; this is the
 * shared, DOM-free version new editors should use instead of copying it.
 */

export interface TextSelection {
  text: string;
  start: number;
  end: number;
}

/** Wraps the selection in `marker` on both sides, or opens an empty pair. */
export function wrapInlineMarker(
  selection: TextSelection,
  marker: string,
): TextSelection {
  const { text, start, end } = selection;
  const selected = text.slice(start, end);
  const next = `${text.slice(0, start)}${marker}${selected}${marker}${text.slice(end)}`;
  const caret = start + marker.length;
  return { text: next, start: caret, end: caret + selected.length };
}

/**
 * Adds `prefix` to the start of every line the selection touches, or removes
 * it from all of them if every touched line already has it. Toggling off
 * keeps a user from having to delete the marker on each line by hand.
 */
export function toggleLinePrefix(
  selection: TextSelection,
  prefix: string,
): TextSelection {
  const { text, start, end } = selection;
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = text.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;

  const block = text.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const rewritten = lines
    .map((line) =>
      allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`,
    )
    .join("\n");

  const next = `${text.slice(0, lineStart)}${rewritten}${text.slice(lineEnd)}`;
  const shift = rewritten.length - block.length;
  return { text: next, start, end: end + shift };
}

/**
 * Wires the pure formatting ops above to one textarea: applies a marker via
 * the toolbar or a keyboard shortcut, restores the caret, and (optionally)
 * hands Ctrl/Cmd+Enter to a submit callback. Both `JournalComposer` and
 * `JournalEntryEditForm` used to carry their own copy of this glue; sharing
 * it is what keeps a fix or a new shortcut from having to land twice.
 */
export function createMarkdownEditingController(options: {
  getTextarea: () => HTMLTextAreaElement | undefined | null;
  getText: () => string;
  setText: (text: string) => void;
  /** Ctrl/Cmd+Enter, e.g. to submit a composer. Omitted where there is no
   *  single "submit" action for it to trigger. */
  onSubmitShortcut?: () => void;
}) {
  async function format(op: (selection: TextSelection) => TextSelection) {
    const textarea = options.getTextarea();
    if (!textarea) return;
    const result = op({
      text: options.getText(),
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
    options.setText(result.text);
    await tick();
    textarea.focus();
    textarea.setSelectionRange(result.start, result.end);
  }

  const bold = () => void format((s) => wrapInlineMarker(s, "**"));
  const italic = () => void format((s) => wrapInlineMarker(s, "*"));
  const bullet = () => void format((s) => toggleLinePrefix(s, "- "));

  function handleKeydown(event: KeyboardEvent) {
    const withModifier = event.metaKey || event.ctrlKey;
    if (!withModifier) return;
    if (options.onSubmitShortcut && event.key === "Enter") {
      event.preventDefault();
      options.onSubmitShortcut();
    } else if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      bold();
    } else if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      italic();
    }
  }

  return { format, bold, italic, bullet, handleKeydown };
}
