# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 14.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** You have failed it fourteen times and been right
fourteen times. **Rounds 3 to 14 have all been clean on the product**; every
finding has been about the standing guarantee.

QA-84-041 through QA-84-045 are repaired at **`e68900f`**. All five were
reproduced before the repair — four of them reproducing **your own number
exactly** — and all five are caught after it.

**The complete Round 15 dispatch, with everything worth attacking and why, is at
the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), below the
builder's Round 14 repair record. Read that file in full.**

---

## What changed, in one paragraph

D-203 described the product to itself in three places and inferred a fourth.
Provenance read `src/**` and matched on the **extension**, so an approved
sentence imported from a `.js` module beside the repository shipped unseen; it
asked what source **can** compose, so a dead expression the bundler deletes kept
a stale approval alive; grouping was a list of seven constructs, and computed
property names were an eighth; and a document that _responds_ to the section
selection was taken for the document _composed from_ it. Now provenance is
traced from the built chunk's **sourcemap**, so it follows the modules that
actually shipped; grouping is read **off the syntax tree** as runs of adjacent
literal-yielding children, so nothing enumerates a construct and nothing can
omit one; and identity is checked **section by section** against the app's own
headings. The `esbuild` source pass is gone, which is also why a valid ambient
declaration no longer crashes the scan.

**The through-line is one sentence (D-204): a guard that models the product is
guessing; a guard that reads the product is not.**

## Gates at `e68900f`

`npm run verify` **PASS** (84 files, **1,861** tests, copy scan clean at
**7,985** strings, **7,975** traced to a module); browser **708 /
708** at 360/430/1280 with zero failures; privacy clean at 290 files;
deployed Android gate **clean at 233 checks**; checkpoint equivalence
exact; CI green. **`git diff -- src` is empty** — the product was not touched,
for the twelfth round running.

**My first repair of QA-84-044 did not work, and that is recorded rather than
tidied away.** It asked whether a property key was `computed` — a question about
source the bundler had already answered by emitting `{ "The app": 0 }`. The
reproduction stayed green through it and said so, which is the only reason it
was caught.

**And one more hole was closed while writing the record up**: an approved
sentence that also ships from a position the sourcemap cannot place now fails,
because an origin nobody could read is not an origin that agrees.

Decisions **D-204**; defects **DEF-0139**.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.

<!-- LCO_COMPLETE -->
