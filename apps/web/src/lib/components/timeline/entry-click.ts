import type { CalendarEventEntry } from "chronology-engine";

const DBLCLICK_DELAY = 220;

/**
 * Returns paired click/dblclick handlers that prevent the two events from
 * stepping on each other. A single click is held for DBLCLICK_DELAY ms; if a
 * second click arrives within that window the timer is cancelled and the
 * dblclick action fires instead.
 *
 * Pass side-effects (e.g. closing a popup) inside the callbacks themselves.
 */
export function createEntryClickHandlers(
  onSingleClick: (entry: CalendarEventEntry) => void,
  onDoubleClick: (entityId: string) => void,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    handleClick(entry: CalendarEventEntry) {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        onSingleClick(entry);
      }, DBLCLICK_DELAY);
    },
    handleDblClick(entityId: string) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      onDoubleClick(entityId);
    },
  };
}
