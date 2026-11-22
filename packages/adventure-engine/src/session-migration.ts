import { CURRENT_ADVENTURE_SCHEMA_VERSION } from "./session-schema";
import { migrateLegacyScenarioCollection } from "./scenario-migration";
import { migrateHistoricalAnchor } from "./historical-anchor-schemas";

type RawAdventureSession = Record<string, unknown>;
type AdventureSessionMigration = (
  session: RawAdventureSession,
) => RawAdventureSession;

const sessionMigrations: Record<number, AdventureSessionMigration> = {
  1: (session) => ({
    ...session,
    schemaVersion: 2,
    dicePresets: session.dicePresets ?? [],
    resourceCounters: session.resourceCounters ?? [],
  }),
  2: (session) => migrateLegacyScenarioCollection(session),
};

/**
 * Upgrades a durable session document without mutating the parsed JSON.
 * Unknown future versions are deliberately rejected rather than rewritten.
 */
export function migrateAdventureSession(input: unknown): unknown {
  let session = cloneSessionDocument(input);
  let version = readInitialVersion(session);
  while (version < CURRENT_ADVENTURE_SCHEMA_VERSION) {
    session = applySessionMigration(session, version);
    version = session.schemaVersion as number;
  }
  if (version !== CURRENT_ADVENTURE_SCHEMA_VERSION) {
    throw new Error("incompatible-version");
  }
  if (session.historicalAnchor !== undefined) {
    session.historicalAnchor = migrateHistoricalAnchor(
      session.historicalAnchor,
    );
  }
  return session;
}

export function isSessionDocument(
  input: unknown,
): input is RawAdventureSession {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}

function cloneSessionDocument(input: unknown): RawAdventureSession {
  if (!isSessionDocument(input)) throw new Error("invalid-adventure-session");
  return structuredClone(input);
}

function isIntegerVersion(version: unknown): version is number {
  return typeof version === "number" && Number.isInteger(version);
}

function readInitialVersion(session: RawAdventureSession): number {
  const version = session.schemaVersion;
  if (!isIntegerVersion(version) || version < 1) {
    throw new Error("invalid-adventure-session-version");
  }
  return version;
}

function applySessionMigration(
  session: RawAdventureSession,
  version: number,
): RawAdventureSession {
  const migrate = sessionMigrations[version];
  if (!migrate) throw new Error("incompatible-version");
  const migrated = migrate(session);
  if (!isIntegerVersion(migrated.schemaVersion))
    throw new Error("incompatible-version");
  return migrated;
}
