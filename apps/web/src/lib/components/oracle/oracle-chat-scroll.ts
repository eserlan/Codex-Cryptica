export interface ScrollToBottomOptions {
  behavior?: ScrollBehavior | "instant";
  threshold?: number;
}

export function isChatNearBottom(
  container: HTMLElement,
  threshold = 24,
): boolean {
  const distanceToBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight;
  return distanceToBottom <= threshold;
}

export function scrollChatToBottom(
  container: HTMLElement | undefined,
  options: ScrollToBottomOptions = {},
): boolean {
  if (!container) return false;

  const behavior = options.behavior ?? "auto";
  const threshold = options.threshold ?? 24;

  if (isChatNearBottom(container, threshold)) return false;

  if (behavior === "instant") {
    container.scrollTop = container.scrollHeight;
    return true;
  }

  container.scrollTo({ top: container.scrollHeight, behavior });
  return true;
}
