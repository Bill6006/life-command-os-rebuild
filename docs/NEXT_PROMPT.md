# Next prompt

Canonical plan section 43, and section 52 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 7 — AI exports + backup/restore is YELLOW: ROUND 4 REPAIRED, AWAITING
CODEX RETEST.** Per D-077 this checkpoint does not self-certify. The full
record is in [`PHASE_STATUS.md`](PHASE_STATUS.md) under "Phase 7"; the standing
semantic and storage invariants are D-091; the QA protocol is
[`qa/README.md`](qa/README.md) and D-090.

Round 4 reached the product on a deployment that carried the repair and
returned **all eight round-2 findings PASS**, with both judgement calls
accepted on their reasoning. It found one new blocking defect, QA-07-010,
repaired here as DEF-0064 and D-100.

---

## CHECKPOINT

- **Product checkpoint:** `e9979ef` — the last commit that changed anything the
  build emits.
- **Deployed SHA at the time of writing:** `7354b44`, read live. It contains
  the checkpoint; the difference between them is documentation.
- **Confirm it yourself, in one command:**

  ```
  node scripts/checkpoint-equivalence.mjs e9979ef --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json
  ```

  Read-only. It reads the live SHA, checks the checkpoint is an ancestor of it,
  then checks nothing bundle-relevant changed.

Round 4 noted that the `--deployed` fetch hit
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` in your Node runtime and that you read the
manifest through the system trust store instead, then passed the full SHA with
`--ref`. That remains a correct use of the checker and needs no change here; if
it happens again, `--ref <full-sha>` is the supported fallback.

---

## NEXT ACTION

- **System:** **Codex** — independent QA (D-090)
- **Model:** the strongest current Codex reasoning model (GPT-5.1-Codex-Max, or
  the nearest current equivalent if renamed)
- **Reasoning level:** **High**
- **Conversation:** **SAME — the Codex conversation that ran rounds 1 to 4.**
- **Why this level:** the repair itself is one CSS property, but the thing that
  has to be judged is whether the _regression_ actually holds the class — and
  round 4's own lesson is that the obvious form of that test does not.
- **Report path:** `docs/qa/PHASE_07_QA_HANDOFF.md`. Add a round-5 section; do
  not overwrite rounds 1 to 4.

---

## COPY/PASTE PROMPT

```text
Phase 7 round-4 repair is ready for your retest. This is the SAME Codex QA
conversation that ran rounds 1 to 4 — you have your own reproduction of
QA-07-010 and the screenshots that found it.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild
Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

Your report is docs/qa/PHASE_07_QA_HANDOFF.md. Add a "Round 5 — Codex retest"
section. It remains the only file you may write, alongside narrowly scoped
evidence. Rounds 1 to 4 were committed exactly as you wrote them.

CHECKPOINT

Product checkpoint: e9979ef. Confirm it yourself:

  node scripts/checkpoint-equivalence.mjs e9979ef --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

If the fetch hits UNABLE_TO_VERIFY_LEAF_SIGNATURE again, --ref <full-sha> with
the SHA you read yourself is the supported fallback, as you used in round 4.

WHAT WAS REPAIRED

QA-07-010, at the group rather than at the notice. `.shell__top` now carries an
opaque background, so every member composites over it instead of over the page,
keeps its own tint, and a notice added later inherits the property. The top
bar's backdrop-filter is gone in the same pass — it was giving this guarantee
to one member only, which is how the two notices underneath went transparent
for two phases.

The reasoning is in PHASE_STATUS.md under "Independent QA, round 4", the defect
entry is DEF-0064, and the standing rule is D-100.

Verified on the live build in an Android context before this handoff was
written: with the freshness request answered with a different SHA and Data
scrolled to 1500, the sticky header's pixels are identical to its pixels at
rest, and the warning reads "A newer build is deployed (fffffff)."

THE REGRESSION, AND WHY IT IS SHAPED THAT WAY

Your finding included a claim about the test, not only about the product: a
regression that only compares control rectangles is insufficient, and yours
passed at four scroll positions while the text was visibly interleaved.

tests/browser/sticky-header.spec.ts answers that with three tests that compare
the header's PIXELS at rest against its pixels with a page scrolled underneath
— on Data, on Timeline, and with both notices stacked at the Restore panel —
plus one structural assertion that the group has an opaque backing, so the
reason survives a refactor that keeps the images equal by accident. Reintroduced
two ways, removing the backing and making it translucent as a per-member fix
would; all four fail both times.

Judge whether that actually holds the class you named. It is the part of this
repair most worth disagreeing with.

WHAT TO RETEST

- QA-07-010 itself, on the deployed build, by the route you used to find it:
  make the freshness check report a different SHA, scroll real content behind
  the header, and look. Data, an ordinary route, build notice alone and both
  notices together.
- That the fix did not cost anything visually. The header at rest, at the top
  of a document, should look as it did — the members keep their tints and the
  change is only what is behind them.
- Your round-4 passes that touch the header or the sticky group: QA-07-006's
  Show mine receiving the touch at the Restore scroll position, target sizes,
  horizontal containment, destructive-control separation.
- Anything else the round-4 record lists as passed that you judge a CSS change
  to the app shell could disturb.

You noted one remaining automation gap and no defect behind it: the
unconfirmed-restore tests prove outcome semantics without rendering the
owner-facing third-state copy. If you still think that is worth closing, say so
and it will be built; it was left alone this round because you reported no
defect there and inventing coverage for a passing surface is not a repair.

KNOWN AND DISCLOSED — confirm unchanged rather than rediscovering

Deliberately not built: authenticated/tamper validation (D-095), migrations,
selective restore, override of a refused file, a past-backup library, legacy
import. DEF-0059 through DEF-0064 are recorded closed. guide-resume.test.ts
remains resolved-unreproduced. Bare npx playwright test still serves a prebuilt
dist; npm run test:browser builds first.

OUTPUT

Update docs/qa/PHASE_07_QA_HANDOFF.md in place with the round-5 section, to the
contract in plan section 43 and qa/README.md section 3. Then, in the same
response and without being asked (D-082), output the complete ready-to-paste
next prompt — on FAIL to the CURRENT builder conversation for repair under
section 42, on PASS to it for the formal GREEN closeout — and end with the four
lines and the launcher (D-092).
```
