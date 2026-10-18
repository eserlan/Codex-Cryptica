/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { GameSystemRegistry, SYSTEM_NEUTRAL_ID, TOV_SYSTEM_ID } from "schema";
import {
  SystemProfileStore,
  type ISystemProfileStorage,
} from "$lib/stores/system-profile.svelte";
import GameSystemSettings from "./GameSystemSettings.svelte";

function storage(
  overrides: Partial<ISystemProfileStorage> = {},
): ISystemProfileStorage {
  return {
    loadFromCache: vi.fn().mockResolvedValue(null),
    saveToCache: vi.fn().mockResolvedValue(undefined),
    loadFromDisk: vi.fn().mockResolvedValue(null),
    saveToDisk: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

async function setup(overrides: Partial<ISystemProfileStorage> = {}) {
  const registry = new GameSystemRegistry();
  const disk = storage(overrides);
  const store = new SystemProfileStore(registry, disk);
  await store.init("vault-1");
  const notify = vi.fn();
  render(GameSystemSettings, { props: { store, registry, notify } });
  const select = screen.getByRole("combobox", {
    name: /Default Game System/,
  }) as HTMLSelectElement;
  return { store, disk, notify, select };
}

describe("GameSystemSettings (#3943)", () => {
  it("lists every registered system and starts on System Neutral", async () => {
    const { select } = await setup();
    const labels = [...select.options].map((o) => o.textContent);
    expect(labels).toEqual(["System Neutral", "Tales of the Valiant"]);
    expect(select.value).toBe(SYSTEM_NEUTRAL_ID);
    expect(screen.queryByTestId("game-system-attribution")).toBeNull();
  });

  it("saves Tales of the Valiant to the vault and shows its attribution", async () => {
    const { store, disk, select, notify } = await setup();
    await fireEvent.change(select, { target: { value: TOV_SYSTEM_ID } });

    await waitFor(() => expect(store.vaultSystemId).toBe(TOV_SYSTEM_ID));
    expect(disk.saveToDisk).toHaveBeenCalledWith("vault-1", TOV_SYSTEM_ID);
    expect(
      (await screen.findByTestId("game-system-attribution")).textContent,
    ).toContain("Black Flag Reference Document");
    expect(notify).not.toHaveBeenCalled();
  });

  it("stores System Neutral as no profile", async () => {
    const { store, disk, select } = await setup({
      loadFromDisk: vi.fn().mockResolvedValue(TOV_SYSTEM_ID),
    });
    expect(select.value).toBe(TOV_SYSTEM_ID);

    await fireEvent.change(select, { target: { value: SYSTEM_NEUTRAL_ID } });

    await waitFor(() => expect(store.vaultSystemId).toBeNull());
    expect(disk.saveToDisk).toHaveBeenCalledWith("vault-1", null);
  });

  it("reports a failed save and puts the select back on the saved system (negative)", async () => {
    const { store, disk, select, notify } = await setup({
      saveToDisk: vi.fn().mockResolvedValue(false),
    });
    await fireEvent.change(select, { target: { value: TOV_SYSTEM_ID } });

    await waitFor(() => expect(notify).toHaveBeenCalledOnce());
    expect(notify.mock.calls[0][0]).toMatch(/Could not save/);
    expect(store.vaultSystemId).toBeNull();
    expect(select.value).toBe(SYSTEM_NEUTRAL_ID);
    expect(disk.saveToCache).not.toHaveBeenCalled();
  });

  it("is disabled while a save is in flight", async () => {
    let finish!: (saved: boolean) => void;
    const { select } = await setup({
      saveToDisk: vi.fn(
        () => new Promise<boolean>((resolve) => (finish = resolve)),
      ),
    });
    await fireEvent.change(select, { target: { value: TOV_SYSTEM_ID } });
    expect(select.disabled).toBe(true);

    finish(true);
    await waitFor(() => expect(select.disabled).toBe(false));
  });

  it("is disabled while the profile is loading and enabled afterwards", async () => {
    let finishLoading!: (value: string | null) => void;
    const registry = new GameSystemRegistry();
    const store = new SystemProfileStore(
      registry,
      storage({
        loadFromCache: vi.fn(
          () =>
            new Promise<string | null>((resolve) => (finishLoading = resolve)),
        ),
      }),
    );
    const initialization = store.init("vault-1");
    expect(store.isLoading).toBe(true);

    render(GameSystemSettings, { props: { store, registry } });
    const select = screen.getByRole("combobox", {
      name: /Default Game System/,
    }) as HTMLSelectElement;
    expect(select.disabled).toBe(true);

    finishLoading(null);
    await waitFor(() => expect(store.isLoading).toBe(false));
    expect(select.disabled).toBe(false);
    await initialization;
  });
});
