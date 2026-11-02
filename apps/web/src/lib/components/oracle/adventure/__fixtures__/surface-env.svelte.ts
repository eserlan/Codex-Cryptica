import { vi } from "vitest";

/** Reactive stand-in for the oracle store, so tests can change the Vault. */
export const surfaceEnv = $state({
  vault: {
    activeVaultId: "vault-1" as string | null,
    entities: {} as Record<string, unknown>,
    allEntities: [] as Array<Record<string, unknown>>,
    getSpecificVaultHandle: vi.fn(),
    loadEntityContent: vi.fn(),
  },
  adventure: {
    session: null as null | Record<string, unknown>,
    errorCause: null as string | null,
    errorMessage: null as string | null,
    starting: false,
    readOnly: false,
    openActive: vi.fn(async () => false),
    start: vi.fn(async (_input: unknown) => undefined as unknown),
    end: vi.fn(),
    close: vi.fn(),
    open: vi.fn(),
    resumeArchived: vi.fn(),
  },
});
