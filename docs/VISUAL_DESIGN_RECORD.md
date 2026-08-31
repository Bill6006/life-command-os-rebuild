# Visual design record — routing 90 (canonical Phase 9)

**What this is.** The design decisions routing 90 made, why each was made, and
the fifteen structural accommodations the design leaves room for. It exists
because the phase gate is the owner's physical phone: an approval given to a
screen is worth nothing later unless what was approved, and what it deliberately
left open, are both written down.

**Authority.** Canonical plan sections 24, 25, 37 and 54; `PRODUCT_ADJUDICATION_2.md`
§6.2; D-158, D-162, D-168, D-176, D-181, G-009.

---

## 1. The problem this phase was given

Routing 84 built a destination, a milestone, seven rungs of progress evidence, a
create-and-confirm control, a second questioning surface, two correction gestures
and one owner permission, and gave every one of them the same body text at the
same weight. That was deliberate — routing 84 was not allowed to spend this
phase's budget — so what reached the phone was honest, plain, and **flat**: a
page of true sentences that told the owner nothing about what he was looking at.

Section 54's own reject list named the result before it happened. On a domain
page at 360 pixels there were seven surfaces with the same gradient, the same
hairline, the same radius and the same sixteen-pixel drop shadow. That is **card
soup**, and it is a hierarchy failure rather than a decoration failure: the owner
had to read every panel to find out which one mattered.

---

## 2. What changed, and the rule behind each change

### 2.1 One axis of surface weight, with three values

`loud` (the current decision, one per screen), `plain` (most things) and `quiet`
(what the app has **not** settled). The quiet tier loses the gradient and the
shadow and keeps the hairline — so it sits back without becoming a hole in the
page, since "massive empty dark spaces" is on the same reject list.

**The text inside a quiet panel is not dimmed.** Contrast is not what is turned
down; the surface is. An honest "the app has not worked this out" is one of the
most useful things this product says, and dimming its words would be the app
apologising for it.

**And that is measured rather than asserted.** The quiet ground recedes by going
_darker_ than the panel gradient, and in a dark-first palette receding and
improving legibility are the same move — so a quiet surface is the **most**
legible surface in the product:

| Text               | on `--surface-2` (panel) | on `--ground-deep` (quiet) |
| ------------------ | ------------------------ | -------------------------- |
| `--text-primary`   | 13.64:1                  | **17.33:1**                |
| `--text-secondary` | 7.00:1                   | **8.89:1**                 |
| `--text-muted`     | 4.97:1                   | **6.32:1**                 |

`tests/unit/design-tokens.test.ts` holds this as a rule — the quiet ground may
never be less legible than either stop of the panel gradient, for any text
colour — and proves the rule bites by washing the ground out. The failure mode
it exists for is a later phase "receding" the tier by moving it _toward_ the
text, which would take the words with it.

**A tone can never become a score.** It says how settled the _app_ is, not how
the owner is doing. There is no value it can take that means "more" or "better".

### 2.2 Elevation now means something

`--shadow-3` is on the primary surface and nothing else; the ordinary panel
dropped to `--shadow-1`. One panel comes forward, and it is the one carrying the
decision.

### 2.3 A closed vocabulary of object kinds

Section 54: _"A completed session, a completed course and a milestone are three
different things on the page."_ All three were on the page in one typeface at one
weight. `ObjectKind` gives each a marker.

**It is typographic and has no colour.** A coloured badge per kind reaches two of
section 24's rejects at once — gamer RGB and tiny telemetry labels — and a worse
third: coloured markers on progress objects read as a _ranking_ of them, which is
a score wearing a costume. The markers are unordered, uncoloured and identical in
size. Nothing about them can say a milestone is worth more than a session.

### 2.4 A destination is four rows, always four rows

An unstated part used to be omitted from the list and named in a footnote
underneath. Everything about that was true and it read as a _shorter
destination_. The row is now drawn either way, and an unstated one says so where
the answer would have been (G-009).

**It is a row, not a slot.** `DestinationReading.stated` is four booleans with no
length, no total and no order, specifically so that nothing on the surface can
add them up. A destination with one part filled in is not a quarter of a
destination (D-162, section 22).

### 2.5 A rung is one statement in three sentences

What it is, what the record shows, and what that is **not** evidence of. Set as
three greys of descending size the third line reads as fine print, which is the
line a reader skips — and it is the half that keeps a completed session from
being read as a capability. It is now the same size as the second line, one step
quieter, bound to it by a rule on the leading edge.

