import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
import type { TurnArtworkReveal } from "#lib/services/adventure/artwork/turn-artwork-reveals.js";
import type { AdventureLightboxController } from "./adventure-artwork-lightbox.svelte.js";
import Harness from "../__fixtures__/TurnArtworkHarness.svelte";

const display = {} as ArtworkDisplayService;

function makeReveal(
  reason: "entered" | "reintroduced" = "entered",
): TurnArtworkReveal {
  return {
    location: {
      name: "Mossy Bridge",
      selection: {
        kind: "vault",
        image: "images/bridge.webp",
        subjectKey: "place:bridge",
        alt: "A mossy bridge",
      },
    },
    npcs: [
      {
        id: "npc-1",
        name: "Mira",
        reason,
        selection: {
          kind: "vault",
          name: "Mira",
          subjectKey: "npc:mira",
          image: "images/mira.webp",
          alt: "Portrait of Mira",
        },
      },
    ],
  };
}

function setup(
  reveal: TurnArtworkReveal,
  resolve: (path: string) => string | undefined = (path) => `blob:${path}`,
) {
  let controller!: AdventureLightboxController;
  render(Harness, {
    props: {
      reveal,
      display,
      resolve,
      onController: (c: AdventureLightboxController) => (controller = c),
    },
  });
  return () => controller;
}

describe("adventure turn artwork presentations", () => {
  it("renders full and compact wrappers switched by container query", async () => {
    setup(makeReveal());
    const full = screen.getByTestId("adventure-turn-artwork");
    const compact = screen.getByTestId("adventure-turn-artwork-compact");
    expect(full.classList.contains("@4xl:hidden")).toBe(true);
    expect(compact.classList.contains("hidden")).toBe(true);
    expect(compact.classList.contains("@4xl:flex")).toBe(true);
    expect(
      await screen.findByRole("button", {
        name: "Show illustration of Mossy Bridge",
      }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("button", {
        name: "Show portrait of Mira, enters",
      }),
    ).toBeTruthy();
  });

  it("uses the returns cue for a reintroduced NPC", async () => {
    setup(makeReveal("reintroduced"));
    expect(
      await screen.findByRole("button", {
        name: "Show portrait of Mira, returns",
      }),
    ).toBeTruthy();
  });

  it("opens the lightbox from a compact callout", async () => {
    const get = setup(makeReveal());
    await fireEvent.click(
      await screen.findByRole("button", {
        name: "Show portrait of Mira, enters",
      }),
    );
    expect(get().show).toBe(true);
    expect(get().current?.alt).toBe("Portrait of Mira");
  });

  it("lists the same image once across full card and callout", async () => {
    const get = setup(makeReveal());
    await screen.findByRole("button", {
      name: "Show portrait of Mira, enters",
    });
    await screen.findByRole("button", { name: "Enlarge portrait of Mira" });
    await screen.findByRole("button", {
      name: "Show illustration of Mossy Bridge",
    });
    await waitFor(() => expect(get().items).toHaveLength(2));
    expect(
      get()
        .items.map((item) => item.alt)
        .sort(),
    ).toEqual(["A mossy bridge", "Portrait of Mira"]);
  });

  it("renders nothing for an empty reveal", () => {
    setup({ npcs: [] });
    expect(screen.queryByTestId("adventure-turn-artwork")).toBeNull();
    expect(screen.queryByTestId("adventure-turn-artwork-compact")).toBeNull();
  });

  it("renders no callout when the image cannot load", async () => {
    setup(makeReveal(), (path) =>
      path.includes("mira") ? undefined : `blob:${path}`,
    );
    await screen.findByRole("button", {
      name: "Show illustration of Mossy Bridge",
    });
    expect(
      screen.queryByRole("button", { name: "Show portrait of Mira, enters" }),
    ).toBeNull();
  });
});

describe("compact callout lazy loading", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("skips the CSS-hidden inline portrait when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    vi.stubGlobal("getComputedStyle", (element: Element) => ({
      display: element.closest('[data-testid="adventure-turn-artwork"]')
        ? "none"
        : "block",
    }));
    const resolve = vi.fn((path: string) => `blob:${path}`);
    setup({ location: undefined, npcs: makeReveal().npcs }, resolve);

    await waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
    expect(resolve).toHaveBeenCalledWith("images/mira.webp");
  });

  it("starts loading only after the callout becomes visible", async () => {
    const instances: Array<{
      cb: IntersectionObserverCallback;
      target?: Element;
    }> = [];
    class FakeObserver {
      cb: IntersectionObserverCallback;
      target?: Element;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
        instances.push(this);
      }
      observe(el: Element) {
        this.target = el;
      }
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const resolve = vi.fn((path: string) => `blob:${path}`);
    setup({ location: makeReveal().location, npcs: [] }, resolve);
    await Promise.resolve();
    expect(instances.length).toBeGreaterThan(0);
    expect(resolve).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Show illustration/ }),
    ).toBeNull();

    const compactObserver = instances.find((i) =>
      screen
        .getByTestId("adventure-turn-artwork-compact")
        .contains(i.target ?? null),
    )!;
    const observed = compactObserver.target as Element;
    expect(observed.classList.contains("contents")).toBe(false);
    expect(observed.classList.contains("inline-flex")).toBe(true);
    compactObserver.cb(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      compactObserver as unknown as IntersectionObserver,
    );
    expect(
      await screen.findByRole("button", {
        name: "Show illustration of Mossy Bridge",
      }),
    ).toBeTruthy();
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it("does not load the CSS-hidden inline NPC portrait on wide surfaces", async () => {
    const instances: Array<{
      cb: IntersectionObserverCallback;
      target?: Element;
    }> = [];
    class FakeObserver {
      cb: IntersectionObserverCallback;
      target?: Element;
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb;
        instances.push(this);
      }
      observe(el: Element) {
        this.target = el;
      }
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const resolve = vi.fn((path: string) => `blob:${path}`);
    setup({ location: undefined, npcs: makeReveal().npcs }, resolve);
    await Promise.resolve();

    const inlineObserver = instances.find((instance) =>
      screen
        .getByTestId("adventure-turn-artwork")
        .contains(instance.target ?? null),
    )!;
    const calloutObserver = instances.find((instance) =>
      screen
        .getByTestId("adventure-turn-artwork-compact")
        .contains(instance.target ?? null),
    )!;
    expect(inlineObserver).toBeTruthy();
    expect(calloutObserver).toBeTruthy();
    expect(resolve).not.toHaveBeenCalled();

    calloutObserver.cb(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      calloutObserver as unknown as IntersectionObserver,
    );
    await waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));

    // A display:none ancestor has no intersection, so the inline observer is
    // intentionally left untouched at this wide container size.
    expect(resolve).toHaveBeenCalledWith("images/mira.webp");
  });
});
