# [r/codexcryptica] Updates from the Solo Dev: v0.19.0 to v0.25.1 (Playable Tabletop, Custom Art Direction, & Interface Upgrades)

Hey everyone, solo dev of Codex Cryptica here!

I’ve been working hard over the last few weeks to polish the app and add features you’ve been asking for. My goal is to make Codex Cryptica the best place to build, manage, and play your campaigns.

Here is a chronological look at the latest user-facing changes I've rolled out, starting from **v0.19.0** up to today's **v0.25.1** release!

---

### 🔍 v0.19.0: Custom Workspaces & Aliases

- **Aliases for Characters & Locations:** You can now add multiple names, titles, or pseudonyms to your characters and locations (e.g., "Mithrandir" for Gandalf). This makes cross-referencing and search much more natural.
- **Resizable Workspace:** I've made the sidebars resizable! You can now drag and scale the panels to customize the interface for whatever size screen or workflow you prefer.
- **Better Label Filtering:** You can now filter your campaign explorer by multiple labels simultaneously to find exactly the collection of lore you're looking for.

---

### 🎨 v0.20.0: Color-Coded Graphs & Compact Zen Mode

- **Themed Graph Nodes:** The relationship map is now color-coded by category (Characters, Locations, Items, etc.), making it much easier to visually group and read your campaign graph at a glance.
- **Unified Image Lightbox:** I added a dedicated media viewer. Clicking on any character or location art now pops it up in a clean lightbox.
- **Streamlined Zen Writing Mode:** Zen writing mode is now more compact to maximize screen space for your actual notes and descriptions.

---

### 📱 v0.21.0: Mobile Controls & Vault Stats

- **Mobile-Optimized Graph Controls:** I collapsed the relationship graph controls into a compact menu for mobile devices, so you can explore your campaign map on your phone without the interface getting in the way.
- **Campaign Entity Count:** The vault selector now displays the exact number of entities stored in each campaign, so you know exactly how large each campaign has grown.

---

### 📝 v0.22.0: QuickNote Scratchpad

- **QuickNote (Ctrl+I / Cmd+I):** I built a global scratchpad. Wherever you are in the app, hit `Ctrl+I` to bring up a notepad, dump your raw thoughts, and close it.
- **Turn Notes into Entities:** You can instantly convert any raw scratchpad note into a fully formatted character, location, faction, item, or event with one click.

---

### 🌀 v0.23.0: State Persistence & Tactile Animations

- **State Persistence (Never Lose Your Place):** Restores your workspace exactly as you left it! Codex Cryptica now remembers which sidebars you had open, which tools were active, which entity you were looking at, and your Zen mode progress per vault.
- **Tactile Transitions:** The details panel now expands and scales directly from the node or search item you click on, complete with smooth cross-fades and a glowing ripple effect when selecting nodes on the map.

---

### 🎭 v0.24.0: Decoupled Chrome & World Themes

- **Stable App Chrome:** I separated the main application interface (headers, settings, navigation) from your campaign's visual theme. Now, the app chrome stays in a clean, highly readable light or dark mode while the campaign content displays the rich genre layout.
- **Automatic Theme Counterparts:** Campaign themes now support light/dark counterparts that switch automatically based on your system appearance.
- **Refined Dark Fantasy Theme:** Added a brand new, custom seamless leather texture (`leather.svg`) to give the **Candlelit Tome** theme a premium, tactile background.

---

### 🔮 v0.25.0: Smart Art Direction

- **Cohesive AI Image Gen:** You can now guide the AI's visual style. Generated images will follow the default composition rules of your campaign theme instead of starting from scratch.
- **Category Guidelines:** Characters, creatures, locations, items, factions, events, and covers now have automatic composition guidelines tailored specifically to what you are drawing.
- **Markdown-Native Control:** Simply add sections like `Art Direction` or `Visual Style` directly inside your markdown notes, and the image generator will automatically use them to guide the drawing.

---

### 🏷️ v0.25.1: Automatic Tagging & Clean Autocomplete

- **Historical Autotagging:** Any entity in your vault that has a historical end date will now be automatically tagged as `"past"`, making it easy to filter historical lore.
- **Smart Search Autocomplete:** When you select a suggestion from search autocomplete, the input clears and the tag is automatically moved into your sidebar filters, letting you keep typing new terms smoothly.

---

Let me know what you think of these updates! I'm constantly working to make the campaign manager better. Drop your feedback, requests, or bug reports in the comments.

Happy worldbuilding! 🖋️🗺️
