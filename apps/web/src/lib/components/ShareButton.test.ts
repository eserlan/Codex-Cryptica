/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import ShareButton from "./ShareButton.svelte";

// Stub Element.prototype.animate for JSDOM / Svelte 5 transitions compatibility.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () => {
    return {
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;
  };
}

const props = {
  url: "https://codexcryptica.com/answers/how-do-you-track-faction-turns-between-rpg-sessions",
  title: "How do you track faction turns between RPG sessions?",
  text: "A five-step framework for resolving off-screen faction activity.",
};

describe("ShareButton", () => {
  it("uses navigator.share with the canonical url and title when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const onShareClicked = vi.fn();
    const onShareCompleted = vi.fn();
    const onLinkCopied = vi.fn();

    render(ShareButton, {
      props: {
        ...props,
        nav: { share },
        onShareClicked,
        onShareCompleted,
        onLinkCopied,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Share this article" }),
    );

    expect(onShareClicked).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: props.title,
      text: props.text,
      url: props.url,
    });
    // navigator.share's promise resolving is the reliable completion signal.
    await Promise.resolve();
    await Promise.resolve();
    expect(onShareCompleted).toHaveBeenCalledTimes(1);
    expect(onLinkCopied).not.toHaveBeenCalled();
  });

  it("does not report completion when the user cancels the native share sheet", async () => {
    const abortError = Object.assign(new Error("cancelled"), {
      name: "AbortError",
    });
    const share = vi.fn().mockRejectedValue(abortError);
    const onShareCompleted = vi.fn();

    render(ShareButton, {
      props: { ...props, nav: { share }, onShareCompleted },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Share this article" }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(onShareCompleted).not.toHaveBeenCalled();
  });

  it("opens a modal when prepareShare is provided", async () => {
    const prepareShare = vi
      .fn()
      .mockResolvedValue({ url: props.url, title: props.title });

    render(ShareButton, {
      props: {
        ...props,
        prepareShare,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Copy link to this article" }),
    );
    await tick();

    // Modal should be visible
    expect(screen.getByTestId("share-confirm-button")).toBeTruthy();
  });

  it("keeps the share modal open across a re-render that changes prepareShare's identity", async () => {
    // Regression test: callers pass an inline arrow function for
    // prepareShare (e.g. `prepareShare={() => onPrepareShare!(entity)}`),
    // a new reference on every re-render. The share flow must be created
    // once per component instance rather than recreated whenever that
    // reference changes, or the modal opens and instantly disappears.
    const prepareShare1 = vi
      .fn()
      .mockResolvedValue({ url: props.url, title: props.title });

    const { rerender } = render(ShareButton, {
      props: { ...props, prepareShare: prepareShare1 },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Copy link to this article" }),
    );
    await tick();
    expect(screen.getByTestId("share-confirm-button")).toBeTruthy();

    const prepareShare2 = vi
      .fn()
      .mockResolvedValue({ url: props.url, title: props.title });
    await rerender({ ...props, prepareShare: prepareShare2 });
    await tick();

    expect(screen.getByTestId("share-confirm-button")).toBeTruthy();
  });

  it("falls back to copying when the native share sheet fails", async () => {
    const share = vi.fn().mockRejectedValue(new Error("activation lost"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onLinkCopied = vi.fn();

    render(ShareButton, {
      props: {
        ...props,
        nav: { share },
        clipboard: { writeText },
        onLinkCopied,
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Share this article" }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(props.url);
    expect(onLinkCopied).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("falls back to copying the link when navigator.share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onShareClicked = vi.fn();
    const onLinkCopied = vi.fn();
    const onShareCompleted = vi.fn();

    render(ShareButton, {
      props: {
        ...props,
        nav: undefined,
        clipboard: { writeText },
        onShareClicked,
        onLinkCopied,
        onShareCompleted,
      },
    });

    const button = screen.getByRole("button", {
      name: "Copy link to this article",
    });
    await fireEvent.click(button);
    await Promise.resolve();
    await Promise.resolve();

    expect(onShareClicked).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(props.url);
    expect(onLinkCopied).toHaveBeenCalledTimes(1);
    expect(onShareCompleted).not.toHaveBeenCalled();
    expect(screen.getByText("Copied!")).toBeTruthy();
  });

  it("gives accessible copy-success feedback via an aria-live region, not colour alone", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    render(ShareButton, {
      props: { ...props, nav: undefined, clipboard: { writeText } },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Copy link to this article" }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText("Link copied to clipboard")).toBeTruthy();
  });

  it("ignores a second click while a share/copy is still in flight", async () => {
    let resolveShare: () => void = () => {};
    const share = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveShare = resolve;
        }),
    );
    const onShareClicked = vi.fn();

    render(ShareButton, {
      props: { ...props, nav: { share }, onShareClicked },
    });

    const button = screen.getByRole("button", { name: "Share this article" });
    await fireEvent.click(button);
    await fireEvent.click(button);
    await fireEvent.click(button);

    expect(onShareClicked).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
    expect((button as HTMLButtonElement).disabled).toBe(true);

    resolveShare();
    await Promise.resolve();
    await Promise.resolve();
    await tick();
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows accessible failure feedback when the copy fails entirely", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    render(ShareButton, {
      props: {
        ...props,
        nav: undefined,
        // No documentRef is passed, so the execCommand fallback also can't
        // run — copyTextToClipboard resolves to false.
        clipboard: { writeText },
      },
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Copy link to this article" }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByRole("alert").textContent).toContain(
      "Couldn't copy the link",
    );
    expect(screen.queryByText("Copied!")).toBeNull();
  });

  it("re-announces the aria-live region on a repeat copy within the feedback window", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    render(ShareButton, {
      props: { ...props, nav: undefined, clipboard: { writeText } },
    });

    const button = screen.getByRole("button", {
      name: "Copy link to this article",
    });

    await fireEvent.click(button);
    await Promise.resolve();
    await Promise.resolve();
    await tick();
    expect(screen.getByText("Link copied to clipboard")).toBeTruthy();

    await fireEvent.click(button);
    await Promise.resolve();
    await Promise.resolve();
    await tick();

    expect(writeText).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Link copied to clipboard")).toBeTruthy();
  });
});
