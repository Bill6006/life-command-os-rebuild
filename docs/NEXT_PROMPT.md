# Next prompt

Canonical plan section 43, and section 53 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092).

**Phase 8 is YELLOW — READY FOR A THIRD INDEPENDENT QA RETEST.**

Three QA rounds, all **FAIL**, everything repaired under section 42. The second
retest confirmed the product itself correct and failed the **regressions** —
two claimed more than they asserted, and one of those was hiding a real gap. The
phase does not self-certify and a repair does not either.

|                                          |                                            |
| ---------------------------------------- | ------------------------------------------ |
| Repaired product checkpoint              | `d072012`                                  |
| Deployed SHA                             | read live; not expected to match (D-097)   |
| Android-style gate on the deployed build | Clean, 52 checks                           |
| Independent QA                           | Round 1 FAIL, repaired; retest outstanding |

**The next prompt is not here.** A retest goes to the **same** Codex
conversation that found the defects, and the complete prompt for it is written
into that conversation's own report:

> [`qa/PHASE_08_QA_HANDOFF.md`](qa/PHASE_08_QA_HANDOFF.md) — read the
> "Second-retest repair" section and the copy/paste prompt at the end of it.

This file will carry the next-phase prompt again once the retest passes and the
GREEN closeout is written.

---

## NEXT ACTION

- **System:** **Codex** — the **same** QA conversation that ran round 1
- **Model:** the model round 1 ran on, unchanged
- **Reasoning level:** **High**
- **Conversation:** **SAME** — section 43's defect loop: a retest goes to the
  conversation that found the defects, because it holds the reproductions and
  the reasoning, and would otherwise be judging a repair without having seen
  what it repaired. This is the same unresolved loop, three rounds in.
- **Report path:** `docs/qa/PHASE_08_QA_HANDOFF.md`

## COPY/PASTE PROMPT

```text
Retest the Life Command OS rebuild's Phase 8 repair.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read docs/qa/PHASE_08_QA_HANDOFF.md in full and execute the third retest handoff
exactly as written.

Do not ask me to paste the file contents.
```
