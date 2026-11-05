import type { AdventureSession } from "@codex/adventure-engine";
import type { AdventureControlLease } from "#lib/services/adventure/adventure-control-lease.js";

import type { AdventureRuntime } from "./adventure-runtime";

function isReadOnlyLoad(
  loaded: Exclude<
    Awaited<ReturnType<AdventureRuntime["deps"]["repository"]["load"]>>,
    { condition: "unreadable" }
  >,
): boolean {
  return (
    loaded.condition === "duplicate-active-conflict" ||
    loaded.condition === "migration-recovery" ||
    loaded.session.status === "archived"
  );
}

export class AdventureLifecycle {
  private readonly state;
  constructor(
    private readonly runtime: AdventureRuntime,
    private readonly resolveRoll: () => Promise<void> = async () => {},
  ) {
    this.state = runtime.state;
  }

  async open(
    vaultId: string,
    sessionId: string,
    isCurrent?: () => boolean,
  ): Promise<void> {
    const request = isCurrent ? null : ++this.runtime.activeRestoreRequest;
    const isRequestCurrent =
      isCurrent ?? (() => request === this.runtime.activeRestoreRequest);
    const loaded = await this.runtime.deps.repository.load(vaultId, sessionId);
    if (loaded.condition === "unreadable") throw loaded.error;
    if (!isRequestCurrent()) return;
    const readOnly = isReadOnlyLoad(loaded);
    const opened = await this.acquireAndRefreshOpenedSession(
      vaultId,
      sessionId,
      loaded.session,
      readOnly,
      isRequestCurrent,
    );
    if (!opened) return;
    if (!isRequestCurrent()) {
      if (opened.lease) await this.runtime.deps.authority.release(opened.lease);
      return;
    }
    this.activateOpenedSession(opened.session, opened.readOnly, opened.lease);
    await this.resumeRecordedRollIfNeeded(isRequestCurrent);
  }

  private async acquireAndRefreshOpenedSession(
    vaultId: string,
    sessionId: string,
    session: AdventureSession,
    readOnly: boolean,
    isCurrent: () => boolean,
  ): Promise<{
    session: AdventureSession;
    readOnly: boolean;
    lease: AdventureControlLease | null;
  } | null> {
    const lease = await this.acquireOpenedSessionLease(
      vaultId,
      sessionId,
      readOnly,
      isCurrent,
    );
    if (!lease) return { session, readOnly: true, lease: null };
    if (!isCurrent()) {
      await this.runtime.deps.authority.release(lease);
      return null;
    }
    return this.refreshOpenedSession(vaultId, sessionId, lease, isCurrent);
  }

  private async refreshOpenedSession(
    vaultId: string,
    sessionId: string,
    lease: AdventureControlLease,
    isCurrent: () => boolean,
  ): Promise<{
    session: AdventureSession;
    readOnly: boolean;
    lease: AdventureControlLease | null;
  } | null> {
    let refreshed: Awaited<
      ReturnType<typeof this.runtime.deps.repository.load>
    >;
    try {
      refreshed = await this.runtime.deps.repository.load(vaultId, sessionId);
    } catch (cause) {
      await this.runtime.deps.authority.release(lease);
      throw cause;
    }
    if (!isCurrent()) {
      await this.runtime.deps.authority.release(lease);
      return null;
    }
    if (refreshed.condition === "unreadable") {
      await this.runtime.deps.authority.release(lease);
      throw refreshed.error;
    }
    const canWrite =
      refreshed.condition === "normal" && refreshed.session.status === "active";
    if (!canWrite) await this.runtime.deps.authority.release(lease);
    return {
      session: refreshed.session,
      readOnly: !canWrite,
      lease: canWrite ? lease : null,
    };
  }

  /**
   * Retry a previously unavailable control lease without stealing it from
   * another tab. open() reloads the latest committed session before enabling
   * writes, so a stale read-only transcript cannot overwrite newer turns.
   */
  async tryTakeControl(): Promise<boolean> {
    const session = this.state.session;
    if (!session || !this.state.readOnly || session.status !== "active") {
      return false;
    }
    const request = ++this.runtime.activeRestoreRequest;
    const isCurrent = () =>
      request === this.runtime.activeRestoreRequest &&
      this.state.session?.vaultId === session.vaultId &&
      this.state.session?.id === session.id;
    await this.open(session.vaultId, session.id, isCurrent);
    return isCurrent() && !this.state.readOnly;
  }

  private async acquireOpenedSessionLease(
    vaultId: string,
    sessionId: string,
    readOnly: boolean,
    isCurrent: () => boolean,
  ): Promise<AdventureControlLease | null> {
    if (readOnly) return null;
    const acquired = await this.runtime.deps.authority.acquire({
      vaultId,
      sessionId,
    });
    if (!isCurrent()) {
      if (acquired.ok)
        await this.runtime.deps.authority.release(acquired.lease);
      return null;
    }
    return acquired.ok ? acquired.lease : null;
  }

  private activateOpenedSession(
    session: AdventureSession,
    readOnly: boolean,
    lease: AdventureControlLease | null,
  ) {
    this.state.session = session;
    this.state.readOnly = readOnly;
    if (lease) {
      this.state.lease = lease;
      this.runtime.deps.coordinator.start(lease);
    }
    this.state.phase = session.pendingRoll?.suppliedOutcome
      ? "ready-to-resolve"
      : session.pendingRoll
        ? "awaiting-roll"
        : "ready";
  }

