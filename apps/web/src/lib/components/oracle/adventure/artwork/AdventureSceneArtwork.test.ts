import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureSceneArtwork from "./AdventureSceneArtwork.svelte";

describe("adventure scene illustration", () => {
  it("shows a modest illustration with public credits and a clear AI label", async () => {
    const release = vi.fn();
    const load = vi.fn(async () => ({ url: "blob:scene", release }));
    const { unmount } = render(AdventureSceneArtwork, {
      props: {
        subjectKey: "one",
        alt: "A forest road",
        credit: "Codex Cryptica",
        load,
      },
    });
    expect(
      (await screen.findByAltText("A forest road")).getAttribute("src"),
    ).toBe("blob:scene");
    expect(screen.getByText(/AI illustration/).textContent).toContain(
      "Codex Cryptica",
    );
    unmount();
    expect(release).toHaveBeenCalledOnce();
  });
  it("ignores and releases an image returned after the subject changes", async () => {
    let complete!: (value: { url: string; release: () => void }) => void;
    const release = vi.fn();
    const first = vi.fn(
      () =>
        new Promise<{ url: string; release: () => void }>((resolve) => {
          complete = resolve;
        }),
    );
    const second = vi.fn(async () => null);
    const view = render(AdventureSceneArtwork, {
      props: { subjectKey: "one", alt: "First", credit: "Credit", load: first },
    });
    await waitFor(() => expect(first).toHaveBeenCalledOnce());
    await view.rerender({
      subjectKey: "two",
      alt: "Second",
      credit: "Credit",
      load: second,
    });
    complete({ url: "blob:stale", release });
    await waitFor(() => expect(release).toHaveBeenCalledOnce());
    expect(screen.queryByAltText("First")).toBeNull();
  });
  it("removes a failed image without affecting the rest of play", async () => {
    const release = vi.fn();
    const { unmount } = render(AdventureSceneArtwork, {
      props: {
        subjectKey: "one",
        alt: "Forest",
        credit: "Credit",
        load: async () => ({ url: "blob:broken", release }),
      },
    });
    await fireEvent.error(await screen.findByAltText("Forest"));
    expect(screen.queryByAltText("Forest")).toBeNull();
    expect(release).toHaveBeenCalledOnce();
    unmount();
    expect(release).toHaveBeenCalledOnce();
  });
});
