import type { Entity } from "schema";
import type { WorldCalendar } from "chronology-engine";
import {
  emptyWorldEntrySetup,
  type WorldEntrySetup,
} from "#lib/services/adventure/world-entry-setup.js";
import {
  resolveWorldEntryPreview,
  type WorldEntryContextPreview,
} from "#lib/services/adventure/world-entry-context-preview.js";
import {
  createWorldEntryStart,
  describeWorldEntryStartFailure,
} from "#lib/services/adventure/world-entry-start.js";
import {
  describeStartOutcome,
  startPrecheck,
} from "#lib/services/adventure/adventure-start-failure.js";
import {
  hasCommittedOpening,
  type AdventureManager,
} from "#lib/stores/oracle/adventure-manager.svelte.js";

interface WorldEntryDependencies {
  manager: Pick<
    AdventureManager,
    "starting" | "session" | "errorCause" | "readOnly"
  > & {
    start: (
      input: Parameters<AdventureManager["start"]>[0],
    ) => Promise<unknown>;
  };
  getVaultId: () => string;
  getEntities: () => Entity[];
  getCharacters: () => Parameters<typeof createWorldEntryStart>[1];
  getLocations: () => { id: string; name: string }[];
  getCalendar: () => WorldCalendar;
  getPrecheck: () => Parameters<typeof startPrecheck>[0];
  onReview: () => void;
  onStarted: () => void;
}

/** Per-surface world-entry draft, preview and guarded launch. */
export class AdventureWorldEntry {
  setup = $state(emptyWorldEntrySetup("default"));
  preview = $state<WorldEntryContextPreview | null>(null);
  busy = $state(false);
  error = $state<string | null>(null);
  private launchToken = 0;

  constructor(private readonly deps: WorldEntryDependencies) {}

  reset(vaultId: string): void {
    this.setup = emptyWorldEntrySetup(vaultId);
    this.preview = null;
    this.busy = false;
    this.error = null;
    this.launchToken += 1;
  }

  review = (draft: WorldEntrySetup): void => {
    this.setup = draft;
    this.error = null;
    this.preview = resolveWorldEntryPreview({
      entities: this.deps.getEntities(),
      calendar: this.deps.getCalendar(),
      characterId: draft.characterId || undefined,
      locationId: draft.locationId || undefined,
      at: draft.at,
      maxRecords: 14,
    });
    this.deps.onReview();
  };

  start = async (): Promise<void> => {
    if (this.busy || this.deps.manager.starting) return;
    this.error = startPrecheck(this.deps.getPrecheck());
    if (this.error) return;
    const token = ++this.launchToken;
    this.busy = true;
    const message = await this.launch();
    // A Vault switch resets the surface; drop the old result.
    if (token !== this.launchToken) return;
    this.busy = false;
    this.error = message;
    if (message) return;
    this.setup = emptyWorldEntrySetup(this.deps.getVaultId());
    this.preview = null;
    this.deps.onStarted();
  };

  /** Return display copy for a failed setup/opening, or null once it opened. */
  private async launch(): Promise<string | null> {
    let stage: "setup" | "launch" = "setup";
    try {
      const input = createWorldEntryStart(
        $state.snapshot(this.setup),
        this.deps.getCharacters(),
        this.deps.getLocations(),
        this.deps.getCalendar(),
      );
      stage = "launch";
      await this.deps.manager.start(input);
      return describeStartOutcome({
        errorCause: this.deps.manager.errorCause,
        committed: hasCommittedOpening(this.deps.manager.session),
        readOnly: this.deps.manager.readOnly,
      });
    } catch (cause) {
      return describeWorldEntryStartFailure(cause, stage);
    }
  }
}
