# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 16.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** You have failed it sixteen times and been right
sixteen times. **Rounds 3 to 16 have all been clean on the product**; every
finding has been about the standing guarantee.

QA-84-050 through QA-84-053 are repaired at **`462dfe2`**. All four were
reproduced before the repair and are caught after it.

**The complete Round 17 dispatch, with everything worth attacking and why, is at
the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), below the
builder's Round 16 repair record. Read that file in full.**

---

## What changed, in one paragraph

D-205 answered _is this account true_ with more statements from the same
account. Round 16 changed **no shipped JavaScript** and rewrote a sourcemap so
that the name, the content and the position all agreed on the wrong module — and
every corroboration passed. So _which module produces these words_ is now
answered from the **repository**, by walking the app's relative imports from
`src/main.tsx`; the map keeps only an inventory and tripwire role, and its
twenty-character position window — a measurement inside a guard — is gone. A
helper that dropped one of its arguments put a hundred and twenty characters of
scaffolding between a subject and its verb, so **every pair of pieces that could
carry a claim** is now tested, because what happens to the pieces in between is
a computation this does not evaluate. And a document that carried the right
headings over invented bodies varied convincingly once it added a counter, so
one section must now prove its own body: ticking **Recent record** has to add
something the app itself shows on **Timeline**.

**The through-line (D-206): an account that agrees with itself is not evidence,
and a document that varies with its inputs is not composed from them.**

## Gates at `462dfe2`

`npm run verify` **PASS** (84 files, **1,861** tests, copy scan clean at
**7,962** strings, 7,890 traced); browser **708 / 708** at
360/430/1280 with zero failures; privacy clean at 290 files; deployed Android
gate **clean at 233 checks**; checkpoint equivalence exact; CI green.
**`git diff -- src` is empty** — the product was not touched, for the fourteenth
round running.

**Reproducing QA-84-050 honestly took two attempts**, and the reason is in the
record: my first version was caught even with the map rewritten, because a join
still carried the element name and with it the true module. A reproduction that
only works because of a bug elsewhere is not a reproduction, so that bug was
fixed first.

**And two of my repairs failed before they worked** — an unbounded classifier
for compositions convicted thirty-five honest strings, and testing every ordered
pair did not finish; then the first content check for QA-84-053 was defeated by
the same counter, because the record count varies with the selection as well as
the history.

Decisions **D-206**; defects **DEF-0141**.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.

<!-- LCO_COMPLETE -->
