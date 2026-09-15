---
description: Switch to staging, pull latest origin/staging, clean up merged local feature branches, and report status.
---

# Pull Staging Workflow

Execute the following steps using bash commands:

1. **Check Status**: Run `git status` to ensure working directory is clean. If there are uncommitted changes, inform the user and do not switch branches.
2. **Record Branch**: Check the current branch with `git branch --show-current`.
3. **Switch to Staging**: Run `git checkout staging`.
4. **Pull Latest Staging**: Run `git pull origin staging`.
5. **Clean Up Branch**: If the previously active branch was not `staging` or `main`, check if it was merged. If merged, delete the local branch with `git branch -d <branch_name>`.
6. **Summary**: Output a concise summary displaying:
   - Current commit hash and title on `staging`
   - Cleaned up local branch name (if any)
