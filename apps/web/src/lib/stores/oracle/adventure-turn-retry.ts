/** Plain copy for a turn the engine refused twice. The internal reason stays out of the player's sight. */
export const TURN_REJECTED_COPY =
  "The GM lost the thread on that one. Your action is still in the box; try again.";

/** The engine refused both the GM's reply and the one automatic retry. */
export class AdventureTurnRejectedError extends Error {
  constructor(readonly reason: string) {
    super("turn-rejected");
    this.name = "AdventureTurnRejectedError";
  }
}

const reasonOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

/** The result of applying a reply, or why the engine refused it. */
function tryApply<Generated, Accepted>(
  apply: (generated: Generated) => Accepted,
  generated: Generated,
): { ok: true; value: Accepted } | { ok: false; reason: string } {
  try {
    return { ok: true, value: apply(generated) };
  } catch (cause) {
    return { ok: false, reason: reasonOf(cause) };
  }
}

/**
 * Generate a turn and apply it. When the engine refuses the reply (it would break
 * a guarantee, such as leaking GM-only information), regenerate once with the
 * reason so the model can fix it, instead of handing the player an error. A
 * cancelled turn is never retried, and a second refusal is a plain
 * `AdventureTurnRejectedError`. Only the apply step is retried: a generation
 * failure (offline, provider, cancelled) propagates untouched.
 */
export async function generateAcceptedTurn<Generated, Accepted>(options: {
  generate: (correction?: string) => Promise<Generated>;
  apply: (generated: Generated) => Accepted;
  signal: AbortSignal;
  /** Drop the provider's record of the refused reply before asking again. */
  resetProviderContext: () => Promise<void> | void;
}): Promise<Accepted> {
  const { generate, apply, signal } = options;
  const first = tryApply(apply, await generate());
  if (first.ok) return first.value;
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  await Promise.resolve(options.resetProviderContext()).catch(() => {});
  const second = tryApply(apply, await generate(first.reason));
  if (second.ok) return second.value;
  throw new AdventureTurnRejectedError(second.reason);
}

/** What the player sees for a failed turn: plain copy for a refusal, the message otherwise. */
export function turnErrorCopy(cause: unknown, message: string): string {
  if (!(cause instanceof AdventureTurnRejectedError)) return message;
  // The engine's reason is for the console only.
  console.warn("Adventure turn refused:", cause.reason);
  return TURN_REJECTED_COPY;
}
