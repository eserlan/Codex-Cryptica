# Feature Specification: Generate Region for Hex Crawl Maps

**Feature Branch**: `4659-hex-region-generation`  
**Created**: 2026-11-11  
**Status**: Draft  
**Input**: GitHub issue [#4659](https://github.com/eserlan/Codex-Cryptica/issues/4659): "Generate coherent seeded terrain regions with preview and safe commit". Follow-up to the Hex Crawl epic #1957 (#4147, #4148).

## Summary

Hex Crawl maps already hold hex records, hand-assigned terrain, Unknown / Seen / Explored state, per-hex discovery, journey stepping and links to vault entities. What they cannot do is produce geography: a GM who wants forty hexes of believable landscape must set each one by hand.

This feature adds an optional **Generate Region** action. It proposes terrain for a group of empty hexes as one coherent landscape (forests that cluster, hills that rise into mountains, coast that sits between land and water) rather than as unrelated per-hex rolls. The GM sees the proposal on the map, can adjust or reroll it, and nothing is saved until they accept. It works entirely on the device, with AI turned off.

## Clarifications

### Session 2026-11-11

- Q: How should the GM choose the area of hexes to generate terrain for? → A: Pick a centre hex, then choose a radius (1 to 12 hexes); the area is every hex within that distance.
- Q: For Fill Gaps, which empty hexes count as a gap between established terrain? → A: Enclosed holes, plus narrow corridors: strips of empty hexes up to 4 wide with established terrain on both sides. Fill Gaps runs inside a centre hex and radius. (Planning made the corridor rule precise; see FR-004.)
- Q: After the GM accepts a region, how can they take it back? → A: One-step undo offered right after accepting; it restores those hexes to how they were and expires when the GM edits the map again or leaves it.
- Q: How should the GM control which terrains the generator favours? → A: Landscape presets, plus an optional Customise section where each terrain is set to None, Less, Normal or More.
- Q: When the GM regenerates generated terrain, what happens to hexes the party has already explored? → A: Allowed, with a warning: the preview states how many explored hexes would change and marks them on the map.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate terrain for a selected area and review it before saving (Priority: P1)

A GM preparing a session picks a centre hex on a Hex Crawl map, chooses a radius and chooses Generate Region. The area is every hex within that distance of the centre. Proposed terrain appears on those hexes, visibly marked as a proposal. The GM looks it over and either accepts it, which saves it, or cancels, which leaves the map exactly as it was.

**Why this priority**: This is the core of the feature. It turns a long manual chore into one reviewed action, and the review step is what makes generated content safe to use on a map the GM has already invested in. It is a complete, useful slice on its own.

**Independent Test**: On a map with Hex Crawl on and some empty hexes, pick a centre hex and a radius, generate, and confirm that the proposal is shown, that Cancel leaves every hex unchanged, and that Accept saves terrain on exactly the proposed hexes.

**Acceptance Scenarios**:

1. **Given** a Hex Crawl map with a chosen centre hex and radius covering empty hexes, **When** the GM chooses Generate Region, **Then** proposed terrain is shown on each selected empty hex, visibly distinct from saved terrain, and nothing has been saved.
2. **Given** a proposal on screen, **When** the GM cancels, **Then** the proposal disappears and no hex, note, pin, exploration flag, discovery or journey value has changed.
3. **Given** a proposal on screen, **When** the GM accepts, **Then** the proposed terrain is saved on those hexes and stays there after the map is closed and reopened.
4. **Given** a selection that contains hexes with terrain the GM set by hand, **When** a proposal is generated, **Then** those hexes are left out of the proposal and keep their terrain.
5. **Given** a map with no illustrated base image, **When** a proposal is generated, **Then** the proposed terrain is still clearly readable on the hex overlay.
6. **Given** a region has just been accepted, **When** the GM chooses Undo, **Then** every hex the region changed is back exactly as it was before accepting.
7. **Given** a region has been accepted and the GM then edits the map or leaves it, **When** they look for Undo, **Then** it is no longer offered.
8. **Given** the save fails part-way when the GM accepts, **When** the failure is reported, **Then** none of the proposed terrain is applied, the GM is told the map is unchanged, and the proposal remains available to retry or cancel.

---

### User Story 2 - Terrain reads as a coherent landscape (Priority: P1)

The proposed terrain looks like geography. Like terrain gathers into patches, neighbouring terrain makes sense together, and the proposal fits whatever terrain already surrounds it.

**Why this priority**: Without coherence the feature is no better than rolling each hex separately, which is exactly the gap the issue describes. It ships with Story 1; it is listed separately because it is judged and tested separately.

**Independent Test**: Generate regions from a fixed set of seeds and starting layouts and check the results against stated continuity rules (clustering, allowed neighbours, fit with existing terrain).

**Acceptance Scenarios**:

1. **Given** an empty area with no surrounding terrain, **When** a region is generated, **Then** most hexes share terrain with at least one neighbour, so the result shows patches rather than a scatter.
2. **Given** an area bordering saved forest on one side and saved plains on the other, **When** a region is generated, **Then** the proposal continues both and meets between them without an abrupt, unrelated terrain in the middle.
3. **Given** an area between saved hills and saved mountains, **When** a region is generated, **Then** mountains are proposed next to hills or other mountains, not isolated in lowland.
4. **Given** an area between saved land and saved water, **When** a region is generated, **Then** coast is proposed only where it touches both land and water, and open water does not directly meet inland terrain such as mountains without coast between them where a coast hex is available.
5. **Given** surrounding hexes that carry custom, GM-named terrain, **When** a region is generated, **Then** those hexes are respected as fixed neighbours and the proposal neither copies nor replaces the custom terrain.

---

### User Story 3 - Same seed, same landscape (Priority: P1)

Every proposal has a seed that the GM can see. Generating again with the same seed, the same area and the same surrounding terrain gives the same result. Reroll gives a new seed and a different result.

**Why this priority**: Repeatability is what lets a GM share a seed, return to a result they liked, and trust that growing the map later will not quietly contradict what is already there. It also makes the feature testable.

**Independent Test**: Generate twice with the same seed and inputs and compare; reroll and confirm a new seed and a changed proposal; type a seed and confirm the matching result.

**Acceptance Scenarios**:

1. **Given** a seed, an area and unchanged surrounding terrain, **When** the region is generated twice, **Then** both proposals are identical hex for hex.
2. **Given** a proposal on screen, **When** the GM rerolls, **Then** a new seed is shown and a new proposal replaces the old one, still without saving anything.
3. **Given** a proposal on screen, **When** the GM enters a seed of their own, **Then** the proposal for that seed is shown.
4. **Given** the same seed used on two devices with the same map, **When** each generates the same area, **Then** both get the same proposal.

---

### User Story 4 - Grow the map outward from a hex (Priority: P2)

During prep or at the table, the GM picks one hex and chooses to grow from it. The feature proposes terrain for that hex, if it is empty, and for its still-empty neighbours. Repeating this step by step extends the known world a little at a time.

**Why this priority**: This suits GMs who build the map as play moves outward. It reuses everything in Stories 1 to 3 with a different way of choosing the hexes.

**Independent Test**: Pick a hex with a mix of empty and filled neighbours, grow from it, and confirm that only the empty hexes receive proposals and that repeated growth never alters hexes saved in earlier passes.

**Acceptance Scenarios**:

1. **Given** a hex with some empty neighbours, **When** the GM grows from it, **Then** terrain is proposed only for the hex itself, if empty, and its empty neighbours.
2. **Given** terrain accepted in an earlier pass, **When** the GM grows from an adjacent hex, **Then** the earlier hexes are unchanged and the new proposal is consistent with them at the shared edge.
3. **Given** a hex whose neighbours all have terrain, **When** the GM chooses to grow from it, **Then** the GM is told there is nothing to generate and nothing changes.
4. **Given** a hex at the edge of the map, **When** the GM grows from it, **Then** no terrain is proposed outside the map.

---

### User Story 5 - Fill the gaps between established areas (Priority: P2)

A GM has detailed two or three areas and left holes between them. Fill Gaps proposes terrain only for the empty hexes that lie between established terrain, joining the areas into one landscape.

**Why this priority**: It closes a common prep problem with one action. It depends on the same generator and review flow as the earlier stories.

**Independent Test**: On a map with two terrain areas separated by empty hexes, plus empty hexes far from both, run Fill Gaps and confirm proposals appear only in the enclosed or bridging gaps.

**Acceptance Scenarios**:

1. **Given** two established areas separated by a strip of empty hexes up to 4 wide, **When** the GM runs Fill Gaps, **Then** proposals appear for the hexes between them and blend from one area's terrain into the other's.
2. **Given** two established areas separated by a strip more than 4 hexes wide, **When** the GM runs Fill Gaps, **Then** the strip receives no proposal.
3. **Given** empty hexes completely surrounded by established terrain, **When** the GM runs Fill Gaps, **Then** every one of them receives a proposal, whatever the size of the hole.
4. **Given** empty hexes that are not between established areas, **When** the GM runs Fill Gaps, **Then** those hexes receive no proposal.
5. **Given** a map with no gaps, **When** the GM runs Fill Gaps, **Then** the GM is told there is nothing to fill and nothing changes.

---

### User Story 6 - Adjust a proposal and regenerate generated terrain safely (Priority: P2)

Before accepting, the GM can change individual proposed hexes to the terrain they want. Later, the GM can select terrain that was generated earlier and ask to regenerate it. A preview shows exactly which hexes would change. Terrain set by hand is never replaced.

**Why this priority**: Adjustment makes a nearly-right proposal usable without starting over. Regeneration lets the GM change their mind. Both carry risk to existing work, so they follow the simpler flows.

**Independent Test**: Change one hex in a proposal and accept; then select a mix of generated and hand-set hexes, regenerate, and confirm only the generated ones are offered for change and the impact is stated before anything is saved.

**Acceptance Scenarios**:

1. **Given** a proposal on screen, **When** the GM changes one proposed hex to another terrain and accepts, **Then** that hex is saved with the GM's choice and is from then on treated as hand-set.
2. **Given** an area containing generated and hand-set terrain, **When** the GM chooses to regenerate, **Then** only the generated hexes are included, and the preview states how many hexes would change and how many are protected.
3. **Given** a regeneration preview, **When** the GM cancels, **Then** the existing generated terrain is untouched.
4. **Given** a hex with generated terrain, **When** the GM edits its terrain by hand in the normal way, **Then** it becomes hand-set and later regeneration leaves it alone.
5. **Given** a generated hex that has notes, a pin, an Explored flag or a discovery, **When** it is regenerated and accepted, **Then** only its terrain changes and all of those are kept.
6. **Given** a regeneration that covers generated hexes the party has explored, **When** the preview opens, **Then** it states how many explored hexes would change and those hexes are marked on the map.

---

### User Story 7 - Works with AI off, on any device (Priority: P1)

A GM who has turned AI off, or who is offline, can use Generate Region in full. The review screen says plainly that no AI is used. On a phone, the GM can select the area, review the proposal and accept or cancel with touch alone.

**Why this priority**: Local-first operation is a standing promise of the product and an explicit acceptance point of the issue. If it failed, a large group of GMs could not use the feature at all.

**Independent Test**: With AI disabled and the network disconnected, run each operation end to end; repeat on a phone-sized screen using touch only.

**Acceptance Scenarios**:

1. **Given** AI is turned off, **When** the GM generates, reviews and accepts a region, **Then** everything works and no network request is made.
2. **Given** the review is open, **When** the GM looks at it, **Then** it states that the terrain is generated on the device without AI.
3. **Given** a phone-sized screen, **When** the GM selects an area, reviews and accepts, **Then** every control is reachable and usable by touch, and the proposal on the map is not hidden by the review controls.

---

### Edge Cases

- **Nothing to generate**: the selection holds no empty hexes (or, for regeneration, no generated hexes). The GM is told so; no proposal opens.
- **Radius out of range**: the radius can only be set from 1 to 12, which is at most 469 hexes. A request outside that range, or one that would cover more than 469 hexes, is refused with a clear message before any work is done.
- **Hex Crawl is off, or the map has no hex grid**: Generate Region is not offered.
- **Map edge**: hexes outside the map are never proposed and are not treated as neighbours.
- **Custom terrain neighbours**: GM-named terrain counts as fixed and is respected, but the generator only ever proposes terrain from the standard set.
- **Map changes while a proposal is open**: if a hex in the proposal gains terrain or other content before the GM accepts (for example through sync from another device), that hex is dropped from the proposal on accept and the GM is told how many were skipped. Existing data wins.
- **Leaving with a proposal open**: closing the map, switching maps or reloading discards the proposal. Nothing is saved.
- **Guest and shared views**: proposals are visible only to the GM working on them. Players and guests see terrain only after it is accepted, under the existing visibility rules.
- **Read-only maps**: where the GM cannot edit the map, Generate Region is unavailable.
- **Older maps and older app versions**: a map without any generation information opens and behaves as before. Terrain without provenance is treated as hand-set, so it is always protected.
- **Fog and journey**: generating terrain never reveals, explores or hides a hex, and never moves or alters a journey.
- **Solo travel**: terrain is never generated automatically while a party travels; generation happens only when the GM asks for it.

## Requirements _(mandatory)_

### Functional Requirements

**Availability and operations**

- **FR-001**: Generate Region MUST be offered only on maps that have Hex Crawl turned on and that the user can edit.
- **FR-002**: The GM MUST be able to **generate a selected area**: choose a centre hex and a radius of 1 to 12 hexes, and have terrain proposed for the empty hexes within that distance of the centre. The number of hexes the radius covers MUST be shown before generating.
- **FR-003**: The GM MUST be able to **grow from a hex**: propose terrain for the chosen hex, if empty, and its empty neighbours.
- **FR-004**: The GM MUST be able to **fill gaps** within a chosen centre hex and radius: propose terrain only for gap hexes. A gap hex is an empty hex that is either (a) enclosed, meaning it cannot be reached from outside the established terrain through empty hexes, or (b) in a narrow corridor, meaning that along a straight line of hexes the unbroken run of empty hexes containing it is at most 4 long and has established terrain at both ends. Empty hexes that are neither MUST be left alone.
- **FR-005**: Each operation MUST refuse, with a clear message and no change, when there is nothing eligible to generate or when the request exceeds the size limit.
- **FR-006**: Terrain MUST never be proposed for a position outside the map.

**Coherence**

- **FR-007**: Proposed terrain MUST be produced as one landscape for the whole request, taking account of neighbouring hexes, so that like terrain forms patches and adjoining terrain follows plausible transitions.
- **FR-008**: Existing terrain around and within the request MUST be treated as fixed, and the proposal MUST be consistent with it where they meet.
- **FR-009**: Coast MUST be proposed only where it borders both land and water. At the rim of a request, a neighbouring hex that is still empty or lies off the map counts as able to become either, so a coast there is allowed when later generation can still complete it.
- **FR-009a**: Mountains MUST be proposed only beside hills or other mountains, with a still-empty or off-map neighbour counting in the same way as for coast.
- **FR-010**: The GM MUST be able to choose a landscape preset for a request (at least Temperate, Coastal, Highlands, Arid and Frozen), with Temperate as the default so that no setup is needed. An optional Customise section MUST let the GM set each standard terrain to None, Less, Normal or More, starting from the chosen preset.
- **FR-010a**: A terrain set to None MUST NOT be proposed. Existing hexes with that terrain are still respected as fixed neighbours. If the settings leave no terrain that can be proposed, the request MUST be refused with a clear message.
- **FR-010b**: Changing the preset or a terrain level while a proposal is open MUST produce a new proposal with the same seed, still without saving anything.
- **FR-011**: The generator MUST propose only terrain from the standard terrain set; GM-named terrain is respected as a fixed neighbour but never proposed.
- **FR-012**: The rules that shape the landscape MUST be documented in plain language as tunable guidelines, with no claim to simulate climate or geology.

**Repeatability**

- **FR-013**: Every proposal MUST have a seed that is shown to the GM and can be copied.
- **FR-014**: The same seed, operation, area, settings and surrounding terrain MUST always produce the same proposal, on any device.
- **FR-015**: The GM MUST be able to reroll (new seed, new proposal) and to enter a seed of their own.
- **FR-016**: Growing or filling in several passes MUST never change hexes saved in an earlier pass.

**Protection of existing work**

- **FR-017**: Generation MUST NOT change hand-set terrain, notes, AI notes, pins, fog, Seen / Explored state, discoveries, drafts, journey progress or linked entities.
- **FR-018**: By default, hexes that already have terrain, whether hand-set or generated, MUST be excluded from a proposal.
- **FR-019**: The GM MUST be able to explicitly regenerate selected terrain; this MUST affect only hexes whose terrain was generated and has not since been edited by hand.
- **FR-020**: Before a regeneration is saved, the GM MUST be shown which hexes would change and how many selected hexes are protected.
- **FR-020a**: Explored hexes with generated terrain MAY be regenerated. The regeneration preview MUST state how many explored hexes would change and MUST mark those hexes on the map, so the GM can adjust them back or cancel. Their Explored state, notes and discoveries are kept as for any other hex.
- **FR-021**: Terrain with no generation provenance MUST be treated as hand-set.
- **FR-022**: Editing a generated hex's terrain by hand, in the proposal or afterwards, MUST make it hand-set.

**Review and save**

- **FR-023**: Every operation MUST show a preview on the map before anything is saved, with proposed terrain visibly distinct from saved terrain and readable without a base map image.
- **FR-024**: From the preview the GM MUST be able to accept, adjust individual hexes, reroll or cancel.
- **FR-025**: Cancelling, or leaving the map, MUST discard the proposal and leave the map exactly as it was.
- **FR-026**: Accepting MUST save the whole proposal or none of it. If saving fails, no part is applied, the GM is told the map is unchanged, and the proposal stays available.
- **FR-027**: If a proposed hex has gained content since the proposal was made, accepting MUST skip that hex, keep the existing content and tell the GM how many hexes were skipped.
- **FR-028**: A proposal MUST be visible only to the GM who is reviewing it; other viewers see terrain only once it is accepted.
- **FR-028a**: Immediately after a region is accepted, the GM MUST be offered a one-step undo that restores every affected hex to exactly how it was before accepting, including any generated terrain that a regeneration replaced. The undo MUST apply to all of those hexes or none.
- **FR-028b**: The undo MUST stop being offered once the GM makes any further change to the map's hex data (terrain, notes, exploration, discoveries or another region), leaves the map or reloads. Changes that cannot affect the restored hexes, such as moving a pin or editing fog, do not withdraw it. It MUST NOT overwrite a hex that has changed since the region was accepted; if any affected hex has changed, the undo is withdrawn.

**Persistence**

- **FR-029**: Accepted terrain MUST be saved as ordinary hex terrain, so that every existing feature that reads terrain (display, discovery tables, journey) works with it unchanged.
- **FR-030**: Each generated hex MUST keep minimal provenance: that it was generated, the seed, and the version of the generation rules used.
- **FR-031**: Accepted terrain and its provenance MUST survive closing and reopening, backup and restore, export and import, and sync between devices.
- **FR-032**: Only hexes that have content MUST be stored; generating a region MUST NOT create records for hexes left empty.
- **FR-033**: Maps saved before this feature MUST open and behave as before, with no migration step required of the user.
- **FR-034**: Provenance MUST follow the same sharing rules as other GM-only hex data and MUST NOT be exposed to guests.

**Local operation and access**

- **FR-035**: All generation MUST run on the user's device, with AI turned off, with no network request.
- **FR-036**: The review MUST state plainly that the terrain is generated on the device without AI.
- **FR-037**: Selection, review, adjust, reroll, accept and cancel MUST be fully usable on a phone-sized screen with touch, and by keyboard on desktop. Adjusting a proposed hex MUST be possible without a pointer, by entering the hex's label.
- **FR-038**: Terrain MUST NOT be generated automatically at any time, including during solo travel; it is generated only on the GM's explicit request.

**Help**

- **FR-039**: The in-app help for Hex Crawl MUST explain Generate Region, the three operations, the seed, what is protected, and how to regenerate.

### Key Entities

- **Generation request**: what the GM asked for. The operation (selected area, grow from hex, fill gaps or regenerate), the hexes it covers, the seed, and the terrain likelihood settings.
- **Region proposal**: the unsaved result of a request. A set of hexes with proposed terrain, the seed and settings that produced it, any adjustments the GM made, and, for regeneration, which existing hexes would change. It exists only while being reviewed.
- **Hex terrain (existing)**: the terrain saved on a hex. Accepted proposals become ordinary hex terrain.
- **Generation provenance**: a small optional marker on a hex recording that its terrain was generated, with the seed and rules version. Its absence means the terrain was set by hand.
- **Terrain settings**: the landscape preset chosen for a request and any per-terrain level (None, Less, Normal, More) the GM set on top of it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A GM can fill a 50-hex area with reviewed terrain in under one minute, compared with setting each hex by hand.
- **SC-002**: A proposal for the largest allowed region appears within two seconds on a typical phone.
- **SC-003**: In 100% of repeated runs with the same seed and inputs, the proposals are identical.
- **SC-004**: Across the reference set of seeded layouts, at least 80% of generated hexes share terrain with at least one neighbour, and no proposal breaks a stated continuity rule (coast placement, mountains beside high ground, fit with fixed neighbours).
- **SC-005**: In 100% of tested cases, cancelling, a failed save or leaving the map leaves every hex and all related data unchanged, and undoing an accepted region returns the map to its exact state before accepting.
- **SC-006**: In 100% of tested cases, hand-set terrain, notes, pins, exploration state, discoveries and journey progress are identical before and after generation and regeneration.
- **SC-007**: Accepted terrain and its provenance are identical after reopen, after export and restore, and after sync to a second device.
- **SC-008**: Every operation completes with AI turned off and the network disconnected, with zero network requests.
- **SC-009**: Every step of select, review and accept can be completed on a 360-pixel-wide screen with touch alone.
- **SC-010**: Maps created before the feature open with no change in content or behaviour.

## Assumptions

- **Standard terrain only**: the generator works with the nine existing standard terrains (plains, forest, hills, mountains, swamp, desert, water, coast, tundra). The issue names plains, forests, hills, mountains and coasts as the continuity it cares most about; the others take part with simpler rules.
- **Size limit**: the largest selected area is radius 12, which is 469 hexes. Fill Gaps and regeneration are held to the same ceiling of 469 hexes per request, enough for a regional map while keeping the preview fast on a phone.
- **Area selection**: an area is a centre hex plus a radius, using the map's existing single-hex selection. Free-form painted shapes are not part of this feature.
- **Fill Gaps scope**: Fill Gaps works inside a centre hex and radius like the selected-area operation, and uses the gap rule in FR-004. Open country beside a single area is not a gap; Grow from hex covers that.
- **Adjusted hexes are hand-set**: a hex the GM changes in the preview is saved without generation provenance, so it is protected from later regeneration.
- **Provenance is per hex and minimal**: no per-region record or history of past generations is kept. Regeneration works from the hexes themselves.
- **Undo is one step only**: the undo covers the most recent accepted region and nothing earlier. There is no undo history, and no separate operation to clear generated terrain later; after the undo expires, the GM regenerates or edits by hand.
- **Fixed rules version**: if the landscape rules change in a later release, existing saved terrain is not altered. The stored rules version only explains why an old seed may give a different result under newer rules.
- **Seed and settings together**: a seed reproduces a landscape only with the same preset and terrain levels. Those settings are shown beside the seed in the review; they are not stored on each hex. The last seed and settings used on a map are remembered on that device, so that growing the map in several passes continues the same landscape by default.
- **Proposals are not synced**: a proposal lives only on the device and in the session where it is being reviewed.
- **Design principles only**: the approach is inspired by published hex-geography guidance (PBE Games, "Ground Rules"). No table content, wording or code from that source is used.

## Out of Scope

- Rivers, roads and settlement networks (#4660).
- Climate, rainfall, elevation or hydrology simulation.
- Creating or assigning biome profiles (#4289, #4290).
- Drawing or changing an illustrated map image.
- Stocking generated hexes with encounters, sites or other content.
- Automatic generation during solo travel or any other hidden generation.
- AI-assisted terrain generation.

## Dependencies

- The existing Hex Crawl feature (#1957, including #4147 and #4148): hex records, terrain set, selection and overlay, and the map save, sync, backup and export paths.
- Delivered independently of later phases (2 and 3) of this follow-up work.
