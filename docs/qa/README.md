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
confirmation that known deferred items are unchanged; an overall **PASS** or
**FAIL**; a recommended next action; and, when the recommendation sends the
owner back to the builder, the recommended Claude model and intelligence level
for that next step.

## 4 — The defect loop, when QA fails

1. The owner returns to the **original builder conversation**.
2. The builder reads `docs/qa/PHASE_XX_QA_HANDOFF.md`.
3. Each blocking defect goes through plan section 42: reproduce, identify the
   whole class, write a regression, **prove it fails when the defect is
   reintroduced**, fix the root cause, rerun the full gate, deploy a new
   checkpoint.
4. The builder does **not** mark the phase GREEN.
5. The builder gives the exact repaired SHA and a retest prompt for the **same**
   QA conversation.
6. The owner returns to that same QA conversation, which retests and updates the
   same report.

Repeat until QA passes.

## 5 — Owner screenshot review

The owner may review QA's screenshots and results separately with another
reviewer. Anything that surfaces — wording, hierarchy, interface, semantics,
product judgement — is phase-gate feedback and re-enters the builder → QA loop
when warranted.

## 6 — GREEN

Only after QA reports PASS. The owner returns to the builder conversation; the
builder reads the report, confirms the tested SHA and the PASS, performs the
formal closeout, and only then is the phase GREEN.

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
