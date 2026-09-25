export interface GeneratorInlineCopyOptions {
  clipboard: Pick<Clipboard, "writeText">;
  trackCopy: () => void;
}

/** Handle delegated copies of literal values rendered inside generator output. */
export function handleGeneratorInlineCopy(
  event: MouseEvent,
  { clipboard, trackCopy }: GeneratorInlineCopyOptions,
): void {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const copyButton = target.closest<HTMLElement>("[data-copy-text]");
  if (!copyButton) return;

  const textToCopy = copyButton.getAttribute("data-copy-text");
  if (!textToCopy) return;

  trackCopy();
  clipboard
    .writeText(textToCopy)
    .then(() => {
      const icon = copyButton.querySelector("span");
      if (!icon) return;

      icon.className =
        "icon-[lucide--check] w-3.5 h-3.5 text-green-500 animate-pulse";
      setTimeout(() => {
        icon.className = "icon-[lucide--copy] w-3.5 h-3.5";
      }, 1500);
    })
    .catch((error) => {
      console.error("Failed to copy text:", error);
    });
}
