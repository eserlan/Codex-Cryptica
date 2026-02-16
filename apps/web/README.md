# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --no-install ./
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Help & Documentation

Help articles are managed as Markdown files in `src/lib/content/help/`.
To add a new article:

1. Create a `.md` file in that directory.
2. Add frontmatter:
   ```yaml
   ---
   id: unique-id
   title: Article Title
   tags: [tag1, tag2]
   rank: 10
   ---
   ```
3. Write content in Markdown.

### Article Sorting (Rank)

The `rank` field in the frontmatter determines the order of articles in the help system.

- Articles are sorted by `rank` (ascending), then by `title`.
- Use spaced values (e.g., 10, 20, 30) to allow for future insertions without renumbering all articles.
- If `rank` is missing, the article defaults to the end of the list.

4. Verify by running `npm test`.
