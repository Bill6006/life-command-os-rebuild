import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts, currentConcept } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { isUsable } from '../../src/domain/knowledge'
import { timeZone, type Instant } from '../../src/domain/time'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'

/**
 * AUD-0006 — the concept that was renamed, and the history that was not.
 *
 * `career.usable-time-tonight` was the worst naming seam in the model: not a
 * career fact — it gates whether he can spend thirty minutes with his daughter
 * — not about the evening — it is read at half past six in the morning — and
 * filed on the Career page, so his route to correcting how much time he has ran
 * through the wrong life area.
 *
 * Renaming a concept is a **migration**, and plan section 30 and D-101 both say
 * how: *add-new plus alias-old, never a rewrite of history*. Every answer the
 * owner has ever given about his free time carries the old id, and rewriting
 * them would be editing what he said. So the record keeps its id and the fact
 * layer resolves through {@link SUPERSEDED_CONCEPTS}.
 *
 * The audit asks for exactly two tests, and these are them: **a backup written
 * before the change restores with both ids resolving to one belief**, and **no
 * surface shows the same fact twice.**
 */

const ZONE = timeZone('Europe/London')

function beforeTheRename(): { readonly now: Instant; readonly wire: SnapshotWire } {
  const kit = createKit('CR', 'Europe/London', '2026-05-01T09:00:00Z')
  const now = kit.local('2026-05-20', '19:30')
  const older = kit.record(
    'observation',
    { occurredAt: kit.local('2026-05-20', '19:00'), domains: [DOMAIN.career] },
    {
      // The id it was stored under, verbatim.
      concept: CONCEPT.usableTimeTonight,
      value: { type: 'duration', minutes: 90 },
      method: 'self-report',
    },
  )
  return { now, wire: kit.document({ entities: [], records: [older], exportedAt: now }) }
}

describe('a backup written before the rename restores as one belief — AUD-0006', () => {
  it('resolves an old record under the new concept', () => {
    const { now, wire } = beforeTheRename()
    const loaded = snapshotFromWire(wire)
    expect(loaded.loaded).toBe(true)
    if (!loaded.loaded) throw new Error('unreachable')

    const view = buildView(loaded.snapshot, { now, zone: ZONE })
    const reading = view.facts.knowledgeFor(CONCEPT.freeNow)
    expect(isUsable(reading), 'the old answer stopped being an answer').toBe(true)
    if (!isUsable(reading)) throw new Error('unreachable')
    expect(reading.value).toEqual({ type: 'duration', minutes: 90 })
  })

  it('keeps the record exactly as it was written', () => {
    // Nothing rewrites history. The record still carries the id the owner's
    // answer was stored under, which is what makes this a migration rather than
    // an edit of what he said.
    const { now, wire } = beforeTheRename()
    const loaded = snapshotFromWire(wire)
    if (!loaded.loaded) throw new Error('unreachable')
    const stored = loaded.snapshot.records[0]
    expect(stored, 'the record did not survive the load').toBeDefined()
    expect((stored as { concept?: string }).concept).toBe(String(CONCEPT.usableTimeTonight))
    void now
  })

  it('shows the fact once, not twice', () => {
    /*
     * The other test the audit asks for. Two ids for one quantity is exactly
     * how a surface ends up listing "Usable time tonight" and "Usable time now"
     * side by side, each with half the evidence.
     */
    const { now, wire } = beforeTheRename()
    const loaded = snapshotFromWire(wire)
    if (!loaded.loaded) throw new Error('unreachable')
    const view = buildView(loaded.snapshot, { now, zone: ZONE })

    const listed = view.facts.entries.filter(
      (entry) => entry.concept === CONCEPT.freeNow || entry.concept === CONCEPT.usableTimeTonight,
    )
    expect(listed.map((entry) => String(entry.concept))).toEqual([String(CONCEPT.freeNow)])
  })

  it('registers the superseded id nowhere, and resolves it everywhere', () => {
    expect(coreConcepts.get(CONCEPT.usableTimeTonight)).toBeUndefined()
    expect(currentConcept(CONCEPT.usableTimeTonight)).toBe(CONCEPT.freeNow)
    // And the table is one-way: nothing resolves to a superseded id.
    expect(currentConcept(CONCEPT.freeNow)).toBe(CONCEPT.freeNow)
  })

  it('files it away from Career, which is the finding itself', () => {
    const definition = coreConcepts.definitionFor(CONCEPT.freeNow)
    expect(definition.domain, 'free time is still filed under what he is studying').not.toBe(
      DOMAIN.career,
    )
    expect(String(definition.id).startsWith('time.'), 'the id still names a domain').toBe(true)
  })
})
