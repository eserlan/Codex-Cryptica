import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { AdventureJsonV1 } from "@codex/adventure-engine";
import sample from "../../../../../static/schemas/adventure-json/examples/minimal.v1.json";
import { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";
import ApprovedAdventurePackages from "./ApprovedAdventurePackages.svelte";

function setup() {
  const open = vi.fn(async () => {});
  const library = new AdventurePackageLibrary({
    getVaultId: () => "vault-1",
    isReady: () => true,
    isGuest: () => false,
    listPackages: async () => [],
    listSessions: async () => ({ effectiveActiveId: null, entries: [] }),
    open,
    resumeArchived: open,
  });
  const hash = "a".repeat(64);
  library.packages = [
    {
      hash,
      path: "package.json",
      originFormat: "adventure-json/v1",
      package: sample as AdventureJsonV1,
    },
  ];
  const onStart = vi.fn();
  return { library, hash, onStart, open };
}

describe("approved adventure packages", () => {
  it("starts a new session with the exact approved package and hash", async () => {
    const { library, hash, onStart } = setup();
    render(ApprovedAdventurePackages, { library, onStart });
    await fireEvent.click(
      screen.getByRole("button", { name: "Start new session" }),
    );
    expect(onStart).toHaveBeenCalledWith(library.packages[0].package, hash);
    expect(screen.queryByRole("button", { name: /Resume/ })).toBeNull();
  });

  it("resumes the latest pinned session", async () => {
    const { library, hash, onStart, open } = setup();
    library.pinnedByHash = new Map([
      [
        hash,
        [
          {
            id: "session-1",
            title: "At the mill",
            status: "active",
            loadCondition: "normal",
          },
        ],
      ],
    ]);
    render(ApprovedAdventurePackages, { library, onStart });
    await fireEvent.click(
      screen.getByRole("button", { name: "Resume (At the mill)" }),
    );
    expect(open).toHaveBeenCalledWith("vault-1", "session-1");
  });

  it("hides an empty library and displays resume failures", () => {
    const { library, onStart } = setup();
    library.resumeError = "Unable to open the session.";
    const view = render(ApprovedAdventurePackages, { library, onStart });
    expect(screen.getByRole("alert").textContent).toBe(
      "Unable to open the session.",
    );
    view.unmount();
    library.packages = [];
    render(ApprovedAdventurePackages, { library, onStart });
    expect(screen.queryByTestId("approved-adventure-packages")).toBeNull();
  });
});
