# Pull Request Labeling

Pull requests in this repository are labeled automatically by `.github/workflows/labeler.yml`.

The labeler reads two things:

- the PR title
- the files changed in the PR

The goal is to keep labels aligned with the same gitmoji-style language used in commit messages and release notes.

## Label mapping

- `enhancement`
  - PR titles that indicate a feature, such as `✨ feat(...)` or `🚀 feat(...)`
- `bug`
  - PR titles that indicate a fix, such as `🐛 fix(...)`, `🩹 fix(...)`, or `🔒 fix(...)`
- `documentation`
  - PR titles that mention docs, such as `📚 docs(...)`
- `improvement`
  - polish, accessibility, refactor, performance, chore, or test work
- `dependencies`
  - dependency updates, including `build(deps)` titles and lockfile changes
- `github_actions`
  - changes under `.github/**`

## Notes

- The labeler is semantic, not path-area based.
- If a PR title is ambiguous, the file changes are used as a fallback for dependency and GitHub Actions updates.
- The release changelog categories use the same labels, so a well-labeled PR also produces cleaner release notes.

## Examples

- `✨ feat(graph): open zen mode on node double click` -> `enhancement`
- `🩹 fix(p2p): share theme and images in guest mode` -> `bug`
- `📚 docs: update labeling guide` -> `documentation`
- `🎨 Palette: Add ARIA labels to main action buttons` -> `improvement`
- `build(deps): bump the dependencies group` -> `dependencies`
