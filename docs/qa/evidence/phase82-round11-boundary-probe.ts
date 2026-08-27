import assert from 'node:assert/strict'
import { coreConcepts, type ConceptId } from '../../../src/domain/concepts'
import { DOMAIN, type LifeDomainId } from '../../../src/domain/domains'
import { instant } from '../../../src/domain/time'
import { standingFor } from '../../../src/features/life/standing'
import { answerRecord } from '../../../src/intelligence/questions'
import { nextGuideStep } from '../../../src/intelligence/guide'
import { collectEpisodes, planLifecycle } from '../../../src/intelligence/lifecycle'
import { outcomeWindowFor } from '../../../src/intelligence/outcomes'
import { decide } from '../../../src/intelligence/engine'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { SCENARIOS } from '../../../src/synthetic/scenarios'

const DAY = 86_400_000
const OFFSETS = [-2, -1, 0, 1, 2, 7, 14, 21, 28, 30, 35, 60, 90] as const
let passed = 0
const failures: string[] = []

function check(name: string, body: () => void) {
  try {
    body()
    passed += 1
    console.log(`PASS: ${name}`)
  } catch (error) {
    failures.push(name)
    console.error(`FAIL: ${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function domainOf(concept: ConceptId): LifeDomainId {
  return coreConcepts.definitionFor(concept).domain
}

const actionEscapes: string[] = []
const questionRows: string[] = []
const questionEscapes: string[] = []
const reviewContradictions: string[] = []
const normalRows: string[] = []
const normalWithoutCompletedEpisode: string[] = []
const doubleProposalRuns: string[] = []
let privateActionRoutes = 0

for (const scenario of SCENARIOS) {
  const wire = scenario.build()
  for (const days of OFFSETS) {
    const now = instant(scenario.now + days * DAY)
    const loaded = snapshotFromWire(wire)
    assert.equal(loaded.loaded, true)
    if (!loaded.loaded) throw new Error('unreachable')
    const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
    const view = buildView(loaded.snapshot, moment)
    const situation = assembleSituation(view, moment)
    const decision = decide(view, moment)
    const guide = nextGuideStep(view, moment)
    const guideDomain =
      guide.question === undefined ? undefined : domainOf(guide.question.spec.concept)
    const label = `${scenario.id} ${days >= 0 ? '+' : ''}${days}d`

    const coverageMoves = decision.trace.proposed.filter((move) => move.generator === 'coverage')
    for (const entry of situation.coverage.domains) {
      if (entry.domain === DOMAIN.privateHealth && entry.refresh === 'an-action') {
        privateActionRoutes += 1
      }
      if (entry.status === 'stale' && entry.refresh === 'an-action') {
        if (!coverageMoves.some((move) => move.domain === entry.domain)) {
          actionEscapes.push(
            `${label} / ${entry.domain}; status ${entry.status}; matters ${String(entry.matters)}; proposed ${coverageMoves.map((move) => move.domain).join(',') || 'none'}`,
          )
        }
      }
      if (entry.refresh === 'a-question') {
        questionRows.push(`${label} / ${entry.domain}`)
        if (guideDomain !== entry.domain) {
          questionEscapes.push(
            `${label} / ${entry.domain}; guide ${guide.kind}${guideDomain === undefined ? '' : `/${guideDomain}`}; ${guide.because}`,
          )
        }
      }
      if (entry.refresh === 'needs-review' && guideDomain === entry.domain) {
        const question = guide.question
        assert.ok(question)
        const answer = answerRecord(question.spec, question.options[0], moment)
        const answeredView = buildView(
          { ...loaded.snapshot, records: [...loaded.snapshot.records, answer] },
          moment,
        )
        const after = assembleSituation(answeredView, moment).coverage.get(entry.domain)
        reviewContradictions.push(
          `${label} / ${entry.domain}; guide asks ${question.spec.concept}; after one answer ${after?.status ?? 'missing'}`,
        )
      }
      if (entry.refresh === 'normal-life') {
        normalRows.push(`${label} / ${entry.domain}`)
        const hasLiveCompletedEpisode = collectEpisodes(view, scenario.zone).some((episode) => {
          if (episode.semantics.domain !== entry.domain || episode.state !== 'completed')
            return false
          const window = outcomeWindowFor(episode, scenario.zone)
          return window !== undefined && now <= window.latest
        })
        if (!hasLiveCompletedEpisode) {
          normalWithoutCompletedEpisode.push(`${label} / ${entry.domain}`)
        }
      }
    }

    if (coverageMoves.length >= 2) {
      doubleProposalRuns.push(
        `${label}; proposed ${coverageMoves.map((move) => `${move.domain}/${move.verb}`).join(', ')}; ranked ${decision.trace.ranking.length} [${decision.trace.ranking.map((row) => row.id).join(', ')}]; chosen ${decision.trace.chosen ?? 'none'}; rejected ${decision.trace.rejected.length}`,
      )
    }
  }
}

check('every an-action route still reaches the arbiter and Private never takes it', () => {
  assert.deepEqual(actionEscapes, [])
  assert.equal(privateActionRoutes, 0)
})

check('a-question routes reach the owner through the guide', () => {
  console.log(`a-question rows: ${questionRows.length}`)
  console.log(
    `a-question routes not served by the current guide: ${JSON.stringify(questionEscapes)}`,
  )
  assert.deepEqual(questionEscapes, [])
})

check('needs-review never denies a question the guide is actually asking', () => {
  console.log(`needs-review contradictions: ${reviewContradictions.length}`)
  console.log(
    `needs-review contradiction sample: ${JSON.stringify(reviewContradictions.slice(0, 10))}`,
  )
  assert.deepEqual(reviewContradictions, [])
})

check('normal-life has a completed episode whose answer can still arrive', () => {
  console.log(`normal-life rows: ${normalRows.length}`)
  console.log(
    `normal-life without a live completed episode: ${JSON.stringify(normalWithoutCompletedEpisode)}`,
  )
  assert.deepEqual(normalWithoutCompletedEpisode, [])
})

check('an unfinished action is not described as an answer already on its way', () => {
  const scenario = SCENARIOS.find((entry) => entry.id === 'what-worked')
  assert.ok(scenario)
  const now = instant(scenario.now + 30 * DAY)
  const loaded = snapshotFromWire(scenario.build())
  assert.equal(loaded.loaded, true)
  if (!loaded.loaded) throw new Error('unreachable')
  const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
  const view = buildView(loaded.snapshot, moment)
  const decision = decide(view, moment)
  const candidate = decision.evaluation?.candidate
  assert.equal(candidate?.generator, 'coverage')
  assert.ok(candidate)
  const planned = planLifecycle({
    view,
    situation: decision.situation,
    semantics: candidate.semantics,
    action: 'start',
    recordedAt: now,
  })
  assert.equal(planned.noChange, undefined)
  const startedSnapshot = {
    ...loaded.snapshot,
    records: [...loaded.snapshot.records, ...planned.records],
  }
  const startedView = buildView(startedSnapshot, moment)
  const startedSituation = assembleSituation(startedView, moment)
  const entry = startedSituation.coverage.get(candidate.semantics.domain)
  assert.equal(entry?.status, 'stale')
  assert.notEqual(entry.refresh, 'normal-life')
  assert.notEqual(standingFor(entry).note, 'An answer is already on its way.')
  const episode = collectEpisodes(startedView, scenario.zone).find(
    (row) => row.recommendation === planned.recommendation,
  )
  assert.equal(episode?.state, 'started')
  assert.equal(
    episode === undefined ? undefined : outcomeWindowFor(episode, scenario.zone),
    undefined,
  )
})

check('the corpus reaches two coverage proposals and records their arbitration', () => {
  console.log(`double coverage proposal runs: ${doubleProposalRuns.length}`)
  console.log(`double coverage proposal sample: ${JSON.stringify(doubleProposalRuns.slice(0, 10))}`)
  assert.ok(doubleProposalRuns.length > 0, 'no situation reached two coverage proposals')
})

check('the route words remain distinct', () => {
  const rows = [
    ['normal-life', 'An answer is already on its way.'],
    ['a-question', 'A question will cover it.'],
    ['needs-review', 'Nothing the app can do on its own will bring these back.'],
  ] as const
  for (const [refresh, words] of rows) {
    const coverage = { status: 'stale', refresh, summary: '' } as never
    const standing = standingFor(coverage)
    assert.ok(`${standing.note} ${standing.detail?.(coverage) ?? ''}`.includes(words))
  }
})

console.log(JSON.stringify({ passed, failed: failures, count: failures.length }, null, 2))
if (failures.length > 0) process.exitCode = 1
