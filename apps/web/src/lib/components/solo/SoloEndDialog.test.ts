/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  store: {
    journalRunning: true,
    end: vi.fn(async (_o: { endJournal: boolean }) => {}),
  },
  notification: { confirm: vi.fn(async (_o: unknown) => true) },
}));

vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: env.store,
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: env.notification,
}));

import SoloEndDialog from "./SoloEndDialog.svelte";

beforeEach(() => {
  env.store.journalRunning = true;
  env.store.end.mockClear();
  env.notification.confirm.mockClear();
  env.notification.confirm.mockResolvedValue(true);
});

describe("SoloEndDialog with a running journal", () => {
  it("offers Cancel, End session and End session and journal", () => {
    render(SoloEndDialog, { props: { onclose: vi.fn() } });
    expect(screen.getByTestId("solo-end-cancel")).toBeTruthy();
    expect(screen.getByTestId("solo-end-keep-journal")).toBeTruthy();
    expect(screen.getByTestId("solo-end-with-journal")).toBeTruthy();
  });

  it("Cancel changes nothing", async () => {
    const onclose = vi.fn();
    render(SoloEndDialog, { props: { onclose } });
    await fireEvent.click(screen.getByTestId("solo-end-cancel"));
    expect(env.store.end).not.toHaveBeenCalled();
    expect(onclose).toHaveBeenCalled();
  });

  it("End session keeps the journal running", async () => {
    const onclose = vi.fn();
    render(SoloEndDialog, { props: { onclose } });
    await fireEvent.click(screen.getByTestId("solo-end-keep-journal"));
    await waitFor(() =>
      expect(env.store.end).toHaveBeenCalledWith({ endJournal: false }),
    );
    expect(onclose).toHaveBeenCalled();
  });

  it("End session and journal ends the journal too", async () => {
    render(SoloEndDialog, { props: { onclose: vi.fn() } });
    await fireEvent.click(screen.getByTestId("solo-end-with-journal"));
    await waitFor(() =>
      expect(env.store.end).toHaveBeenCalledWith({ endJournal: true }),
    );
  });
});

describe("SoloEndDialog without a running journal", () => {
  beforeEach(() => {
    env.store.journalRunning = false;
  });

  it("confirms with the standard dialog and ends straight away", async () => {
    render(SoloEndDialog, { props: { onclose: vi.fn() } });
    await waitFor(() => expect(env.notification.confirm).toHaveBeenCalled());
    await waitFor(() =>
      expect(env.store.end).toHaveBeenCalledWith({ endJournal: false }),
    );
  });

  it("does nothing when the player declines the confirmation", async () => {
    env.notification.confirm.mockResolvedValueOnce(false);
    const onclose = vi.fn();
    render(SoloEndDialog, { props: { onclose } });
    await waitFor(() => expect(onclose).toHaveBeenCalled());
    expect(env.store.end).not.toHaveBeenCalled();
  });
});
