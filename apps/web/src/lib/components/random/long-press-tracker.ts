/**
 * Long-press detection for the source list's mobile context menu.
 *
 * A right-click opens the context menu on desktop; a touch device has no
 * right-click, so a held touch has to stand in for it. Generic over the
 * payload so the same tracker can carry whichever item was pressed through to
 * the eventual `onLongPress` call without the caller re-deriving it from a
 * stale event.
 */
export interface LongPressOptions<T> {
  /** How long a touch must be held before it counts as a long press. */
  delayMs?: number;
  /** Movement past this distance (px) cancels a pending long press. */
  moveThresholdPx?: number;
  onLongPress: (payload: T, clientX: number, clientY: number) => void;
  /** Optional haptic feedback; failures are swallowed (unsupported devices throw). */
  vibrate?: (ms: number) => void;
}

export interface LongPressTracker<T> {
  handleTouchStart(payload: T, clientX: number, clientY: number): void;
  handleTouchMove(clientX: number, clientY: number): void;
  handleTouchEnd(): void;
  /**
   * Reads and clears the "did a long press just fire" flag. Consuming rather
   * than merely reading it means the tap that follows a long press's
   * synthetic click does not also select the item.
   */
  consumeTriggered(): boolean;
}

const DEFAULT_DELAY_MS = 450;
const DEFAULT_MOVE_THRESHOLD_PX = 10;

export function createLongPressTracker<T>(
  options: LongPressOptions<T>,
): LongPressTracker<T> {
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const moveThresholdPx = options.moveThresholdPx ?? DEFAULT_MOVE_THRESHOLD_PX;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let triggered = false;
  let startX = 0;
  let startY = 0;

  function handleTouchStart(payload: T, clientX: number, clientY: number) {
    startX = clientX;
    startY = clientY;
    triggered = false;
    clearTimeout(timer);

    timer = setTimeout(() => {
      triggered = true;
      try {
        options.vibrate?.(40);
      } catch {
        // Unsupported or blocked; the long press itself still succeeds.
      }
      options.onLongPress(payload, clientX, clientY);
    }, delayMs);
  }

  function handleTouchMove(clientX: number, clientY: number) {
    const dx = Math.abs(clientX - startX);
    const dy = Math.abs(clientY - startY);
    if (dx > moveThresholdPx || dy > moveThresholdPx) {
      clearTimeout(timer);
    }
  }

  function handleTouchEnd() {
    clearTimeout(timer);
  }

  function consumeTriggered(): boolean {
    const was = triggered;
    triggered = false;
    return was;
  }

  return { handleTouchStart, handleTouchMove, handleTouchEnd, consumeTriggered };
}
