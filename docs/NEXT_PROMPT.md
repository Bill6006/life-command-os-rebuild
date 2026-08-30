# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 19.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

---

## This is a bounded retest, not another round

Owner decision **D-210** closed the open-ended loop. Rounds 15 to 19 produced
twenty findings with no taper; nineteen were instrument findings and are
**deferred**, preserved verbatim in
[`qa/INSTRUMENT_HARDENING_BACKLOG.md`](qa/INSTRUMENT_HARDENING_BACKLOG.md) and
open in the defect ledger. One — **QA-84-064** — remained blocking. It is
repaired at **`d618588`**.

**General instrument hardening is closed for this phase.** From here only two
things may block GREEN:

- a **genuinely new owner-visible product defect**; or
- a **release-integrity defect comparable to QA-84-064**.

**A further finding that a detector can be fooled is not a blocker.** It belongs
in the backlog, appended, with nothing removed.

---

## What was repaired

**QA-84-064 — the live verifier proved a SHA, not the bytes being served.** The
deploy job published the artifact the gate had verified and then proved the
deployment by reading `commitSha` out of the served `build-info.json`. A step
between the download and the publish appended a visible rule to the app
stylesheet; `build-info.json` was untouched, and the verifier reported
**"Deployed SHA matches"** over a site that was now saying something the engine
cannot do. **A commit identifier names what was built and says nothing about
what is served.**

`npm run build` now writes `dist/release-manifest.json` — a SHA-256 for every
file it produced, and a digest over that list, with no clock in it.
`scripts/release-integrity.mjs <base-url> --manifest <path>` fetches each of
those files **from the live site**, hashes what the host actually returns, and
requires every digest to be the one recorded when the gates passed. It also
requires the site's own copy of the manifest to be the verified one, so a
publication that rewrote the tree _and_ its record is named too. **The manifest
the deploy job checks against arrives as its own artifact**, not out of the tree
being published.

**What it does not establish is written down with it (D-211):** a hostile step
inside the deploy job can subvert any check in that job. What changed is that
the check reads the artifact rather than a name for it, and that **it can be run
from outside CI** — the manifest is published, so you can verify any deployment
from a machine the pipeline does not control:

```bash
npm run release:integrity -- https://bill6006.github.io/life-command-os-rebuild/preview/ --manifest verified/release-manifest.json
```

The SHA check stays. It answers a different question — whether the phone is
looking at this commit at all — and it was never wrong about that.

**One thing was not edited, deliberately.** `qa/INSTRUMENT_HARDENING_BACKLOG.md`
failed `prettier --check` and formatting it would have been an edit, so it is
listed in `.prettierignore` instead, beside the QA handoffs and the sealed
owner-use review that are exempt for the same reason. All **39** `QA-84-0xx`
identifiers still resolve and the file is byte-identical to the commit that
added it.

---

## What this retest verifies, and nothing else

1. **QA-84-064 / release-integrity correctness.** Reproduce it as it was
   reproduced here — build, take the manifest of the verified bytes, append a
   visible rule to the app stylesheet, serve the result — and confirm that
   `verify-deployed-sha.sh` still reports a match while
   `release-integrity.mjs` names the file. The honest tree must pass.
2. **The seven Phase 84 acceptance items.**
3. **CASE A** fresh-store owner use.
4. **CASE B** fresh-store owner use.
5. **The normal required regression gates** — the full test suite, the browser
   matrix at three widths, the Android checks, the privacy scan, checkpoint
   equivalence, and a clean worktree.

**If all of those pass, Phase 84 may go GREEN.** I may not declare it: a builder
conversation does not approve its own phase (**D-077**). That is yours to say.

Phase 84 stays **YELLOW** until you do, and **routing 90 must not start**.

## Gates at `d618588`

`npm run verify` **PASS** (84 files, **1,861** tests; the build now writes the
release manifest; copy scan clean at **8,035** strings, 7,951 placed in a module
of the build graph); browser **708 / 708** at 360/430/1280 with zero
failures; privacy clean at 291 tracked files; deployed Android gate **clean at
233 checks**; **release integrity clean — 8 files served byte for byte as
verified**; checkpoint equivalence exact; CI green. **`git diff -- src` is
empty** — the product was not touched.

Decisions **D-211**; defects **DEF-0144**.

---

## Independent bounded retest result — PASS

**Phase 84 is GREEN.** Codex independent QA completed exactly the bounded
retest above at deployed documentation head `986c086` and found no new
owner-visible product defect or release-integrity defect comparable to
QA-84-064.

- QA-84-064 reproduced exactly: the visible CSS mutation remained green under
  the legacy SHA check and failed the release-integrity check with the mutated
  stylesheet named. The honest tree passed, and the deployed tree passed all 8
  files against the manifest downloaded separately from the successful CI run.
- All seven Phase 84 acceptance items passed.
- Fresh-store CASE A passed with 1 entity / 2 records; fresh-store CASE B passed
  with 2 entities / 7 records. Both laboratory databases remained empty.
- `npm run verify` passed with 1,861 tests in 84 files; browser 708/708 at
  360/430/1280; Android 233 checks; privacy 293 tracked files; rendered-copy
  scan 8,035 / 7,951; checkpoint equivalence and the clean-tree audit passed.
- `qa/INSTRUMENT_HARDENING_BACKLOG.md` remains byte-identical to `4e4cedd`.
  Its deferred findings remain open under D-210 and were not treated as Phase
  84 blockers.

Routing 90 has not started. There is no further Phase 84 repair or QA round to
dispatch from this handoff.

<!-- LCO_COMPLETE -->
