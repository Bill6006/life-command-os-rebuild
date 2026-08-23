# Next prompt

Canonical plan section 43, and section 52 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 7 — AI exports + backup/restore is YELLOW: READY FOR INDEPENDENT
RETEST.** Per D-077 this checkpoint does not self-certify. The full record is
in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 7 — AI exports +
backup/restore"; the nine standing semantic and storage invariants are D-091;
the QA protocol is [`qa/README.md`](qa/README.md) and D-090; the
handoff-launcher rule is D-092.

**This is a repair of the QA handoff itself, not of Phase 7's product
behaviour.** Independent QA's first run stopped at the mandatory
deployed-checkpoint preflight and returned FAIL, correctly, because the prior
version of this file told QA to block unless `build-info.json` reported
`322c00b` — a commit that the very act of pushing that instruction had already
superseded. No product behaviour was tested. The repair is below (D-097,
DEF-0061) and Phase 7's application code is untouched since `322c00b`.

---

## What was wrong, and why it will not recur

This repository redeploys the Preview on **every** push to `main`, including a
documentation-only one, and `build-info.json` always reports the SHA of
whatever commit was actually pushed. A "pin the checkpoint" commit that names
an earlier commit as "the deployed checkpoint, confirmed live" is
self-contradicting the moment it is pushed — pushing it is what moves the
deployed SHA past the value it names. Phases 1 through 6 avoided this by never
asserting literal SHA equality as a blocking precondition, informally: "the
closing SHA… `git diff X..HEAD --name-only` shows only `docs/`, so the
deployed product code **is** the checkpoint's." Phase 7's first QA handoff
dropped that reasoning in favour of an exact-match assertion, and it broke the
first time a docs commit followed a product commit under it.

**The rule now, D-097:** a handoff never asserts that the deployed SHA equals
a named product commit. It names the product checkpoint (the last commit that
changed anything the build emits) and separately reports the deployed SHA
(read live, whatever it is), and where equivalence matters, it is established
by checking the diff between them touches nothing bundle-relevant — not by
string comparison.

**Made checkable:** `scripts/checkpoint-equivalence.mjs <product-sha>` runs
`git diff --name-only` between the named product commit and the current ref
and fails if anything under `src/`, `public/`, or the build-input files at the
repository root changed. It knows nothing about `docs/`, `scripts/`, `tests/`
or `.github/`, because none of them can alter one byte of `dist/`.

---

## CHECKPOINT

- **Product checkpoint:** `322c00b` — the last commit that changed anything
  the build emits. Phase 7's application code, tests and the Android gate
  script are unchanged since it.
- **Deployed SHA:** read `preview/build-info.json` live and use whatever
  `commitSha` it reports. **Do not compare it against a value written in this
  file** — every commit after `322c00b`, including this one, moves the
  deployed SHA forward, by design (D-097).
- **Bundle equivalence, checkable rather than asserted:** run
  `node scripts/checkpoint-equivalence.mjs 322c00b` from a checkout at the
  deployed SHA. It is read-only — a `git diff` and nothing else — and safe to
  run as evidence-gathering under the QA protocol. It should report that
  nothing bundle-relevant changed. If it reports otherwise, stop: something
  changed that this handoff does not account for, and that is a real
  precondition failure, not a naming one.

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest current Codex reasoning model (GPT-5.1-Codex-Max, or
  the nearest current equivalent if renamed)
- **Reasoning level:** **High**
- **Conversation:** **SAME — the Codex conversation that returned the
  checkpoint-preflight FAIL.** This is a retest after a builder repair
  (`qa/README.md` section 4); no Phase 7 product testing has happened yet, so
  the work ahead is the full first pass, not a narrow recheck — but the
  conversation routing is a retest's regardless, per D-090.
- **Why this model and level:** unchanged from the original assignment —
  nothing about the size or stakes of the actual Phase 7 acceptance work has
  changed, only the checkpoint-naming defect that blocked reaching it.
- **Why the same conversation:** the reviewer must not re-derive context it
  already has, and D-090's retest rule sends a repair back to the conversation
  that found it.
- **Report path:** `docs/qa/PHASE_07_QA_HANDOFF.md` — QA owns it, and QA
  alone. Update it in place with a new section for this run; do not overwrite
  the FAIL already recorded.

---

## COPY/PASTE PROMPT

