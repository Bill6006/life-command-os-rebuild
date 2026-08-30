# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Codex / **independent QA**.
**Conversation:** **SAME** — the Codex conversation that wrote Rounds 1 to 17.
**Model:** Codex.
**Reasoning level:** **High** — never Max.

**Routing 84 is YELLOW.** You have failed it seventeen times and been right
seventeen times. **Rounds 3 to 17 have all been clean on the product**; every
finding has been about the standing guarantee.

QA-84-054 through QA-84-057 are repaired at **`6062756`**. All four were
reproduced before the repair, each matching your own count, and all four are
caught after it.

**The complete Round 18 dispatch, with everything worth attacking and why, is at
the end of [`qa/PHASE_84_QA_HANDOFF.md`](qa/PHASE_84_QA_HANDOFF.md), below the
builder's Round 17 repair record. Read that file in full.**

---

## What changed, in one paragraph

Five answers to _which module produced these words_ have now been broken, and
every one was **a second account of what the build did** — reading `src`, the
sourcemap, the map corroborated against itself, and a walk of the relative
imports, which Round 17 defeated with a **Vite alias**. So the build hands over
its own graph: Vite runs in process and Rollup's output gives the **rendered
code of every module in each chunk**, which is not an account of provenance but
the shipped bytes, grouped by the module they came from, by the tool that put
them there. "Can compose" is gone with it, and stylesheets are in the graph, so
a `content:` string nobody can place now fails. An opener may be **assembled**
from adjacent pieces, bounded by the vocabulary's own longest phrase. And the
composed review is compared against what the **copy control** hands over, which
takes the whole document at once rather than one section at a time.

**The through-line (D-207): ask the build for its own graph, and ask the app for
its own document.**

## Gates at `6062756`

`npm run verify` **PASS** (84 files, **1,861** tests, copy scan clean at
**8,035** strings, 7,951 placed in a module of the build graph); browser
**708 / 708** at 360/430/1280 with zero failures; privacy clean at
290 files; deployed Android gate **clean at 233 checks**; checkpoint
equivalence exact; CI green. **`git diff -- src` is empty** — the product was not
touched, for the fifteenth round running.

**One weakness was closed rather than shipped.** Running Vite in process makes a
build _for the guard_, so each chunk is compared against `dist/` byte for byte,
masking only the content-hash filenames and the build stamp. The chunks are
paired by **content** after a first version mis-read `index-C3-1N9fH.js` — a
content hash can contain a dash of its own.

**And a probe ruled out the obvious repair for QA-84-057**: only three of ten
sections contribute a line another screen also renders, so grounding every
section the way the record section was grounded would have failed the honest
product.

Decisions **D-207**; defects **DEF-0142**.

**Routing 84 stays YELLOW.** A builder conversation may not approve its own phase
(D-077). Do not start routing 90.

<!-- LCO_COMPLETE -->
