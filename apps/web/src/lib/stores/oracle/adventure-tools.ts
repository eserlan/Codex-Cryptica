import {
  addDicePreset,
  removeDicePreset,
  addResourceCounter,
  adjustResourceCounter,
  removeResourceCounter,
  applyStateCorrection,
  type AdventureSession,
  type VisibleStatePatch,
  type StateCorrectionOutcome,
} from "@codex/adventure-engine";

import { acceptedSession } from "./adventure-session";

import type { AdventureRuntime } from "./adventure-runtime";

export class AdventureTools {
  private readonly state;
  constructor(private readonly runtime: AdventureRuntime) {
    this.state = runtime.state;
  }

  private requireWritableSession(): AdventureSession {
    if (!this.state.session || this.state.readOnly)
      throw new Error("no-active-session");
    return this.state.session;
  }

  private async persistLocalMutation(
    next: AdventureSession,
  ): Promise<AdventureSession> {
    if (!this.state.session) throw new Error("no-active-session");
    const saved = await this.runtime.deps.repository.save(
      this.state.session.revision,
      next,
    );
    if (!saved.ok) throw saved.error;
    this.state.session = saved.session;
    return saved.session;
  }

  /**
   * Applies an explicit, player-visible-state-only correction. Rejects with
   * `stale-revision` rather than silently overwriting or being overwritten
   * by a concurrently completing turn (FR-009, FR-010).
   */
  async submitCorrection(
    patch: VisibleStatePatch,
  ): Promise<StateCorrectionOutcome> {
    const session = this.requireWritableSession();
    const result = applyStateCorrection(
      session,
      patch,
      this.runtime.deps.now(),
    );
    if (!result.ok) {
      throw new Error(result.errors[0]?.message ?? "invalid-correction");
    }
    const saved = await this.runtime.deps.repository.save(
      session.revision,
      result.value,
    );
    if (!saved.ok) {
      if (saved.error.message === "revision-conflict") return "stale-revision";
      throw saved.error;
    }
    this.state.session = saved.session;
    return "applied";
  }

  async addDicePreset(label: string, expression: string): Promise<void> {
    const session = this.requireWritableSession();
    const result = addDicePreset(
      session,
      { id: this.runtime.deps.idGenerator(), label, expression },
      this.runtime.deps.now(),
    );
    await this.persistLocalMutation(
      acceptedSession(result, "invalid-dice-preset"),
    );
  }

  async removeDicePreset(presetId: string): Promise<void> {
    const session = this.requireWritableSession();
    const next = removeDicePreset(session, presetId, this.runtime.deps.now());
    await this.persistLocalMutation(next);
  }

  async addResourceCounter(label: string, initialValue: number): Promise<void> {
    const session = this.requireWritableSession();
    const result = addResourceCounter(
      session,
      { id: this.runtime.deps.idGenerator(), label, value: initialValue },
      this.runtime.deps.now(),
    );
    await this.persistLocalMutation(
      acceptedSession(result, "invalid-resource-counter"),
    );
  }

  async adjustResourceCounter(
    counterId: string,
    newValue: number,
  ): Promise<void> {
    const session = this.requireWritableSession();
    const result = adjustResourceCounter(
      session,
      counterId,
      newValue,
      this.runtime.deps.now(),
    );
    await this.persistLocalMutation(
      acceptedSession(result, "invalid-resource-counter"),
    );
  }

  async removeResourceCounter(counterId: string): Promise<void> {
    const session = this.requireWritableSession();
    const next = removeResourceCounter(
      session,
      counterId,
      this.runtime.deps.now(),
    );
    await this.persistLocalMutation(next);
  }
}
