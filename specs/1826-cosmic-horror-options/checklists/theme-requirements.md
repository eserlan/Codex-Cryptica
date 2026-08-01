# Specification Quality Checklist: New Theme Creation

**Purpose**: Assess whether a proposed visual, generator, or hub theme is specified clearly enough to avoid hidden genre fallbacks.
**Created**: 2026-08-01
**Feature**: [Cosmic Horror generator options](../spec.md)

**Note**: This checklist evaluates the written requirements, not the implementation.

## Requirement Completeness

- [ ] CHK001 Are the theme key, public label, and intended scope (visual-only, generator genre, or public hub) defined? [Gap]
- [ ] CHK002 Are all generator cards promised by the hub enumerated, including optional cards such as names, news sheets, and language? [Gap]
- [ ] CHK003 Are dedicated option and vocabulary requirements defined for every promised generator card? [Gap]
- [ ] CHK004 Are visual requirements defined for both appearance variants, including contrast, typography, graph style, and art direction? [Gap]

## Requirement Clarity

- [ ] CHK005 Is “dedicated theme support” defined so it rules out an undocumented nearest-genre fallback? [Ambiguity]
- [ ] CHK006 Are the selector labels, default selections, hub slug, and stored visual-theme identifier specified without relying on similar names? [Gap]
- [ ] CHK007 Are the terms “appropriate options” and “genre-specific vocabulary” illustrated with required option categories or examples? [Ambiguity]

## Requirement Consistency

- [ ] CHK008 Are the hub's advertised cards consistent with the generators that the requirements say have dedicated support? [Gap]
- [ ] CHK009 Are direct-link and hub-origin default-selection requirements consistent for every generator? [Gap]
- [ ] CHK010 Are visual-theme and generator-genre naming requirements consistent where their identifiers intentionally differ? [Gap]

## Acceptance Criteria Quality

- [ ] CHK011 Do the acceptance criteria objectively identify the default option required for each generator? [Gap]
- [ ] CHK012 Do the acceptance criteria make the absence of a fallback to Fantasy, Gothic Horror, or another related theme measurable? [Gap]
- [ ] CHK013 Are the required test boundaries stated for both dedicated data and an unrelated-genre negative case? [Gap]

## Scenario and Edge-Case Coverage

- [ ] CHK014 Are requirements defined for a visitor entering from the hub and for one opening a generator directly? [Gap]
- [ ] CHK015 Are requirements defined for a generator that cannot support the proposed theme, including whether its hub card is removed or its fallback is disclosed? [Gap]
- [ ] CHK016 Are requirements defined for light and dark/system appearance selection on public generator pages? [Gap]
- [ ] CHK017 Are requirements defined for adding a new selector theme later, so coverage cannot silently regress? [Gap]

## Dependencies and Assumptions

- [ ] CHK018 Are the affected mapping tables, generator contracts, and public discovery surfaces identified as dependencies? [Gap]
- [ ] CHK019 Is the assumption that local/offline and AI-assisted generation share the same theme vocabulary documented? [Assumption]
- [ ] CHK020 Is the decision about whether a new theme needs a public hub explicitly recorded? [Gap]
