# Kenney Scribble Dungeons

The built-in **Scribble Dungeons** starter deck is curated from the official
[Scribble Dungeons pack](https://kenney.nl/assets/scribble-dungeons) by Kenney.
The upstream pack contains 256 64×64 PNG sprites and is released under CC0 1.0.

The distribution copy is intentionally stored in Cloudflare R2, not bundled in
the web build. It is published at:

`starter-tile-decks/kenney-scribble-dungeons/`

The manifest contains all 136 unique transparent 64×64 PNG sprites from the
pack, including dungeon construction tiles, props, characters, and items. The
upstream archive also contains the same sprites at 128×128; those duplicate
resolution variants are deliberately not fetched into the deck. When a user
chooses **Add Scribble Dungeons starter deck**, the app fetches the 64×64
objects once and imports them into the active local vault. All later random
draws use those vault files and work offline.

The exact upstream license text is retained in [LICENSE.txt](./LICENSE.txt).
