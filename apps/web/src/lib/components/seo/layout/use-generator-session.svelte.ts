import { tick } from "svelte";
import { browser } from "$app/environment";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import { onlineStatus } from "$lib/stores/online.svelte";
import { sessionHubStore } from "$lib/stores/session-hub.svelte";
import { trackEvent } from "$lib/services/analytics/zaraz-analytics";
import type { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";
import type { getContextSelection } from "generator-engine";
import { recordGeneratedEntity } from "./record-generated-entity";

type DocumentLayout = ReturnType<typeof getGeneratorDocumentLayout>;
type ContextSelection = ReturnType<typeof getContextSelection>;

export interface GeneratorSessionInputs {
  getCanonicalPath: () => string | undefined;
  getInitialDraft: () => GeneratorOutput | null;
  getInitialDraftIsUserGenerated: () => boolean;
  getAutoGenerateExplicit: () => boolean;
  getAiModeRequired: () => boolean;
  getSupportsStreaming: () => boolean;
  getSingleColumn: () => boolean;
  getGeneratorType: () => string;
  getDocumentLayout: () => DocumentLayout;
  getContextSelection: () => ContextSelection;
  getOutputCard: () => HTMLElement | null;
  generate: (opts: {
    useAI: boolean;
    onPreview?: (preview: GeneratorOutput) => void;
  }) => Promise<GeneratorOutput>;
}

/**
 * Owns the generate lifecycle of a generator page: the seed draft shown on
 * load, explicit user generations (including streamed previews), and the
 * bookkeeping that records a result in the session hub.
 */
export function useGeneratorSession(inputs: GeneratorSessionInputs) {
  let isGenerating = $state(false);
  // Separate flag for the on-mount seed draft so it never blocks (or is blocked
  // by) an explicit user Generate (#1494 review follow-up).
  let isAutoDrafting = $state(false);
  // Once the user explicitly generates, the in-flight seed draft must not clobber
  // their result if it resolves later.
  let userGenerated = $state(false);
  // Follow-up actions must only use a result from a completed explicit run,
  // never the example draft left behind after a failed attempt.
  let userGenerationSucceeded = $state(false);
  // Streaming generators can show a usable draft before their final validation
  // finishes. Keep the loading overlay only until that first preview arrives.
  let hasStreamedPreview = $state(false);
  let generatedData = $state<GeneratorOutput | null>(null);
  let isExampleDraft = $state(false);
  let errorMessage = $state<string | null>(null);
  let useAI = $state(true);
  // Dismissal flag for the "AI was unavailable, used local" notice; reset on
  // each new generation so a later failure shows it again.
  let aiFallbackDismissed = $state(false);
  let currentEntityId = $state<string | null>(null);

  let currentPagePath = $state<string | undefined>(undefined);
  let appliedInitialDraft: GeneratorOutput | null | undefined;
  let autoDraftAttemptedForPath = $state<string | undefined>(undefined);

  const isBusy = $derived(isGenerating || isAutoDrafting);
  const showOutputLoading = $derived(isBusy && !hasStreamedPreview);

  $effect(() => {
    const canonicalPath = inputs.getCanonicalPath();
    const initialDraft = inputs.getInitialDraft();
    const initialIsUserGenerated = inputs.getInitialDraftIsUserGenerated();
    if (canonicalPath !== currentPagePath) {
      currentPagePath = canonicalPath;
      userGenerated = initialIsUserGenerated;
      userGenerationSucceeded = initialIsUserGenerated;
      generatedData = initialDraft;
      isExampleDraft = !initialIsUserGenerated;
      appliedInitialDraft = initialDraft;
    } else if (
      initialDraft !== appliedInitialDraft &&
      initialDraft &&
      !userGenerated
    ) {
      generatedData = initialDraft;
      userGenerated = initialIsUserGenerated;
      userGenerationSucceeded = initialIsUserGenerated;
      isExampleDraft = !initialIsUserGenerated;
      appliedInitialDraft = initialDraft;
    }
  });

  $effect(() => {
    const canonicalPath = inputs.getCanonicalPath();
    if (
      browser &&
      !generatedData &&
      !inputs.getAutoGenerateExplicit() &&
      !isAutoDrafting &&
      autoDraftAttemptedForPath !== canonicalPath
    ) {
      autoDraftAttemptedForPath = canonicalPath;
      void handleGenerateOnMount();
    }
  });

  function triggerExplicitAutoGenerate() {
    const canonicalPath = inputs.getCanonicalPath();
    if (autoDraftAttemptedForPath === canonicalPath) return;
    autoDraftAttemptedForPath = canonicalPath;
    void handleGenerate();
  }

  async function handleGenerateOnMount() {
    if (inputs.getAiModeRequired() || isAutoDrafting || generatedData) return;
    isAutoDrafting = true;
    errorMessage = null;
    try {
      const draft = await inputs.generate({ useAI: false });
      // The user may have triggered (or finished) an explicit generation while
      // this seed draft was in flight; don't overwrite their result.
      if (!userGenerated) generatedData = draft;
    } catch (err: any) {
      console.warn("Failed to generate initial draft:", err);
    } finally {
      isAutoDrafting = false;
    }
  }

  function recordCurrentOutputInHub(output: GeneratorOutput) {
    const documentLayout = inputs.getDocumentLayout();
    currentEntityId = recordGeneratedEntity(
      sessionHubStore,
      $state.snapshot(inputs.getContextSelection()),
      {
        type: output.type,
        kind: output.kind,
        title: output.title,
        summary: output.summary,
        content: documentLayout.content,
        lore: documentLayout.lore,
        labels: output.labels,
        status: output.status,
      },
    );
  }

  /** Side-by-side layouts already show the output; stacked ones scroll to it. */
  async function scrollToOutputIfStacked() {
    const outputCard = inputs.getOutputCard();
    const isStacked = inputs.getSingleColumn() || window.innerWidth < 1024;
    if (!browser || !isStacked || !outputCard) return;
    await tick();
    outputCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** AI only when the user opted in *and* we are online, read at click time. */
  function shouldUseAI() {
    // Read the live status at click time so a generation triggered before
    // status settles still routes correctly (#1494).
    return useAI && (browser ? navigator.onLine : onlineStatus.current);
  }

  async function handleGenerate() {
    if (isGenerating) return;
    userGenerated = true;
    userGenerationSucceeded = false;
    isGenerating = true;
    errorMessage = null;
    aiFallbackDismissed = false;
    hasStreamedPreview = false;
    const generatorType = inputs.getGeneratorType();
    // #1796: only ever fires for an explicit user Generate click, never the
    // silent handleGenerateOnMount() seed draft (that path never sets
    // userGenerated / calls handleGenerate at all).
    trackEvent("generator_started", { generator_type: generatorType });
    const useAINow = shouldUseAI();
    try {
      const onPreview = (preview: GeneratorOutput) => {
        generatedData = preview;
        isExampleDraft = false;
        hasStreamedPreview = true;
      };
      generatedData =
        useAINow && inputs.getSupportsStreaming()
          ? await inputs.generate({ useAI: useAINow, onPreview })
          : await inputs.generate({ useAI: useAINow });
      userGenerationSucceeded = true;
      isExampleDraft = false;
      // #1796: only on the success path — a caught error below means the
      // generation did not complete, so it must not count as one.
      trackEvent("generator_completed", { generator_type: generatorType });

      if (generatedData) recordCurrentOutputInHub(generatedData);

      await scrollToOutputIfStacked();
    } catch (err: any) {
      errorMessage = "Failed to generate: " + (err.message || err);
    } finally {
      isGenerating = false;
    }
  }

  /** Replaces the current result with an accepted refinement. */
  function applyRefinedOutput(output: GeneratorOutput, entityId: string) {
    generatedData = output;
    isExampleDraft = false;
    userGenerated = true;
    userGenerationSucceeded = true;
    currentEntityId = entityId;
  }

  return {
    handleGenerate,
    triggerExplicitAutoGenerate,
    applyRefinedOutput,
    dismissAiFallback() {
      aiFallbackDismissed = true;
    },
    get generatedData() {
      return generatedData;
    },
    get isExampleDraft() {
      return isExampleDraft;
    },
    get userGenerationSucceeded() {
      return userGenerationSucceeded;
    },
    get currentEntityId() {
      return currentEntityId;
    },
    get isBusy() {
      return isBusy;
    },
    get showOutputLoading() {
      return showOutputLoading;
    },
    get aiFallbackDismissed() {
      return aiFallbackDismissed;
    },
    get errorMessage() {
      return errorMessage;
    },
    set errorMessage(value: string | null) {
      errorMessage = value;
    },
    get useAI() {
      return useAI;
    },
    set useAI(value: boolean) {
      useAI = value;
    },
  };
}
