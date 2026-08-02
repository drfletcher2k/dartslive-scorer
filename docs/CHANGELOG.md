# Changelog

Reverse-chronological. Newest entry at the top.

## 2026-08-02 — Consolidated into `C:\ai\`, both unique commits recovered

- **Copied** (not moved) from the authoritative live instance
  `Y:\ClaudeCentral\dartslive-scorer` to `C:\ai\dartslive-scorer`. The production Windows
  service was left untouched and running. `node_modules/` and `logs/` excluded — 52 of 674 files.
- **Recovered a commit that had been stranded since July.** `ec5bd1b`
  ("Track package-lock.json and ignore logs/") was committed on 2026-07-26 by the prior effort
  and deliberately left unpushed pending a decision that was never given. It is now on
  `origin/main` — 0 ahead / 0 behind.
- **Recovered a commit stranded since May.** The Office copy held `0b78e06` ("fffff") on
  `claude/ble-scanner-phase-1`, one commit ahead of origin's version of that branch and present
  nowhere else. Preserved as `salvage/machineA-2026-08-02` and pushed, rather than
  force-updating origin's existing branch.
- Verified afterwards that **zero local-only commits remain** across either copy.
- Confirmed no secrets are tracked: `.env`, `certs/cert.pem` and `certs/key.pem` all exist on
  disk and are all gitignored (`git check-ignore` verified; `git ls-files` shows none tracked).
  This matters because **the repository is public**.
- Office copy at `C:\projects\applications\dartslive-scorer` moved to
  `C:\ai\_quarantine\machineA\dartslive-scorer` after its unique commit was safely on origin.
- Added `docs/PROJECT.md`, this changelog, and `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`.
- No application code was modified.

## 2026-07-26 — Prior effort, DR-02

- Kitchen's `ClaudeCentral` copy confirmed as authoritative live production. Its dirty working
  tree committed as `ec5bd1b`. **Not pushed** — flagged as an open question.
- The scheduled-task/service target question was left unresolved: Kitchen's service
  configuration cannot be queried from Office (Access Denied, no WinRM). Still unresolved.

## 2026-06-12 — Office copy last touched

- `a82698c` on `claude/increase-cricket-chip-font-size` — already present on origin.

## 2026-05-17 — Stranded commit

- `0b78e06` ("fffff") committed on `claude/ble-scanner-phase-1` in the Office copy. Never
  pushed until 2026-08-02.
