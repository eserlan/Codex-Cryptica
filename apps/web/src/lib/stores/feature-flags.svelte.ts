import { IS_STAGING } from "#lib/config/index.js";
import { resolveOracleProxyUrl } from "#lib/config/oracle-proxy.js";

export const DEFAULT_FEATURE_FLAGS = {
  adventureArtwork: false,
} as const;

export type FeatureFlagName = keyof typeof DEFAULT_FEATURE_FLAGS;
export type FeatureFlags = Record<FeatureFlagName, boolean>;

const KNOWN_FLAG_KEYS = Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagName[];

const BUILD_ENV_MAP: Record<FeatureFlagName, string> = {
  adventureArtwork: "VITE_ADVENTURE_ARTWORK",
};

const CACHE_KEY_PREFIX = "codex-feature-flags-cache:";
const OVERRIDES_STORAGE_KEY = "codex-feature-flag-overrides";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FeatureFlagsDependencies {
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
  storage?: StorageLike | null;
  resolveProxyUrl?: () => string;
  isStaging?: () => boolean;
  isOnline?: () => boolean;
  readBuildEnv?: (envKey: string) => string | undefined;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function defaultReadBuildEnv(envKey: string): string | undefined {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta.env as Record<string, unknown> | undefined)
      : undefined;
  const value = env?.[envKey];
  return typeof value === "string" ? value : undefined;
}

function parseFlagRecord(raw: unknown): Partial<FeatureFlags> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const out: Partial<FeatureFlags> = {};
  for (const key of KNOWN_FLAG_KEYS) {
    if (typeof record[key] === "boolean") {
      out[key] = record[key];
    }
  }
  return out;
}

function readJsonFromStorage(
  storage: StorageLike | null,
  key: string,
): Partial<FeatureFlags> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    return parseFlagRecord(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeJsonToStorage(
  storage: StorageLike | null,
  key: string,
  value: Partial<FeatureFlags>,
): void {
  if (!storage) return;
  try {
    if (Object.keys(value).length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage quota or private-mode errors.
  }
}

function parseBooleanToken(token: string): boolean | undefined {
  const lowered = token.trim().toLowerCase();
  if (lowered === "1" || lowered === "true" || lowered === "on") return true;
  if (lowered === "0" || lowered === "false" || lowered === "off") return false;
  return undefined;
}

export class FeatureFlagsStore {
  private readonly fetchFn: (
    input: string,
    init?: RequestInit,
  ) => Promise<Response>;
  private readonly storage: StorageLike | null;
  private readonly resolveProxyUrl: () => string;
  private readonly isStaging: () => boolean;
  private readonly isOnline: () => boolean;
  private readonly readBuildEnv: (envKey: string) => string | undefined;

  private runtimeFlags = $state<FeatureFlags>({ ...DEFAULT_FEATURE_FLAGS });
  private localOverrides = $state<Partial<FeatureFlags>>({});

  constructor(deps: FeatureFlagsDependencies = {}) {
    this.fetchFn =
      deps.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
    this.storage = deps.storage !== undefined ? deps.storage : defaultStorage();
    this.resolveProxyUrl =
      deps.resolveProxyUrl ?? (() => resolveOracleProxyUrl());
    this.isStaging = deps.isStaging ?? (() => IS_STAGING);
    this.isOnline =
      deps.isOnline ??
      (() => (typeof navigator === "undefined" ? true : navigator.onLine));
    this.readBuildEnv = deps.readBuildEnv ?? defaultReadBuildEnv;

    const cached = readJsonFromStorage(this.storage, this.cacheKey());
    this.runtimeFlags = { ...DEFAULT_FEATURE_FLAGS, ...cached };
    this.localOverrides = readJsonFromStorage(
      this.storage,
      OVERRIDES_STORAGE_KEY,
    );
  }

  private envName(): "staging" | "prod" {
    return this.isStaging() ? "staging" : "prod";
  }

  private cacheKey(): string {
    return `${CACHE_KEY_PREFIX}${this.envName()}`;
  }

  isEnabled(flag: FeatureFlagName): boolean {
    const buildVal = this.readBuildEnv(BUILD_ENV_MAP[flag]);
    if (buildVal === "true") return true;
    if (buildVal === "false") return false;

    const override = this.localOverrides[flag];
    if (typeof override === "boolean") return override;

    return this.runtimeFlags[flag];
  }

  setOverride(flag: FeatureFlagName, value: boolean): void {
    const next = { ...this.localOverrides, [flag]: value };
    this.localOverrides = next;
    writeJsonToStorage(this.storage, OVERRIDES_STORAGE_KEY, next);
  }

  clearOverride(flag: FeatureFlagName): void {
    const next = { ...this.localOverrides };
    delete next[flag];
    this.localOverrides = next;
    writeJsonToStorage(this.storage, OVERRIDES_STORAGE_KEY, next);
  }

  private applyFlagToken(pair: string): void {
    const [rawName, rawValue] = pair.split(":");
    const name = rawName?.trim() as FeatureFlagName;
    if (!KNOWN_FLAG_KEYS.includes(name) || rawValue === undefined) return;
    if (rawValue.trim().toLowerCase() === "reset") {
      this.clearOverride(name);
      return;
    }
    const parsed = parseBooleanToken(rawValue);
    if (parsed !== undefined) {
      this.setOverride(name, parsed);
    }
  }

  /**
   * Parses `?flag=adventureArtwork:1` (or comma-separated entries) from the
   * current URL search string into device-local overrides so testers can
   * verify features in production before flipping KV globally.
   */
  applyUrlOverrides(
    search: string | undefined = typeof window !== "undefined"
      ? window.location.search
      : undefined,
  ): void {
    if (!search) return;
    const pairs = new URLSearchParams(search)
      .getAll("flag")
      .flatMap((entry) => entry.split(","));
    for (const pair of pairs) {
      this.applyFlagToken(pair);
    }
  }

  private async fetchRemoteFlags(
    url: string,
    signal?: AbortSignal,
  ): Promise<Partial<FeatureFlags> | null> {
    const response = await this.fetchFn(url, { method: "GET", signal });
    if (!response.ok) return null;
    const body = (await response.json()) as { flags?: unknown };
    return parseFlagRecord(body?.flags);
  }

  async refresh(signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted || !this.isOnline()) return false;
    const baseUrl = this.resolveProxyUrl().replace(/\/+$/, "");
    try {
      const parsed = await this.fetchRemoteFlags(
        `${baseUrl}/api/flags?env=${this.envName()}`,
        signal,
      );
      if (!parsed || signal?.aborted) return false;
      const next: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS, ...parsed };
      this.runtimeFlags = next;
      writeJsonToStorage(this.storage, this.cacheKey(), next);
      return true;
    } catch {
      return false;
    }
  }
}

export const featureFlags = new FeatureFlagsStore();
