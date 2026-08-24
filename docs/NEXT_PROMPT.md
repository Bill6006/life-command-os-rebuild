# Next prompt

Canonical plan section 43, and section 52 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 7 — AI exports + backup/restore is YELLOW: ROUND 2 REPAIRED, AWAITING
CODEX RETEST.** Per D-077 this checkpoint does not self-certify. The full
record is in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 7"; the standing
semantic and storage invariants are D-091; the QA protocol is
[`qa/README.md`](qa/README.md) and D-090.

Round 2 was the first full product pass and returned **FAIL** on seven product
findings and one in `PHASE_STATUS.md`. All eight are repaired
(DEF-0062, D-098, D-099). QA's report and its evidence are unchanged and
unedited — the builder may not write to either.

---

## CHECKPOINT

Reported to D-097's pattern. The product checkpoint and the deployed SHA are
two facts, and the relationship between them is checked rather than asserted.

- **Product checkpoint:** `3a8e8b6` — the last commit that changed anything the
  build emits.
- **Deployed SHA:** read `preview/build-info.json` live and use whatever
  `commitSha` it reports. Do not compare it against a value written here; every
  commit after the checkpoint, including this one, moves it forward by design.
- **Bundle equivalence:** run `node scripts/checkpoint-equivalence.mjs 3a8e8b6`
  from a checkout at the deployed SHA. Read-only. It should report that nothing
  bundle-relevant changed. If it reports otherwise, stop — that is a real
  precondition failure rather than a naming one.

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest current Codex reasoning model (GPT-5.1-Codex-Max, or
  the nearest current equivalent if renamed)
- **Reasoning level:** **High**
- **Conversation:** **SAME — the Codex conversation that ran rounds 1 and 2.**
  A retest returns to the conversation that found the defects; it has its own
  reproductions and the acceptance expectations it set for each.
- **Why this model and level:** the repairs cross export semantics, a privacy
  boundary, owner/laboratory time, IndexedDB failure handling and mobile
  stacking. Judging whether each root cause was actually reached — rather than
  the reported symptom papered over — is the same class of reasoning that found
  them.
- **Report path:** `docs/qa/PHASE_07_QA_HANDOFF.md`. Add a round-3 section; do
  not overwrite rounds 1 or 2.

---

## COPY/PASTE PROMPT

```text
Phase 7 round-2 repair is ready for your retest. This is the SAME Codex QA
conversation that ran rounds 1 and 2 — you have your own reproductions of
QA-07-002 through QA-07-009 and the acceptance expectations you set for each.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_07_QA_HANDOFF.md. Add a "Round 3 — Codex retest"
section. It remains the only file you may write, alongside narrowly scoped
evidence under test-results/. Rounds 1 and 2 were committed exactly as you
wrote them.

CHECKPOINT

Product checkpoint: 3a8e8b6. As in round 2, do not expect build-info.json to
report that literal string. Read the deployed SHA live, then confirm bundle
equivalence yourself:

  node scripts/checkpoint-equivalence.mjs 3a8e8b6

WHAT WAS REPAIRED

All eight findings. The reasoning is in PHASE_STATUS.md under "Independent QA,
round 2", the defect entry is DEF-0062, and two of the repairs became standing
decisions — D-098 (an artefact states its identity in its first line, and an
excluded area is excluded from the metadata too) and D-099 (a restore's
post-reopen confirmation is part of its result, and a failed one is not rolled
back).

Two of those are judgement calls rather than mechanical fixes, and you should
decide whether you agree rather than checking that the symptom is gone:

- QA-07-003: the private exclusion now also drops the withheld "Private entry"
  row from the recent record, which is the opposite of what Timeline does on
  the owner's own screen. The argument is that Timeline is right there because
  dropping the row would tell him his history is thinner than it is, and this
  artefact is different because it leaves the device under an explicit promise.
  The document states once that the exclusion covers whether anything is
  recorded there, so the silence is not meant to read as an empty area. Test
  whether that holds as a reader.
- QA-07-007: a failed post-restore confirmation is deliberately NOT rolled
  back. The write had committed and matched its fingerprint before the reopen
  ran, so the argument is that undoing it would trade a restore that probably
  worked for one that certainly did not happen. The outcome is a third state —
  applied, verified once, not confirmed, not undone — and the owner is told to
  reopen the app and look. Decide whether that is the right call and whether
  the wording earns it.

WHAT TO RETEST

Your eight findings, each against the acceptance expectation you set. Then the
things a repair of this size can break, which is the more likely place to find
something:

- Everything round 2 passed. Field-by-field backup exactness with private,
  unknown-field and malformed rows; damaged-file refusal; same-file retry;
  atomic apply; the first fingerprint verification; a successful reopen;
  G-012 reachability; deliberate Private inclusion rendering in full; Select
  all and remembered-Private safety; prompt completeness and the diagnostics
  tuning request.
- The export header now describes the selected document rather than the whole
  store. Check it against ordinary selections, not only the zero-section case:
  does what it reports match what the document actually contains?
- The private exclusion now reaches coverage, the header's areas and the
  recent record. Check it does not over-reach — an ordinary non-private
  document should be unchanged.
- The restore's third outcome state. Force the reopen to fail all three ways
  (throw, memory fallback, different contents) and read what the owner is
  shown each time.
- The header group now sticks as one element. Check the bar and both notices
  at several scroll positions, on Data and elsewhere, and check the build
  notice as well as the laboratory one.
- Copy, on a real phone, from the first line of the document. Two rounds of
  reading this screen have produced findings both times.

KNOWN AND DISCLOSED — confirm unchanged rather than rediscovering

Deliberately not built: authenticated/tamper validation (D-095), migrations,
selective restore, override of a refused file, a past-backup library, legacy
import. DEF-0059, DEF-0060, DEF-0061 and DEF-0062 are recorded closed.
guide-resume.test.ts remains resolved-unreproduced. Bare npx playwright test
still serves a prebuilt dist; npm run test:browser builds first.

OUTPUT

Update docs/qa/PHASE_07_QA_HANDOFF.md in place with the round-3 section, to the
contract in plan section 43 and qa/README.md section 3. Then, in the same
response and without being asked (D-082), output the complete ready-to-paste
next prompt — on FAIL to the CURRENT builder conversation for repair under
section 42, on PASS to it for the formal GREEN closeout — and end with the four
lines and the launcher (D-092).
```
