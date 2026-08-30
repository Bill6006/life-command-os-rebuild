# Phase 84 instrument-hardening backlog

**Status: deferred, not resolved.** Nineteen findings from independent QA
rounds 15 to 19, preserved here verbatim because the owner separated *product
acceptance* from *QA-instrument hardening* on 2026-08-30 (see **D-210**).

None of these is an owner-visible product defect. Each demonstrates that a
guard, scanner, oracle, verifier or build tie can be defeated by a
deliberately constructed forgery. They remain real work; they are no longer
Phase 84 GREEN blockers.

**QA-84-064 is deliberately NOT in this file.** It concerns release and
deployed-byte integrity rather than a detector, and remains a Phase 84
blocker. It stays in `PHASE_84_QA_HANDOFF.md` with the round that raised it.

## Why this file exists, and why verbatim

Twelve of these findings existed in exactly one place: the Phase 84 QA
handoff, a document of nearly nine thousand lines that every QA round
rewrites. Pointers into it would not have survived a single compaction, so
the full text is copied here and the backlog stands on its own.

## Rules for this file

- **It is inert to routing.** The orchestrator treats only
  `docs/qa/PHASE_<digits>_QA_HANDOFF.md` as a handoff candidate, so this file
  is never dispatched, never staged, and never rewritten by a round.
- **No round may edit, remove or renumber anything here.** A QA-84 identifier
  that stops resolving in this file is a preservation failure, not a cleanup.
- **Adding is allowed; deleting is not.** A finding leaves only by being
  fixed, and the fix is recorded beside it rather than replacing it.

## Index

| ID | Title | Round |
| --- | --- | --- |
| `QA-84-046` | the sourcemap can confidently approve the wrong module | 15 |
| `QA-84-047` | four literal sibling elements become one sentence on screen | 15 |
| `QA-84-048` | headings over fabricated content pass as the composed review | 15 |
| `QA-84-049` | the export marker grants its exemption on any route | 15 |
| `QA-84-050` | a consistently wrong sourcemap still launders a transplant | 16 |
| `QA-84-051` | a dropped call argument can hide a rendered promise | 16 |
| `QA-84-052` | the twenty-character position threshold accepts a prefix decoy | 16 |
| `QA-84-053` | a history counter makes an invented review pass identity | 16 |
| `QA-84-054` | the app resolver and the repository walker can disagree | 17 |
| `QA-84-055` | “can say it” and “it ships” still identify no producer | 17 |
| `QA-84-056` | splitting the subject prevents a claim-bearing pair | 17 |
| `QA-84-057` | one honest section can carry nine fabricated ones | 17 |
| `QA-84-058` | the build tie does not include stylesheets | 18 |
| `QA-84-059` | adjacent CSS strings compose after the scanner stops | 18 |
| `QA-84-060` | render-time copy borrows an honest producer | 18 |
| `QA-84-061` | the field and clipboard agree on the same false document | 18 |
| `QA-84-062` | the oracle shares the defect it is meant to detect | 19 |
| `QA-84-063` | the composing exception exempts an invented fact | 19 |
| `QA-84-065` | a custom property reaches `content` unseen | 19 |

---

## QA-84-046 — the sourcemap can confidently approve the wrong module

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 15.*


**Severity:** Blocker. **Decision:** D-204.
**Class:** provenance trusts a source name without checking that the named
source contains or produced the mapped words.

I placed the already-approved sentence
`Leave it empty and the app will not invent one.` visibly in
`MoreScreen.tsx`. With the build's honest map, the scan correctly exited 1 and
named `src/features/more/MoreScreen.tsx` as an unapproved transplant. I then
changed no shipped JavaScript at all: in the chunk map only, I replaced the
`MoreScreen.tsx` source entry with the existing approved
`DomainPanels.tsx` source entry. The same scan reported:

```text
Rendered copy scan clean — 7987 shipped strings (7977 traced to a module)
```

The map's `sourcesContent` still described More and no content cross-check
objected. Requiring a map and counting mapped positions proves that a map
exists and is busy; it does not prove that a particular attribution is true.


## QA-84-047 — four literal sibling elements become one sentence on screen

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 15.*


**Severity:** Blocker. **Decision:** D-204.
**Class:** syntax-tree adjacency is not rendered-text adjacency.

Behind an ordinary text input on More, reached by typing `show`, I rendered:

