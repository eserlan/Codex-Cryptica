import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
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
