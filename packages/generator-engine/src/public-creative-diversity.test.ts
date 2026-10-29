import { describe, expect, it } from "vitest";
import { withPublicCreativeCue } from "./public-creative-diversity";
import { buildNpcPrompt } from "./public-npc";
import { buildNamesPrompt } from "./public-names";
import { buildSettlementPrompt } from "./public-settlement";
import { buildFactionRosterPrompt } from "./public-faction-roster";
import { buildMagicItemPrompt } from "./public-magic-item";
import { buildMinorMagicItemPrompt } from "./public-minor-magic-item";
import { buildArtifactPrompt } from "./public-artifact";
import { buildCreaturePrompt } from "./public-creature";
import { buildShipPrompt } from "./public-ship";
import { buildOriginPrompt } from "./public-origin";
import { buildPersonalityPrompt } from "./public-personality";
import { buildKingdomPrompt } from "./public-kingdom";
import { buildNationPrompt } from "./public-nation";
import { buildHolidayPrompt } from "./public-holiday";
import { buildVillainSchemePrompt } from "./public-villain-scheme";
import {
  buildFactionPrompt,
  buildNomadClanPrompt,
  buildVampirePrompt,
  buildDarkFactionPrompt,
} from "./public-faction";
import { buildSocialHubPrompt, buildTavernPrompt } from "./public-social-hub";
import { buildLanguagePrompt } from "./public-language";
import { buildSecretSocietyPrompt } from "./public-secret-society";
import { buildPantheonPrompt } from "./public-pantheon";
import { buildAdventurePrompt } from "./public-adventure";
import { buildAlienRacePrompt } from "./public-alien-race";
import {
  buildConstellationPrompt,
  buildNightSkyPrompt,
} from "./public-constellation";
import { buildStarSystemPrompt } from "./public-star-system";
import { buildWorldPrompt } from "./public-world";
import { buildPointCrawlPrompt } from "./public-point-crawl";
import { buildTomePrompt } from "./public-tome";
import { buildVillainPrompt } from "./public-villain";

describe("public creative diversity", () => {
  it("varies the cue deterministically while keeping the original request authoritative", () => {
    const low = withPublicCreativeCue(
      "User request: a talking sword",
      "object",
      () => 0,
    );
    const high = withPublicCreativeCue(
      "User request: a talking sword",
      "object",
      () => 0.99,
    );
    expect(low).toContain("User request: a talking sword");
    expect(low).toContain("those always take precedence");
    expect(low).not.toEqual(high);
    expect(withPublicCreativeCue("Names", "names", () => 0)).not.toContain(
      "trade-off",
    );
  });

  it("adds output-appropriate guidance to public single-pass prompts", () => {
    const prompts = [
      buildNpcPrompt(),
      buildNamesPrompt(),
      buildSettlementPrompt(),
      buildFactionRosterPrompt(),
      buildMagicItemPrompt(),
      buildMinorMagicItemPrompt(),
      buildArtifactPrompt(),
      buildCreaturePrompt(),
      buildShipPrompt(),
      buildOriginPrompt(),
      buildPersonalityPrompt(),
      buildKingdomPrompt(),
      buildNationPrompt(),
      buildHolidayPrompt(),
      buildVillainSchemePrompt(),
      buildFactionPrompt(),
      buildSecretSocietyPrompt(),
      buildNomadClanPrompt(),
      buildVampirePrompt(),
      buildDarkFactionPrompt(),
      buildSocialHubPrompt(),
      buildTavernPrompt(),
      buildLanguagePrompt(),
      buildPantheonPrompt({ mode: "single" }),
      buildPantheonPrompt({ mode: "pantheon" }),
      buildAdventurePrompt({}),
      buildAlienRacePrompt({}, () => 0),
      buildConstellationPrompt({}, () => 0),
      buildNightSkyPrompt({}, () => 0),
      buildStarSystemPrompt({}, () => 0),
      buildWorldPrompt({}, () => 0),
      buildPointCrawlPrompt({}, "", () => 0),
      buildTomePrompt({}, "", () => 0),
      buildVillainPrompt({}, "", () => 0),
    ];
    for (const prompt of prompts) {
      expect(prompt.userMessage).toContain("Optional creative variation:");
      expect(prompt.userMessage).toContain("those always take precedence");
    }
  });
});
