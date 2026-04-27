# Workflow Preferences

## Merged Shortcut

When the user says `merged`, assume the current branch work is finished and do the following:

1. Switch to `staging`.
2. Pull the latest `origin/staging`.
3. Delete the old feature branch locally.
4. Delete the old feature branch on the remote if it still exists.

If any of those steps would be unsafe or ambiguous, ask for confirmation before changing branches or deleting refs.
