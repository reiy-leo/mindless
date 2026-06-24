---
description: Stage and commit all current changes with a conventional commit message.
---

# Git Commit All Changes

Stage all modified and new files, create a commit with a concise message summarizing the changes.

## Steps

### 1. Gather context (parallel)

```bash
git status
git diff --stat && echo "---STAGED---" && git diff --cached --stat
git log --oneline -5
```

### 2. Analyze changes

From the diff output, identify:
- What changed (new features, bug fixes, refactors, style changes)
- Which files are new vs modified
- The scope of changes (single feature, multiple features, cleanup)

### 3. Draft commit message

Follow conventional commit format: `type(scope): description`

Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`

Keep the message concise (1-2 sentences). Focus on **why** not **what**.

### 4. Stage and commit

```bash
git add <all source files>
git commit -m "<message>"
```

Exclude files that likely contain secrets (.env, credentials.json, etc.). Warn the user if such files are present.

### 5. Verify

```bash
git status
```

Confirm the commit succeeded and the working tree is clean (except for untracked files that shouldn't be committed).

### 6. Report

Return:
- Commit SHA and message
- Number of files changed
- Any remaining untracked files
