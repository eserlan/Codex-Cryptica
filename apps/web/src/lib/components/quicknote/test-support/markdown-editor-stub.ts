/**
 * A stand-in for `MarkdownEditor` in journal tests that are about the
 * journal's own behaviour (adding, editing, moving entries), not about
 * TipTap: typing into a real ProseMirror surface through jsdom events is
 * unreliable, so these tests drive a plain textarea instead. The real
 * editor's rendering is covered by `MarkdownEditor.compact.test.ts`.
 */
export function markdownEditorStub(
  anchor: Comment,
  props: {
    content?: string;
    onUpdate?: (markdown: string) => void;
    onSubmitShortcut?: () => void;
    testId?: string;
  },
) {
  const el = document.createElement("textarea");
  el.setAttribute("data-testid", props.testId ?? "markdown-editor-stub");
  el.value = props.content ?? "";
  el.addEventListener("input", () => props.onUpdate?.(el.value));
  el.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      props.onSubmitShortcut?.();
    }
  });
  anchor.before(el);
}
