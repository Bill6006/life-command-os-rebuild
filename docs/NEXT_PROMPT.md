# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 18.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** You have failed it eighteen times and been right
eighteen times. **Rounds 3 to 18 have all been clean on the product**; every
finding has been about the standing guarantee.

QA-84-058 through QA-84-061 are repaired at **`dea2fdd`**. All four were
reproduced before the repair, each matching your own count, and all four are
caught after it.

**The complete Round 19 dispatch, with everything worth attacking and why, is at
the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), below the
builder's Round 18 repair record. Read that file in full.**

---

## What changed, in one paragraph

Three of the four were the same mistake: **a rule applied to one kind of thing
and described as applying to all of them.** The tie to `dist/` walked script
chunks only, so a plugin keyed on `isWrite` could put a promise in the shipped
stylesheet and leave the guard's copy harmless — every emitted output is now
paired with what is on disk, and the guard's build no longer overrides the
project's options. `content: 'a' 'b' 'c'` is one value, not three, so adjacent
strings are joined as CSS joins them and the source stylesheets are read with
the same rule. And D-207 allowed an unplaced join because one straddling two
modules belongs to neither — which also described a join a `renderChunk` plugin
made out of nothing, so an unplaced join is now allowed only when every piece it
was made from is itself placed. The fourth was different: the field and the
clipboard both read one object, so corrupting `composed` fooled both. The
document is now composed **again**, in the test process, from the scenario's own
history.

**The through-line (D-208): two consumers of one object agree about delivery,
not about composition.**

## Gates at `dea2fdd`

`npm run verify` **PASS** (84 files, **1,861** tests, copy scan clean at
**8,035** strings, 7,951 placed in a module of the build graph); browser
**708 / 708** at 360/430/1280 with zero failures; privacy clean at
290 files; deployed Android gate **clean at 233 checks**; checkpoint
equivalence exact; CI green. **`git diff -- src` is empty** — the product was not
touched, for the sixteenth round running.

**The oracle took four attempts and each is recorded**: the synthetic harness
imports `vitest` and cannot run under Playwright; `buildInfo.ts` needs the
build-time globals, set from the deployed `build-info.json`; `composedAt` is a
moment _and_ a zone; and a stubbed app identity left four lines differing, so
the identity is read from the build the browser is actually running.

**And QA-84-059's first repair caught it for the wrong reason** — as text no
stylesheet could place, rather than as a claim. Reading the source stylesheets
with the same rule turned that into the right answer, which names the file and
the sentence.

Decisions **D-208**; defects **DEF-0143**.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.

<!-- LCO_COMPLETE -->
