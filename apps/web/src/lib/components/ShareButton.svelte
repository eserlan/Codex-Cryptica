<script lang="ts">
  import { tick } from "svelte";
  import { copyTextToClipboard } from "$lib/utils/share-link";
  import { createGeneratorShareFlow } from "$lib/services/sharing/generator-share-flow.svelte";
  import GeneratorShareModal from "$lib/components/modals/GeneratorShareModal.svelte";

  type PreparedShare = {
    url: string;
    title?: string;
    text?: string;
    cleanup?: () => Promise<void>;
  };

  let {
    url,
    title,
    text = "",
    onShareClicked = undefined,
    onShareCompleted = undefined,
    onLinkCopied = undefined,
    prepareShare = undefined,
    subjectLabel = "this article",
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
    /** Optionally creates the final URL immediately before sharing. */
    prepareShare?: () => Promise<PreparedShare>;
    /** The thing named in the button's accessible label. */
    subjectLabel?: string;
    /** Injectable for testing; defaults to the real `navigator`. */
    nav?: Pick<Navigator, "share"> | undefined;
    clipboard?: Pick<Clipboard, "writeText"> | undefined;
  } = $props();

  let isSharing = $state(false);
  let copied = $state(false);
  let copyFailed = $state(false);
  let copyAnnouncement = $state("");
  let copyTimeout: ReturnType<typeof setTimeout> | undefined;

  const canNativeShare = $derived(typeof nav?.share === "function");
  const shareFlow = $derived.by(() =>
    prepareShare ? createGeneratorShareFlow() : null,
  );

  async function copyLink(link: string): Promise<boolean> {
    const success = await copyTextToClipboard(link, clipboard);
    if (success) {
      onLinkCopied?.();
      copied = true;
      copyFailed = false;
      // Reset first so a repeat copy within the 2s window still mutates
      // the aria-live region's text and gets re-announced.
      copyAnnouncement = "";
      await tick();
      copyAnnouncement = "Link copied to clipboard";
      clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        copied = false;
      }, 2000);
      return true;
    } else {
      copyFailed = true;
      return false;
    }
  }

  async function cleanupPreparedShare(prepared: PreparedShare) {
    if (!prepared.cleanup) return;
    try {
      await prepared.cleanup();
    } catch (err) {
      console.warn("[ShareButton] Failed to clean up prepared share", err);
    }
  }

  async function handleClick() {
    if (isSharing) return;
    onShareClicked?.();

    // For generator shares with prepareShare, use the modal flow
    if (prepareShare && shareFlow) {
      shareFlow.start({
        title: subjectLabel,
        prepareShare,
      });
      return;
    }

    isSharing = true;

    try {
      copyFailed = false;
      let prepared: PreparedShare;
      try {
        prepared = prepareShare ? await prepareShare() : { url, title, text };
      } catch (err) {
        console.warn("[ShareButton] Failed to prepare share", err);
        copyFailed = true;
        return;
      }
      if (nav?.share) {
        try {
          await nav.share({
            title: prepared.title ?? title,
            text: prepared.text ?? text,
            url: prepared.url,
          });
          // navigator.share()'s promise only resolves once the OS reports
          // the share actually completed — it rejects (AbortError) if the
          // user dismisses the sheet, so this is a reliable completion
          // signal, not an inference from merely opening the sheet.
          onShareCompleted?.();
        } catch (err) {
          if ((err as { name?: string })?.name === "AbortError") {
            await cleanupPreparedShare(prepared);
          } else {
            console.warn("[ShareButton] navigator.share failed", err);
            const copiedLink = await copyLink(prepared.url);
            if (!copiedLink) await cleanupPreparedShare(prepared);
          }
        }
        return;
      }

      const copiedLink = await copyLink(prepared.url);
      if (!copiedLink) await cleanupPreparedShare(prepared);
    } finally {
      isSharing = false;
    }
  }
</script>

<button
  type="button"
  onclick={handleClick}
  disabled={isSharing}
  aria-busy={isSharing}
  class="inline-flex items-center gap-1.5 rounded-full border border-theme-border/60 bg-theme-surface/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-text/70 transition-all hover:border-theme-primary/60 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent disabled:opacity-70"
  aria-label={canNativeShare
    ? `Share ${subjectLabel}`
    : `Copy link to ${subjectLabel}`}
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
{#if copyFailed}
  <span class="text-[10px] text-theme-danger" role="alert"
    >Couldn't copy the link — copy it from the address bar instead.</span
  >
{/if}
<span class="sr-only" aria-live="polite">{copyAnnouncement}</span>

{#if shareFlow}
  <GeneratorShareModal
    open={shareFlow.open}
    state={shareFlow.state}
    subject={shareFlow.subject}
    shareData={shareFlow.shareData}
    onConfirm={() => shareFlow.confirm()}
    onCopyLink={(url) => {
      shareFlow.copyLink(url);
      onLinkCopied?.();
    }}
    onClose={() => shareFlow.close()}
  />
{/if}
