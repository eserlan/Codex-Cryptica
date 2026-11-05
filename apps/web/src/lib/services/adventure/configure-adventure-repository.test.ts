import { describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ setRootResolver: vi.fn() }));
vi.mock("./adventure-session-repository.js", () => ({
  adventureSessionRepository: repo,
}));

import { configureAdventureRepository } from "./configure-adventure-repository";

function resolverFor(handle: unknown) {
  repo.setRootResolver.mockReset();
  configureAdventureRepository({
    getSpecificVaultHandle: vi.fn(async () => handle as never),
  });
  return repo.setRootResolver.mock.calls[0][0] as (
    id: string,
  ) => Promise<unknown>;
}

describe("configureAdventureRepository", () => {
  it("resolves the open Vault's directory handle", async () => {
    const handle = { kind: "directory" };
    await expect(resolverFor(handle)("vault-1")).resolves.toBe(handle);
  });

  it("fails clearly when the Vault is not open", async () => {
    await expect(resolverFor(null)("vault-1")).rejects.toThrow(
      "vault-not-open",
    );
    await expect(resolverFor(undefined)("vault-1")).rejects.toThrow(
      "vault-not-open",
    );
  });
});
