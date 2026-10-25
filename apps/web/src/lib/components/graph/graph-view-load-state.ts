import { hasDegenerateSavedCoordinates } from "./saved-coordinate-health";
import { releaseGraphImages } from "./graph-image-sync";
import type { GraphRenderActivity } from "./graph-visibility";
import type { GraphViewDependencies, GraphViewHost } from "./graph-view-types";

/** Vault load transitions and the delayed recovery of degenerate saved coordinates. */
export class GraphViewLoadState {
  savedCoordsDegenerate = false;
  private lastVaultId: string | null | undefined = undefined;
  private slashRecoveryDone = false;
  private slashGuardTimer: number | null = null;

  constructor(
    private host: GraphViewHost,
    private deps: GraphViewDependencies,
    private activity: GraphRenderActivity,
  ) {}

  reconcile = () => {
    if (this.activity.deferWhileSuspended()) return;
    const { status, allEntities, activeVaultId } = this.deps.vault;
    const vaultChanged =
      this.host.cy != null && activeVaultId !== this.lastVaultId;
    this.lastVaultId = activeVaultId;
    if (vaultChanged || (status === "loading" && allEntities.length === 0)) {
      this.resetLoad();
      return;
    }
    if (status === "idle" && this.host.loadPhase === "elements")
      this.finalizeLoad();
    if (this.shouldScheduleRecovery()) this.scheduleSlashGuard();
  };

  private resetLoad() {
    this.host.loadPhase = "idle";
    this.slashRecoveryDone = false;
    this.clearTimer();
    releaseGraphImages(this.host.imageManager, this.deps.vault);
  }

  private finalizeLoad() {
    this.host.loadPhase = "finalized";
    // Check the full vault, since a culled focus subset may look collinear.
    this.savedCoordsDegenerate = hasDegenerateSavedCoordinates(
      this.deps.vault.allEntities,
    );
    this.deps.debugStore.log(
      "[GraphView] Vault load finalized, unlocking all updates.",
    );
    this.host.applyCurrentLayout({
      reason: "Load Finalized",
      isInitial: true,
      isForced: true,
    });
  }

  private shouldScheduleRecovery() {
    return (
      this.deps.vault.status === "idle" &&
      !this.slashRecoveryDone &&
      this.savedCoordsDegenerate &&
      this.host.cy &&
      this.host.cy.nodes().length > 0
    );
  }

  clearTimer() {
    if (this.slashGuardTimer) {
      clearTimeout(this.slashGuardTimer);
      this.slashGuardTimer = null;
    }
  }

  private scheduleSlashGuard() {
    if (this.host.isSuspended) return;
    this.clearTimer();
    this.slashGuardTimer = window.setTimeout(() => {
      this.slashGuardTimer = null;
      this.recoverFromSlashIfNeeded();
    }, 1500);
  }

  private recoverFromSlashIfNeeded() {
    if (this.host.isSuspended) return;
    if (this.slashRecoveryDone || !this.host.cy || this.host.cy.destroyed())
      return;
    if (this.deps.vault.status === "loading") return;
    if (!this.savedCoordsDegenerate) return;
    this.slashRecoveryDone = true;
    this.deps.debugStore.log(
      "[GraphView] Degenerate saved-coordinate slash detected after load — re-solving.",
    );
    this.host.applyCurrentLayout({
      reason: "Slash Recovery",
      isInitial: true,
      isForced: true,
      reseed: true,
    });
  }
}
