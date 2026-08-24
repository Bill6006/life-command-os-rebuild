# Next prompt

Canonical plan section 43, and section 53 for the phase itself. Independent QA
is Codex (D-090); Claude builds. Every handoff ends with the model, the level,
the conversation and a short copyable launcher (D-092) — the detail lives here,
in the repository.

**Phase 8 is YELLOW — READY FOR INDEPENDENT QA.** The builder does not
self-certify (D-077). Full record in [`PHASE_STATUS.md`](PHASE_STATUS.md) under
"Phase 8 — Legacy migration".

|                                           |                                          |
| ----------------------------------------- | ---------------------------------------- |
| Product checkpoint                        | `b593a49`                                |
| Deployed SHA                              | read live; see the checkpoint note below |
| Unit / contract / synthetic / adversarial | 1170 / 1170, 56 files                    |
| Browser                                   | 444 / 444 — 148 tests × 360, 430, 1280px |
| Clean-checkout `npm run verify`           | Pass                                     |
| Android-style gate on the deployed build  | Clean, 44 checks                         |
| Independent QA                            | **Outstanding**                          |

Phase 8 added five standing decisions: **D-101** on four dispositions and why
silence is not one of them; **D-102** on there being one door out of the
previous generation and it needing the passphrase; **D-103** on naming a
standing instruction the app cannot keep rather than storing an inert one;
**D-104** on an import being the restore transaction with different contents;
**D-105** on a reason the owner reads and a reason that survives audit being two
strings.

---

## NEXT ACTION

- **System:** **Codex** (independent QA — D-090)
- **Model:** GPT-5-class Codex, the strongest currently available for reading a
  screen critically (or the nearest current equivalent if renamed)
- **Reasoning level:** **High**
- **Conversation:** **NEW CODEX CONVERSATION REQUIRED FOR INDEPENDENCE**
- **Why this model:** the phase's hardest question is semantic rather than
  mechanical — whether what the import says it did is what it actually did to
  the owner's history — and that needs a model that can hold a data model in
  mind while reading ordinary sentences on a screen.
- **Why this level:** High rather than Max because the acceptance criteria are
  written down and the surfaces are few. The judgement calls this phase makes
  are recorded with their reasons, so the work is auditing stated claims against
  observed behaviour rather than deriving the mapping independently.
- **Why a new conversation:** the reviewer must not inherit the builder's model
  of why this is correct. This phase is almost entirely judgement about meaning,
  which is exactly the kind of reasoning a shared context would launder.
- **Report path:** `docs/qa/PHASE_08_QA_HANDOFF.md`
- **Attach/reference:** nothing to attach. The prompt names every path, and
  D-090's first step is cold use **before** reading any of them.

---

## COPY/PASTE PROMPT

