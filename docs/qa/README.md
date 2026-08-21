# Independent QA protocol

Owner decision D-077. This governs every remaining build phase from Phase 5 on,
and sits above the canonical plan in the authority order (plan section 1).

**A builder conversation may not approve its own phase.**

Phase 4 is why. It passed everything it could measure — 574 unit tests, 171
browser tests at three viewport widths, a clean-checkout verify, green CI, a
matching Preview SHA — and then failed a phone gate on five counts, three of
them blocking. Not one came from a failing assertion. The builder had written
the tests, so the tests asked the questions the builder already knew to ask.

---

## The two roles

**QA tests. The builder fixes.** They never share a conversation.

|                         | Builder                                  | Independent QA                                 |
| ----------------------- | ---------------------------------------- | ---------------------------------------------- |
| Conversation            | continues across a phase and its repairs | a new one, started fresh                       |
| May change product code | yes                                      | **no**                                         |
| May write               | anything                                 | this report and QA-only evidence, nothing else |
| Decides GREEN           | no                                       | no — it recommends; the owner decides          |

QA reviews the checkpoint rather than continuing the builder's reasoning. That
is the whole value: a reviewer who inherits the author's model of why something
is correct will check the same things the author already checked.

---

## 1 — The builder finishes

When the builder believes the implementation is complete, the phase becomes:

> **YELLOW — READY FOR INDEPENDENT QA**

Never GREEN. The builder completes its normal gate first: unit, contract,
synthetic and adversarial tests; browser tests; clean-checkout `npm run verify`;
privacy scan; CI; deployed Preview SHA equal to the checkpoint SHA; and its own
Android-style mobile pass where the phase touches a surface.

In that **same response**, without being asked, it provides: phase status;
checkpoint SHA; deployed Preview SHA and whether they match; exact verification
counts; known, open and deferred items; the recommended Claude model and
intelligence level for QA; the conversation instruction (**NEW**); the exact QA
report path; and the complete copy/paste prompt for the QA conversation.

## 2 — Independent QA runs

In a **new** conversation. It reads the governing docs and the implementation
fresh, inspects the phase's acceptance criteria, and tests the deployed
checkpoint.

It uses a real Android-style Playwright context — touch, a mobile user agent, a
realistic device pixel ratio, mobile scrolling and interaction — not a narrow
desktop viewport. Phase 4's five defects were all invisible at three desktop
widths.

It reads whole owner-facing screens as a person, not as a set of string
assertions, and it actively tries to disprove that the phase is correct:
contradictions between two lines of the same screen; questions whose own answers
cannot answer them; explanations that do not match the evidence the decision
used; things the app asks despite already knowing; claims made from ignorance;
stale product or scaffolding copy; questionnaire, dashboard or nag behaviour;
lost subjects and orphan pronouns; touch targets, overflow, sticky nav,
safe-area, button shift and double-tap behaviour. It also names **which existing
automated tests gave false confidence**.

## 3 — The report

Written to a predictable path:

```
docs/qa/PHASE_XX_QA_HANDOFF.md
```

Containing at minimum: phase; checkpoint SHA tested; deployed SHA tested;
Android/mobile configuration; the governing acceptance criteria used; scenarios
and flows tested; PASS/FAIL for each; exact reproductions for defects; semantic,
behavioural and mobile/UI defects separately; blocking vs non-blocking;
screenshot and evidence references; automated tests that gave false confidence;
confirmation that known deferred items are unchanged; and an overall **PASS**
or **FAIL**.

## 3a — The QA handoff output rule (owner decision D-082)

**Every independent QA run or retest — PASS or FAIL — automatically ends its
response with the complete next handoff.** QA does not wait for the owner to
ask for it, and does not stop at "recommended next action." In the same
response as the report, QA provides:

- overall **PASS** or **FAIL**;
- the QA-tested product SHA;
- the QA-report commit SHA, if the report was committed;
- the exact QA report path;
- the recommended Claude **model** for the next action, with a one-sentence
  reason;
- the recommended **intelligence level**, with a one-sentence reason;
- the **conversation** instruction (which conversation the next prompt goes
  to), with a one-sentence reason;
- the **complete ready-to-paste next prompt**.

Phase 5's first QA run is why this exists: it returned FAIL with a
recommendation but no prompt, and the owner had to come back and ask for one
before the builder conversation could act. That extra turn is exactly what
this rule removes.

**D-083 amendment.** The complete next prompt above still gets written in
full into `docs/qa/PHASE_XX_QA_HANDOFF.md` (and, on PASS, the builder's
closeout still writes the next phase's complete prompt into
`docs/NEXT_PROMPT.md`). The chat response does not need to repeat that whole
prompt to satisfy 3a. It closes instead with a short, separate launcher:
the recommended model, the recommended intelligence level, the conversation
instruction (NEW/CURRENT/SAME), and a short ready-to-copy prompt that names
the repository path, the exact MD file the next conversation must read,
which handoff it is, and instructs that conversation to read the file in
full and execute it exactly as written — not to ask the owner to paste the
file's contents. See decision D-083 and plan section 43's launcher
requirement for the full rule and an example shape.

**On FAIL**, the next prompt is addressed to **CURRENT — the original builder
conversation for the unresolved phase**, and instructs it to:

