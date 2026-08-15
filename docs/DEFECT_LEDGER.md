# Defect ledger

Verified defects and their resolution. Canonical plan section 42 governs the
process:

1. reproduce;
2. identify the whole defect **class**, not only the reported line;
3. write a focused regression;
4. prove the regression fails when the defect is reintroduced;
5. fix the root cause;
6. rerun focused coverage;
7. rerun the full relevant gate.

A defect is not closed until a regression exists that would have caught it, and
until its siblings in the same failure class have been checked.

## Entry format

```
### DEF-000n — <short title>

- Status:        Open | Fixed | Won't fix
- Severity:      Blocker | Major | Minor
- Found in:      <phase> / <SHA>
- Found by:      <automated gate | owner phone test | independent adversarial pass>
- Class:         <the whole family of failures this belongs to>
- Reproduction:  <exact steps or failing scenario>
- Root cause:    <what was actually wrong, not the symptom>
- Regression:    <test file and name that fails when the defect is reintroduced>
- Siblings:      <other places sharing the class, and their status>
- Fixed in:      <SHA>
```

---

## Open

None.

## Fixed

None yet — Phase 0 introduced no verified defects.
