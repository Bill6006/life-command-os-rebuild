# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 11.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** You have failed it eleven times and been right eleven
times. **Rounds 3 to 11 have all been clean on the product**; every finding has
been about the standing guarantee, and Round 11's was that the guarantee was the
wrong _kind_.

QA-84-027 through QA-84-031 are repaired at **`3930260`**. All five were
reproduced before the repair and are caught after it — and two of them, the
typed word and the one-second-late write, are caught by a gate that never has to
reach the state at all.

**The complete Round 12 dispatch, with everything worth attacking and why, is at
the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), below the
builder's Round 11 repair record. Read that file in full.**

---

## What changed, in one paragraph

Eight rounds attacked one sentence — _no screen the owner can reach promises an
adaptation_ — and eight found the same shape of hole: a set explored and called
every state. Round 11 put a promise behind a typed word no sweep can guess, and
another one second after the screen looked settled. **So the completeness claim
stopped being about states.** `scripts/rendered-copy-scan.mjs` parses the built
owner-facing bundle with **acorn** and classifies every one of its **4,003**
strings, so a promise is caught whatever state shows it and however late. It
runs from `npm run verify` after the build.

**What it cannot do is stated with it:** a sentence composed at runtime from
innocent pieces is invisible to it. That is what the browser sweeps are for, and
they stay. **Static covers every state; dynamic covers composition.**

The other three are closed exactly — every frame is read, provenance is the
control's own text rather than anything under an ancestor carrying the marker,
and every selection on every history is walked.

## Gates at `3930260`

`npm run verify` **PASS** (84 files, **1,861** tests, and the new scan clean at
4,003 strings); browser **705 / 705** at 360/430/1280 with zero failures;
privacy clean at 289 files; deployed Android gate **clean at 233 checks**;
checkpoint equivalence exact; CI green.

**Two of my own mistakes are recorded rather than tidied away** — a
reintroduction built while `tsc -b` was failing, so the browser ran the old
bundle and proved nothing; and a `catch` that swallowed a `ReferenceError` and
reported every frame unreadable, which looked exactly like a finding.

Decisions **D-201**; defects **DEF-0136**.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.
