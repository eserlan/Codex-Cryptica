# Majcher Geomorphs 2013

The built-in **Geomorphs 2013** starter deck is the full set of 600×600 dungeon
geomorph tiles by [Majcher Arcana](https://majcher.itch.io/geomorphs-2013),
released under CC BY 4.0.

The distribution copy is stored in Cloudflare R2, not bundled in the web
build. It is published at:

`starter-tile-decks/majcher-geomorphs-2013/`

The manifest contains all 400 "full" geomorph tiles (`full_0001.png` through
`full_0400.png`) from the pack's `Full 1-100`..`Full 301-400` sets. The
pack's older, smaller "Geomorphs 20131" component-piece set is intentionally
not included — it looks superseded by the cleaner, complete 400-tile set.

When a user chooses **Add Geomorphs 2013 starter deck**, the app fetches
these objects once and imports them into the active local vault. All later
random draws use those vault files and work offline.

Unlike the CC0 Kenney pack, this license requires attribution — the exact
text is retained in [LICENSE.txt](./LICENSE.txt).