```text
You are running independent QA on Phase 8 of the Life Command OS rebuild.

Repository:
D:\Code\AI Coding Agents\Claude Code\life-command-os-rebuild

Product checkpoint under test: b593a49
Deployed Preview: https://bill6006.github.io/life-command-os-rebuild/preview/

THE CHECKPOINT, AND WHY IT WILL NOT MATCH THE DEPLOYED SHA

Read the deployed SHA from preview/build-info.json. It is whatever was pushed
last and is NOT expected to equal b593a49 — every push to main redeploys,
including the push of this handoff. D-097: a handoff names the product
checkpoint and separately reports the live deployed SHA, and never asserts the
two are the same string.

To check they are bundle-equivalent, run:

  node scripts/checkpoint-equivalence.mjs b593a49 --deployed https://bill6006.github.io/life-command-os-rebuild/preview/build-info.json

If the fetch hits a certificate-chain error in your Node runtime, read the
deployed SHA yourself and use `--ref <full-sha>` instead. If it reports that
the deployed build is OLDER than the checkpoint, the deploy has not landed yet
— wait and read it again. That is not a defect and it cost a whole QA round in
Phase 7.

WORK IN THIS ORDER (D-090, docs/qa/README.md)

1. SEALED COLD OWNER-USE. Open the deployed Preview at a normal Now and use it
   as the owner would, BEFORE reading any repository document. Record what it
   appears to claim. Do not read the plan, the decision log or the phase status
   until you have done this.
2. Claim-to-evidence semantic audit: for each claim on screen, establish what
   it actually rests on.
3. Semantic and product correctness: does the app mean what it says, and is
   what it says worth saying.
4. Targeted phase acceptance, now that the meaning is understood.
5. Targeted known-defect regression for the surfaces this phase touched.
6. Architecture inspection where a defect suggests the boundary is wrong rather
   than the line.
7. Full-suite duplication ONLY on a concrete trigger — a builder claim that does
   not match observed behaviour, a suspected false-green, or a change to the
   test harness itself. Green builder tests are evidence; re-running them to
   watch them go green again buys nothing.

WHAT THIS PHASE CLAIMS TO HAVE BUILT

The app can read a backup written by the PREVIOUS VERSION of this app and bring
its history across. The surface is a new panel at the bottom of Data, behind
More → "Exports, backup and restore".

Governing documents, to be read at step 2 and not before:

- docs/CANONICAL_REBUILD_PLAN.md sections 30 (legacy data strategy), 53 (this
  phase), and 59 (explicit legacy exclusions)
- docs/PHASE_STATUS.md, "Phase 8 — Legacy migration"
- docs/DECISION_LOG.md, D-101 to D-105, and D-091's eight invariants
- docs/ARCHITECTURE_BOUNDARIES.md, the `src/legacy/` section
- src/legacy/mapping.ts — the registry, which is where the phase's judgement is

SECTION 53'S GATE, WHICH IS WHAT ACCEPTANCE MEANS HERE

Build: legacy detector; quarantined parser; mapping inventory; explicit semantic
mappings; raw preservation for uncertain fields; preview/dry run; snapshot;
atomic apply; verify; rollback; idempotency; duplicate detection; provenance.

Gate:
- legacy import does not change the recommendation engine architecture;
- ambiguous mappings remain explicit;
- imported raw legacy records cannot silently drive decisions;
- current app behaviour remains correct with no legacy data present.

Section 30's critical rule is the one to hold everything against:

  Do not contort the new architecture to make legacy mapping easier.

If a legacy concept does not map cleanly it is preserved as historical archive
data rather than recreated in the old model's shape.

HOW TO EXERCISE IT — YOU WILL HAVE TO MAKE A FILE

There is no real legacy backup in this repository and there must never be one
(section 39 — real owner data never enters it). To test the import you need to
build an encrypted legacy file yourself. It is the previous generation's format:

  {
    "format": "life-command-os.backup",
    "formatVersion": 2,
    "createdAt": "<iso>",
    "encrypted": true,
    "approximateRecordCount": <n>,
    "crypto": {
      "cryptoVersion": 1, "kdf": "PBKDF2", "kdfHash": "SHA-256",
      "iterations": <n>, "cipher": "AES-GCM", "keyBits": 256,
      "saltBase64": "...", "ivBase64": "..."
    },
    "ciphertextBase64": "..."
  }

The plaintext inside the ciphertext is:

  {
    "payloadVersion": 1,
    "storageSchemaVersion": 1,
    "recordCount": <n>,
    "integrity": { "algorithm": "SHA-256", "digest": "<sha256 hex of JSON.stringify(records)>" },
    "records": [ ... ]
  }

`records` is sorted by `recordId` before the digest is taken, and the digest is
over `JSON.stringify(records)` — the array alone, not the whole payload. The
crypto metadata is passed to AES-GCM as additional authenticated data, as the
eight values joined by `|` in exactly this order: cryptoVersion, kdf, kdfHash,
iterations, cipher, keyBits, saltBase64, ivBase64.

tests/contract/legacyFixture.ts and tests/browser/legacy-import.spec.ts both
build one; either is a working reference. Use a small iteration count for speed.

A legacy record looks like this (the old envelope):

  {
    "recordId": "<uuid or any stable string>",
    "recordType": "observation",
    "schemaVersion": 1,
    "occurredAt": "<iso>", "recordedAt": "<iso>",
    "localTime": { "localIso": "...", "timeZone": "America/Denver", "utcOffsetMinutes": -360 },
    "source": "user-entry",
    "provenance": { "method": "direct-report" },
    "privacy": "general",
    "category": "time-attention-capacity",
    "attribute": "state:energy",
    "value": { "kind": "anchored-scale", "scaleId": "energy", "ordinal": 4, "label": "Good" }
  }

The previous generation had twenty-eight record types. They are listed in
tests/unit/legacy-mapping.test.ts. Its observed value kinds are `quantity`,
`duration`, `count`, `state`, `note`, `anchored-scale` and `unsure`.

THINGS WORTH TRYING TO DISPROVE

- That what the report says would happen is what actually happens. The preview
  and the apply are claimed to be one code path; check the counts on screen
  against the history afterwards, and against a backup taken after the import.
- That an imported entry can be told from one the owner wrote today, on every
  surface it can reach — Timeline, Life, a domain page, Insights, an export.
- That nothing imported changes a recommendation. Import readings that argue
  hard for a different evening and see whether Now moves.
- That the same file twice is genuinely a no-op, and that a file edited between
  two imports does not rewrite what is already there.
- That a wrong passphrase, a truncated file, a damaged one and this app's OWN
  backup each get a different and actionable sentence, and that none of them
  writes anything.
- That an import cannot run against the owner's history while a QA-laboratory
  scenario is on screen, and that the way out it names can be pressed from where
  it is named.
- That the private area is handled correctly: a legacy row classified
  `private-pattern` or `child`, and a row carrying no `privacy` at all.
- Whether anything on this screen reads as developer vocabulary, false
  precision, a claim from ignorance, or a count of one against a plural noun.
  **This is where the builder's own read-through found the phase's only blocking
  defect**, after every gate was green — so it is worth doing slowly, with every
  disclosure opened, rather than trusting that a sweep now covers it.
- Whether the report is legible and operable on a 360px Android context with
  touch, a mobile user agent and a realistic device pixel ratio — not a narrowed
  desktop viewport.

EXPLICIT DEFERRALS, CONFIRMED UNCHANGED

These are stated so you can confirm they are still true rather than report them
as new findings:

- Production release remains preview-only for the QA surface.
- No partial or section-by-section import; no undo button (the way back is a
  backup taken beforehand, one panel up).
- The single-page app that came BEFORE the previous version (`v297-phase68`) is
  recognised and deliberately not imported.
- Four legacy families are kept exactly as written and left for an owner
  decision rather than mapped: `life-context-change`, `skill-claim`,
  `faith-anchor` and `milestone-observation`.
- `derivedRecordId` joins its parts on a literal NUL byte and has since Phase 3.
  It is named in an allow-list rather than changed, because changing it moves
  every derived id already written. It is an open item for the owner.

WHAT YOU MAY AND MAY NOT DO

Do not repair application or product code. You may create or update only
docs/qa/PHASE_08_QA_HANDOFF.md and narrowly scoped QA evidence artifacts.

Do not modify anything at D:\Code\AI Coding Agents\Codax\Life App. That is the
previous generation and owner decision D-001 protects it absolutely: read-only,
never modified, never reinitialised, never overwritten.

THE REPORT

Write docs/qa/PHASE_08_QA_HANDOFF.md to the contract in canonical plan section
43 and docs/qa/README.md section 3: phase; checkpoint SHA tested; deployed SHA
tested; Android/mobile configuration; governing acceptance criteria; scenarios
and flows tested with PASS/FAIL each; exact reproductions for defects; semantic,
behavioural, privacy and mobile findings; blocking versus non-blocking; evidence
references; automated tests that gave false confidence; deferred items confirmed
unchanged; overall PASS or FAIL.

End with D-082 and D-092: the complete ready-to-paste next prompt written into
that file, and a short standalone launcher naming the recommended Claude model,
the intelligence level, the conversation instruction and the exact file to read.
On FAIL that prompt goes to the CURRENT builder conversation for repair under
section 42; on PASS it goes there for the formal GREEN closeout. Do not wait to
be asked for it.
```

<!-- LCO_COMPLETE -->
