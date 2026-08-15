# Phase status

Report format: canonical plan section 58.

---

# Phase 0 — New repo foundation + phone preview

**Status: GREEN pending owner phone approval.**

Section 45 ends with "STOP and obtain owner visual/workflow approval before
Phase 1." Every automated part of the gate passes. The visual and workflow
checks are the owner's, on a real phone.

## Build identity

|                      |                                                             |
| -------------------- | ----------------------------------------------------------- |
| Checkpoint SHA       | current `main` HEAD                                         |
| Deployed Preview SHA | identical to `main` HEAD                                    |
| Do they match?       | Yes, by construction — see below                            |
| Stable Preview URL   | https://bill6006.github.io/life-command-os-rebuild/preview/ |
| Live proof           | `preview/build-info.json`                                   |

Preview redeploys on every push to `main` that passes the gate (D-004), and the
deploy job fails if the live `build-info.json` does not serve the pushed SHA. So
the deployed Preview SHA equals `main` HEAD at all times rather than being
something to reconcile by hand at each handoff.

First verified deployment: `cc6624b`. The live `build-info.json` served exactly
that SHA while the production root simultaneously served its placeholder,
confirming that a preview deploy does not move production.

## Verification

| Gate                            | Result                                       |
| ------------------------------- | -------------------------------------------- |
| Privacy scan                    | Clean                                        |
| Format (Prettier)               | Pass                                         |
| Lint (ESLint)                   | Pass, 0 warnings                             |
| Typecheck (strict TS)           | Pass, 0 errors                               |
| Unit tests (Vitest)             | 19 passed / 19                               |
| Browser tests (Playwright)      | 33 passed / 33 — 11 tests × 360, 430, 1280px |
| Production build                | Pass                                         |
| Bundle carries checkout SHA     | Asserted in CI                               |
| Deployed SHA matches checkpoint | Asserted live in CI, and confirmed by hand   |

## Gate checklist (section 45)

| Requirement                                      | Status                                         |
| ------------------------------------------------ | ---------------------------------------------- |
| Repository identity is `life-command-os-rebuild` | Verified                                       |
| `Bill6006/life-command-os` unchanged             | Verified against a pre-work fingerprint        |
| Owner opens the stable Preview URL on phone      | **Owner action**                               |
| Latest verified checkpoint SHA is obvious        | Short SHA on every screen; full SHA under More |
| Deployed Preview SHA matches the checkpoint      | Asserted by CI on every deploy                 |
| Refresh reliably shows the current Preview build | No service worker; live check with reload      |
| Preview URL is bookmarkable and reusable         | Fixed for the whole rebuild                    |
| No submarine/cave visual direction               | **Owner judgement**                            |
| CI green                                         | Yes                                            |
| No private owner data in repo                    | Privacy scan clean; synthetic only             |
| `docs/NEXT_PROMPT.md` ready                      | Yes — level, conversation instruction, prompt  |

## What changed

Everything — this is a new repository.

- Vite + React + TypeScript foundation, strict compiler settings
- Design tokens implementing the section 24 visual contract
- App shell: Now, Life, Timeline, Insights, More, with hash routing
- Build identity compiled in and published as `build-info.json`
- Stale-build detection with an explicit reload
- CI: privacy scan, format, lint, typecheck, unit, build, browser, deploy
- Preview/production separation on two paths of the `gh-pages` branch
- Required docs, including the canonical plan copied verbatim

**Product behaviour changed:** yes — there is now an app shell to look at.
**Semantic behaviour changed:** no — there is no engine or record store yet.

## Deliberately not built

Per section 45's "do not build yet": full domain UI, legacy importer,
recommendation library, life score, backup complexity, old tabs. Also no
canonical record store, no intelligence kernel, no service worker.

## Open defects

None. See [`DEFECT_LEDGER.md`](DEFECT_LEDGER.md).

## Notes

- Playwright runs two workers locally. A single `vite preview` process drops
  connections above a handful of concurrent Chromium instances, which produced
  navigation timeouts that looked like product failures. Not a product defect.
- Production currently serves a placeholder pointing at Preview. It is written
  only by a manually dispatched workflow that also requires a typed
  confirmation.

## Decisions made

D-001 … D-010 in [`DECISION_LOG.md`](DECISION_LOG.md).

## Next

Phase 1 — canonical records, semantic model, QA lab.
See [`NEXT_PROMPT.md`](NEXT_PROMPT.md).
