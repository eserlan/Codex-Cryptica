import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import type { ArtworkCommand } from "@codex/adventure-artwork-engine";
import type {
  ArtworkSubject,
  ArtworkControlContext,
} from "#lib/services/adventure/artwork/ports.js";
import AdventureLocationControls from "./AdventureLocationControls.svelte";

const asset = {
  id: "forest",
  type: "location",
  genres: ["fantasy"],
  primaryCues: ["forest"],
  settingCues: [],
  moodCues: [],
  timeCues: [],
  excludes: [],
  review: { status: "approved" },
  alt: "Forest road",
  provenance: { attribution: "Artist" },
  variants: { display: { sha256: "a".repeat(64) } },
} as unknown as ArtworkAsset;
const session = {
  id: "s1",
  vaultId: "v1",
  revision: 2,
  currentPlaceId: "p1",
  places: [{ id: "p1", name: "Forest" }],
};
describe("adventure location controls", () => {
  it("offers eligible options and saves the selected choice", async () => {
    const mutate = vi.fn(
      async (
        _subject: ArtworkSubject,
        _command: ArtworkCommand,
        _context: ArtworkControlContext,
      ) => ({ ok: true as const, association: { version: 1 as const } }),
    );
    render(AdventureLocationControls, {
      props: {
        session,
        catalogue: [asset],
        theme: "fantasy",
        readOnly: false,
        mutate,
      },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Choose another" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Forest road" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledOnce());
    expect(mutate.mock.calls[0][1]).toMatchObject({
      kind: "replace",
      choice: { assetId: "forest" },
    });
  });
  it("does not show local controls for a linked canonical place", () => {
    const linked = {
      ...session,
      places: [{ ...session.places[0], sourceRecordId: "e1" }],
    };
    render(AdventureLocationControls, {
      props: {
        session: linked,
        catalogue: [asset],
        theme: "fantasy",
        readOnly: false,
        mutate: vi.fn(),
      },
    });
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });
});