```tsx
<p>
  <span>The app </span>
  <span>will choose </span>
  <span>something better </span>
  <span>next time.</span>
</p>
```

Every word is a static literal. The spans separate the literals in the bundle's
tree, while the browser puts their text nodes together in one paragraph. The
copy scan reported clean at **7,999 shipped strings, 7,989 traced**. A separate
mobile-large owner probe typed `show` and read the exact visible sentence
**The app will choose something better next time.** The browser sweeps do not
type arbitrary words, which is their documented boundary; this finding is that
the tree grouping claimed to close literal composition and did not.


## QA-84-048 — headings over fabricated content pass as the composed review

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 15.*


**Severity:** Blocker. **Decision:** D-204.
**Class:** section membership is not section content.

I replaced only the marked Data textarea's value. The impostor listed the
heading of every selected section, omitted every unselected heading, changed
when a box changed, restored byte-for-byte when it was rechecked, and followed
the headings with the unapproved blocker-path sentence **This needs special
care.** plus thirty fabricated review lines. None of the real composed content
was present.

The copy scan was clean at **7,989 shipped strings, 7,979 traced**. Across all
three widths, both the identity test and the whole-app before/after guard passed:

```text
6 passed (22.2s)
```

The headings show which sections an impostor knows were selected. They do not
show that the bytes under those headings came from those sections, and the
marker still removes those unapproved generated lines from the catalogue
comparison.


## QA-84-049 — the export marker grants its exemption on any route

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 15.*


**Severity:** Blocker. **Decision:** D-204.
**Class:** uniqueness is checked per page, while identity is proved on one page
and one history.

I left the real Data export untouched and put a second read-only textarea on
More with the same `export-text` marker and the unapproved value **This needs
special care.** There was one marked control on each page, so the per-page
`<= 1` assertion held. The identity test visited Data only, so it proved the
real control and never observed the impostor. The route crawl did visit More,
but classified the impostor's value as generated and excluded it from the
catalogue comparison.

The copy scan reported clean at **7,988 shipped strings, 7,978 traced**. The
identity and whole-app guards again passed at all three widths:

```text
6 passed (16.2s)
```

This is the dispatch's exact route-scope case: the crawl reached the control,
but the identity proof that authorizes its exemption happened elsewhere.


## QA-84-050 — a consistently wrong sourcemap still launders a transplant

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 16.*


**Severity:** Blocker. **Decision:** D-205.
**Class:** corroboration entirely within one build account is not independent
provenance.

I placed the already-approved sentence
`Leave it empty and the app will not invent one.` visibly in
`MoreScreen.tsx`. With the build's honest map, the scan correctly exited 1 and
named the unapproved transplant. I then changed no shipped JavaScript at all.
In the map only, I changed the mapping for both the sentence literal and its
outer paragraph to the real approved line in `DomainPanels.tsx`.

The named source existed, `sourcesContent` matched that file on disk exactly,
and the named position said the whole credited sentence. The scan nevertheless
reported:

```text
Rendered copy scan clean — 8,184 shipped strings (8,159 traced to a module)
```

The repair corroborates the map with other statements made by the same build;
it never establishes which source actually produced those shipped bytes. A
consistent false attribution therefore satisfies every check.


## QA-84-051 — a dropped call argument can hide a rendered promise

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 16.*


**Severity:** Blocker. **Decision:** D-205.
**Class:** treating every call argument as rendered text lets non-rendered
arguments weaken the classifier.

Behind an ordinary text input on More, reached by typing `show`, I called a
helper that returns its first and remaining arguments but deliberately drops
the second:

```tsx
qaRound16Render(
  'The app ',
  'This unrelated argument is deliberately dropped and has enough words to separate the subject from its verb in the guard.',
  ['will choose ', 'something better ', 'next time.'],
)
```

The browser displayed the exact sentence **The app will choose something
better next time.** The guard inserted the non-rendered second argument between
the visible subject and verb, and the scan reported clean at **8,195 shipped
strings, 8,170 traced**.

This is not the dispatch's fetched-text remainder: every rendered word is a
literal call argument. It disproves the narrower claim that extra call-argument
text is harmless noise. Here that noise moves a static, visible promise beyond
the classifier's reach.


## QA-84-052 — the twenty-character position threshold accepts a prefix decoy

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 16.*


