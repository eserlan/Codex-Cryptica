# `/for` pack fan-language review

Every `/for/...` content pack gets a fan-language review before it ships. A pack
is not done until it has had one. This applies to system pages, genre pages,
campaign-style / use-case pages, and to material expansions of an existing pack.

Origin: #2220 and #2300. The first eight passes (#2292–#2299) were done as
clean-up after feedback; this document makes the pass part of the definition
of done so it doesn't have to be.

## The standard

> **Would an experienced member of this community naturally phrase it this way?**

Not "are these terms related to the system or genre?". A page can use correct,
recognisable terms and still read as outsider-written when they are combined in
ways the community wouldn't say. The goal is natural community language, not
maximum jargon density.

## What to review

The whole pack config in `apps/web/src/lib/content/for/packs/<slug>.ts`:

- `seo` title and description
- `hero` copy and the problem statement
- `useCases` titles and descriptions
- `exampleGraph` node labels and relations
- `recommendedTools` descriptions
- `cta` copy

## Checklist

- [ ] List every system-, genre- or community-specific term in the copy.
- [ ] Check each one is used the way someone who plays, runs, reads or builds in
      this space would use it, in that context.
- [ ] Remove noun stacking and term pairings that are individually valid but not
      idiomatic together.
- [ ] Check the example graph's labels and relations make sense in-world, and
      mechanically where relevant.
- [ ] Keep rules/mechanics terminology distinct from setting/community
      terminology.
- [ ] Don't imply mechanics, rules support, integrations or automation Codex
      Cryptica doesn't provide.
- [ ] Lead with campaign and worldbuilding value; flavour terms support the
      message rather than carry it.
- [ ] Prefer concrete, community-native examples over generic marketing copy.
- [ ] Prefer homebrew-neutral examples unless a canon reference is deliberate
      and useful.
- [ ] Check the page sounds distinct from adjacent packs (e.g. Gothic Horror vs
      Vampire: The Masquerade, Cyberpunk RED vs Dystopian Sci-Fi).
- [ ] British English throughout, except where official terminology differs.
- [ ] Final read as someone arriving from Reddit, Bluesky, search or a fan forum.

## Examples of what the pass catches

From the original Vampire: The Masquerade feedback. These illustrate the kind
of problem, they are not a find/replace list:

| Before                | Why it reads wrong                                                       |
| --------------------- | ------------------------------------------------------------------------ |
| `Primogen member`     | Players say "a Primogen".                                                |
| `Elysium sanctuaries` | Elysium already means that; the pairing is redundant and invented.       |
| `human disguises`     | The community talks about mortal identities, mortal connections, covers. |
| `coterie touchstones` | Touchstones belong to individual Kindred, not the coterie.               |

## Lock it in with a test

Where a pack has a few phrases that define it, or obvious outsider phrasing
to keep out, assert on them in
`apps/web/src/lib/content/for/registry.test.ts`. Use the `ownCopy` helper so
cross-link descriptions in `recommendedTools`, which have to use other pages'
vocabulary, don't trip the check. The West Marches pack is the worked example:
it requires "expedition", "base town" and "roster", and rejects "the party" and
"story arc".

## In the PR

Say in the PR description that the fan-language review was done, and list the
terms you changed or deliberately kept.
