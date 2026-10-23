/** Capture DOM identity before index-keyed rows are reordered. */
export interface RowFocus {
  selector: string;
  targetIndex: number;
  selectionStart: number | null;
  selectionEnd: number | null;
}

function rowSelector(index: number) {
  return `tr[data-row-index="${index}"]`;
}

function controlSelector(active: HTMLElement, targetIndex: number) {
  const row = rowSelector(targetIndex);
  if (active.tagName === "TR") return row;
  const { colId, counterAction, action } = active.dataset;
  if (colId) {
    const cell = `${row} [data-col-id="${colId}"]`;
    if (counterAction) return `${cell}[data-counter-action="${counterAction}"]`;
    return action ? `${cell}[data-action="${action}"]` : cell;
  }
  return action ? `${row} [data-action="${action}"]` : null;
}

function inputSelection(active: HTMLElement) {
  if (!(active instanceof HTMLInputElement)) return {};
  if (
    !["text", "search", "url", "tel", "password", "number"].includes(
      active.type,
    )
  )
    return {};
  try {
    return {
      selectionStart: active.selectionStart,
      selectionEnd: active.selectionEnd,
    };
  } catch {
    // Some input types do not support selection.
    return {};
  }
}

export function captureRowFocus(
  container: HTMLElement | undefined,
  index: number,
  targetIndex: number,
): RowFocus | null {
  const active = document.activeElement as HTMLElement | null;
  if (!active || !container?.contains(active)) return null;
  const row = active.closest<HTMLTableRowElement>("tr[data-row-index]");
  if (!row || Number(row.dataset.rowIndex) !== index) return null;
  const selector = controlSelector(active, targetIndex);
  if (!selector) return null;
  return {
    selector,
    targetIndex,
    selectionStart: null,
    selectionEnd: null,
    ...inputSelection(active),
  };
}

function focusTarget(container: HTMLElement, focus: RowFocus) {
  const target = container.querySelector<HTMLElement>(focus.selector);
  if (!target || !(target as HTMLButtonElement).disabled) return target;
  // Preserve the existing alternate-move, then row fallback order.
  const row = rowSelector(focus.targetIndex);
  return (
    container.querySelector<HTMLElement>(`${row} [data-action="move-down"]`) ??
    container.querySelector<HTMLElement>(`${row} [data-action="move-up"]`) ??
    container.querySelector<HTMLElement>(row)
  );
}

function restoreSelection(target: HTMLElement, focus: RowFocus) {
  if (!(target instanceof HTMLInputElement)) return;
  if (focus.selectionStart === null || focus.selectionEnd === null) return;
  try {
    target.setSelectionRange(focus.selectionStart, focus.selectionEnd);
  } catch {
    // Some input types do not support selection.
  }
}

export function restoreRowFocus(
  container: HTMLElement | undefined,
  focus: RowFocus,
) {
  if (!container) return;
  const target = focusTarget(container, focus);
  if (!target) return;
  target.focus();
  restoreSelection(target, focus);
}

export function rowMoveDirection(
  event: KeyboardEvent,
  readOnly: boolean,
): -1 | 1 | null {
  if (readOnly || event.shiftKey) return null;
  if (!(event.ctrlKey || event.metaKey || event.altKey)) return null;
  if (event.key === "ArrowUp") return -1;
  return event.key === "ArrowDown" ? 1 : null;
}