```text
Independent QA retest — Life Command OS rebuild, Phase 7 (AI exports +
backup/restore). Repository:

D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You are the SAME Codex QA conversation that returned FAIL on the deployed-
checkpoint preflight (QA-07-001). Read docs/NEXT_PROMPT.md in full before
acting — it has been rewritten since your last read.

WHAT CHANGED AND WHAT DID NOT

Nothing in Phase 7's application code changed. The defect you found was real
and the stop was correct: the prior handoff told you to block unless
build-info.json reported 322c00b, and it never could, because pushing that
instruction is what moved the deployed SHA past it. That is now D-097 and
DEF-0061 in the repository's own decision log and defect ledger — read them if
you want the full account, but you do not need to re-verify the mismatch
itself; it is not in dispute.

CHECKPOINT, THIS TIME

Product checkpoint: 322c00b. Do not expect build-info.json to report this
literal string — every commit since, including this one, moves the deployed
SHA forward by design. Instead:

1. Fetch preview/build-info.json live (bypass cache) and record whatever
   commitSha it reports as the deployed SHA you are testing.
2. Confirm bundle equivalence yourself, mechanically rather than by trusting
   this document: run
     node scripts/checkpoint-equivalence.mjs 322c00b
   from a checkout at the deployed SHA. This is a read-only git diff — it
   repairs nothing and is safe evidence-gathering under the QA protocol. It
   should report that nothing bundle-relevant changed since 322c00b. If it
   reports a bundle-relevant change, STOP and report that as a real blocking
   finding — it would mean something changed that this handoff does not
   account for.
3. If it passes, proceed. The deployed build is 322c00b's product code,
   whatever commit SHA the badge shows.

ORDER OF WORK FROM HERE — D-090's seven steps, qa/README.md section 2

1. Sealed cold owner-use, before reading anything else in the repository
   beyond this prompt and the checkpoint confirmation above.
2. Claim-to-evidence semantic audit.
3. Semantic and product correctness.
4. Targeted Phase 7 acceptance.
5. Targeted known-defect regression for the surfaces this phase touched.
6. Architecture inspection where warranted.
7. Full-suite duplication only on a concrete trigger.

WHAT THIS PHASE BUILT

A new destination, Data, reached from More (#/data). Three deliberately
different things on it:

- A REVIEW EXPORT: a description of what the app currently believes, composed
  of chosen sections, with an embedded handoff prompt for whichever assistant
  reads it. Allowed to leave things out.
- A BACKUP: the file the owner's whole recorded life comes back from. The
  claim is that NOTHING is omitted — not the private domain, not a row the
  parser could not read, not a field this schema version has never heard of.
- A RESTORE: replaces everything. Validate, preview, atomic apply, verify,
  roll back on failure, never report a success it cannot deliver.

Governing requirements: canonical plan section 52 (the phase), section 29
(full backup and restore), section 11 (the private domain's export
requirement), G-012 and G-013 in section 32, D-091's nine invariants. Read
those yourself.

ACCEPTANCE THIS PHASE IS BEING HELD TO

- G-013: selected sections are present; the Private section can be included;
  the handoff prompt is embedded; the prompt says what to keep, change, remove
  and NOT change.
- The export composer offers section selection, select all, clear, a
  remembered last selection, and carries the app/engine version, the current
  data range and the current selected domains.
- The handoff prompt asks for an app-tuning review when diagnostics are
  included.
- A full backup is complete, transactional, verified, with rollback, and
  tested on a phone.
- Export stays reliable on a phone.
- Restore exactness is proven.
- Data and restore stay accessible during degraded-state tests (G-012).

WHERE TO PUSH HARDEST — the builder's own claims; disprove them, don't confirm them

- "A backup omits nothing." Take one with unreadable rows in the store and one
  with something in the private domain. Compare field by field, not by count.
- "A restore never reports a success it cannot deliver." What does the owner
  see if the write fails? The read-back? Putting his old history back on top
  of that failing too? Is the difference between "nothing was written" and
  "something was written and then undone" legible to a person?
- "A backup is of his own records whatever is on screen." Load a synthetic
  scenario in the QA laboratory and take a backup. Whose history is in it?
- "A restore does not run while a test history is on screen." Right rule, or a
  refusal that reads as a bug? The builder chose it and recorded why in D-093
  — decide whether you agree.
- The export document. It leaves the device. Does any sentence claim more than
  the record supports? Does it say whose history it is? Does a figure ever
  appear without the quantity it counts?
- The handoff prompt, read as the assistant receiving it. Useful review, or a
  plausible one?
- The private section: off by default, not reached by "select all", not
  remembered between exports. Check all three, and check the document says
  which way round it is when left out.
- Copy, on a real phone. The builder's own automated Android gate passed
  clean twice and a read-through of the actual screen then found five wording
  defects each time — a plural that did not agree, a pronoun that did not
  agree, a machine timestamp, a full-length hash on a 360px screen, and (on
  the second reading) two of the sweeps meant to catch the first three that
  could not fire because no history in the library held exactly one record.
  Assume there are more of exactly this shape.

KNOWN AND DISCLOSED — confirm unchanged rather than rediscovering

Deliberately not built: authenticated/tamper validation (D-095), migrations,
selective restore, override of a refused file, a library of past backups,
legacy import. DEF-0059 (a literal-scanning guard silently covered less than
it claimed) and DEF-0060 (counts beside plural nouns, and two sweeps that
could not fire on them) are both closed this phase, with their own regressions.
guide-resume.test.ts remains resolved-unreproduced from Phase 6.

One tooling note: npx playwright test serves a PREBUILT dist and never builds.
Use npm run test:browser if you change source and want the change tested.

OUTPUT

Update docs/qa/PHASE_07_QA_HANDOFF.md in place — add this run as a new section
rather than overwriting the recorded FAIL, per the contract in plan section 43
and qa/README.md section 3. Then, in the same response and without being asked
(D-082), output the complete ready-to-paste next prompt — on FAIL addressed to
the CURRENT builder conversation for repair under section 42, on PASS
addressed to it for the formal GREEN closeout — and end with the four lines
and the launcher (D-092): model, reasoning level, conversation, and a short
copyable block naming the repository path and the exact MD file the next
conversation must read.
```