**Severity:** Blocker. **Decision:** D-205.
**Class:** a fixed prefix and line window are not proof that a mapped position
contains the credited sentence.

I rebuilt the same visible More transplant, then changed only its map. This
time both relevant mappings named a nearby comment in `DomainPanels.tsx`:

```text
QA_ROUND16_PREFIX_DECOY: Leave it empty and the guard only sees this prefix.
```

The comment shares the credited sentence's first twenty characters but does
not contain the sentence. Its source name and `sourcesContent` were again exact
matches for the file on disk, and the shipped JavaScript was unchanged. The
scan still reported clean at **8,184 shipped strings, 8,159 traced**.

The test asks whether twenty leading characters occur in a small line window.
That measurement can say agreement where the complete credited text is absent;
it is not an enumeration of the attribution it purports to corroborate.


## QA-84-053 — a history counter makes an invented review pass identity

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 16.*


**Severity:** Blocker. **Decision:** D-205.
**Class:** two unequal outputs do not prove that either output contains the
selected sections' content.

I replaced only the marked Data textarea's value. The impostor emitted the
selected section headings, a `History counter` derived from the loaded record
count, the unapproved sentence **This needs special care.**, and thirty
fabricated lines. It contained none of the real composed section bodies.

The first and second fixtures have different record counts, so the two invented
documents differed and the history assertion passed. The copy scan was clean at
**8,190 shipped strings, 8,165 traced**. Across all three widths, both the
identity test and the whole-app before/after guard passed:

```text
6 passed (24.1s)
```

The headings prove selection membership and the counter proves only that the
impostor observed some history property. Neither proves that the document body
is the composed content of the selected sections.


## QA-84-054 — the app resolver and the repository walker can disagree

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 17.*


**Severity:** Blocker. **Decision:** D-206.
**Class:** a second resolver plus a forgeable inventory does not enumerate the
modules the real build used.

I added a TypeScript/Vite alias named `@qa-round17`, imported it from More, and
put the approved sentence `Leave it empty and the app will not invent one.` in
the aliased module. The real build followed the alias and visibly shipped the
sentence. The repository walk ignored the non-relative import. With the honest
map, its inventory tripwire correctly exited 1 and named the missed module.

I then changed no shipped JavaScript at all. In the map only, I changed the
aliased module's source identity and `sourcesContent` to repeat the real
approved `DomainPanels.tsx` source. The scan reported:

```text
Rendered copy scan clean — 7,962 shipped strings (7,890 traced to a module)
```

The import walk is not the resolver that built the app, and its only check
against the build graph is the account Round 16 already proved forgeable. Two
incomplete accounts do not become independent provenance by disagreeing first.


## QA-84-055 — “can say it” and “it ships” still identify no producer

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 17.*


**Severity:** Blocker. **Decision:** D-206.
**Class:** separate evidence that a module can compose words and that the words
ship does not establish which shipped occurrence came from that module.

I removed the approved sentence from its honest visible paragraph in
`DomainPanels.tsx`, retained it there only as an unused exported literal, and
rendered the exact sentence visibly on More with CSS `content:`. A mobile-large
browser probe read the pseudo-element's computed content exactly. The scan,
which does read shipped CSS, nevertheless reported clean at **7,964 shipped
strings, 7,892 traced**.

The repository walk found a possible producer in the approved module. The
bundle separately proved that the words ship. Nothing joined those two facts,
and the CSS occurrence's real origin was discarded when approval provenance
was decided. This is static copy in a shipped stylesheet, not the declared
runtime-composition remainder.


## QA-84-056 — splitting the subject prevents a claim-bearing pair

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 17.*


**Severity:** Blocker. **Decision:** D-206.
**Class:** a pair selected by the classifier's single-piece vocabulary is not
every pair whose composition the classifier can recognise.

Behind an ordinary text input on More, reached by typing `show`, I called a
helper that returned its first, second and remaining arguments while dropping
the long third argument:

```tsx
qaRound17Render(
  'The ',
  'app ',
  'This unrelated argument is dropped and is deliberately long enough to separate a subject assembled from two pieces from the modal that follows it in the guard.',
  ['will choose ', 'something better ', 'next time.'],
)
```

The browser displayed the exact sentence **The app will choose something
better next time.** The whole-run join retained the dropped noise, while
neither `The ` nor `app ` individually matched `couldOpenAClaim`, so no pair
was built. The scan reported clean at **7,976 shipped strings, 7,904 traced**.

