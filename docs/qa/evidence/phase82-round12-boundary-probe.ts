import assert from 'node:assert/strict'
import { DOMAIN, type LifeDomainId } from '../../../src/domain/domains'
import { instant, type Instant } from '../../../src/domain/time'
import { standingFor } from '../../../src/features/life/standing'
import { decide } from '../../../src/intelligence/engine'
import { nextGuideStep } from '../../../src/intelligence/guide'
import { collectEpisodes, planLifecycle } from '../../../src/intelligence/lifecycle'
import { outcomeWindowFor } from '../../../src/intelligence/outcomes'
import { answerRecord, questionFor } from '../../../src/intelligence/questions'
import { assembleSituation, type DomainCoverage } from '../../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { scenarioById, SCENARIOS } from '../../../src/synthetic/scenarios'

const DAY = 86_400_000
const OFFSETS = [-2, -1, 0, 1, 2, 7, 14, 21, 28, 30, 35, 60, 90] as const
const DENIAL = 'Nothing the app can do on its own will bring these back.'
const ARRIVING = 'An answer is already on its way.'

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

function load(wire: SnapshotWire) {
  const loaded = snapshotFromWire(wire)
  assert.equal(loaded.loaded, true)
  if (!loaded.loaded) throw new Error('unreachable')
  return loaded.snapshot
}

function lifeLine(entry: DomainCoverage): string {
  const standing = standingFor(entry)
  return `${standing.word}. ${standing.note} ${standing.detail?.(entry) ?? ''}`
}

interface QuestionRouteResult {
  readonly label: string
  readonly domain: LifeDomainId
  readonly candidates: number
  readonly everyAnswerCovers: boolean
  readonly guideSelected: boolean
  readonly guideSettled: boolean
}

const questionRoutes: QuestionRouteResult[] = []
const reviewWithQuestionCapability: string[] = []
let currentGuideQuestions = 0

for (const scenario of SCENARIOS) {
  const wire = scenario.build()
  for (const days of OFFSETS) {
    const now = instant(scenario.now + days * DAY)
    const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
    const snapshot = load(wire)
    const view = buildView(snapshot, moment)
    const coverage = assembleSituation(view, moment).coverage.domains
    const guide = nextGuideStep(view, moment)
    const selectedConcept = guide.question?.spec.concept
    const selectedDomain = coverage.find((entry) =>
      entry.concepts.some((row) => row.concept === selectedConcept),
    )?.domain
    if (guide.kind === 'question') currentGuideQuestions += 1

    for (const entry of coverage) {
      const candidates = entry.concepts.flatMap((row) => {
        if (!row.askable) return []
        const question = questionFor(row.concept)
        return question === undefined ? [] : [question]
      })

      if (entry.refresh === 'needs-review' && candidates.length > 0) {
        reviewWithQuestionCapability.push(`${scenario.id} ${days}d / ${entry.domain}`)
      }
      if (entry.refresh !== 'a-question') continue

      let everyAnswerCovers = candidates.length > 0
      for (const question of candidates) {
        for (const option of question.options(assembleSituation(view, moment))) {
          const answered = buildView(
            {
              ...snapshot,
              records: [...snapshot.records, answerRecord(question, option, moment)],
            },
            moment,
          )
          const after = assembleSituation(answered, moment).coverage.get(entry.domain)
          if (after?.status !== 'current') everyAnswerCovers = false
        }
      }

      questionRoutes.push({
        label: `${scenario.id} ${days}d`,
        domain: entry.domain,
        candidates: candidates.length,
        everyAnswerCovers,
        guideSelected: selectedDomain === entry.domain,
        guideSettled: guide.kind === 'settled',
      })
    }
  }
}

check('the question route is a real offered capability, not a second live selector', () => {
  assert.ok(questionRoutes.length > 0, 'the corpus never reaches a-question')
  assert.equal(
    questionRoutes.every((row) => row.candidates > 0),
    true,
    'a route has no question in the guide catalogue',
  )
  assert.equal(
    questionRoutes.every((row) => row.everyAnswerCovers),
    true,
    'answering a promised question does not restore its area',
  )
  assert.ok(currentGuideQuestions > 0, 'the guide never actually asks a question')
  assert.ok(
    questionRoutes.some((row) => row.guideSelected),
    'no question-route area ever wins the guide selector',
  )
  assert.ok(
    questionRoutes.some((row) => !row.guideSelected),
    'the corpus cannot distinguish offered capability from current selection',
  )
  assert.ok(
    questionRoutes.some((row) => row.guideSettled),
    "the corpus cannot distinguish eligibility from worth spending today's tap",
  )
})

