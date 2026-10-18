# Theme/genre selector (optional, public surface only)

Read this when the generator's content should take its flavour from the chosen world theme (fantasy, cyberpunk and so on).

0. **Don't invent new genre or theme strings.** Before adding a genre value, check whether it already exists:
   - `factionConfig.themes` in `public-faction-constants.ts` is the canonical list of 13: `Classic Fantasy`, `Pirate`, `Cyberpunk / Corporate`, `Vampire / Gothic Noir`, `Cosmic Horror`, `Sci-Fi / Space Opera`, `Modern Conspiracy`, `Post-Apocalyptic`, `Western / Frontier`, `Steampunk`, `Lancer`, `Space Opera Resistance`, `Optimistic Exploration Sci-Fi`.
   - Sibling generators have their own lists (e.g. `worldConfig.genres`).

   A generator may use its own shorter vocabulary (world and star-system use `Hard Sci-Fi`, `Space Opera`, `Cyberpunk`, mapped to a theme skin in step 3), but every value should reuse existing terminology. Don't coin a synonym (`"Post-Collapse"` when `"Post-Apocalyptic"` exists), and don't add a genre with no existing counterpart unless the user confirms it is a genuinely new concept. This has shipped and been walked back before. If a value doesn't map cleanly to an existing theme, reuse the closest one or drop it.

1. Add `genre?: string` to the public options interface and use it in the prompt text and the local-fallback flavour text. Default it to `"Classic Fantasy"` in `resolve<Name>()`.

2. In `<Name>FormFields.svelte`, add a `theme` bindable prop and a `SelectWithCustomOption` over `factionConfig.themes`, labelled "Choose a vibe". Copy `QuestFormFields.svelte`'s first field.

3. Page wiring:
   - In the slug's branch of `GeneratorPageFormFields.svelte`, pass `bind:theme={activeTheme}`.
   - Add the theme-sync branch to `syncGeneratorTheme()` in `generator-theme-sync.ts`, and pass the generator's state into it from `GeneratorPageContent.svelte`. Two patterns:
     - **Direct** (dungeon, adventure): `<name>.genre = activeTheme;`. Use when the theme label is the genre value.
     - **Mapped** (quest, world, star-system): `<name>.genre = themeTo<Name>Genre[activeTheme] ?? "Classic Fantasy";`. For a generator with its own genre vocabulary, the mapping goes the other way: `activeTheme = map<Name>GenreToTheme(<name>.genre);`.
   - If the form's field is named `genre` rather than bound as `theme`, add an `on<Name>GenreChange` prop to `GeneratorPageFormFields.svelte` and a handler in `GeneratorPageContent.svelte`, passed to the field's `SelectWithCustomOption`. The handler maps a selected built-in genre to `activeTheme`. A custom free-text genre stays generation input only and keeps the current skin.

4. **Surprise Me must not randomize `genre`.** Genre is the user's choice: Surprise Me re-rolls the other fields only (world and star-system behave this way, so copy them). Only the genre select's own `onvaluechange` may call `onGenreChange`. If a generator has a real product reason to randomize genre, confirm with the user first. In that case the handler must call `onGenreChange?.(genre)` with the new value before or alongside `onSurprise?.()`, or the page skin stays on the old genre. Write a component test asserting `onGenreChange` is **not** called on a Surprise Me click.

5. Add the slug to **both** sets in `generator-theme-maps.ts`. They handle separate concerns, and it's easy to add one and forget the other:
   - Missing from `GENERATOR_SLUGS_WITH_THEME`: picking a theme changes the generated content, but the page's visual skin (`themeStore.worldThemeId`) never re-syncs.
   - Missing from `SLUGS_USING_STORED_THEME`: the theme choice doesn't persist across visits.

6. **Per-theme option pools** (optional; only for fields with genuinely genre-specific values, such as governing-body or location types). Add a `<field>ByTheme: Record<string, string[]>` map to `<name>Config`, mirroring `public-quest.ts`'s `locationTypesByTheme` and `tonesByTheme`:
   - In `resolve<Name>()`, pick from `config.<field>ByTheme[genre] ?? config.<field>`.
   - In the form component, add `const active<Field> = $derived(config.<field>ByTheme[theme] ?? config.<field>)` and use it for the select's `choices` and the Surprise Me pick. Add an `$effect` that resets the value to `active<Field>[0]` only if the current value is a **built-in** option no longer in the active pool (`builtIn<Field>.includes(value) && !active<Field>.includes(value)`). Never reset a custom user-typed value.
   - Only filter genre-flavoured fields. A field like "voting rule" that fits any setting doesn't need a per-theme pool.
