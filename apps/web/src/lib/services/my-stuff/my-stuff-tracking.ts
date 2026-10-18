import { trackEvent } from "$lib/services/analytics/zaraz-analytics";

export type MyStuffTab = "liked" | "shared";

export function trackMyStuffOpened(
  tab: MyStuffTab = "liked",
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("my_stuff_opened", { tab }, win);
}

export function trackMyStuffItemOpened(
  kind: "answer" | "generator_share",
  id: string,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("my_stuff_item_opened", { kind, id }, win);
}

export function trackMyStuffShareLinkCopied(
  shareId: string,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("my_stuff_share_link_copied", { share_id: shareId }, win);
}

export function trackMyStuffShareRevoked(
  shareId: string,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("my_stuff_share_revoked", { share_id: shareId }, win);
}

export function trackMyStuffLikedRemoved(
  slug: string,
  win: any = typeof window !== "undefined" ? window : undefined,
): void {
  trackEvent("my_stuff_liked_removed", { slug }, win);
}