- read the exact QA report;
- keep the phase **YELLOW**;
- repair each blocking/material defect under plan section 42 (reproduce,
  identify the whole class, regression, prove it fails when reintroduced, fix
  the root cause, rerun the full gate);
- preserve everything QA already passed and every explicit deferral;
- deploy a repaired checkpoint;
- provide a retest prompt addressed to the **same** QA conversation;
- not start the next phase.

QA should not prescribe the implementation fix beyond what its own evidence
supports — reproductions, the defect class, the evidence, and the acceptance
expectation the fix must meet are QA's to give; root-cause repair is the
builder's.

**On PASS**, the next prompt is addressed to **CURRENT — the original builder
conversation for that phase**, and instructs it to:

- read the QA report;
- confirm the QA-tested SHA and the PASS;
- perform the formal GREEN closeout;
- update the governing docs;
- preserve deferred items;
- provide the next phase's recommended model, intelligence level, CURRENT/NEW
  instruction, and the complete next-phase prompt;
- not make the owner ask for another handoff.

## 4 — The defect loop, when QA fails

1. The owner returns to the **original builder conversation**, carrying the
   FAIL prompt QA already produced under 3a.
2. The builder reads `docs/qa/PHASE_XX_QA_HANDOFF.md`.
3. Each blocking defect goes through plan section 42: reproduce, identify the
   whole class, write a regression, **prove it fails when the defect is
   reintroduced**, fix the root cause, rerun the full gate, deploy a new
   checkpoint.
4. The builder does **not** mark the phase GREEN.
5. The builder gives the exact repaired SHA and a retest prompt for the **same**
   QA conversation.
6. The owner returns to that same QA conversation, which retests, updates the
   same report, and again outputs the complete next handoff under 3a —
   whichever way the retest goes.

Repeat until QA passes.

## 5 — Owner screenshot review

The owner may review QA's screenshots and results separately with another
reviewer. Anything that surfaces — wording, hierarchy, interface, semantics,
product judgement — is phase-gate feedback and re-enters the builder → QA loop
when warranted.

## 6 — GREEN

Only after QA reports PASS. The owner returns to the builder conversation,
carrying the PASS closeout prompt QA already produced under 3a; the builder
reads the report, confirms the tested SHA and the PASS, performs the formal
closeout, and only then is the phase GREEN.

The closing response carries, without being asked: final status; approved
checkpoint SHA; the closing SHA if a docs-only closeout moved it; deployed
Preview SHA and match; verification results; the QA report path and the SHA QA
tested; deferred and open items; decisions; the next phase; the recommended
Claude model; the recommended intelligence level; CURRENT or NEW; a short
reason for each of the three; required references; and the complete next
copy/paste prompt.

---

## Conversation rule

- Implementing or repairing the **same unresolved phase** → CURRENT builder
  conversation.
- Independent QA → **NEW** conversation.
- QA retest after a builder repair → the **same** QA conversation that ran the
  original test.
- A genuinely new phase after GREEN → normally a NEW builder conversation.

Recommend CURRENT or NEW explicitly at every handoff. Never assume it forever.

## Intelligence level rule

Recommend the **lowest level appropriate to the work**, not Max by default.

- **High** — ordinary implementation, UI work, straightforward domain wiring,
  documentation, normal repairs.
- **Max** — difficult cross-system semantics, learning and inference
  mathematics, privacy architecture, migration architecture, or especially
  ambiguous root-cause-heavy defects.
- **Independent QA** — High by default; Max when the phase or a discovered
  defect genuinely needs deeper architectural reasoning.

The recommendation stays **outside** the copy/paste prompt so the owner can
switch levels before sending it.

## Model recommendation rule

Owner decision D-080. Every handoff also names **which Claude model** the next
step should run on — a third recommendation, alongside intelligence level and
conversation, each with its own one-sentence reason, all stated outside the
copy/paste prompt.

Choose the **lowest model/effort combination that does not materially risk
quality**. Do not default to the strongest available model or to Max effort.

- **Sonnet-class, High when sufficient** — ordinary implementation, UI work,
  straightforward domain wiring, documentation, routine repairs, and ordinary
  independent QA.
- **Opus-class, High or Max by actual difficulty** — difficult cross-system
  semantic reasoning, learning/inference design, privacy architecture,
  migration architecture, unusually ambiguous root-cause analysis, or
  demanding adversarial reasoning.
- **A cheaper/lower option** — genuinely safe, mechanical, local work.
- If Anthropic renames or replaces a model, recommend the nearest current
  equivalent and say that is what happened rather than naming a model that no
  longer exists.

Model and intelligence level are independent choices. A Sonnet-class model at
High and an Opus-class model at High are different recommendations; state
both rather than collapsing them into one line.

## What this does not replace

Per-phase QA asks _did this phase actually work?_

Plan section 56's independent adversarial hardening asks _now that the whole
system exists, can interactions across phases break it?_

Both remain. Neither substitutes for the other.

## What QA must not be told

Give QA the governing requirements, the acceptance criteria, the checkpoint, the
explicit deferrals and the repository paths it needs.

Do **not** tell it what the builder believes is correct, which behaviours are
intentional, or what conclusion is expected. A reviewer handed the author's
answer key stops being independent.
