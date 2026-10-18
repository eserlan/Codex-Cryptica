import type { Attachment } from "svelte/attachments";

/**
 * Grows a textarea to fit its text. Reading `value` makes the attachment
 * re-run when the text changes from code (an AI answer, a redraft, an undo),
 * not only when the GM types.
 */
export function autosize(value: () => string): Attachment<HTMLTextAreaElement> {
  return (node) => {
    value();
    const resize = () => {
      node.style.height = "auto";
      // `scrollHeight` excludes borders; border-box sizing needs them added.
      const borders = node.offsetHeight - node.clientHeight;
      node.style.height = `${node.scrollHeight + borders}px`;
    };
    resize();
    node.addEventListener("input", resize);
    return () => node.removeEventListener("input", resize);
  };
}
