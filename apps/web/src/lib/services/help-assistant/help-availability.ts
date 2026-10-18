import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { isHelpAssistantEnabled } from "$lib/config/help-assistant";

/**
 * Whether the help assistant may appear at all: the build flag is on and the
 * user has not turned on the existing "AI Disabled" setting. Reactive when
 * read inside a component or `$derived`. When this is false, users get the
 * app's existing static help and nothing about the assistant is shown.
 */
export function isHelpAssistantAvailable(
  policy: { aiDisabled: boolean } = discoveryPolicyStore,
  flagOn: () => boolean = isHelpAssistantEnabled,
): boolean {
  return flagOn() && !policy.aiDisabled;
}
