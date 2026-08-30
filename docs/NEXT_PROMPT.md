# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 12.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** You have failed it twelve times and been right twelve
times. **Rounds 3 to 12 have all been clean on the product**; every finding has
been about the standing guarantee, and Round 12's was that the guarantee's two
halves do not meet.

QA-84-032 through QA-84-036 are repaired at **`5b9fe99`**. All five were
reproduced before the repair and are caught after it.

**The complete Round 13 dispatch, with everything worth attacking and why, is at
the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), below the
builder's Round 12 repair record. Read that file in full.**

---

## What changed, in one paragraph

D-201 split the copy guarantee in two and named both halves: _static covers
every state; dynamic covers composition_. Round 12 walked through the seam
between them with four adjacent string literals behind a typed word. The static
scan now **joins** `+` chains, template quasis and array elements and classifies
the joined forms; it parses every shipped stylesheet's `content`, because CSS
puts words on the screen that no JavaScript string holds; **each of the
seventeen approvals now names the source files it may live in**, checked in both
directions, so an honest sentence cannot be transplanted where the same words
are false; exactly one composed review is asserted before anything is read; and
every frame that ever attached is read before the crawl concludes.

**What is left open is written down rather than covered by a phrase.** A
sentence composed at runtime **from data**, in a state no sweep reaches, is in
neither half — and no wider sweep or cleverer parser closes it. D-201's
"whole-app" wording overstated the guarantee and is superseded by **D-202**.

## Gates at `5b9fe99`

`npm run verify` **PASS** (84 files, **1,861** tests, copy scan clean at
**5,410** strings across 1 script chunk and 2 stylesheets); browser **705 / 705**
at 360/430/1280 with zero failures; privacy clean at 290 files; deployed Android
gate **clean at 233 checks**; checkpoint equivalence exact; CI green.
**`git diff -- src` is empty** — the product was not touched, for the tenth round
running.

**Two of my own false greens are recorded rather than tidied away** — a CSS
repair first written against `src/index.css`, a file in no import graph; and a
reintroduction whose mutation never ran because an earlier `git checkout` in the
same `&&` chain failed and took the chain down with it.

**One repair reaches less far than the finding it answers.** QA's frame arrives
ten seconds after mount and the crawl finishes in three, so the late-frame read
never sees it; what caught QA's mutation was the static scan. The late-frame
read was proved separately against a one-second frame. Saying which gate caught
what is the difference between a repair and a coincidence.

**And the browser number is the second full run.** The first had one
`net::ERR_ABORTED` on a test's first navigation, and a focused re-run had one
more — the transport class `playwright.config.ts` documents and mitigates by
binding `127.0.0.1`. Neither reproduced; no retry was added, because a retry
would hide a real navigation regression.

Decisions **D-202**; defects **DEF-0137**.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.
