/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => {
  const files = new Map<string, string>();
  const vault = {
    isGuest: false,
    selectedEntityId: null as string | null,
    entities: { c1: { id: "c1", title: "Mara" } } as Record<
      string,
      { id: string; title: string }
    >,
  };
  const modal = { openZenMode: vi.fn() };
  return { files, vault, modal };
});

vi.mock("$lib/stores/solo-session-instance", async () => {
  const { SoloThreadsStore } = await import("$lib/stores/solo-threads.svelte");
  const soloThreads = new SoloThreadsStore({
    vaultId: () => "v1",
    files: () => ({
      read: async (path: string[]) => env.files.get(path.join("/")) ?? null,
      write: async (path: string[], text: string) => {
        env.files.set(path.join("/"), text);
      },
    }),
    readOnly: () => env.vault.isGuest,
    entityIds: () => new Set(Object.keys(env.vault.entities)),
    ids: {
      uuid: (() => {
        let n = 0;
        return () => `t${++n}`;
      })(),
    },
    clock: { now: () => 1000 },
    publishCapture: () => {},
    notify: () => {},
  });
  return { soloThreads };
});
vi.mock("$lib/stores/vault.svelte", () => ({ vault: env.vault }));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({ modalUIStore: env.modal }));

import SoloThreadsMenu from "./SoloThreadsMenu.svelte";
import { soloThreads } from "$lib/stores/solo-session-instance";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function openMenu() {
  await fireEvent.click(screen.getByTestId("solo-threads-menu"));
}

async function addThread(title: string, kind = "lead") {
  await fireEvent.click(screen.getByTestId("solo-thread-add"));
  await fireEvent.input(screen.getByTestId("solo-thread-title"), {
    target: { value: title },
  });
  await fireEvent.change(screen.getByTestId("solo-thread-kind"), {
    target: { value: kind },
  });
  await fireEvent.click(screen.getByTestId("solo-thread-save"));
}

beforeEach(async () => {
  env.files.clear();
  env.vault.isGuest = false;
  env.vault.entities = { c1: { id: "c1", title: "Mara" } };
  env.modal.openZenMode.mockClear();
  await soloThreads.load("v1");
});

describe("SoloThreadsMenu", () => {
  it("explains threads when there are none yet", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    expect(screen.getByTestId("solo-threads-empty").textContent).toContain(
      "open questions",
    );
  });

  it("adds a thread from the dialog and lists it as open", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    await addThread("Why is the keeper lying?", "mystery");
    await flush();
    const open = screen.getByTestId("solo-threads-open");
    expect(open.textContent).toContain("Why is the keeper lying?");
    expect(open.textContent).toContain("Mystery");
    expect(env.files.get(".codex/threads.json")).toContain(
      "Why is the keeper lying?",
    );
  });

  it("refuses an empty title with a message and saves nothing", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-thread-add"));
    await fireEvent.click(screen.getByTestId("solo-thread-save"));
    expect(screen.getByTestId("solo-thread-error").textContent).toContain(
      "Give the thread a title.",
    );
    expect(soloThreads.threads).toEqual([]);
  });

  it("closes with a note, lists it under closed, and reopens it", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    await addThread("Find the bell");
    await fireEvent.click(screen.getByText("Close"));
    await fireEvent.input(screen.getByTestId("solo-thread-closing-note"), {
      target: { value: "Rung at dawn" },
    });
    await fireEvent.click(screen.getByTestId("solo-thread-confirm-close"));
    expect(
      screen.getByTestId("solo-threads-toggle-closed").textContent,
    ).toContain("(1)");
    await fireEvent.click(screen.getByTestId("solo-threads-toggle-closed"));
    expect(screen.getByTestId("solo-threads-closed").textContent).toContain(
      "Rung at dawn",
    );
    await fireEvent.click(screen.getByText("Reopen"));
    await waitFor(() =>
      expect(screen.getByTestId("solo-threads-open").textContent).toContain(
        "Find the bell",
      ),
    );
  });

  it("asks before deleting, and keeps the thread when the player says no", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    await addThread("Keep me");
    await fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete this thread?")).toBeTruthy();
    await fireEvent.click(screen.getByText("No"));
    expect(soloThreads.threads.map((t) => t.title)).toEqual(["Keep me"]);
    await fireEvent.click(screen.getByText("Delete"));
    await fireEvent.click(screen.getByTestId("solo-thread-confirm-delete"));
    expect(soloThreads.threads).toEqual([]);
  });

  it("filters by kind and searches, and says when nothing matches", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    await addThread("Lead one", "lead");
    await addThread("Mystery one", "mystery");
    await fireEvent.change(screen.getByTestId("solo-threads-filter"), {
      target: { value: "mystery" },
    });
    expect(screen.getByTestId("solo-threads-open").textContent).toContain(
      "Mystery one",
    );
    expect(screen.getByTestId("solo-threads-open").textContent).not.toContain(
      "Lead one",
    );
    await fireEvent.change(screen.getByTestId("solo-threads-filter"), {
      target: { value: "all" },
    });
    await fireEvent.input(screen.getByTestId("solo-threads-search"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("No open threads match.")).toBeTruthy();
  });

  it("opens a linked entry from the thread", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    await addThread("Ask Mara");
    await fireEvent.click(screen.getByText("Edit"));
    await fireEvent.change(screen.getByTestId("solo-thread-link-choice"), {
      target: { value: "c1" },
    });
    await fireEvent.click(screen.getByText("Link"));
    await fireEvent.click(screen.getByTestId("solo-thread-save"));
    await fireEvent.click(screen.getByText("Open Mara"));
    expect(env.modal.openZenMode).toHaveBeenCalledWith("c1");
    expect(env.vault.selectedEntityId).toBe("c1");
  });

  it("starts a fresh draft when another thread is opened for editing", async () => {
    render(SoloThreadsMenu);
    await openMenu();
    await addThread("First thread");
    await addThread("Second thread", "mystery");
    await fireEvent.click(screen.getAllByText("Edit")[0]);
    expect(
      (screen.getByTestId("solo-thread-title") as HTMLInputElement).value,
    ).toBe("First thread");
    await fireEvent.click(screen.getAllByText("Edit")[1]);
    const title = screen.getByTestId("solo-thread-title") as HTMLInputElement;
    const kind = screen.getByTestId("solo-thread-kind") as HTMLSelectElement;
    expect(title.value).toBe("Second thread");
    expect(kind.value).toBe("mystery");
  });

  it("is view-only in a read-only vault, with no add control", async () => {
    env.vault.isGuest = true;
    render(SoloThreadsMenu);
    await openMenu();
    expect(screen.getByTestId("solo-threads-readonly")).toBeTruthy();
    expect(screen.queryByTestId("solo-thread-add")).toBeNull();
  });

  it("does not change a threads file it cannot read", async () => {
    const unreadable = JSON.stringify({ version: 9, threads: [] });
    env.files.set(".codex/threads.json", unreadable);
    await soloThreads.load("v1");
    render(SoloThreadsMenu);
    await openMenu();
    expect(screen.getByTestId("solo-threads-readonly")).toBeTruthy();
    expect(screen.queryByTestId("solo-thread-add")).toBeNull();
    expect(env.files.get(".codex/threads.json")).toBe(unreadable);
  });
});
