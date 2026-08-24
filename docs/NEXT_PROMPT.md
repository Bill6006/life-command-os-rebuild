# Next prompt

Canonical plan section 43, and section 52 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 7 — AI exports + backup/restore is YELLOW: AWAITING CODEX RETEST.**
Per D-077 this checkpoint does not self-certify. The full record is in
[`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 7"; the standing semantic and
storage invariants are D-091; the QA protocol is [`qa/README.md`](qa/README.md)
and D-090.

Three QA rounds so far and only one reached the product. Round 2's seven
product findings are repaired (DEF-0062). Round 3 stopped at the checkpoint
gate on a handoff pushed before its own deploy had landed, and a checker that
described that as eight bundle differences — both repaired (DEF-0063, and
D-097's amendment).

**This handoff was written after the deploy landed and after the live SHA was
confirmed**, which is the step round 3 was missing.

---

## CHECKPOINT

- **Product checkpoint:** `3a8e8b6` — the last commit that changed anything the
  build emits.
- **Deployed SHA at the time of writing:** `8cc75f3`, read live. It contains
  the checkpoint; the difference between them is documentation and the
  equivalence script.
- **Confirm it yourself, in one command:**

  ```
  node scripts/checkpoint-equivalence.mjs 3a8e8b6 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
  ```

  It reads the live SHA, checks the checkpoint is an ancestor of it, and then
  checks nothing bundle-relevant changed. Read-only.

**If it reports that the deployed build does not contain the checkpoint**, the
deploy has not landed yet — wait and run it again. That is now its own message
rather than a list of source files, which is what sent round 3 the wrong way.

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest current Codex reasoning model (GPT-5.1-Codex-Max, or
  the nearest current equivalent if renamed)
- **Reasoning level:** **High**
- **Conversation:** **SAME — the Codex conversation that ran rounds 1, 2 and 3.** A retest returns to the conversation that found the defects; it has its
  own reproductions and the acceptance expectations it set for each.
- **Why this model and level:** the round-2 repairs cross export semantics, a
  privacy boundary, owner/laboratory time, IndexedDB failure handling and
  mobile stacking. Judging whether each root cause was reached — rather than
  the reported symptom papered over — is the same class of reasoning that found
  them.
- **Report path:** `docs/qa/PHASE_07_QA_HANDOFF.md`. Add a round-4 section; do
  not overwrite rounds 1 to 3.

---

## COPY/PASTE PROMPT

```text
Phase 7 is ready for your retest, on a deployment that carries the repair this
time. This is the SAME Codex QA conversation that ran rounds 1, 2 and 3 — you
have your own reproductions of QA-07-002 through QA-07-009.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_07_QA_HANDOFF.md. Add a "Round 4 — Codex retest"
section. It remains the only file you may write, alongside narrowly scoped
evidence. Rounds 1 to 3 were committed exactly as you wrote them.

CHECKPOINT

Product checkpoint: 3a8e8b6. Confirm it yourself in one command:

  node scripts/checkpoint-equivalence.mjs 3a8e8b6 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

It reads the live SHA, checks the checkpoint is an ancestor of it, then checks
nothing bundle-relevant changed. Read-only.

Round 3's blocker is closed at both ends. The script now reports "the deployed
build does not contain the checkpoint" as its own outcome rather than as a list
of source files — your round-3 diagnosis, made mechanical — and D-097 now says
a checkpoint is named only after its deploy has landed. This handoff was
written after confirming the live SHA.

WHAT TO RETEST

Your eight round-2 findings, each against the acceptance expectation you set.
Two are judgement calls rather than mechanical fixes, and you should decide
whether you agree rather than checking the symptom is gone:

- QA-07-003: the private exclusion now also drops the withheld "Private entry"
  row from the recent record — the opposite of what Timeline does on the
  owner's own screen. The argument is that Timeline is right there, because
  dropping the row would tell him his history is thinner than it is and he
  already knows what is in it, and that this artefact is different because it
  leaves the device under an explicit promise. The document states once that
  the exclusion covers whether anything is recorded there, so the silence is
  not meant to read as an empty area. Test whether that holds as a reader.
- QA-07-007: a failed post-restore confirmation is deliberately NOT rolled
  back. The write had committed and matched its fingerprint before the reopen
  ran, so the argument is that undoing it would trade a restore that probably
  worked for one that certainly did not happen. The outcome is a third state —
  applied, verified once, not confirmed, not undone — and the owner is told to
  reopen the app and look. Decide whether that is right and whether the wording
  earns it.

Then the things a repair of this size can break:

- Everything round 2 passed. Field-by-field backup exactness with private,
  unknown-field and malformed rows; damaged-file refusal; same-file retry;
  atomic apply; the first fingerprint verification; a successful reopen; G-012
  reachability; deliberate Private inclusion rendering in full; Select all and
  remembered-Private safety; prompt completeness and the diagnostics tuning
  request.
- The export header now describes the selected document rather than the whole
  store. Check ordinary selections, not only the zero-section case: does what
  it reports match what the document actually contains?
- The private exclusion now reaches coverage, the header's areas and the recent
  record. Check it does not over-reach — an ordinary non-private document
  should be unchanged.
- The restore's third outcome state. Force the reopen to fail all three ways
  (throw, memory fallback, different contents) and read what the owner is shown
  each time.
- The header group now sticks as one element instead of three. Check the bar
  and both notices at several scroll positions, on Data and elsewhere, and
  check the build notice as well as the laboratory one.
- Copy, on a real phone, from the first line of the document. Two readings of
  this screen have produced findings both times.

KNOWN AND DISCLOSED — confirm unchanged rather than rediscovering

Deliberately not built: authenticated/tamper validation (D-095), migrations,
selective restore, override of a refused file, a past-backup library, legacy
import. DEF-0059 through DEF-0063 are recorded closed. guide-resume.test.ts
remains resolved-unreproduced. Bare npx playwright test still serves a prebuilt
dist; npm run test:browser builds first.

OUTPUT

Update docs/qa/PHASE_07_QA_HANDOFF.md in place with the round-4 section, to the
contract in plan section 43 and qa/README.md section 3. Then, in the same
response and without being asked (D-082), output the complete ready-to-paste
next prompt — on FAIL to the CURRENT builder conversation for repair under
section 42, on PASS to it for the formal GREEN closeout — and end with the four
lines and the launcher (D-092).
```
