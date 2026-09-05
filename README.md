# Life Command OS — rebuild

> **Development moved to `life-command` on 2026-09-04 — https://github.com/Bill6006/life-command. This repository is closed and is not planned from.**

A whole-life personal intelligence system. It should build a useful model of the
owner's life, recognise what matters now, choose the best credible next move,
explain it in normal language, learn from the outcome, and improve.

**Current phase: 0 — foundation and phone preview.** There is no record store
and no decision engine yet. See [`docs/PHASE_STATUS.md`](docs/PHASE_STATUS.md).

## Governing authority

[`docs/CANONICAL_REBUILD_PLAN.md`](docs/CANONICAL_REBUILD_PLAN.md) is the sole
governing plan, copied verbatim. It is self-contained: the older Life Command OS
planning and archive documents are **intentionally excluded** as build inputs,
and `Bill6006/life-command-os` is legacy/reference only — never a requirements
source and never modified.

Authority order: explicit current owner decisions → the canonical plan →
owner-approved amendments → [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md) →
verified implementation in this repository.

## Preview

|                         |                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **Preview (phone)**     | https://bill6006.github.io/life-command-os-rebuild/preview/                                             |
| **Production**          | https://bill6006.github.io/life-command-os-rebuild/ — Phase 12 only                                     |
| **Live build identity** | [`preview/build-info.json`](https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json) |

The Preview URL is stable for the whole rebuild — bookmark it once. Every push
to `main` that passes verification redeploys it, so the deployed Preview SHA
always equals `main` HEAD. The short SHA is visible at the top of every screen
and in full under **More**; the app re-checks `build-info.json` on load and on
tab focus, and offers a reload when a newer build is deployed. No service worker
is registered.

Production is written only by a manually dispatched workflow, so a preview
deploy can never move it.

## Development

```bash
npm install
npm run dev
```

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run verify`       | The full local gate: format, lint, typecheck, unit tests, build |
| `npm run test`         | Unit tests                                                      |
| `npm run test:browser` | Playwright at 360px, 430px and 1280px                           |
| `npm run build`        | Production build (`LCOS_TARGET=preview\|production`)            |

Physical-phone validation stays mandatory for important flows regardless of what
the automated gates say.

## Privacy

Real owner data never enters this repository. Fixtures are synthetic only; no
emails, addresses or unnecessary direct identifiers appear in fixtures or docs;
real backups and exports are never committed.

## Documents

- [Canonical rebuild plan](docs/CANONICAL_REBUILD_PLAN.md) — the governing authority
- [Phase status](docs/PHASE_STATUS.md) — current acceptance report
- [Decision log](docs/DECISION_LOG.md) — decisions and their reasons
- [Defect ledger](docs/DEFECT_LEDGER.md) — verified defects and regressions
- [Next prompt](docs/NEXT_PROMPT.md) — next intelligence level, conversation instruction, prompt
- [Architecture boundaries](docs/ARCHITECTURE_BOUNDARIES.md) — module ownership
