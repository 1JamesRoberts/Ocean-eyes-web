---
name: git-add-commit-push
description: 'Use when: staging files, creating commits, pushing to remote, or running any git write command. Handles the Windows git auto-gc "n/n/n/n" prompt problem by setting GIT_ASK_YESNO=false.'
---

# Git Add / Commit / Push

## Problem: Windows git auto-gc prompts

After `git commit`, `git pull --rebase`, or any write operation, git may run automatic garbage collection which fails to delete `.git/objects/XX/` directories (locked by Windows file indexing). This produces an endless stream of prompts:

```
Deletion of directory '.git/objects/00' failed. Should I try again? (y/n)
```

Answering **"n"** to all of them is tedious.

## Solution: `GIT_ASK_YESNO=false`

Set this environment variable **before** running any git command. It makes git automatically answer "no" to all prompts without blocking the terminal.

### One-liner

```powershell
$env:GIT_ASK_YESNO='false'; git add . ; git commit -m "message" ; git push
```

### For multi-step workflows (preferred)

```powershell
$env:GIT_ASK_YESNO='false'
git add .
git commit -m "feat: my change"
git push
```

The variable only affects the current PowerShell session — no global side effects.

## Procedure

1. **Check status**
   ```powershell
   git status --short
   ```

2. **Stage files** — if many files changed, consider using a subagent to batch the work
   ```powershell
   $env:GIT_ASK_YESNO='false'
   git add <files or .>
   ```

3. **Commit** — generate the commit message yourself based on the diff; do not ask the user
   ```powershell
   git commit -m "type(scope): description"
   ```

4. **Pull & rebase** (if push is rejected)
   ```powershell
   git fetch
   git rebase origin/main
   ```

5. **Push**
   ```powershell
   git push
   ```

If `git push` is rejected due to non-fast-forward, rebase first (step 4), then push again.

## Common Mistakes

- **Forgetting `GIT_ASK_YESNO`** — you'll get the endless "n/n/n/n" prompts again. Always set it before any git write command.
- **Setting it after `git add`** — doesn't help. Set it **before** the command that triggers gc (usually `commit` or `pull --rebase`).
- **Using `git pull` without `--rebase`** — creates merge commits. Prefer `git pull --rebase` or `git fetch` + `git rebase`.
- **Running git in a different shell** — `$env:GIT_ASK_YESNO` is session-scoped. Each new terminal needs it set again.
