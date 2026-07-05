# Codex Workspace Notes

This directory is the dedicated GitHub Pages workspace for:

`https://github.com/Asmallhamis/BURST_8-DIVIDE_10-DIVIDE_3-ADD_TRIGGER-DIVIDE_4-DIVIDE_2-TAU-FLY_DOWNWARDS`

Use this folder for all future GitHub Pages edits and pushes.

## Repository Boundary

- Remote `origin` must be the GitHub repository above.
- Local `main` must track `origin/main`.
- Push GitHub Pages changes with `git push origin main`.
- Do not add or use the CNB remote here.
- Do not use the older mixed workspace at `E:\download\newapi\cc\BURST_8-DIVIDE_10-DIVIDE_3-ADD_TRIGGER-DIVIDE_4-DIVIDE_2-TAU-FLY_DOWNWARDS` for GitHub Pages pushes.
- Do not use `E:\download\newapi\cc\github-pages-push-tmp` for normal work; it was only a temporary rescue worktree.

## Before Editing

- Run `git status --short --branch` and confirm it says `main...origin/main`.
- Run `git remote -v` and confirm `origin` points to GitHub.
- If either check fails, stop and fix the repo state before editing.

## Commit Discipline

- Stage only files needed for the current task.
- Do not stage logs, caches, local server output, temp notes, or CNB artifacts.
- Keep GitHub Pages data and assets together with code that references them; for example, if `app.js` points at `data13/` or new spell icons, those files must be committed too.

## Verification

- For JavaScript changes, run `node --check app.js`.
- For UI/data changes, start a local static server from this directory and test the page before pushing.
