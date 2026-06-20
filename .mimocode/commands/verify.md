---
description: Run the full verification pipeline (Rust check + TypeScript check + Vite build) to confirm no regressions after code changes.
---

# Verify Build

Run the three-stage verification pipeline for the Mindless Tauri+React app. Execute stages sequentially; stop on first failure.

## Stage 1: Rust Compilation

```bash
cd src-tauri && cargo check 2>&1
```

If this fails, fix Rust errors before proceeding.

## Stage 2: TypeScript Type Check

```bash
npx tsc --noEmit 2>&1
```

If this fails, fix TypeScript errors before proceeding.

## Stage 3: Frontend Build

```bash
npm run build 2>&1
```

If this fails, fix Vite/build errors before proceeding.

## Report

After all three stages pass, report:
- ✅ Rust: `cargo check` passed
- ✅ TypeScript: `npx tsc --noEmit` passed
- ✅ Build: `npm run build` passed

If any stage failed, report the error summary and the files that need fixing.
