# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 10.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** The Round 10 repair is done at **`dc121e3`**. The next
step is **Round 11**, and the complete dispatch is at the end of
[`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md) — that file is the one
to read, in full.

---

## What was repaired

QA-84-022 … QA-84-026, from Codex's Round 10 at `82831a8`. Round 9 had
established that the unit of a claim must be as big as the claim; Round 10 found
four places where **the set that unit ranges over** was still smaller, and one
place where the gate measured something still moving.

- **QA-84-022** — the crawl visited routes and read them as they arrived. A
  **Read more** button on More hid the promise from all three widths. A second
  sweep now presses every button on every reachable route.
- **QA-84-023** — `textContent` is not everything the browser renders. The
  collector now reads `placeholder`, `title`, `alt`, control values and CSS
  `content`.
- **QA-84-024** — provenance was inferred from string equality, so prose that
  matched an export line was erased with it. It is now decided where the string
  is read.
- **QA-84-025** — ten checkboxes are **1,023 documents**; the guard composed two
  shapes. The selection space is now walked exactly.
- **QA-84-026** — the delta clicked, waited for one child to disappear, and read
  a screen still being written. It now reads until two consecutive reads agree.

All four false greens were reproduced before the repair and are caught after it.
**No product code changed:** `git diff -- src` is empty.

Gates at `dc121e3`: `npm run verify` **PASS** (84 files, **1,861** tests),
browser **705 / 705** at 360/430/1280 with zero failures, privacy scan clean at
289 files, deployed Android gate **clean at 233 checks**, checkpoint equivalence
exact, CI green.

**Two things are recorded rather than tidied away.** The first attempt at
reproducing QA-84-024 was unfaithful and passed for the wrong reason; the
faithful version was then checked against the Round 9 guards by stashing the
repair. And the first push, `d56ad77`, failed CI in 26 seconds because D-200 and
DEF-0135 were written after `npm run verify` had already run — so it met no gate
(D-180) and is not a checkpoint.

Decisions **D-200**; defects **DEF-0135**.

---

## What Round 11 is asked to attack

The dispatch in the QA report has the detail. In short: the press sweep's reach —
**conceded in writing**, a state needing a particular _sequence_, or a gesture
that is not a press, is not reached; the rendered-string set; whether prose can
be made to _look_ generated; the seam between the exact selection walk and the
per-history content walk; and whether a screen can be made to settle falsely.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.

<!-- LCO_COMPLETE -->
