<script lang="ts">
  import { copyTextToClipboard } from "$lib/utils/share-link";

  let {
    url,
    title,
    text = "",
    onShareClicked = undefined,
    onShareCompleted = undefined,
    onLinkCopied = undefined,
    nav = typeof navigator !== "undefined" ? navigator : undefined,
    clipboard = typeof navigator !== "undefined"
      ? navigator.clipboard
      : undefined,
  }: {
    /** The canonical URL to share — never the current browser URL. */
    url: string;
    title: string;
    text?: string;
    onShareClicked?: () => void;
    onShareCompleted?: () => void;
    onLinkCopied?: () => void;
    /** Injectable for testing; defaults to the real `navigator`. */
    nav?: Pick<Navigator, "share"> | undefined;
    clipboard?: Pick<Clipboard, "writeText"> | undefined;
  } = $props();

  let copied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  const canNativeShare = $derived(typeof nav?.share === "function");

  async function handleClick() {
    onShareClicked?.();

    if (canNativeShare) {
      try {
        await nav!.share({ title, text, url });
        // navigator.share()'s promise only resolves once the OS reports the
        // share actually completed — it rejects (AbortError) if the user
        // dismisses the sheet, so this is a reliable completion signal, not
        // an inference from merely opening the sheet.
        onShareCompleted?.();
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          console.warn("[ShareButton] navigator.share failed", err);
        }
      }
      return;
    }

    const success = await copyTextToClipboard(url, clipboard);
    if (success) {
      onLinkCopied?.();
      copied = true;
      clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }
</script>

<button
  type="button"
  onclick={handleClick}
  class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-text/70 transition-all hover:border-theme-primary/60 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
  aria-label={canNativeShare
    ? "Share this article"
    : "Copy link to this article"}
>
  <span
    class={copied
      ? "icon-[lucide--check] h-3.5 w-3.5"
      : canNativeShare
        ? "icon-[lucide--share-2] h-3.5 w-3.5"
        : "icon-[lucide--link] h-3.5 w-3.5"}
    aria-hidden="true"
  ></span>
  <span>{copied ? "Copied!" : canNativeShare ? "Share" : "Copy link"}</span>
</button>
<span class="sr-only" aria-live="polite"
  >{copied ? "Link copied to clipboard" : ""}</span
>