**No rung outranks another.** `PROGRESS_EVIDENCE` is ordinal and `rankOf` indexes
it, which is exactly why nothing may draw that order: a ladder rendered as a
ladder is a scale, and a scale about the owner is what section 22 forbids. There
is no numbering, no track, no filled/unfilled state and no colour that climbs.

### 2.6 Motion communicates change and nothing else

One keyframe (`arrive`), applied to a panel that appeared **because something
happened**. Nothing moves on its own, loops, pulses or breathes. A product whose
subject is a man's actual life has no business being restless at him.
`prefers-reduced-motion` zeroes every duration, and no state is expressed by
movement alone.

### 2.7 Phone density, and four defects the review found

- A label/value row stacks below 30rem. A right-aligned _sentence_ at 360 pixels
  wraps into a ragged left edge the eye has to find twice per line — section 24's
  "dense developer-dashboard grid", arriving one component at a time.
- The correction control at the end of a row no longer wraps. `base.css` gives
  every button a one-target `min-width`, which is a floor and not a reservation:
  inside a flex row the text took the space first and "Not right?" rendered as
  "Not" over "right?" beside every entry in the list.
- Four uses of two CSS custom properties that **were never defined** —
  `--border-subtle` and `--edge` — were resolving to nothing, so two borders
  simply did not render. A guard now fails the build on an undefined token.
- `describeFactValue` said `60 min` while the premise said the same quantity in
  words. One formatter now, in `domain/horizon.ts` so every layer can reach it —
  which is AUD-0038(b) on the third of its three surfaces.

---

## 3. The explicit anti-pattern review

Section 54 asks for this as its own item, so it is answered row by row rather
than by a general assurance. Each entry says what the product does that keeps it
out, and — where one applies — what would put it back in, because a reject the
design merely happens to avoid today is not a reject it is protected from.

| Reject                        | What keeps it out                                                                                                                                                                                                                                         | What would put it back                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Submarine / control panel** | No instrument frame, no gauges, no rules boxing content into cells. Depth comes from light on surfaces, not from bezels.                                                                                                                                  | A dashboard grid; a border around every block.                                                           |
| **Cave**                      | Deliberately not near-black: `--ground` is a blue-charcoal with a warm wash high on the screen and a cool counter-light low. The quiet tier drops the gradient and keeps the hairline, so it recesses **as a surface** rather than becoming a hole.       | Darkening the quiet tier further, or removing its border.                                                |
| **Gamer UI**                  | One accent, used for the current decision and the primary action. No neon borders, no per-kind colour, no RGB. The object markers are typographic and identical.                                                                                          | Colouring `ObjectKind` by kind — which is also how it would become a ranking (D-231).                    |
| **Developer dashboard**       | The one two-column label/value component now **stacks below 30rem**, because a right-aligned sentence on a phone is a spec sheet. No metric grids anywhere.                                                                                               | Restoring the right-aligned row at phone width; adding a second columnar component.                      |
| **Card soup**                 | The whole subject of D-230: one axis of surface weight, and elevation reserved for the current decision.                                                                                                                                                  | Giving the ordinary panel real elevation again, or marking every panel `plain`.                          |
| **Massive empty dark spaces** | The quiet tier keeps its hairline and its padding rhythm. An empty state is a sentence, never a blank region — DEF-0013's precedent, and the learning panel is **absent** rather than empty when there is nothing in progress.                            | A panel that renders an empty list instead of not rendering.                                             |
| **Endless tiny metrics**      | `EvidencePieces` is still the only module in the product that may print a percentage, and it takes the whole `MeasuredRate` so the figure cannot be separated from the sentence naming what it measures. Nothing this phase added prints a number at all. | A count badge on a marker; a tally beside a rung.                                                        |
| **Pastel wellness**           | Palette untouched: one ember accent, one violet used only inside gradients. No soft-focus imagery, no encouragement copy, no congratulation on a reached milestone.                                                                                       | A congratulation on `reached` — which would also be the app judging the size of his achievement (D-223). |

**The one this design is closest to failing is the cave**, and it is worth
saying so plainly. Three tiers of dark surface on a dark ground is a narrow band
to work in, and the quiet tier is a deliberate step toward the edge of it. That
judgement cannot be settled by a contrast ratio; it is settled on the phone,
which is why the gate is the phone.

---

## 4. The structural accommodation list

