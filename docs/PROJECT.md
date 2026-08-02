# dartslive-scorer

## Purpose

A darts scoring web application, served over HTTPS on the home network, with Bluetooth LE
integration for a connected dartboard and a leaderboard/history feature.

It runs **as a Windows service in production** on the Kitchen machine.

## Stack + versions

Node.js + vanilla browser front end. Docker packaging present.

- `server.js` — the HTTP/HTTPS server
- `scorer.js`, `ble.js`, `add-game.js`, `remove-player.js` — application logic
- `index.html`, `blescanner.html`, `style.css` — the UI
- `package.json` / `package-lock.json` — dependencies (lockfile tracked as of `ec5bd1b`)
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`

## Entrypoint and run command

```bash
npm install
node server.js
```

or via Docker:

```bash
docker compose up
```

In production it is run as a Windows service using **nssm** — the service binary lives in
Kitchen's `ClaudeCentral\tools\`, which the prior migration explicitly flagged as live
infrastructure not to be relocated without checking the service config first.

## Directory map

```
.
├── server.js              # entrypoint
├── scorer.js / ble.js     # scoring + Bluetooth LE
├── add-game.js / remove-player.js
├── index.html / blescanner.html / style.css / logo.png
├── certs/                 # cert.pem + key.pem - GITIGNORED
├── data/                  # history.json - GITIGNORED
├── .env                   # GITIGNORED
├── .env.example           # committed template
├── Dockerfile / docker-compose.yml / .dockerignore
└── docs/
```

52 files here. The live Kitchen copy has 674 — the difference is `node_modules/` and `logs/`,
both excluded from this copy and both gitignored.

## External dependencies and services

- **A connected dartboard over Bluetooth LE.**
- **Self-signed HTTPS certificates** in `certs/` — required for BLE, which browsers only expose
  on secure origins. Gitignored.
- **nssm** — runs the app as a Windows service on Kitchen.
- **Docker** — optional packaging path.

### Secrets

`.env`, `certs/cert.pem` and `certs/key.pem` all exist on disk and are all **gitignored** —
verified with `git check-ignore`, and `git ls-files` confirms none is tracked. This matters
more than usual here: **the GitHub repository is public.**

## ⚠️ This is a copy — the production instance was not moved

The live service runs from Kitchen's `C:\ClaudeCentral\dartslive-scorer`
(`Y:\ClaudeCentral\dartslive-scorer` from Office). That copy was **left untouched and running**.

`C:\ai\dartslive-scorer` is a consolidated copy for version control and development. Do not
assume changes here affect the running scoreboard.

There is also a third location, `Y:\dartslive-scorer`, containing only `certs/` and
`data/history.json` — runtime artefacts with no source. Which of the two the service actually
points at has never been confirmed: Kitchen's service configuration cannot be queried remotely
(`schtasks`/`sc` return Access Denied, no WinRM). The prior effort hit exactly this wall and
left the same question open.

## Current state

Fully pushed and clean — `main` at `ec5bd1b`, 0 ahead / 0 behind `origin/main`.

Two copies existed, and **each held exactly one commit the other did not**:

| Copy | Unique commit | Outcome |
|---|---|---|
| Kitchen `ClaudeCentral` (authoritative, live) | `ec5bd1b` "Track package-lock.json and ignore logs/" | promoted, **now pushed to `origin/main`** |
| Office `C:\projects\applications\` | `0b78e06` "fffff" on `claude/ble-scanner-phase-1` | preserved on `salvage/machineA-2026-08-02`, **pushed** |

Neither was lost. `ec5bd1b` had been committed on 2026-07-26 and left unpushed pending a
decision that was never given; it is now on origin.

## Known issues

- **The repository is public.** The app itself is unremarkable, but the gitignore is the only
  thing keeping `.env` and the TLS keys out of it. Any future `git add -f` or gitignore edit
  would expose them immediately.
- **Which folder the live service targets is unverified** — see above. This has been an open
  question since July.
- **`0b78e06` has the commit message "fffff"** and no description. It is one commit ahead of
  origin's `claude/ble-scanner-phase-1`. Whether it is real work or a stray save is unknowable
  from the repository.
- **Many stale remote branches** — origin carries 15 branches, most `claude/*` feature branches
  from agent sessions, with no record of which are merged or abandoned.
- **Self-signed certificates** mean browsers show a warning on every fresh client.

## Unknown — needs owner input

- **Which directory the Windows service runs from** — `ClaudeCentral\dartslive-scorer` or the
  bare `Y:\dartslive-scorer` runtime folder. Requires local access to Kitchen.
- **Whether `0b78e06` ("fffff") is worth keeping** or should be dropped.
- **Whether the repository should be public**, given it ships TLS-key handling and a `.env`
  contract even though neither is committed.
- **Which of the 15 origin branches can be pruned.**

## Decision log

| Date | Decision |
|---|---|
| 2026-05-17 | `0b78e06` ("fffff") committed on `claude/ble-scanner-phase-1` in the Office copy. Never pushed. |
| 2026-07-26 | Prior effort (DR-02) established Kitchen's `ClaudeCentral` copy as authoritative live production, committed its dirty state as `ec5bd1b`, and **deliberately did not push** pending confirmation that never came. |
| 2026-08-02 | Kitchen copy promoted as the winner — authoritative per DR-02, and the only one running in production. **Copied, not moved**, per the live-project rule; the service is undisturbed. |
| 2026-08-02 | Both unique commits preserved and pushed: `ec5bd1b` to `origin/main`, and `0b78e06` as `salvage/machineA-2026-08-02` rather than by force-updating origin's existing `claude/ble-scanner-phase-1` branch. |
| 2026-08-02 | `node_modules/` and `logs/` excluded from the copy — regenerable and gitignored. |
| 2026-08-02 | Office copy quarantined after its unique commit was salvaged and pushed. |