Every visible word is a static literal argument. The classifier recognises
`the app` after composition, but the predicate that decides whether to compose
requires those two words to exist in one piece first. The claimed pair set is
therefore not exhaustive over the rule it is meant to feed.


## QA-84-057 — one honest section can carry nine fabricated ones

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 17.*


**Severity:** Blocker. **Decision:** D-206.
**Class:** grounding one fixed section does not establish the bodies of the
other selected sections.

I replaced only the marked Data textarea's value. The impostor extracted and
preserved the real **Recent record** section from `composed.text`, so everything
that section added was honestly grounded in Timeline. For every other selected
section it emitted only the correct heading, the unapproved sentence **This
needs special care.**, and thirty fabricated review lines.

Selections still added and removed their own headings, the honest record block
passed the Timeline contribution check in both directions, and the record made
the two histories differ. The copy scan was clean at **7,975 shipped strings,
7,903 traced**. Across all three widths, both the identity test and the
whole-app before/after guard passed:

```text
6 passed (43.6s)
```

The test proves one section's body and assumes that proof transfers to every
other section. It does not: the other selected bodies remain established only
by their headings.


## QA-84-058 — the build tie does not include stylesheets

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 18.*


**Severity:** Blocker. **Decision:** D-208.
**Class:** a guard build can disagree with the shipped CSS while the claimed
build-identity check reports agreement.

I added a Vite plugin whose `generateBundle` hook inspected `isWrite`. More's
source stylesheet contained the harmless visible sentence **The quiet build
marker.** On the guard's in-process `write: false` build, it stayed harmless.
On the ordinary writing build that produced `dist/`, the plugin changed only
the emitted stylesheet to **The app will choose something better next time.**

The copy scan reported clean:

```text
Rendered copy scan clean — 8037 shipped strings (7953 placed in a module)
across 1 script chunk(s) and 2 stylesheet(s).
```

A local preview of that ordinary build returned the exact prohibited sentence
from the visible pseudo-element's computed `::before` content. The comparison
against `dist/` iterates JavaScript chunks only. It therefore did not compare
the stylesheet at all: no filename or timestamp mask was even needed.

The record says each chunk is tied byte-for-byte to `dist/` and that
stylesheets participate in provenance. The actual tie covers only script
assets, leaving a production stylesheet free to differ from the build the
guard examined.


## QA-84-059 — adjacent CSS strings compose after the scanner stops

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 18.*


**Severity:** Blocker. **Decision:** D-208.
**Class:** CSS provenance and claim detection inspect quoted pieces rather than
the value the browser composes.

I put this static rule on a visible More pseudo-element:

```css
content: 'The app ' 'will choose ' 'something better ' 'next time.';
```

The browser's computed `content` was exactly **The app will choose something
better next time.** The scan was nevertheless clean:

```text
Rendered copy scan clean — 8040 shipped strings (7956 placed in a module)
across 1 script chunk(s) and 2 stylesheet(s).
```

This is not the declared open case of a sentence composed from runtime data.
It is one static CSS value whose standard adjacent-string composition the
guard does not perform. `contentIn` extracts each quoted fragment separately,
and stylesheet attribution then asks whether source text contains that
fragment. Neither operation establishes the composed value the browser ships.


## QA-84-060 — render-time copy borrows an honest producer

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 18.*


**Severity:** Blocker. **Decision:** D-208.
**Class:** render-time generated copy has no occurrence provenance and can
inherit approval from an unrelated honest occurrence.

I placed only the inert marker `QA_ROUND18_RENDER_COPY` in More, then used a
Vite `renderChunk` hook to replace it after module attribution with:

```js
['Leave it empty and the app ', 'will not invent one.'].join('')
```

Typing `show` displayed exactly the approved sentence **Leave it empty and the
app will not invent one.** The scan reported clean:

```text
Rendered copy scan clean — 8043 shipped strings (7956 placed in a module)
across 1 script chunk(s) and 2 stylesheet(s).
```

Rollup's `item.modules[id].code` still contained only the marker, because the
plugin created the sentence in `renderChunk`. The whole chunk contained the
approved joined value, but an unplaced joined value is allowed. The existing
honest occurrence in `DomainPanels.tsx` supplied the approved producer for the
sentence as a whole, even though it did not produce this occurrence.

