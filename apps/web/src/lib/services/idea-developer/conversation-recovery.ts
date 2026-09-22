import {
  turnRunner,
  type ReplayParams,
  type TurnOutcome,
  type TurnRunner,
} from "./turn-runner";

/**
 * Recovers a conversation the AI service no longer holds (#3228, FR-037).
 *
 * The tab keeps the idea and the turns, so the conversation can be rebuilt as
 * one request and continued from a new interaction id. Recovery is tried once:
 * a second failure is returned, not retried, and the typed input is kept by
 * the caller.
 */
export class ConversationRecovery {
  constructor(
    private readonly runner: Pick<TurnRunner, "runReplay"> = turnRunner,
  ) {}

  recover(params: ReplayParams): Promise<TurnOutcome> {
    return this.runner.runReplay(params);
  }
}

export const conversationRecovery = new ConversationRecovery();
