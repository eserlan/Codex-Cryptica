# Tales of the Valiant: step-by-step test plan

**Epic:** [#3941 — First-class Tales of the Valiant support](https://github.com/eserlan/Codex-Cryptica/issues/3941)
**Prepared:** 2026-10-19

Run the core walkthrough in order, then the relevant import, generator and regression
checks. Every case has actions and expected results. This document records a plan,
not a completed test run.

## Scope and current delivery

| Area                                            | Issues                         | Cases                      |
| ----------------------------------------------- | ------------------------------ | -------------------------- |
| Source provenance and attribution               | #3942                          | 14                         |
| Optional vault profile and isolation            | #3943                          | 1, 7, 13                   |
| Native character, quick NPC and monster sheets  | #3944                          | 2–6, 8                     |
| ToV/Black Flag detection and stat-block mapping | #3945; newer import flow #4192 | 8–10                       |
| Versioned character-builder interchange         | #3946                          | 16 — pending               |
| Shared Luck counter on sheet and VTT            | #3947                          | 4–6                        |
| Generator mechanics and encounter/Doom guidance | #3948, #3949                   | 11–12                      |
| Sourced Oracle rules and Cif separation         | #3950                          | 15, 17 — retrieval pending |
| Working help and discovery links                | #3951                          | 15                         |

As checked on 2026-10-19, **#3946 and #3950 are open**. The current campaign guide
explicitly says that external `tov-chargen` character JSON is not supported. The
stat-block paste dialog imports monsters and quick NPCs, not full player characters.
The core walkthrough therefore uses a manually populated character sheet.

Passing that walkthrough does **not** pass the epic's character-builder import/export
exit test. Record cases 16 and 17 as **Blocked — pending implementation** until their
actual user workflows exist; reassess their status against the build under test.

## Record the run

| Item                                                   | Value                                   |
| ------------------------------------------------------ | --------------------------------------- |
| Tester and date                                        |                                         |
| App URL and commit/build                               |                                         |
| Browser, operating system and viewport                 |                                         |
| AI mode and model, if used                             |                                         |
| Verified BFRD artifact/revision and section references |                                         |
| Core cases 1–7                                         | Not run                                 |
| Additional cases 8–15                                  | Not run                                 |
| Pending acceptance cases 16–17                         | Blocked pending implementation; recheck |
| Failures and issue links                               |                                         |

Record **Pass**, **Fail** or **Blocked** for each case. A failure report should include
the case/step, source fixture, expected and actual values, and a screenshot or error
if useful. Unrun, unavailable and deferred work is never a pass.

## Prepare a disposable campaign

1. Create **ToV QA** and a second campaign called **Neutral QA**. Leave both on their
   default system initially. Keep a backed-up D&D 5e character available for regression.
2. In ToV QA, create a character **QA Aric**, with a note `CC-only lore: owes Mira a favour`,
   a custom Label, and a relationship to another entity. These detect accidental overwrites.
3. Create **QA Scout** for a quick NPC sheet and **QA Brute** for a monster sheet.
   Add a map image for token tests.
4. Turn **AI Disabled** on. Keep the app loaded before testing network disconnection;
   loading an uncached app is a separate concern from offline sheet use.
5. Use the repository-authored [hero fixture](../packages/stat-sheet-engine/src/rules-sources/fixtures/tov-hero.fixture.ts)
   for representative data. Its Luck value of 3 is a saved mid-session value, not a
   claim about starting Luck. Prepare these values for manual entry:

   | Field                                       | Value                      |
   | ------------------------------------------- | -------------------------- |
   | Lineage / Heritage                          | Human / Cloudborn          |
   | Background / Class / Level                  | Soldier / Fighter / 1      |
   | STR / DEX / CON / INT / WIS / CHA           | 16 / 14 / 14 / 10 / 12 / 8 |
   | Proficiency Bonus                           | 2                          |
   | HP / maximum HP / AC                        | 12 / 12 / 16               |
   | Speed / Hit Dice                            | 30 ft / 1d10               |
   | Luck / maximum Luck                         | 3 / 5                      |
   | STR check / proficient STR save / Athletics | 1d20+3 / 1d20+5 / 1d20+5   |
   | Longsword attack / damage                   | 1d20+5 / 1d8+3             |
   | Heavy Crossbow attack / damage              | 1d20+4 / 1d10+2            |

6. For imports, use the `source` string or JSON from the named entries in
   [stat-block fixtures](../packages/stat-sheet-engine/src/stat-block-reader/__fixtures__/stat-blocks.ts).
   Paste the source value, not its surrounding TypeScript declaration. These are
   repository-authored examples, not a licence to reuse commercial book text.

## Core walkthrough: playable sheet and VTT

### 1. Opt into ToV without changing existing content

1. In a fresh campaign, open **Settings → Vault → Default Game System**.
   **Expect:** **System Neutral** is the default.
2. In ToV QA, select **Tales of the Valiant**. Wait for saving, then reload.
   **Expect:** the choice remains selected; the source/attribution is available.
3. Open an existing entity and the campaign NPC generator.
   **Expect:** existing content is unchanged; the generator starts with ToV selected
   and the relevant ToV templates are suggested first.
4. Close the generator without generating. **Expect:** no entity or stat block was created.

### 2. Attach and populate a native character sheet

1. Open QA Aric → **Stats → Templates**. Choose **ToV Character**
   (`builtin-tov-character`), rather than a D&D 5e template.
   **Expect:** distinct Lineage, Heritage, Background, Class, talents/features,
   ability scores, saves, skills, attacks, spell fields and Luck.
2. Enter the prepared values using the sheet's editable controls and **Edit Layout**
   where necessary. Set current/maximum HP and Luck separately. Finish editing.
   **Expect:** the displayed values match the table; Lineage and Heritage remain separate.
3. Add a sample talent/feature, spell-circle information and a custom field
   `QA house-rule note`. Save and reopen the entity.
   **Expect:** those fields and the CC-only note, Label and relationship all survive.
4. Check the proficient save/skill and attack formulas explicitly. If the UI cannot
   represent the prepared values, record that failure rather than substituting an
   unproficient roll or silently editing vault files to make the case pass.

### 3. Roll checks, skills, saves and attacks locally

1. Roll STR Check, the configured STR Save, and Athletics once each.
   **Expect:** one result per action, with formulas `1d20+3`, `1d20+5`, `1d20+5`.
2. Roll Longsword attack and damage, then Heavy Crossbow attack and damage.
   **Expect:** the configured formulas are used; the two attack rows do not share values.
3. Inspect the rolled dice and modifier, not a particular random total.
   **Expect:** arithmetic is correct and the proficiency bonus is included exactly once.
4. Record Luck, roll again, and declare an attack failed at the table.
   **Expect:** CC does not infer the outcome or adjust Luck automatically.
5. Reload and repeat a roll. **Expect:** configured formulas and editable overrides
   remain intact; unrelated lore has not changed.

### 4. Spend and gain Luck deliberately

1. Set Luck to 3. Use **Spend 1 Luck** once, then **Gain 1 Luck** twice.
   **Expect:** values 2, 3, 4, persisted on the character.
2. Spend down to 0. **Expect:** another spend is unavailable; no negative value.
3. Gain up to 5. **Expect:** the UI counter does not exceed its configured maximum.
   The current widget disables Gain at the cap; it does not automate the published
   overflow reset. Check the rules explanation separately in case 14.
4. Restore Luck to 3, reload and reopen QA Aric. **Expect:** 3, not a new random pool.
5. Open **How Luck works**. **Expect:** it identifies the source, says changes are
   manual, and explains earning, spending and the d4 reset when gaining at 5.
   Reopening, rolling or a rest must not silently reset the counter.

### 5. Use the same character from the VTT

1. Open the map, enable VTT, and add a token linked to QA Aric.
   **Expect:** selecting it shows Luck in **Token Quick Stats**, even without favouriting Luck.
2. From Luck 3, spend once in token quick stats. Reopen the character sheet.
   **Expect:** both views show 2; this is one entity resource, not independent copies.
3. Gain once from the sheet and reselect the token. **Expect:** token quick stats shows 3.
4. Favourite a rollable skill/check and exercise it from quick stats.
   **Expect:** the configured formula is used once. Change HP and confirm Luck is unchanged.
5. Select a token linked to another character. **Expect:** its resources are independent.
6. Reload, reopen the map and relink/reselect the token if the session requires it.
   **Expect:** saved character HP, Luck, attacks and lore remain intact.

### 6. Prove local persistence and offline use

1. With the app loaded and AI disabled, disconnect the network using browser DevTools.
   Clear the Network log before testing actions.
2. Edit a character value, roll a skill, change Luck on the sheet and via its token.
   **Expect:** each works locally without an AI or remote character-service request.
3. Reconnect before reloading if the app is not cached. Reload and inspect the entity.
   **Expect:** edits and counters persisted locally; connectivity did not reset them.
4. Export a normal campaign backup, then restore it into a separate test campaign.
   **Expect:** profile, template association, custom fields, formulas, counters, lore,
   Labels and relationships survive. This is campaign backup, not `tov-chargen` interchange.

### 7. Keep neutral and other systems independent

1. Switch to Neutral QA. Open an existing entity and the NPC generator.
   **Expect:** no inherited ToV default, Luck/Doom widget or rewritten sheet.
2. Open the backed-up D&D 5e character. **Expect:** its existing template, formulas,
   resources and lore remain unchanged; it is not reclassified as ToV.
3. In ToV QA, select **System Neutral**, wait for saving and reload.
   **Expect:** generator defaults return to neutral; QA Aric keeps its explicitly
   attached ToV sheet and values. Restore the ToV vault profile for later cases.
4. Switch repeatedly between campaigns. **Expect:** each restores its own profile.
   A generic counter named Luck, or Mythras Luck, must not acquire ToV-specific help.

## Imports, generators and regression checks

### 8. Read a creature or quick NPC stat block

1. Open QA Brute → **Stats → Import**. Paste `clean-hill-brute`, then
   **Read stat block**. With AI disabled, expect the deterministic quick-reader path.
2. Inspect the review before saving. **Expect:** Monster sheet proposed; AC 13,
   HP 45, CR 3, and source action details are preserved where read. Missing or
   uncertain values are identified for review, not filled with invented mechanics.
3. Correct any flagged field, then save. **Expect:** a ToV monster sheet, not a D&D
   character sheet; source values and rollable actions agree after reload.
4. In QA Scout, repeat with `clean-bandit-captain`, selecting **NPC** when necessary.
   **Expect:** a quick NPC sheet, CR-based stats and appropriate actions.
5. Repeat with `foundry-hill-brute`. **Expect:** Black Flag evidence is recognised,
   HP/AC/abilities map correctly, and absent values are not invented.
6. Cancel a separate review before saving. **Expect:** no sheet/entity mutation.

### 9. Preserve edits and separate 5e conversion

1. Add a custom field and handwritten lore to QA Brute. Reimport a copy of the same
   block with only AC changed from 13 to 14.
   **Expect:** the confirmation identifies the actual changes; unaffected fields and
   CC-only content remain intact. Cancel once, then repeat and confirm.
2. Paste `5e-goblin-boss` in **Copy as written** with AI available.
   **Expect:** the detected-system notice does not silently convert its statistics.
3. Deliberately select **Convert from 5e** and read again.
   **Expect:** changed/added values are marked as converted with original values visible;
   saving adds **Converted from 5e**. Unchanged values are not rewritten without explanation.
4. Turn AI off and repeat. **Expect:** conversion is unavailable, while the quick
   reader remains usable locally. A failed cloud request is not required for fallback.

### 10. Invalid input, uncertainty and cancellation

1. Import `no-stat-block-lore`, `several-goblins`, and `character-sheet-fighter`
   separately. **Expect:** helpful rejection or an explicit unsupported/multiple-block
   result, not a fabricated monster sheet or a full-PC import success.
2. Import `pdf-dire-stalker`. **Expect:** damaged/uncertain text is flagged for checking;
   inspect the split damage expression against its source before saving.
3. Remove HP from a block targeting a new sheet. **Expect:** save remains blocked
   until the required value is supplied, without damaging any existing entity.
4. Paste more than 12,000 characters. **Expect:** refusal before an AI request.
5. With AI on, fail a read request. **Expect:** pasted input remains available, with
   Retry and **Use quick reader**. Retry, then cancel during an in-flight read.
   **Expect:** no late save, duplicate entity or mutation after closing/switching vaults.
6. Save once with **Keep the original text in notes** selected, once without it.
   **Expect:** original text is retained only when chosen, with the sharing warning;
   private source text is not automatically added to unrelated entities or public pages.

### 11. Generate ToV mechanics explicitly — requires AI for mechanics

1. In ToV QA, open the campaign **NPC** generator. Keep ToV selected and choose
   **Quick NPC (CR)**. Generate and inspect before saving.
   **Expect:** narrative plus reviewable mechanics; saving attaches the quick NPC template.
2. Repeat with the levelled-character option. **Expect:** a ToV character sheet with
   distinct identity fields, rolls and Luck, rather than a quick NPC or D&D sheet.
3. Generate a **Creature** with an unusual homebrew ability.
   **Expect:** a monster sheet; invented abilities are presented for GM review rather
   than asserted to be published BFRD material. Verify the source basis of any official claim.
4. Generate a **Magic Item** and **Minor Magic Item** with ToV selected.
   **Expect:** relevant mechanics are saved under **Game Statistics (Tales of the Valiant)**,
   with narrative preserved; do not expect a creature sheet on an item.
5. Change the run to **System Neutral**. **Expect:** no ToV mechanics requirement.
   Switch AI off and request ToV: expect neutral fallback content and the informational
   notice that ToV mechanics require AI; no invented offline ToV stats.
6. On `/generators/npc`, select ToV explicitly, generate, Copy, then use the
   save-to-campaign action. **Expect:** copied mechanics match the result and the
   accepted draft saves with the right sheet; public defaults do not borrow a private vault's profile.

### 12. Encounter guidance and Doom

1. In the **Encounter** generator, select ToV, party size 4 and party level 3.
   **Expect:** ToV-specific party inputs and qualitative difficulty guidance alongside
   the narrative. Review creature/CR suggestions against the source, not an assumed 5e XP budget.
2. Exercise party-size boundaries 1 and 8, level boundaries 1 and 20, and invalid
   values outside them. **Expect:** valid boundaries accepted; invalid values blocked.
3. Save a result. **Expect:** narrative and **Game Mechanics & Challenge Guidance
   (Tales of the Valiant)** survive. Switch to neutral: ToV party controls/guidance disappear.
4. On QA Brute's monster sheet, set Doom to 3; spend once and gain once. Repeat
   from its linked token. **Expect:** shared values 2 then 3; no crossing the configured
   limits (default 0–10). Another monster's Doom remains independent.
5. Open **How Doom Points work**. **Expect:** optional encounter-level BFRD Doom is
   distinguished from CC's per-creature allocation counter. No automatic encounter pool,
   recharge or advantage application is implied by changing a number.
6. Select QA Aric or an unrelated-system sheet. **Expect:** no ToV monster Doom widget.

### 13. Guest access, responsive controls and failed saves

1. Publish/share only the intended test character and open the guest copy.
   **Expect:** shared fields are readable; counters/import/edit controls cannot persist
   changes to the source campaign. Do not assume shared ToV stats themselves are secret.
2. Repeat cases 2–5 at approximately 390 × 844 and using keyboard only.
   **Expect:** fields, roll actions and counters remain reachable, with labelled
   controls, visible focus and readable totals. Check dialog focus entry/return.
3. Check light/dark app appearance and contrasting world themes.
   **Expect:** readable text, disabled controls, errors and focus indicators.
4. With developer-controlled fault injection, fail a profile save and a character
   update. **Expect:** a truthful error or rollback, no false success, and no loss of
   the last persisted values. Retry must not duplicate entities or affect another vault.
   Mark blocked if that test setup is unavailable; do not delete campaign storage.

### 14. Rules accuracy and attribution — assess separately from counter usability

1. Inspect the [source manifest](../packages/stat-sheet-engine/src/rules-sources/bfrd-manifest.ts)
   and [attribution document](./legal/tales-of-the-valiant-attribution.md).
   **Expect:** an identifiable BFRD artifact/revision, licence and attribution that
   match the material used. Record the actual rules revision; a Foundry system release
   number alone does not establish the revision of a rules document.
2. Compare Luck explanations across Help, sheet, VTT and fixtures against the chosen
   source. For the publisher's [BFRD, Playing the Game, pp. 120–121](https://koboldpress.com/wp-content/uploads/2024/05/Black-Flag-Roleplaying.pdf#page=120),
   check starting Luck 0, the once-per-turn failed attack/save gain, cap 5, d4 overflow
   reset, one-for-one spending, and the three-Luck reroll. Ordinary failed ability
   checks are not the automatic gain condition. Do not substitute D&D Inspiration.
3. **Expect:** rules text distinguishes manual tracking from automation and does not
   invent a mandatory Long Rest reset. Record a rules-content failure even if the
   plus/minus counter works. In particular, confirm `TOV_LUCK_REFERENCE` and
   `tov-luck.fixture.ts` still match the source: they were corrected on 2026-10-19 to
   drop the ability-check gain, the `1d4 + 1` starting pool and the Long Rest reset.
4. Check Doom references, lineage/heritage separation, talents and spell circles
   against their actual sections. **Expect:** source-backed claims and clearly identified
   homebrew; no claim that CC's per-monster counter is the published encounter pool.
5. Inspect distributed content and exports for the required attribution. **Expect:**
   proprietary setting prose/artwork and compatibility logos are not bundled as open
   BFRD content. Record missing provenance; do not infer licence compliance from test counts.

### 15. Find working features through Help and discovery

1. Search Help for `Tales of the Valiant`, `Luck` and `Doom`.
   **Expect:** campaign/generator guidance points to working controls and explains
   manual resource handling, AI requirements and external-character import limitations.
2. Open `/for/tales-of-the-valiant` and
   `/answers/how-do-i-organise-a-tales-of-the-valiant-campaign`.
   **Expect:** their links work and capabilities match this build, including limitations.
3. If Cif is available, ask **Where do I select ToV and change my character's Luck?**
   **Expect:** CC navigation guidance, not invented character JSON support or automatic Luck.
4. Ask Cif to adjudicate a campaign rules dispute. **Expect:** product-help boundaries,
   not an unsupported claim to be an authoritative in-campaign GM.
5. Repeat Help navigation with AI off. **Expect:** static help remains readable.

## Pending epic acceptance checks

### 16. Versioned tov-chargen interchange — blocked on #3946

When implemented, use a documented, versioned export from `tov-chargen` and record
the external character ID and schema version. An internal mapper test is not a UI import.

1. Export a character locally and import through CC's supported preview into a new
   character. **Expect:** supported identity, lineage/heritage, classes, talents, scores,
   proficiencies, equipment, spells, HP/AC and Luck map without silent loss; unsupported
   fields are visible. Verify rolls, Luck and VTT using cases 3–5.
2. Add CC-only lore, Labels, relationships and custom fields. Reimport a revised copy
   of the same external character. **Expect:** mapped updates follow the documented
   ownership/conflict policy without losing CC content or creating an unwanted duplicate.
3. Export through the delivered interchange route and validate its versioned contract.
   Reimport supported round-trip fields. **Expect:** values, IDs and provenance preserved
   according to the declared contract; unsupported round trips explicitly identified.
4. Try malformed input, an older version, an unknown future version, then cancel a
   valid preview. **Expect:** helpful rejection/migration and no partial entity update.
5. Repeat with the network disconnected. **Expect:** local-file exchange works without
   an account or remote service. Repeat the full import → roll → Luck → VTT → reload
   → export flow on desktop and mobile before declaring M1 complete.

### 17. Source-grounded Oracle references — blocked on #3950

1. In a ToV campaign, ask a small verified fixture set about Luck, lineage/heritage
   and Doom. **Expect:** correct version/section provenance and a distinction between
   cited rules, interpretation and homebrew.
2. Repeat in a neutral and D&D campaign. **Expect:** profile isolation; ToV rules are
   not silently used for a different system.
3. Ask about an ambiguous rule and unavailable proprietary supplement. Inject hostile
   instructions into a controlled retrieval fixture. **Expect:** acknowledged source
   limits; retrieved text cannot redirect the assistant or disclose private vault data.
4. Disable AI/offline access. **Expect:** honest reference unavailability while local
   sheets, counters and dice remain usable. Cif continues to describe product workflows.

## Optional automated support

These are existing focused tests, not a claim of execution. From the repository root:

```sh
bun run --cwd packages/stat-sheet-engine test tests/tov-templates.test.ts tests/tov-luck.test.ts tests/tov-doom.test.ts tests/stat-block-import.test.ts tests/rules-sources/bfrd-manifest.test.ts
bun run --cwd packages/stat-sheet-engine test src/stat-block-reader src/stat-block
bun run --cwd packages/generator-engine test tests/public-npc-tov.test.ts tests/public-creature-tov.test.ts tests/public-magic-item-tov.test.ts tests/public-encounter-tov.test.ts
```

From `apps/web`, use the Svelte/Vitest runner rather than plain `bun test`:

```sh
bunx vitest run src/lib/stores/system-profile.svelte.test.ts src/lib/stores/system-profile.storage.test.ts src/lib/components/settings/GameSystemSettings.test.ts src/lib/components/stats/TovLuckControl.test.ts src/lib/components/stats/TovDoomControl.test.ts src/lib/components/vtt/TokenQuickStats.test.ts
bunx vitest run src/lib/components/stats/import src/lib/components/entity-detail/DetailStatsTab.statBlock.test.ts
```

Passing mapper or recorded-AI tests does not establish live AI accuracy, an external
interchange workflow, published-rules correctness or a connected-player permission check.

## Finish the run

- Record results and failures, including rules-text discrepancies separately from UI behaviour.
- Core cases 1–7 establish the current manual-entry workflow only. Do not declare the
  epic's M1 exit test passed until case 16 and the desktop/mobile checks pass.
- For M2/M3, record applicable cases 8–15 and 17 and any explicit deferrals with rationale.
- Check every child issue against current delivery; a checked epic list is not test evidence.
- Keep fixtures needed to reproduce failures; remove disposable campaigns, guest publications
  and live sessions when testing is complete.

## Repository references

- [Campaign help](../apps/web/src/lib/content/help/tales-of-the-valiant.md)
- [Generator help](../apps/web/src/lib/content/help/tales-of-the-valiant-generators.md)
- [Stat-block import quickstart](../specs/4192-tov-statblock-import/quickstart.md)
- [Generator mechanics quickstart](../specs/3948-tov-generator-mechanics/quickstart.md)
- [Encounter and Doom quickstart](../specs/3949-tov-encounter-guidance/quickstart.md)
- [Discovery and Help quickstart](../specs/3951-tov-discovery-and-help/quickstart.md)