An initial three-piece form was correctly rejected because one unapproved
sub-pair happened to read **the app will not invent one.** The two-piece form
removes that incidental signal without changing the class: the scanner sees
shipped approved text and an honest producer somewhere, but cannot connect the
render-time occurrence to its producer.


## QA-84-061 — the field and clipboard agree on the same false document

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 18.*


**Severity:** Blocker. **Decision:** D-208.
**Class:** agreement between two consumers of `composed.text` does not prove
that the composed document represents its inputs.

I corrupted the `composed` object immediately after the honest
`composeExport` call. The impostor preserved the exact honest **Recent record**
section. Every other selected section kept its expected heading but replaced
its body with **This needs special care.** followed by thirty fabricated review
lines. Both the textarea and copy control then consumed the same corrupted
`composed.text`.

The existing identity test and whole-app before/after guard passed at all three
widths:

```text
6 passed (21.5s)
```

The copy scan was also clean at **8,048 shipped strings, 7,964 placed**. The
clipboard equalled the field exactly; selection headings appeared and
disappeared; the preserved Recent record contribution matched Timeline; and
the honest record block made the two fixture histories differ. Nine fabricated
section bodies therefore passed every claimed identity check.

The repair moved the comparison point without adding an independent account of
the document. A field and a clipboard fed by one object prove delivery
agreement, not composition identity.


## QA-84-062 — the oracle shares the defect it is meant to detect

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 19.*


**Severity:** Blocker. **Decision:** D-209.
**Class:** common-mode composition error passes because product and oracle call
the same composer.

I added one fabricated factual line directly to `composeExport`:

```text
- The history shows twelve completed launches.
```

No history supplied that fact. The product document and `composedHere` both
imported the altered composer, so both contained the same invention and the
line-by-line comparison found no stray line. The copy scanner was clean:

```text
Rendered copy scan clean — 8037 shipped strings (7953 placed in a module)
across 1 script chunk(s) and 2 stylesheet(s).
```

The composed-review identity test and the whole-app copy guard both passed at
all three widths:

```text
6 passed (23.4s)
```

This does not need a third history or an unvisited selection. It defeats both
of the oracle's existing histories at once: a second invocation of the same
faulty function is agreement with itself, not independent evidence that the
document represents its inputs.


## QA-84-063 — the composing exception exempts an invented fact

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 19.*


**Severity:** Blocker. **Decision:** D-209.
**Class:** a prefix-based exception removes arbitrary document content, not one
identified metadata field.

I left `composeExport` honest and altered only the `composed` object held by
`DataScreen`, inserting this line into the UI document:

```text
- Composed: The history shows twelve completed launches.
```

The independently composed oracle did not contain it. The comparison still
passed because `ABOUT_THE_COMPOSING = /^- Composed: /` discards every line with
that prefix before it asks whether the oracle contains the line. The textarea
and clipboard also agreed because both consumed the same altered object.

The copy scanner was clean at **8,038 shipped strings, 7,954 placed**, and the
same focused guards passed at all three widths:

```text
6 passed (18.3s)
```

The legitimate difference is one metadata field at one structural position.
A regular expression over arbitrary lines grants that exception to any factual
claim that adopts the prefix.


## QA-84-065 — a custom property reaches `content` unseen

*Preserved verbatim from `PHASE_84_QA_HANDOFF.md`, round 19.*


**Severity:** Blocker. **Decision:** D-209.
**Class:** the CSS reader composes quoted strings only when they occur directly
inside a `content` declaration.

I put the prohibited sentence in a custom property and referenced it from the
visible pseudo-element:

```css
body::before {
  --qa-round-19-copy: 'The app will choose something better next time.';
  content: var(--qa-round-19-copy);
}
```

The scan remained exactly at the honest baseline:

```text
Rendered copy scan clean — 8035 shipped strings (7951 placed in a module)
across 1 script chunk(s) and 2 stylesheet(s).
```

The browser's computed `::before` content was exactly **The app will choose
something better next time.**, displayed as a block on More. `contentIn` saw
only `var(--qa-round-19-copy)` and read no quoted value; it never inspected the
custom-property declaration that supplied the rendered words.

This is static authored CSS, not the declared open case of runtime data. The
browser resolves the property before rendering it, while the guard stops at
the direct declaration syntax.
