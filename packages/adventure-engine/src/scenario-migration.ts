type Raw = Record<string, unknown>;
type SecretBinder = (preferred: string, value: string) => string;

/** Convert the former single writable scenario into the v3 collection. */
export function migrateLegacyScenarioCollection(session: Raw): Raw {
  if ("scenarioState" in session && "scenarioCollection" in session) {
    throw new Error("mixed-scenario-representations");
  }
  const { scenarioState: legacy, ...withoutLegacy } = session;
  if (!isRecord(legacy)) return { ...withoutLegacy, schemaVersion: 3 };

  const scenario = structuredClone(legacy) as Raw;
  const scenarioId =
    typeof scenario.id === "string" ? scenario.id : "legacy-scenario";
  const secrets = legacySecrets(session);
  const bindSecret = createSecretBinder(session, scenarioId, secrets);
  const eventIds = mapEventBindings(scenario.events, bindSecret);
  const gmOnly = isRecord(scenario.gmOnly) ? scenario.gmOnly : {};
  const truthId = bindSecret(
    "scenario-baseline-truth",
    String(gmOnly.truth ?? ""),
  );
  const investigatedId =
    typeof gmOnly.ifInvestigated === "string"
      ? bindSecret("scenario-if-investigated", gmOnly.ifInvestigated)
      : undefined;
  const secretIds = [
    truthId,
    ...(investigatedId ? [investigatedId] : []),
    ...Object.values(eventIds),
  ];

  return {
    ...withoutLegacy,
    schemaVersion: 3,
    scenarioCollection: {
      version: 1,
      items: [
        {
          ...scenario,
          knowledge: "heard",
          anchorRefs: [],
          revealedSecretIds: revealedBindings(session, secrets, secretIds),
          secretBindings: {
            truth: truthId,
            ...(investigatedId ? { ifInvestigated: investigatedId } : {}),
            eventIds,
          },
          origin: {
            ...(isRecord(scenario.origin) ? scenario.origin : {}),
            legacySessionId: String(session.id).slice(0, 160),
            legacyScenarioId: scenarioId.slice(0, 160),
          },
        },
      ],
      focusedScenarioId: scenario.status === "open" ? scenarioId : null,
    },
  };
}

function isRecord(value: unknown): value is Raw {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function legacySecrets(session: Raw): Raw[] {
  const hidden = isRecord(session.hiddenState) ? session.hiddenState : {};
  return Array.isArray(hidden.secrets) ? (hidden.secrets as Raw[]) : [];
}

function createSecretBinder(
  session: Raw,
  scenarioId: string,
  secrets: Raw[],
): SecretBinder {
  const occupied = new Set<string>([
    String(session.id ?? ""),
    String(session.vaultId ?? ""),
    scenarioId,
    ...legacyTurnIds(session.turns),
    ...secrets.flatMap((secret) =>
      typeof secret.id === "string" ? [secret.id] : [],
    ),
  ]);
  const bound = new Set<string>();
  return (preferred, value) =>
    bindSecretId(preferred, value, secrets, occupied, bound);
}

function legacyTurnIds(turns: unknown): string[] {
  return Array.isArray(turns)
    ? turns.flatMap((turn) =>
        isRecord(turn) && typeof turn.id === "string" ? [turn.id] : [],
      )
    : [];
}

function bindSecretId(
  preferred: string,
  value: string,
  secrets: Raw[],
  occupied: Set<string>,
  bound: Set<string>,
): string {
  const registered = secrets.find((secret) => secret.id === preferred);
  if (registered && isReusableSecret(registered, value, bound)) {
    return reserve(preferred, occupied, bound);
  }
  const matching = secrets.find((secret) =>
    isReusableSecret(secret, value, bound),
  );
  if (typeof matching?.id === "string")
    return reserve(matching.id, occupied, bound);
  if (!occupied.has(preferred)) return reserve(preferred, occupied, bound);
  return allocateLegacySecretId(occupied, bound);
}

function isReusableSecret(
  secret: Raw,
  value: string,
  bound: Set<string>,
): boolean {
  return (
    typeof secret.id === "string" &&
    secret.id.length <= 160 &&
    !bound.has(secret.id) &&
    typeof secret.text === "string" &&
    normalize(secret.text) === normalize(value)
  );
}

function reserve(
  id: string,
  occupied: Set<string>,
  bound: Set<string>,
): string {
  occupied.add(id);
  bound.add(id);
  return id;
}

function allocateLegacySecretId(
  occupied: Set<string>,
  bound: Set<string>,
): string {
  for (let counter = 0; counter < 10_000; counter += 1) {
    const candidate = `legacy-scenario-secret-${counter}`;
    if (!occupied.has(candidate)) return reserve(candidate, occupied, bound);
  }
  throw new Error("scenario-secret-id-allocation-failed");
}

function mapEventBindings(
  input: unknown,
  bindSecret: SecretBinder,
): Record<string, string> {
  const bindings: Record<string, string> = {};
  if (!Array.isArray(input)) return bindings;
  for (const value of input) {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      value.visibility !== "gm"
    )
      continue;
    const candidate = `scenario-event-${value.id}`;
    const fallback = `legacy-event-${Object.keys(bindings).length}`;
    Object.defineProperty(bindings, value.id, {
      value: bindSecret(
        candidate.length <= 160 ? candidate : fallback,
        typeof value.text === "string" ? value.text : "",
      ),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return bindings;
}

function revealedBindings(
  session: Raw,
  secrets: Raw[],
  scenarioSecretIds: string[],
): string[] {
  const revealed = new Set<string>([
    ...secrets.flatMap((secret) =>
      secret.status === "revealed" && typeof secret.id === "string"
        ? [secret.id]
        : [],
    ),
    ...legacyTurnReveals(session.turns),
  ]);
  return scenarioSecretIds.filter((id) => revealed.has(id));
}

function legacyTurnReveals(turns: unknown): string[] {
  return Array.isArray(turns)
    ? turns.flatMap((turn) =>
        isRecord(turn) && Array.isArray(turn.revealedSecretIds)
          ? (turn.revealedSecretIds as string[])
          : [],
      )
    : [];
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