Fifteen rows: section 54's nine (**A**), the second adjudication §6.2's six
(**B1–B6**), and the refinement it attaches to A9 rather than listing separately
(**B7**, the provenance answer under D-222).

**Every row is reserved and none is built.** The table is machine-checked by
`tests/synthetic/phase90-accommodation.test.ts`, which reads
`tests/synthetic/accommodation.ts` and holds two claims per row:

- **the reservation** — the composition that would carry it exists and takes a
  _variable number of things_, so the row arrives as another item, another state
  or another sentence rather than as a redesign;
- **not built** — named tokens that must be absent from `src/`, matched on word
  boundaries. This is the half that stops a visual phase quietly doing routing 91
  through 97's work.

| Row    | What it is                                                                                                                                      | Where it lands                                                                                      | Routing |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------- |
| **A1** | A course of action carrying a review status and a verdict sentence.                                                                             | The thread object’s own position line, which is already a value rather than a branch.               | 95      |
| **A2** | A tradeoff clause naming a longer horizon, inside Q9’s one-additional-clause budget. Not a second card.                                         | The tradeoff row of the reasoning panel — one row, whose value is a sentence.                       | 95      |
| **A3** | A recurring constraint the owner can see and dismiss, on the domain page rather than a new screen.                                              | The standing-blockers panel, already a list of N with a dismissal on each.                          | 92      |
| **A4** | A held intention resolving to fulfilled, missed or expired.                                                                                     | The commitment’s own state, rendered from a value.                                                  | 96      |
| **A5** | A maintenance-versus-advancement distinction in the reason line, not a chart.                                                                   | The `proposedBecause` reason line — one sentence, composed from parts.                              | 95      |
| **A6** | An evidence card able to carry a competing explanation and an open question.                                                                    | `PatternEvidence.reasoning`, which is a list of sentences and takes two more.                       | 93      |
| **A7** | Domain pages composing a destination section with an existing progression object.                                                               | The domain page, which already renders both a destination and its growth objects.                   | 94      |
| **A8** | A compact reentry state after a long absence: one screen, not a wall of stale cards.                                                            | The grouped stale-belief card — AUD-0044 is the mechanism, and it is built.                         | 95      |
| **A9** | A restrained “why am I being asked this?” affordance. No dashboard, no score.                                                                   | The prompt’s own `because` sentence — one slot, filled by whatever aimed the question.              | 92      |
| **B1** | A cross-domain re-file option inside a confirmation block — one option row, not a picker screen.                                                | The authoring confirmation block, which already draws a list of option rows.                        | 91      |
| **B2** | An expectation-and-reconciliation line on an evidence surface: what the app expected, and what happened.                                        | `PatternEvidence.reasoning` again — a second sentence in the same list.                             | 96      |
| **B3** | A destination that is not moving, readable as a state of the destination rather than as a new card.                                             | A `data-` state on the destination itself, beside `data-stated` — not a sibling panel.              | 95      |
| **B4** | Six emotional dimensions as six independently-unknown readings, with no arrangement in which they could be summed or averaged.                  | The concept-reading list, where each row carries its own knowledge state and there is no total row. | 92      |
| **B5** | A twelfth domain page in navigation — Love / Dating / Romantic Life (D-168).                                                                    | `LIFE_PAGES`, a list the Life overview groups by standing rather than by a fixed layout.            | 94      |
| **B6** | A fifth correction gesture — “the record is incomplete here” — stating its consequence before it acts.                                          | `CORRECTION_GESTURES` and its exhaustive consequence table, which is a list of N.                   | 95      |
| **B7** | The “why am I being asked this?” affordance must be able to carry a provenance answer (D-222), and may never render as a claim about the owner. | The same one `because` slot as A9 — a provenance answer is a different sentence in it.              | 92      |

**What the check does not claim.** It does not prove a future feature will be
easy, and it is not a design for one. It proves a _shape_ is open. What it
forecloses is the failure this list was written about: arriving at routing 94 and
finding that the only place a twelfth domain could go is a navigation pattern the
owner has already approved without it.

---

## 5. What this phase deliberately did not do

No semantic capture (91). No new concept or vocabulary (92). No new conclusion
from evidence (93). No twelfth domain **built** (94) — it is designed in
navigation only. No advancement register and no "closer" sentence (94, 95). No
named expectation and no reconciliation (96). No inference mechanism (97, held by
D-172). No scoring change of any kind. No change to `QUESTIONS_PER_DAY` and no
new asking channel. Phases 1 through 84 are not reopened.
