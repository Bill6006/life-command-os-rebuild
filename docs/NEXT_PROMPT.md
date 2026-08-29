# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Status: the Round 9 repair is done. The next step is Round 10, and it is
dispatched from the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md).
That file is the one to read.**

---

## Done — 2026-08-29

QA-84-019, QA-84-020 and QA-84-021 are repaired at **`7147c83`**. Codex's Round 9
is committed alone and unedited at `5dca44a`, the repair on top of it.

**Round 9 was right three times, and the three findings were one finding: the
unit of the claim was smaller than the claim.** Round 8 moved the guarantee from
components to screens the owner can reach; each of these three was that widening
stopping one level too early.

- **QA-84-019** — the crawl read one navigation surface. **More** is behind a
  button in the header and **Data** behind a link on More, so neither was ever
  visited and a plain future-tense promise on Data passed all three widths. The
  route set is now seeded from `routing.ts` and followed through links to a fixed
  point.
- **QA-84-020** — four collectors, not the two QA named, read DOM leaves. A
  sentence split across two `<span>`s was two honest fragments to the guard and
  one promise to the owner. The unit is now what the browser lays out as one run
  of text, and all four collectors share one definition.
- **QA-84-021** — "every line of the document" composed one of **ten** selectable
  sections. The promise went into `correctionsSection()` and all 1,860 tests
  passed with it in a document the owner can produce in two taps. The guarantee
  now runs over every id in `EXPORT_SECTION_IDS`.

All three of Round 9's exact mutations were reproduced before the repair and are
caught after it — **QA-84-021 under QA's own focused command**, the one that had
reported `1 passed, 13 skipped`. **No product code changed:** `git diff -- src`
is empty.

Gates at `7147c83`: `npm run verify` **PASS** (84 files, **1,860** tests), browser
**702 / 702** at 360/430/1280 with zero failures, privacy scan clean at 289
files, deployed Android gate clean, checkpoint equivalence proved, CI green. The
full record, with the reintroduction output, is the **Round 9 repair** section of
the QA report.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077), and this record says what was repaired — not that the phase passed.

**Round 10** goes to the **SAME** Codex QA conversation at **High**, repeating
CASE A and CASE B from new ephemeral browser contexts and never opening the QA
laboratory. It is asked to attack the route seeds, the reading unit, the
subtraction on Data, `APPROVED_PRODUCT_DESCRIPTION`, and the ten sections — and
one limit is conceded to it in writing: a parameterised sub-route reachable only
by a button and linked from nowhere would still not be swept.

Decisions **D-199**; defects **DEF-0134**. Do not start routing 90.
