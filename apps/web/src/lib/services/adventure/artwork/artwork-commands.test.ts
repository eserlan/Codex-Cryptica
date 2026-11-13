import { describe, expect, it, vi } from "vitest";
import { ArtworkCommands } from "./artwork-commands";

const subject = { kind: "place" as const, id: "place1" };
const context = {
  vaultId: "vault1",
  sessionId: "session1",
  expectedRevision: 1,
};
const snapshot = {
  kind: "snapshot" as const,
  path: "images/artwork_one.png",
  mime: "image/png" as const,
  bytes: 8,
  width: 1,
  height: 1,
  sha256: "a".repeat(64),
};

describe("artwork commands", () => {
  it("preserves a Vault picture before saving its exact snapshot", async () => {
    const mutate = vi.fn(async () => ({
      ok: true as const,
      association: { version: 1 as const, override: snapshot },
    }));
    const preserve = vi.fn(async () => snapshot);
    const removeIfUnreferenced = vi.fn();
    const commands = new ArtworkCommands(
      { mutate },
      { preserve, removeIfUnreferenced },
    );
    const blob = new Blob(["image"]);
    expect(
      (
        await commands.keepVaultImage(
          subject,
          context,
          blob,
          new AbortController().signal,
        )
      ).ok,
    ).toBe(true);
    expect(mutate).toHaveBeenCalledWith(
      subject,
      { kind: "keep", choice: snapshot },
      context,
    );
    expect(removeIfUnreferenced).not.toHaveBeenCalled();
  });

  it("cleans up a new snapshot when its save fails", async () => {
    const mutate = vi.fn(async () => ({
      ok: false as const,
      reason: "lease-lost",
    }));
    const removeIfUnreferenced = vi.fn(async () => {});
    const commands = new ArtworkCommands(
      { mutate },
      { preserve: async () => snapshot, removeIfUnreferenced },
    );
    expect(
      await commands.keepVaultImage(
        subject,
        context,
        new Blob(),
        new AbortController().signal,
      ),
    ).toEqual({ ok: false, reason: "lease-lost" });
    expect(removeIfUnreferenced).toHaveBeenCalledWith(snapshot.path);
  });

  it("does not mutate after cancellation during preservation", async () => {
    const controller = new AbortController();
    const mutate = vi.fn();
    const removeIfUnreferenced = vi.fn(async () => {});
    const commands = new ArtworkCommands(
      { mutate },
      {
        preserve: async () => {
          controller.abort();
          return snapshot;
        },
        removeIfUnreferenced,
      },
    );
    expect(
      await commands.keepVaultImage(
        subject,
        context,
        new Blob(),
        controller.signal,
      ),
    ).toEqual({ ok: false, reason: "cancelled" });
    expect(mutate).not.toHaveBeenCalled();
    expect(removeIfUnreferenced).toHaveBeenCalledWith(snapshot.path);
  });
});
