import assert from 'node:assert/strict'
import { coreDomains } from '../../../src/domain/domains'
import { originOfSources } from '../../../src/features/history/origin'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { SCENARIOS } from '../../../src/synthetic/scenarios'

const EXPECTED = {
  owner: undefined,
  'legacy-import': 'Imported',
  device: 'Measured',
  derived: 'Worked out',
} as const satisfies Record<'owner' | 'legacy-import' | 'device' | 'derived', string | undefined>

type ProbeSource = keyof typeof EXPECTED

function rewritten(
  document: SnapshotWire,
  source: ProbeSource,
  ownerRecord?: string,
): SnapshotWire {
  const clone = structuredClone(document) as SnapshotWire & {
    records: Array<Record<string, unknown>>
  }

  clone.records = clone.records.map((record) => {
    if (record === null || typeof record !== 'object') return record
    const actualSource = record.id === ownerRecord ? 'owner' : source
    const provenance = record.provenance as Record<string, unknown> | undefined
    return {
      ...record,
      provenance: { ...provenance, source: actualSource } satisfies Record<string, unknown>,
      ...(record.kind === 'observation' && (actualSource === 'device' || actualSource === 'derived')
        ? { method: actualSource }
        : record.kind === 'observation' && actualSource === 'owner'
          ? { method: 'self-report' }
          : {}),
    }
  })

  return clone
}

const counts: Record<ProbeSource, Record<string, number>> = {
  owner: {},
  'legacy-import': {},
  device: {},
  derived: {},
}

for (const source of Object.keys(EXPECTED) as ProbeSource[]) {
  assert.equal(originOfSources([source])?.label, EXPECTED[source])

  for (const scenario of SCENARIOS) {
    const loaded = snapshotFromWire(rewritten(scenario.build(), source))
    assert.equal(loaded.loaded, true, `${scenario.id}: rewritten snapshot did not load`)

    const view = buildView(loaded.snapshot, { now: scenario.now, zone: scenario.zone })
    const situation = assembleSituation(view, {
      now: scenario.now,
      zone: scenario.zone,
      weekStartsOn: 1,
      domains: coreDomains,
    })

    for (const domain of situation.coverage.domains) {
      if (domain.sources.length > 0) {
        assert.deepEqual(domain.sources, [source], `${scenario.id}: domain ${domain.domain}`)
      }
      for (const concept of domain.concepts) {
        if (concept.sources.length > 0) {
          assert.deepEqual(concept.sources, [source], `${scenario.id}: concept ${concept.concept}`)
        }
      }
    }

    for (const insight of insightsFor(situation).insights) {
      counts[source][insight.kind] = (counts[source][insight.kind] ?? 0) + 1
      if (insight.sources.length > 0) {
        assert.deepEqual(insight.sources, [source], `${scenario.id}: insight ${insight.id}`)
        assert.equal(originOfSources(insight.sources)?.label, EXPECTED[source])
      }
    }
  }
}

for (const source of ['legacy-import', 'device', 'derived'] as const) {
  assert.ok((counts[source].trajectory ?? 0) > 0, `${source}: no trajectory card was exercised`)
  assert.ok(
    (counts[source]['state-association'] ?? 0) > 0,
    `${source}: no association card was exercised`,
  )
}

const mixedKinds: Record<string, number> = {}
for (const scenario of SCENARIOS) {
  const importedDocument = rewritten(scenario.build(), 'legacy-import')
  const importedLoaded = snapshotFromWire(importedDocument)
  if (!importedLoaded.loaded) continue
  const importedView = buildView(importedLoaded.snapshot, {
    now: scenario.now,
    zone: scenario.zone,
  })
  const importedSituation = assembleSituation(importedView, {
    now: scenario.now,
    zone: scenario.zone,
    weekStartsOn: 1,
    domains: coreDomains,
  })

  for (const insight of insightsFor(importedSituation).insights) {
    const cited = [
      ...insight.evidence.included,
      ...insight.evidence.counterexamples,
      ...insight.evidence.excluded,
    ]
    const ids = [...new Set(cited.map((line) => line.record))]
    if (ids.length < 2) continue

    const mixedLoaded = snapshotFromWire(rewritten(scenario.build(), 'legacy-import', ids[0]))
    if (!mixedLoaded.loaded) continue
    const mixedView = buildView(mixedLoaded.snapshot, { now: scenario.now, zone: scenario.zone })
    const mixedSituation = assembleSituation(mixedView, {
      now: scenario.now,
      zone: scenario.zone,
      weekStartsOn: 1,
      domains: coreDomains,
    })
    const mixed = insightsFor(mixedSituation).insights.find((entry) => entry.id === insight.id)
    if (mixed === undefined || !mixed.sources.includes('owner')) continue

    assert.ok(mixed.sources.includes('legacy-import'), `${scenario.id}: ${insight.id} is not mixed`)
    assert.equal(originOfSources(mixed.sources), undefined, `${scenario.id}: ${insight.id}`)
    mixedKinds[mixed.kind] = (mixedKinds[mixed.kind] ?? 0) + 1
  }
}

assert.ok(
  Object.values(mixedKinds).reduce((total, count) => total + count, 0) >= 5,
  `too few mixed-source insight kinds were exercised: ${JSON.stringify(mixedKinds)}`,
)

process.stdout.write(`${JSON.stringify({ counts, mixedKinds }, null, 2)}\n`)
