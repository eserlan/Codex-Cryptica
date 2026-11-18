import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type {
  AdventureJsonV1,
  StoredAdventurePackage,
} from "@codex/adventure-engine";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sample from "../../../../../static/schemas/adventure-json/examples/minimal.v1.json";
import { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";
import ApprovedAdventurePackages from "./ApprovedAdventurePackages.svelte";

function fixture(name: string): AdventureJsonV1 {
  return JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../../fixtures/adventures/${name}/adventure.v1.json`,
      ),
      "utf8",
    ),
  );
}

function setup(pkg: AdventureJsonV1 = sample as AdventureJsonV1) {
  const open = vi.fn(async () => {});
  const library = new AdventurePackageLibrary({
    getVaultId: () => "vault-1",
    isReady: () => true,
    isGuest: () => false,
    listPackages: async (): Promise<StoredAdventurePackage[]> => [],
    listSessions: async () => ({ effectiveActiveId: null, entries: [] }),
    open,
    resumeArchived: open,
    removeApproved: async (_vaultId, hash) => ({
      status: "removed",
      hash,
      path: hash,
    }),
  });
  const hash = "a".repeat(64);
  library.packages = [
    {
      hash,
      path: "package.json",
      originFormat: "adventure-json/v1",
      package: pkg,
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

  describe("package card", () => {
    it.each(["reference-one-shot", "mystery"])(
      "shows safe details and no spoilers for %s",
      (name) => {
        const pkg = fixture(name);
        const { library, onStart } = setup(pkg);
        const { container } = render(ApprovedAdventurePackages, {
          library,
          onStart,
        });
        const html = container.innerHTML;
        expect(html).toContain(pkg.title);
        expect(html).toContain(pkg.system?.name ?? "");
        expect(html).toContain("2–5 players");
        expect(html).toContain(pkg.source.license);
        expect(html).toContain(pkg.premise.hook);
        const hidden = [
          pkg.premise.background,
          ...pkg.scenes.flatMap((s) => [s.title, s.summary]),
          ...pkg.endings.flatMap((e) => [e.title, e.description]),
          ...pkg.secrets.map((s) => s.text),
          ...[
            ...pkg.locations,
            ...pkg.actors,
            ...pkg.items,
            ...pkg.encounters,
            ...pkg.clues,
          ]
            .filter((e) => e.visibility === "gm-only")
            .flatMap((e) => {
              const r = e as Record<string, unknown>;
              return [r.name, r.title, r.summary, r.description, r.text];
            }),
        ].filter((t): t is string => typeof t === "string" && t.length > 0);
        for (const text of hidden) {
          expect(html.includes(text.replace(/&/g, "&amp;"))).toBe(false);
          expect(html.includes(text)).toBe(false);
        }
        expect(screen.queryByRole("radiogroup")).toBeNull();
        expect(screen.queryAllByRole("radio")).toHaveLength(0);
      },
    );

    it("calls onStart with two arguments for a single start", async () => {
      const pkg = fixture("mystery");
      const { library, hash, onStart } = setup(pkg);
      render(ApprovedAdventurePackages, { library, onStart });
      await fireEvent.click(
        screen.getByRole("button", { name: "Start new session" }),
      );
      expect(onStart.mock.calls[0]).toEqual([pkg, hash]);
    });

    it("offers a starting-point picker for several starts", async () => {
      const ref = fixture("reference-one-shot");
      const base = {
        epistemicStatus: ref.scenes[0].epistemicStatus,
        sourceRef: ref.scenes[0].sourceRef,
      };
      const pkg = {
        ...ref,
        scenes: [
          ...ref.scenes,
          {
            ...base,
            id: "alt-visible",
            title: "The Lower Dock",
            summary: "Begin among the smugglers.",
            optional: true,
            visibility: "player-visible",
          },
          {
            ...base,
            id: "alt-secret",
            title: "Hidden Vault Title",
            summary: "Hidden vault summary.",
            optional: true,
            visibility: "gm-only",
          },
        ],
      } as AdventureJsonV1;
      const { library, hash, onStart } = setup(pkg);
      const { container } = render(ApprovedAdventurePackages, {
        library,
        onStart,
      });
      const group = screen.getByRole("group", { name: "Starting point" });
      const radios = within(group).getAllByRole("radio") as HTMLInputElement[];
      expect(radios).toHaveLength(3);
      expect(radios[0].checked).toBe(true);
      expect(within(group).getByText("The Lower Dock")).toBeTruthy();
      expect(
        within(group).getByText("Begin among the smugglers."),
      ).toBeTruthy();
      expect(
        screen.getByLabelText("Alternative start (details hidden)"),
      ).toBeTruthy();
      for (const hidden of [
        "Hidden Vault Title",
        "Hidden vault summary.",
        "alt-secret",
      ])
        expect(container.innerHTML).not.toContain(hidden);
      await fireEvent.click(radios[1]);
      await fireEvent.click(
        screen.getByRole("button", { name: "Start new session" }),
      );
      expect(onStart).toHaveBeenCalledWith(pkg, hash, "alt-visible");
    });
  });
});
