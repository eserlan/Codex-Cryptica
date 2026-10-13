<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { onMount, untrack } from "svelte";
  import type { InvitationChoice } from "onboarding-journey-engine";
  import releases from "$lib/content/changelog/releases.json";
  import {
    decideFirstRunAction,
    hasUnseenMinorRelease,
  } from "$lib/app/onboarding/onboarding-orchestrator";
  import { journeyStore } from "$lib/app/onboarding/journey/journey-runtime";
  import { journeyMilestones } from "$lib/app/onboarding/journey/journey-milestones-runtime";
  import {
    cifPopout,
    helpAssistant,
    helpContext,
  } from "$lib/stores/help-assistant/help-runtime";
  import { helpHighlight } from "$lib/services/help-assistant/help-highlight.svelte";
  import { isHelpAssistantAvailable } from "$lib/services/help-assistant/help-availability";
  import { helpStore } from "$lib/stores/help.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { tipsStore } from "$lib/app/onboarding/tips/tips-runtime";
  import GoalInvitation from "./GoalInvitation.svelte";
  import JourneyCard from "./JourneyCard.svelte";
  import CifTipChip from "./CifTipChip.svelte";
  import TipsOptIn from "./TipsOptIn.svelte";

  /**
   * Owns "what does a first-time user see first?" (#1780, spec 175): the
   * single first-run decision, the goal invitation and the guided-setup
   * journey card. Moved out of `(app)/+layout.svelte`.
   */

  let invitationOpen = $state(false);

  // Other first-run prompts (theme prompt, phone coach marks) wait on this.
  $effect(() => {
    const active = invitationOpen || journeyStore.active;
    untrack(() => (onboardingStore.firstRunGuidanceActive = active));
  });

  // Progress belongs to the vault it started in (data-model, reload rule).
  $effect(() => {
    const vaultId =
      vault.isInitialized &&
      !sessionModeStore.isGuestMode &&
      !sessionModeStore.isDemoMode
        ? vault.activeVaultId
        : null;
    untrack(() => journeyStore.load(vaultId));
  });

  onMount(() => journeyMilestones.start((m) => journeyStore.apply(m)));

  // The graph step completes while the graph is the screen (research R3).
  $effect(() => {
    void helpContext.current.area;
    untrack(() => journeyStore.syncScreen());
  });

  // A tour started from Help stops a running journey (FR-016).
  $effect(() => {
    if (helpStore.activeTour) untrack(() => journeyStore.tourStarted());
  });

  // Unified first-run orchestrator (#1780). One decision function owns what a
  // first-time user sees first, so the invitation, a journey and the
  // changelog never stack or compete. See onboarding-orchestrator.ts.
  $effect(() => {
    if (!browser) return;

    const action = decideFirstRunAction({
      isInitialized: vault.isInitialized,
      isGuestMode: sessionModeStore.isGuestMode,
      isDemoMode: sessionModeStore.isDemoMode,
      isLandingVisible: onboardingStore.isLandingPageVisible,
      vaultSwitcherOpen: modalUIStore.showVaultSwitcher,
      hasDemoQueryParam: page.url.searchParams.has("demo"),
      hasSeenTour: helpStore.hasSeen("initial-onboarding"),
      goalInvitationResolved: onboardingStore.goalInvitation !== null,
      journeyActive: journeyStore.active || invitationOpen,
      activeTour: !!helpStore.activeTour,
      anyModalOpen: modalUIStore.isAnyModalOpen || modalUIStore.showZenMode,
      hasUnseenRelease: hasUnseenMinorRelease(
        onboardingStore.lastSeenVersion,
        releases.map((r) => r.version),
      ),
    });

    switch (action.kind) {
      case "goal-invitation":
        // The invitation replaces the auto-started tour (spec 175).
        invitationOpen = true;
        break;
      case "changelog": {
        // Small delay so it never races an overlay that is about to open.
        const timeout = setTimeout(() => {
          if (
            !helpStore.activeTour &&
            !modalUIStore.showZenMode &&
            !sessionModeStore.isDemoMode &&
            !onboardingStore.showChangelog
          ) {
            onboardingStore.showChangelog = true;
          }
        }, 2000);
        return () => clearTimeout(timeout);
      }
      case "none":
      default:
        break;
    }
  });

  // A dialog, the landing layer, a vault switch or a tour takes over: the
  // invitation steps aside. It is not answered, so it can come back on a later
  // evaluation, and a finished tour answers it for the user.
  $effect(() => {
    if (
      invitationOpen &&
      onboardingStore.goalInvitation === null &&
      (!!helpStore.activeTour ||
        modalUIStore.isAnyModalOpen ||
        modalUIStore.showVaultSwitcher ||
        onboardingStore.isLandingPageVisible ||
        sessionModeStore.isGuestMode ||
        sessionModeStore.isDemoMode)
    ) {
      untrack(() => (invitationOpen = false));
    }
  });

  // Cif tips follow the screen, the switch and the blockers (spec 176). Nothing
  // here runs on a timer: only these reactive inputs and focus changes.
  $effect(() => {
    void helpContext.current.area;
    void tipsStore.enabled;
    void onboardingStore.goalInvitation;
    void onboardingStore.chosenGoal;
    void journeyStore.setupEnded;
    void helpStore.activeTour;
    void modalUIStore.isAnyModalOpen;
    void modalUIStore.showZenMode;
    void onboardingStore.firstRunGuidanceActive;
    void helpAssistant.isOpen;
    void cifPopout.connected;
    untrack(() => tipsStore.evaluate());
  });

  // Typing or focus moves are blockers: check when focus moves in (hide a tip)
  // and when it leaves (a tip that waited on this screen may now show).
  onMount(() => {
    const onIn = () => tipsStore.evaluate();
    const onOut = () => tipsStore.reevaluate();
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  });

  function choose(choice: InvitationChoice) {
    if (choice === "explore") {
      onboardingStore.resolveGoalInvitation("explore");
      return;
    }
    onboardingStore.resolveGoalInvitation("goal");
    onboardingStore.chooseGoal(choice);
    invitationOpen = false;
    journeyStore.start(choice);
  }
</script>

{#if invitationOpen}
  <GoalInvitation
    aiAvailable={isHelpAssistantAvailable()}
    onChoose={choose}
    onDismiss={() => {
      onboardingStore.resolveGoalInvitation("dismissed");
      invitationOpen = false;
    }}
    onTour={() => {
      invitationOpen = false;
      helpStore.startTour("initial-onboarding");
    }}
    onClose={() => (invitationOpen = false)}
  />
{/if}

<JourneyCard
  store={journeyStore}
  highlightRect={() => helpHighlight.current?.rect ?? null}
/>

{#if tipsStore.shouldAskOptIn}
  <TipsOptIn
    onYes={() => tipsStore.answerOptIn(true)}
    onNo={() => tipsStore.closeOptIn()}
  />
{/if}

{#if tipsStore.current}
  <CifTipChip
    label={tipsStore.current.label}
    onAct={() => tipsStore.act()}
    onDismiss={() => tipsStore.dismiss()}
  />
{/if}
