# Next prompt

**Phase:** 84 — **what the owner is trying to become**

**Actor:** Claude / **builder**.
**Conversation:** **CURRENT** — the original routing 84 Claude builder conversation.
**Model:** Claude Opus-class.
**Reasoning level:** **Max**.

---

## The owner has closed the open-ended QA loop

Rounds 15 to 19 produced twenty findings, four per round, with no taper. All
twenty were reviewed. **None was an owner-visible product defect.** Nineteen
show that a guard, scanner, oracle, verifier or build tie can be defeated by a
deliberately constructed forgery. One — **QA-84-064** — concerns release and
deployed-byte integrity.

**Decision D-210 (2026-08-30)** separates product acceptance from instrument
hardening:

- the nineteen instrument findings are **deferred from Phase 84 GREEN**, preserved
  verbatim in [`qa/INSTRUMENT_HARDENING_BACKLOG.md`](qa/INSTRUMENT_HARDENING_BACKLOG.md)
  and indexed in the defect ledger as **open, not closed**;
- **QA-84-064 remains blocking**;
- **Phase 84 GREEN means bounded product acceptance only.** It does not mean the
  deferred findings are resolved.

Read `DECISION_LOG.md` **D-210** before doing anything else.

---

## Your task: repair QA-84-064, and nothing else

**QA-84-064 — the live verifier proves a SHA, not deployed bytes.** Post-gate
publication can change the artifact while the claimed deployed-build identity
stays green. QA demonstrated it by adding a deploy-job step after `preview-dist`
was downloaded and before `publish-pages.sh` ran: its publisher appended a
visible `body::before` rule to the app stylesheet. No source byte and no verified
`dist/` byte changed, and the build-identity check still reported agreement.

The full finding is in `qa/PHASE_84_QA_HANDOFF.md`, round 19.

Repair it so that what is _served_ is tied to what was _verified_ — not to a
commit identifier that a later step can decorate around. Reproduce the defect
before you fix it, and prove the reproduction is caught afterwards.

### Explicitly out of scope

- **The nineteen deferred findings.** Do not repair, revisit or pre-empt them.
- **`qa/INSTRUMENT_HARDENING_BACKLOG.md` may not be edited, removed, renumbered
  or reordered.** Every `QA-84-0xx` identifier in it must still resolve when you
  are done. A missing identifier is a preservation failure, not a cleanup.
- **General guard, scanner, oracle and verifier hardening.** That work now has
  its own backlog and its own gate. It is not part of this closeout.
- **Routing 90 must not start.** Phase 84 stays YELLOW until QA says otherwise.

---

## When the repair is done

Write the **bounded retest dispatch** into this file, `docs/NEXT_PROMPT.md`,
addressed to **Codex / independent QA**, **SAME** conversation (the one that
wrote rounds 1 to 19), **Codex**, **High** — never Max.

That retest verifies **only**:

1. **QA-84-064 / release-integrity correctness** — including the reproduction you
   used, and that it is now caught.
2. **The seven Phase 84 acceptance items.**
3. **CASE A** fresh-store owner use.
4. **CASE B** fresh-store owner use.
5. **The normal required regression gates** — the full test suite, the browser
   matrix at three widths, the Android checks, the privacy scan, checkpoint
   equivalence, and a clean worktree.

Say plainly in that dispatch that **general instrument hardening is closed for
this phase**, and that only two things may block GREEN from here:

- a **genuinely new owner-visible product defect**; or
- a **release-integrity defect comparable to QA-84-064**.

A further finding that a detector can be fooled is **not** a blocker. It belongs
in the backlog, appended, with nothing removed.

**If all bounded acceptance items pass, Phase 84 may go GREEN.** You may not
declare GREEN yourself — a builder conversation does not approve its own phase
(D-077). QA declares it.

---

## Completion

When finished, make the LAST meaningful line of `docs/NEXT_PROMPT.md` exactly:

<!-- LCO_COMPLETE -->

Do not put this completion marker in a different handoff file. The line above
quotes it as an instruction and is not the final meaningful line, so this file
does not yet count as finished — writing the marker at the end is what proves
you are.
