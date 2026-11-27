import { tick } from "svelte";
import type {
  AdventureListResult,
  AdventureSessionRepository,
} from "#lib/services/adventure/adventure-session-repository.js";

/** Sheet focus and the session listing shared by archive and management controls. */
export class AdventureFocusToolsState {
  open = $state(false);
  button = $state<HTMLButtonElement>();
  closeButton = $state<HTMLButtonElement>();
  private listing: {
    vaultId: string;
    promise: Promise<AdventureListResult>;
  } | null = null;

  constructor(
    private readonly getRepository: () => Pick<
      AdventureSessionRepository,
      "list"
    >,
  ) {}

  list = (
    vaultId: string,
    forceFresh = false,
  ): Promise<AdventureListResult> => {
    if (!forceFresh && this.listing?.vaultId === vaultId)
      return this.listing.promise;
    const promise = this.getRepository().list(vaultId);
    this.listing = { vaultId, promise };
    return promise;
  };

  invalidate = (): void => {
    this.listing = null;
  };

  close = (): void => {
    this.open = false;
    this.invalidate();
    this.button?.focus();
  };

  toggle = (): void => {
    if (this.open) {
      this.close();
    } else {
      this.open = true;
      void tick().then(() => this.closeButton?.focus());
    }
  };

  handleKeydown(event: KeyboardEvent, hasNestedModal: boolean): void {
    if (
      !this.open ||
      event.key !== "Escape" ||
      event.defaultPrevented ||
      hasNestedModal
    )
      return;
    event.preventDefault();
    this.close();
  }
}
