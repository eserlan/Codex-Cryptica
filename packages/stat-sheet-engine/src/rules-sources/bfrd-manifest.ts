import type { RulesSourceManifest } from "./types";
import { RulesSourceManifestSchema } from "./types";

export const BFRD_MANIFEST: RulesSourceManifest = {
  id: "bfrd",
  name: "Black Flag Reference Document",
  shortName: "BFRD",
  publisher: "Open Design LLC d/b/a Kobold Press",
  repositoryUrl: "https://github.com/koboldpress/black-flag",
  websiteUrl: "https://koboldpress.com/black-flag-roleplaying/",
  version: "1.0.0",
  releaseDate: "2024-07-16",
  license: "CC-BY-4.0",
  licenseName: "Creative Commons Attribution 4.0 International",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  attributionNotice:
    "This work includes material from the Black Flag Reference Document, made available under the Creative Commons Attribution 4.0 International License (CC BY 4.0) by Open Design LLC d/b/a Kobold Press.",
  upstreamSources: [
    {
      name: "System Reference Document 5.1 (SRD 5.1)",
      publisher: "Wizards of the Coast LLC",
      license: "CC-BY-4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      attributionNotice:
        "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC, available under the Creative Commons Attribution 4.0 International License.",
    },
  ],
  trademarkGuidance:
    "'Tales of the Valiant' and 'Black Flag Roleplaying' are trademarks of Open Design LLC. Codex Cryptica does not display, embed, or redistribute the official 'Tales of the Valiant Compatibility' logo without fulfilling its separate licence terms and agreement.",
  contentBoundaries:
    "Only open game mechanics, terms, tables, and reference structures released in the Black Flag Reference Document under CC BY 4.0 are utilized. Proprietary setting lore (such as the Midgard Campaign Setting, Southlands, or Margreve), proprietary campaign books, commercial adventures, and commercial artwork/illustrations are strictly excluded.",
  aiUsageGuardrails:
    "Codex Cryptica's own AI prompts, prompt grounding and bundled content are strictly limited to open BFRD mechanics under CC BY 4.0. No scraping, ingesting, or redistributing of proprietary book text or commercial supplements is allowed in those prompts, bundled content or public pages. Stat block import may send text a user pastes into their own vault to the AI for a single read for their own use: that text is not stored by the request, not reused to ground other requests, and not shared or published by Codex Cryptica. Product-level guidance for Codex Cryptica remains the exclusive domain of Cif.",
};

// Validate at module load to ensure configuration integrity
RulesSourceManifestSchema.parse(BFRD_MANIFEST);
