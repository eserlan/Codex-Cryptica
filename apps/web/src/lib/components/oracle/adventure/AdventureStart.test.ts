/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureStart from "./AdventureStart.svelte";

function manager(
  start: (...args: unknown[]) => Promise<unknown>,
  errorMessage: string | null = null,
) {
  return { start, errorMessage } as any;
}

async function fillForm() {
  await fireEvent.input(screen.getByLabelText("Adventure title"), {
    target: { value: "The Lantern Road" },
  });
  await fireEvent.input(screen.getByLabelText("Premise"), {
    target: { value: "A lantern has gone dark at the edge of town." },
  });
  await fireEvent.input(screen.getByLabelText("Player character"), {
    target: { value: "Mara" },
  });
}

describe("AdventureStart", () => {
  it("clears the drafted fields after a successful start", async () => {
    const start = vi.fn(async () => undefined);
    render(AdventureStart, {
      props: { manager: manager(start), vaultId: "vault-1" },
    });

    await fillForm();
    await fireEvent.click(
      screen.getByRole("button", { name: "Start adventure" }),
    );

    expect(start).toHaveBeenCalled();
    expect(
      (screen.getByLabelText("Adventure title") as HTMLInputElement).value,
    ).toBe("");
  });

  it("keeps the drafted fields when the start fails", async () => {
    const start = vi.fn(async () => {
      throw new Error("offline");
    });
    render(AdventureStart, {
      props: { manager: manager(start), vaultId: "vault-1" },
    });

    await fillForm();
    await fireEvent.click(
      screen.getByRole("button", { name: "Start adventure" }),
    );

    expect(start).toHaveBeenCalled();
    // The whole point: nothing typed is lost just because generation failed.
    expect(
      (screen.getByLabelText("Adventure title") as HTMLInputElement).value,
    ).toBe("The Lantern Road");
    expect(
      (screen.getByLabelText("Premise") as HTMLTextAreaElement).value,
    ).toBe("A lantern has gone dark at the edge of town.");
    expect(
      (screen.getByLabelText("Player character") as HTMLInputElement).value,
    ).toBe("Mara");
  });

  it("keeps the drafted fields when start resolves but the opening generation failed", async () => {
    // manager.start() resolves normally even when generateOpening() fails
    // internally — it catches its own errors and sets errorMessage instead
    // of rethrowing. A resolved promise here must NOT be read as success.
    const start = vi.fn(async () => undefined);
    const m = manager(start);
    render(AdventureStart, {
      props: { manager: m, vaultId: "vault-1" },
    });

    await fillForm();
    m.errorMessage = "Failed to fetch";
    await fireEvent.click(
      screen.getByRole("button", { name: "Start adventure" }),
    );

    expect(start).toHaveBeenCalled();
    expect(
      (screen.getByLabelText("Adventure title") as HTMLInputElement).value,
    ).toBe("The Lantern Road");
  });

  it("survives being torn down and remounted, given the same bound values", async () => {
    // Simulates what actually happens in AdventureSurface.svelte: a failed
    // start briefly creates then archives a session, which unmounts and
    // remounts this component. The parent holds the real state via
    // bind:title etc.; here we just confirm a fresh instance seeded with
    // the prior draft renders it back out rather than defaulting to empty.
    const start = vi.fn(async () => undefined);
    const { unmount } = render(AdventureStart, {
      props: {
        manager: manager(start),
        vaultId: "vault-1",
        title: "The Lantern Road",
        premise: "A lantern has gone dark at the edge of town.",
        characterName: "Mara",
      },
    });
    unmount();

    render(AdventureStart, {
      props: {
        manager: manager(start),
        vaultId: "vault-1",
        title: "The Lantern Road",
        premise: "A lantern has gone dark at the edge of town.",
        characterName: "Mara",
      },
    });

    expect(
      (screen.getByLabelText("Adventure title") as HTMLInputElement).value,
    ).toBe("The Lantern Road");
  });
});