check('needs-review is reserved for areas with neither action nor question capability', () => {
  assert.deepEqual(reviewWithQuestionCapability, [])
  const scenario = scenarioById('social-opening')
  assert.ok(scenario)
  const now = instant(scenario.now + 35 * DAY)
  const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
  const social = assembleSituation(buildView(load(scenario.build()), moment), moment).coverage.get(
    DOMAIN.social,
  )
  assert.equal(social?.refresh, 'needs-review')
  assert.equal(standingFor(social as DomainCoverage).note, DENIAL)
})

function lifecycleRun(action: 'start' | 'complete' | 'decline') {
  const scenario = scenarioById('what-worked')
  assert.ok(scenario)
  const now = instant(scenario.now + 30 * DAY)
  const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
  const snapshot = load(scenario.build())
  let records = snapshot.records
  let recommendation: string | undefined

  for (const step of action === 'complete' ? (['start', 'complete'] as const) : [action]) {
    const view = buildView({ ...snapshot, records }, moment)
    const candidate = decide(view, moment).evaluation?.candidate
    assert.ok(candidate)
    const planned = planLifecycle({
      view,
      situation: decide(view, moment).situation,
      semantics: candidate.semantics,
      action: step,
      recordedAt: now,
    })
    assert.equal(planned.noChange, undefined)
    records = [...records, ...planned.records]
    recommendation = planned.recommendation
  }

  const completedSnapshot = { ...snapshot, records }
  const view = buildView(completedSnapshot, moment)
  const episode = collectEpisodes(view, scenario.zone).find(
    (row) => row.recommendation === recommendation,
  )
  assert.ok(episode)
  const coverage = assembleSituation(view, moment).coverage.get(episode.semantics.domain)
  return { scenario, now, moment, completedSnapshot, episode, coverage }
}

check('normal-life follows the real completed-result window from opening through closure', () => {
  const started = lifecycleRun('start')
  assert.equal(started.episode.state, 'started')
  assert.equal(outcomeWindowFor(started.episode, started.scenario.zone), undefined)
  assert.notEqual(started.coverage?.refresh, 'normal-life')
  assert.ok(!lifeLine(started.coverage as DomainCoverage).includes(ARRIVING))

  const declined = lifecycleRun('decline')
  assert.equal(declined.episode.state, 'declined')
  assert.equal(outcomeWindowFor(declined.episode, declined.scenario.zone), undefined)
  assert.notEqual(declined.coverage?.refresh, 'normal-life')

  const completed = lifecycleRun('complete')
  assert.equal(completed.episode.state, 'completed')
  const window = outcomeWindowFor(completed.episode, completed.scenario.zone)
  assert.ok(window)
  assert.equal(completed.coverage?.refresh, 'normal-life')
  assert.equal(standingFor(completed.coverage as DomainCoverage).note, ARRIVING)

  const after = {
    ...completed.moment,
    now: (window.latest + DAY) as Instant,
  }
  const afterView = buildView(completed.completedSnapshot, after)
  const afterEpisode = collectEpisodes(afterView, completed.scenario.zone).find(
    (row) => row.recommendation === completed.episode.recommendation,
  )
  assert.ok(afterEpisode)
  assert.equal(afterEpisode.state, 'completed')
  assert.ok(outcomeWindowFor(afterEpisode, completed.scenario.zone))
  const afterCoverage = assembleSituation(afterView, after).coverage.get(
    completed.episode.semantics.domain,
  )
  assert.notEqual(afterCoverage?.refresh, 'normal-life')
  assert.ok(!lifeLine(afterCoverage as DomainCoverage).includes(ARRIVING))
})

check('already-current copy is only a calm statement about coverage recency', () => {
  let rows = 0
  for (const scenario of SCENARIOS) {
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const coverage = assembleSituation(buildView(load(scenario.build()), moment), moment).coverage
    for (const entry of coverage.domains) {
      if (entry.refresh !== 'already-current') continue
      rows += 1
      assert.ok(entry.status === 'current' || entry.status === 'quiet')
      const line = lifeLine(entry)
      assert.ok(!/up to date|all current|nothing out of date/i.test(line), line)
    }
  }
  assert.ok(rows > 0, 'already-current is never reached')
})

console.log(
  JSON.stringify(
    {
      questionRoutes: questionRoutes.length,
      selectedNow: questionRoutes.filter((row) => row.guideSelected).length,
      notSelectedNow: questionRoutes.filter((row) => !row.guideSelected).length,
      guideSettled: questionRoutes.filter((row) => row.guideSettled).length,
      passed,
      failed: failures,
    },
    null,
    2,
  ),
)

if (failures.length > 0) process.exitCode = 1