  private async resumeRecordedRollIfNeeded(isCurrent: () => boolean) {
    if (
      !this.state.readOnly &&
      this.state.session?.pendingRoll?.suppliedOutcome &&
      this.state.lease &&
      isCurrent()
    ) {
      await this.resolveRoll();
    }
  }

  private resetAdventureView(): void {
    this.state.session = null;
    this.state.readOnly = false;
    this.state.draft = "";
    this.state.streamedNarration = "";
    this.state.errorMessage = null;
    this.state.lastRollResult = null;
    this.state.phase = "idle";
  }

  private async leavePreviousVault(
    vaultId: string,
    isCurrent: () => boolean,
  ): Promise<boolean> {
    if (!this.state.session || this.state.session.vaultId === vaultId)
      return true;
    await this.destroy(isCurrent);
    if (!isCurrent()) return false;
    this.resetAdventureView();
    return true;
  }

  /**
   * Moves from the adventure being played to another one: releases control of
   * the current adventure first, so its lease and coordinator do not leak.
   */
  async switchTo(vaultId: string, sessionId: string): Promise<void> {
    if (
      this.state.session?.vaultId === vaultId &&
      this.state.session.id === sessionId
    ) {
      return;
    }
    if (this.state.session) await this.close();
    await this.open(vaultId, sessionId);
  }

  async openActive(vaultId: string): Promise<boolean> {
    const request = ++this.runtime.activeRestoreRequest;
    const isCurrent = () => request === this.runtime.activeRestoreRequest;
    if (
      this.state.session?.vaultId === vaultId &&
      this.state.session.status === "active"
    ) {
      return true;
    }
    if (!(await this.leavePreviousVault(vaultId, isCurrent))) return false;
    const { effectiveActiveId } =
      await this.runtime.deps.repository.list(vaultId);
    if (!isCurrent() || !effectiveActiveId) return false;
    await this.open(vaultId, effectiveActiveId, isCurrent);
    return isCurrent() && this.state.session?.vaultId === vaultId;
  }

  private async archiveSession(
    session: AdventureSession,
  ): Promise<AdventureSession> {
    const result = await this.runtime.deps.repository.archive(
      session.vaultId,
      session.id,
      session.revision,
    );
    if (!result.ok) throw result.error;
    return result.session;
  }

  async end(): Promise<void> {
    if (!this.state.session || this.state.readOnly) return;
    const archived = await this.archiveSession(this.state.session);
    this.state.session = archived;
    void this.runtime.deps.clearGenerationInteraction(archived.id);
    this.state.readOnly = true;
    await this.runtime.deps.coordinator.stop();
    this.state.lease = null;
    this.state.phase = "ready";
  }

  /**
   * Closes the active adventure view, releases the control lease, and returns
   * the UI to the start/archive screen without archiving the adventure.
   * Progress remains safely persisted in the repository.
   */
  async close(): Promise<void> {
    this.runtime.activeRestoreRequest += 1;
    this.runtime.generationController?.abort();
    this.runtime.generationController = null;
    if (this.state.session) {
      void this.runtime.deps.clearGenerationInteraction(this.state.session.id);
    }
    await this.runtime.deps.coordinator.stop();
    if (this.state.lease) {
      await this.runtime.deps.authority.release(this.state.lease);
      this.state.lease = null;
    }
    this.state.session = null;
    this.state.readOnly = false;
    this.state.draft = "";
    this.state.errorMessage = null;
    this.state.lastRollResult = null;
    this.state.phase = "idle";
  }

  /**
   * Archives the current session even when this tab never holds (or has
   * lost) the control lease — recovers a session stuck read-only with no
   * other tab actually able to advance it, e.g. one whose opening-turn
   * generation failed and whose own cleanup archive also failed, leaving
   * an orphaned lease that keeps renewing itself. Goes straight through
   * the repository's revision check rather than `manager.end()`'s
   * lease-based `readOnly` gate: if another tab is genuinely mid-turn, its
   * next save will have moved the revision on, so this fails with
   * `revision-conflict` instead of silently cutting it off.
   */
  async forceEnd(): Promise<void> {
    if (!this.state.session) return;
    const archived = await this.archiveSession(this.state.session);
    void this.runtime.deps.clearGenerationInteraction(archived.id);
    await this.runtime.deps.coordinator.stop();
    this.state.lease = null;
    this.state.session = null;
    this.state.readOnly = false;
    this.state.errorMessage = null;
    this.state.phase = "idle";
  }

  /**
   * Resumes an archived (or freshly duplicated) adventure. A Vault may hold
   * several active adventures; this one simply becomes active again.
   */
  async resumeArchived(
    vaultId: string,
    sessionId: string,
  ): Promise<AdventureSession> {
    const loaded = await this.runtime.deps.repository.load(vaultId, sessionId);
    if (loaded.condition === "unreadable") throw loaded.error;
    const now = this.runtime.deps.now();
    const resumed: AdventureSession = {
      ...loaded.session,
      status: "active",
      revision: loaded.session.revision + 1,
      updatedAt: now,
      lastPlayedAt: now,
    };
    const saved = await this.runtime.deps.repository.save(
      loaded.session.revision,
      resumed,
    );
    if (!saved.ok) throw saved.error;
    await this.switchTo(vaultId, sessionId);
    if (!this.state.session) throw new Error("resume-failed");
    return this.state.session;
  }

  async destroy(isCurrent?: () => boolean): Promise<void> {
    if (!isCurrent) this.runtime.activeRestoreRequest += 1;
    this.runtime.generationController?.abort();
    this.runtime.generationController = null;
    await this.runtime.deps.coordinator.stop();
    this.state.lease = null;
  }
}
