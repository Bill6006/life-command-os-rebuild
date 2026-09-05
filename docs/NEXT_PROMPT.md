# Next dispatch — plan phase 0: a new home

**Phase:** 0 — **A new home: the app as it is, in a new repository at a new address**

**Next actor:** Claude Builder
**Model:** Claude Opus 5
**Reasoning / Effort:** Max
**Conversation:** NEW
**Independent QA:** OFF. **Control:** the owner says **Green** or **Yellow**. No orchestrator.

---

## Read `PLAN.md` at the repository root first

The plan is numbered **0 to 9**. This is **phase 0**. `PLAN.md` is the whole
plan; the older documents in `docs/` are history and are not planned from.

## What to do

**Move house. Nothing else.** The owner wants his current app left exactly as it
is; every phase from 2 on is built in a new repository seeded from this one.

1. **Create the new repository.** Folder `life-command-os` beside this one (the
   parent is `D:\Code\AI Coding Agents\Claude Code`). Seed it from this working
   tree at the current commit — copy everything except `node_modules`, `dist`,
   `.git`, `test-results` and `playwright-report`; `git init`; first commit
   message names the commit it was seeded from. Create `Bill6006/life-command-os`
   on GitHub with `gh repo create --private --source . --push`, and turn on Pages
   the way this repository has it (see `.github/workflows/ci.yml`).
   **Pushing needs `git -c http.sslBackend=schannel push`** on this machine.
2. **Rename every hard-coded path and address** from `life-command-os-rebuild`
   to `life-command-os`: the Vite base, `playwright.config.ts`'s preview URL,
   `scripts/android-gate.mjs`, `scripts/checkpoint-equivalence.mjs`,
   `scripts/release-integrity.mjs`, the CI workflow, the test specs' `APP`
   constant, and anything `grep -rn "life-command-os-rebuild"` finds. **Change
   nothing else.**
3. **Run every gate in the new repository** — `npm ci`, `npm run verify`, the
   full 360/430/1280 browser matrix at one worker on a clean port, the privacy,
   copy and adaptation scans, CI, checkpoint equivalence, release integrity from
   CI's own manifest artifact, the Android-style deployed gate — against the
   **new** address. Read the summary line and its count, never a pipeline's exit
   code.
4. **Leave a pointer here.** One line at the top of this repository's `PLAN.md`
   and `README.md`: development moved to `life-command-os` on the date, with the
   new address. Commit and push it. Touch nothing else in this repository again.
5. **In the new repository, write `docs/NEXT_PROMPT.md` as the phase 2
   dispatch** from `PLAN.md` phase 2 — its step 0 (extend the catalogue with the
   three families, document only, wait for Green) comes first, and
   `docs/CATALOGUE_DECISIONS.md` carries the owner's six settled decisions it must
   not reopen. `Phase: 2` on its own line near the top, completion marker last.

## Then stop and hand it to the owner

Tell him the new address, that it is his app unchanged, and that the old address
still works. Then stop and wait.

- **"Green — next phase"** → start phase 2 in the new repository, in this same
  conversation if context allows; otherwise say so and stop.
- **"Yellow — …"** → fix in place, re-run the gates that cover it, come back.

**You may not approve your own phase.** Only the owner's Green does that.

---

```text
Continue the Life Command OS rebuild. You are the builder and the orchestrator.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os
If that folder does not exist yet, use this one instead:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Read PLAN.md at the repository root, then docs/NEXT_PROMPT.md, and execute the
phase it dispatches exactly as written. Do not ask me to paste file contents.

I control this with two words. When a phase's gates are green and the deploy is
proven, tell me what to open on my phone and what to look at, then stop and
wait. I will say "Green - next phase" or "Yellow - " with what is wrong. Green
means write the next phase's dispatch into docs/NEXT_PROMPT.md and keep going in
this conversation while context allows. Yellow means fix it in place and come
back. Never approve a phase yourself; never start a QA round; never edit the
handoffs for routing 91-94; never change the old repository once phase 0 has
moved development out of it.

When a phase is finished, make the LAST meaningful line of docs/NEXT_PROMPT.md
exactly:
<!-- LCO_COMPLETE -->
```

<!-- LCO_COMPLETE -->
