# Next prompt

Canonical plan section 43, and section 52 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 7 — AI exports + backup/restore is YELLOW: READY FOR INDEPENDENT QA.**
Per D-077 this checkpoint does not self-certify. The full record is in
[`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 7 — AI exports +
backup/restore"; the nine standing semantic and storage invariants are D-091;
the QA protocol is [`qa/README.md`](qa/README.md) and D-090; the
handoff-launcher rule is D-092.

**Product checkpoint: `322c00b`.** Deployed to Preview and confirmed live.

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest current Codex reasoning model (GPT-5.1-Codex-Max, or
  the nearest current equivalent if renamed)
- **Reasoning level:** **High**
- **Conversation:** **NEW CODEX CONVERSATION REQUIRED FOR INDEPENDENCE**
- **Why this model:** this phase writes to and replaces the owner's only copy
  of his own history, and the interesting failures are the ones that report a
  success they cannot deliver — which is reasoning about what a claim rests on
  rather than about whether a control works.
- **Why this level:** High. The surface is small and the acceptance criteria
  are explicit, but the cost of a missed defect here is a life's record, and
  step 2 of the protocol — claim-to-evidence — is the step that found
  everything the last two phases lost rounds to.
- **Why a new conversation:** independence is part of the gate. The builder's
  model of why this is correct must not be inherited (D-077, D-090).
- **Report path:** `docs/qa/PHASE_07_QA_HANDOFF.md` — QA owns it, and QA alone.

---

## COPY/PASTE PROMPT

```text
Independent QA — Life Command OS rebuild, Phase 7 (AI exports + backup/restore).
Repository:

D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

You are Codex, running independent QA under owner decisions D-077 and D-090.
You test; you do not repair. You may write only
docs/qa/PHASE_07_QA_HANDOFF.md and narrowly scoped QA evidence artifacts.

CHECKPOINT

Product checkpoint SHA: 322c00b
Deployed Preview:       https://bill6006.github.io/life-command-os-rebuild/preview/
Confirm for yourself that preview/build-info.json reports 322c00b before you
conclude anything. If it does not, stop and say so.

ORDER OF WORK — D-090's seven steps, in qa/README.md section 2

1. SEALED COLD OWNER-USE. Open the deployed Preview and use it as the owner
   would, BEFORE reading any repository document. Write down what it appears to
   claim. Everything Phase 6 lost three rounds to was visible in this step and
   invisible to every suite; every finding this phase's builder made after its
   own automated gate came back clean was also found here and nowhere else.
2. CLAIM-TO-EVIDENCE SEMANTIC AUDIT. For each claim on screen, establish what
   it actually rests on.
3. SEMANTIC AND PRODUCT CORRECTNESS. Does the app mean what it says, and is
   what it says worth saying?
4. TARGETED PHASE ACCEPTANCE, now that the meaning is understood.
5. TARGETED KNOWN-DEFECT REGRESSION for the surfaces this phase touched.
6. ARCHITECTURE INSPECTION WHERE WARRANTED.
7. FULL-SUITE DUPLICATION ONLY ON A CONCRETE TRIGGER.

Green builder tests are evidence. Re-running a suite that was already green
buys nothing and costs the attention steps 1 and 2 need.

WHAT THIS PHASE BUILT

A new destination, Data, reached from More (#/data). Three things on it, and
the builder's claim is that they are deliberately three different things:

- A REVIEW EXPORT: a description of what the app currently believes, composed
  of chosen sections, with an embedded handoff prompt for whichever assistant
  reads it. It is allowed to leave things out.
- A BACKUP: the file the owner's whole recorded life comes back from. The
  claim is that NOTHING is omitted for any reason — not the private domain,
  not a row the parser could not read, not a field this schema version has
  never heard of.
- A RESTORE: replaces everything. Validate, preview, atomic apply, verify,
  roll back on failure, and never report a success it cannot deliver.

The governing requirements are canonical plan section 52 (the phase), section
29 (full backup and restore), section 11 (the private domain's export
requirement), G-012 and G-013 in section 32, and D-091's nine invariants. Read
those yourself rather than taking the summary above as the specification.

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

WHERE TO PUSH HARDEST

These are the builder's own claims. Treat each as something to disprove, not
as something to confirm.

- "A backup omits nothing." Take one with unreadable rows in the store. Take
  one with something in the private domain. Compare what comes back with what
  went in, field by field, rather than by counting.
- "A restore never reports a success it cannot deliver." What does the owner
  actually see if the write fails? If the read-back fails? If putting his old
  history back fails on top of that? Is the difference between "nothing was
  written" and "something was written and then undone" legible to a person?
- "A backup is of his own records whatever is on screen." Load a synthetic
  scenario in the QA laboratory and take a backup. Whose history is in the
  file?
- "A restore does not run while a test history is on screen." Is that the
  right rule, or is it a refusal that will read as a bug the first time he
  meets it? The builder chose it over the alternative and recorded why in
  D-093 — decide whether you agree.
- The export document itself. It leaves the device and is read by something
  that cannot see the evidence underneath it. Does any sentence in it claim
  more than the record supports? Does it say whose history it is? Does a
  figure ever appear without the quantity it counts?
- The handoff prompt. Read it as the assistant receiving it. Would it produce
  a useful review, or a plausible one?
- The private section. It is off by default, is not reached by "select all",
  and is not remembered between exports. Check all three, and check that the
  document says which way round it is when it is left out — an absence a
  reader cannot distinguish from an empty life is its own defect.
- Copy, on a real phone. The builder's automated Android gate passed clean and
  a read-through then found five defects in the wording — a plural that did
  not agree, a pronoun that did not agree, a machine timestamp and a
  sixty-four character hash on a 360px screen. Assume there are more.

KNOWN AND DISCLOSED — confirm these are unchanged rather than rediscovering them

- Deliberately not built, with reasons in PHASE_STATUS.md: authenticated /
  tamper validation (integrity is a content fingerprint, not a signature —
  D-095); migrations (schema 1 is the first); selective restore; any way to
  override a refused file; a library of past backups; legacy import (Phase 8).
- DEF-0059: two standing copy guards had silently stopped reading part of each
  file they swept. Repaired this phase, with its own self-tests.
- DEF-0060: counts printed beside plural nouns, and the two sweeps that could
  not fire on them. Repaired this phase.
- guide-resume.test.ts remains recorded as resolved-unreproduced from Phase 6.
  It did not fail during this phase.
- npx playwright test serves a PREBUILT dist and never builds. Use
  npm run test:browser if you change source and want the change tested.

HOW TO TEST

Use an Android-style Playwright context — touch, a mobile user agent, a
realistic device pixel ratio, mobile scrolling — not a narrowed desktop
viewport. Read whole screens as a person, not as a set of string assertions.
The builder's own gate script is scripts/android-gate.mjs; you are welcome to
read it, and you should assume it only checks what somebody already thought of.

There is one thing this phase makes easy to get wrong when testing it: seeding
records straight into IndexedDB does not reach the running app, because the
provider has already opened and a hash change is not a reload. The builder lost
a whole class of coverage to exactly that.

OUTPUT

Write docs/qa/PHASE_07_QA_HANDOFF.md to the contract in plan section 43 and
qa/README.md section 3: phase; checkpoint SHA tested; deployed SHA tested;
Android/mobile configuration; the governing acceptance criteria used; scenarios
and flows tested; PASS/FAIL per flow; exact reproductions; semantic,
behavioural, privacy and mobile/UI findings separately; blocking vs
non-blocking; which automated tests gave false confidence; confirmation that
the deferred items above are unchanged; and an overall PASS or FAIL.

Then, in the SAME response and without being asked (D-082), output the complete
ready-to-paste next prompt — on FAIL addressed to the CURRENT builder
conversation for repair under section 42, on PASS addressed to it for the
formal GREEN closeout — and end with the four lines and the launcher (D-092):
model, reasoning/intelligence level, conversation, and a short copyable block
naming the repository path and the exact MD file the next conversation must
read.
```

<!-- LCO_COMPLETE -->
