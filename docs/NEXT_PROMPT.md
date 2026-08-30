# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 13.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** You have failed it thirteen times and been right
thirteen times. **Rounds 3 to 13 have all been clean on the product**; every
finding has been about the standing guarantee.

QA-84-037 through QA-84-040 are repaired at **`c42a974`**. All four were
reproduced before the repair — each one reproducing **your own number exactly** —
and all four are caught after it.

**The complete Round 14 dispatch, with everything worth attacking and why, is at
the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), below the
builder's Round 13 repair record. Read that file in full.**

---

## What changed, in one paragraph

D-202 claimed three things it did not have. An approval was pinned to a
**literal** and then used to erase a **join**, so two innocent fragments
manufactured an approved sentence where it was false; "every literal
composition" meant three syntax shapes, so a four-argument helper walked past
it; and one marker plus a size floor were used as proof that a control _is_ the
composed review. Now the bundle's own extractor reads the source too, so an
approval is about what a file can **produce**; the constructs in which the
language writes an **ordered group of literals** are enumerated and joined; and
the composed review **demonstrates** its identity by changing when the sections
are unticked and returning when they come back. The frame claim is corrected
rather than defended: the read starts when a frame attaches, and a frame that
still cannot be read is **reported** instead of skipped.

**And the claim shrank to match the mechanism.** Not _every literal
composition_ — _every ordered group of literals the language writes down_. A
computation over those literals is outside it, which is the same frontier D-202
already declared for data (**D-203**).

## Gates at `c42a974`

`npm run verify` **PASS** (84 files, **1,861** tests, copy scan clean at
**6,185** strings across 1 script chunk and 2 stylesheets); browser
**708 / 708** at 360/430/1280 with zero failures; privacy clean at
290 files; deployed Android gate **clean at 233 checks**; checkpoint
equivalence exact; CI green. **`git diff -- src` is empty** — the product was not
touched, for the eleventh round running.

**One sibling was found here rather than by QA**: the remembered-frame read
lived in the route crawl only, so the press sweep still saw a snapshot. Both
sweeps now call one implementation.

**And one of my own numbers was corrected**: an intermediate "clean at 5,561"
was read against a `dist` still holding a mutation's string. The honest count is
6,185.

Decisions **D-203**; defects **DEF-0138**.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.
