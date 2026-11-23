type StorageWriter = Pick<Storage, "setItem">;
type StorageReader = Pick<Storage, "getItem" | "removeItem">;

const KEY_PREFIX = "codex-generator-setup-recovery:";

export function saveGeneratorSetupState(
  routeKey: string,
  state: {
    forms: object;
    activeTheme: string;
    useAI: boolean;
    output?: import("#lib/services/seo/generator-engine.js").GeneratorOutput;
  },
  storage?: StorageWriter,
): boolean {
  try {
    (storage ?? sessionStorage).setItem(
      `${KEY_PREFIX}${routeKey}`,
      JSON.stringify(state),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeGeneratorSetupState<T extends object>(
  routeKey: string,
  storage?: StorageReader,
): {
  forms: Partial<T>;
  activeTheme: string;
  useAI: boolean;
  output?: import("#lib/services/seo/generator-engine.js").GeneratorOutput;
} | null {
  const key = `${KEY_PREFIX}${routeKey}`;
  let targetStorage = storage;
  try {
    targetStorage ??= sessionStorage;
    const raw = targetStorage.getItem(key);
    targetStorage.removeItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== "object" ||
      !("forms" in value) ||
      !value.forms ||
      typeof value.forms !== "object" ||
      !("activeTheme" in value) ||
      typeof value.activeTheme !== "string" ||
      !("useAI" in value) ||
      typeof value.useAI !== "boolean"
    )
      return null;
    return value as {
      forms: Partial<T>;
      activeTheme: string;
      useAI: boolean;
      output?: import("#lib/services/seo/generator-engine.js").GeneratorOutput;
    };
  } catch {
    try {
      targetStorage?.removeItem(key);
    } catch {
      // Best-effort cleanup of invalid recovery state.
    }
    return null;
  }
}
