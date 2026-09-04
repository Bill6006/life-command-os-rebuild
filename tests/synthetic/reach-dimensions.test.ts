import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { isUsable } from '../../src/domain/knowledge'
import { assembleDomainPageData, pageForDomain } from '../../src/features/life/domainPages'
import { decide } from '../../src/intelligence/engine'
import { profileFor } from '../../src/intelligence/moves'
import { nextGuideStep, QUESTIONS_PER_DAY } from '../../src/intelligence/guide'
import { answerRecord, QUESTIONS } from '../../src/intelligence/questions'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { insightsFor } from '../../src/intelligence/insights'
import { loadScenario } from './harness'

/**
 * Routing 92 — D-166's six emotional dimensions.
 *
 * The owner approved six on 2026-08-27: mood, stress, motivation, confidence,
 * loneliness / social-connection need, mental overload. **Distinct,
 * independently unknown, never composited, not all asked on any day, free text
 * coexisting.** §13B then clarified that approval of the vocabulary is not
 * approval to create unreachable questions, so the six land in different
 * routing packages behind their own consumers.
 *
 * Two things are proved here and neither can be proved by reading the registry.
 * That **nothing anywhere composites them** — the wellness score the owner rules
 * out, arriving by accident rather than by design. And that the coupling this
 * phase decided deliberately is what actually happens: a `tracked` scale on a
 * dimension produces a trajectory card **per dimension**, six separate claims
 * rather than one blended one.
 */

const SIX = [
  CONCEPT.mood,
  CONCEPT.stress,
  CONCEPT.motivation,
  CONCEPT.confidence,
  CONCEPT.needForCompany,
  CONCEPT.overwhelm,
] as const

const ROOT = join(import.meta.dirname, '..', '..')

/** The Emotional Health page, assembled the way the screen assembles it. */
function emotionalPage(situation: Parameters<typeof assembleDomainPageData>[0]) {
  const page = pageForDomain(DOMAIN.emotional)
  expect(page, 'Emotional Health has no page').toBeDefined()
  if (page === undefined) throw new Error('unreachable')
  return assembleDomainPageData(situation, page)
}

function sourceFiles(dir: string): readonly string[] {
  const out: string[] = []
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = join(current, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
    }
  }
  walk(join(ROOT, dir))
  return out
}

function repoPath(file: string): string {
  return relative(ROOT, file).split(sep).join(posix.sep)
}

describe('six dimensions, and never one — D-166', () => {
  it('registers all six, distinct, on one scale each', () => {
    for (const concept of SIX) {
      const definition = coreConcepts.get(concept)
      expect(definition, `${concept}: not registered`).toBeDefined()
      expect(definition?.domain, `${concept}: filed outside Emotional Health`).toBe(
        DOMAIN.emotional,
      )
      expect(definition?.tracked, `${concept}: not a dimension with a scale`).toBe('scale')
      expect(definition?.privacy, `${concept}: not held discreetly`).toBe('sensitive')
    }
    expect(new Set(SIX).size, 'two of the six are the same concept').toBe(6)
  })

  it('keeps the words he types beside the readings rather than instead of them', () => {
    // D-166's own condition: free text coexisting. The dimension scales did not
    // replace `emotionalState`; a sentence and a scale are different things and
    // one is not a tidier version of the other.
    const free = coreConcepts.get(CONCEPT.emotionalState)
    expect(free, 'the free-text reading was removed').toBeDefined()
    expect(free?.tracked, 'a scale was invented for the free-text reading').toBeUndefined()
  })

  /**
   * The one place a composite is now allowed, and it is named — D-287.
   *
   * D-166's rule was *nothing anywhere*, and the owner has since approved a
   * 0–100 **state reading** and said what keeps it on the right side of the
   * line D-166 drew: it is a reading of how he is right now, and it stops being
   * one the moment it acquires a quality adjective.
   *
   * **So the guard is narrowed rather than deleted, and it costs one file.**
   * Every other source file in the repository is held to *nowhere* exactly as
   * before, which is what stops the approved composite becoming a licence for
   * an accidental one somewhere nobody is looking. `state.ts` combines them in
   * a single named function, and the test after it is the other half of the
   * trade: the exemption buys the number, and the number may never buy an
   * adjective.
   */
  const MAY_COMBINE_THEM = 'src/intelligence/state.ts'

  it('composites them nowhere but the one file D-287 approved', () => {
    /*
     * The reintroduction proof, standing rather than performed once.
     *
     * A composite would have to gather the dimensions and reduce them: an
     * array of two or more of the six with a `reduce`, a sum, an average or a
     * `/ 6` anywhere near it. This walks every source file, finds every line
     * that names two or more of the six together, and fails on any that also
     * reduces. Naming two in a **comment** is ordinary and expected — the
     * registry explains them beside each other — so comments are stripped
     * first, exactly as the architecture guards do.
     */
    const offenders: string[] = []
    const reducing = /\breduce\s*\(|\bsum\b|\baverage\b|\bmean\b|\/\s*6\b/
    for (const file of [...sourceFiles('src')]) {
      if (repoPath(file) === MAY_COMBINE_THEM) continue
      const text = readFileSync(file, 'utf8')
      // Strip block and line comments, keeping string literals intact.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      for (const line of code.split('\n')) {
        const named = SIX.filter((concept) => {
          const key = String(concept).split('.')[1] ?? ''
          return line.includes(key) || line.includes(String(concept))
        })
        if (named.length < 2) continue
        if (!reducing.test(line)) continue
        offenders.push(`${repoPath(file)}: ${line.trim().slice(0, 120)}`)
      }
    }
    expect(offenders, 'two or more dimensions were reduced to one number').toEqual([])
  })

  it('holds the exempt file to the thing the exemption was for', () => {
    /*
     * An exemption nobody checks is a hole. Two properties, and between them
     * they are the whole of what D-287 approved.
     *
     * **One reduction, in one function.** The exemption is for a state reading,
     * not for a file where anything at all may be added up.
     *
     * **And it is over readings rather than over the six.** `state.ts` walks the
     * check-in catalogue and asks the registry which entries are scales with a
     * direction; it holds no list of emotional dimensions to blend. That is what
     * makes it a reading of what he answered rather than `emotional.score`
     * arriving under a new name — the back door D-166 named.
     */
    const source = readFileSync(join(ROOT, MAY_COMBINE_THEM), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(
      (code.match(/\breduce\s*\(/g) ?? []).length,
      'the approved composite has grown a second reduction',
    ).toBe(1)
    for (const concept of SIX) {
      expect(code, `${concept} is named in the exempt file’s own code`).not.toContain(
        String(concept),
      )
    }
  })

  it('is a guard with something to catch', () => {
    // The same scan, over a line that does what the rule forbids. A guard whose
    // pattern no longer matches anything passes forever in silence.
    const reducing = /\breduce\s*\(|\bsum\b|\baverage\b|\bmean\b|\/\s*6\b/
    const wouldBe = 'const wellbeing = [mood, stress, overwhelm].reduce((a, b) => a + b) / 6'
    const named = SIX.filter((concept) => wouldBe.includes(String(concept).split('.')[1] ?? ''))
    expect(named.length).toBeGreaterThanOrEqual(2)
    expect(reducing.test(wouldBe)).toBe(true)
  })
})

describe('two known and four unknown, with nothing adding them up', () => {
  /*
   * The ordinary-owner contract, run as the owner would: record a reading on
   * two of the six and look at the page.
   */
  function twoOfSix() {
    const kit = createKit('D6', 'Europe/London', '2026-05-01T09:00:00Z')
    const now = kit.local('2026-05-20', '19:00')
    const load = kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-20', '18:30'), domains: [DOMAIN.emotional] },
      {
        concept: CONCEPT.overwhelm,
        value: { type: 'scale', value: 4, of: 5 },
        method: 'self-report',
      },
    )
    const company = kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-20', '18:30'), domains: [DOMAIN.emotional] },
      {
        concept: CONCEPT.needForCompany,
        value: { type: 'scale', value: 2, of: 5 },
        method: 'self-report',
      },
    )
    const wire = kit.document({ entities: [], records: [load, company], exportedAt: now })
    const loaded = snapshotFromWire(wire)
    expect(loaded.loaded).toBe(true)
    if (!loaded.loaded) throw new Error('unreachable')
    const at = { now, zone: kit.zone, weekStartsOn: 1 as const }
    return { at, view: buildView(loaded.snapshot, at) }
  }

  it('shows two readings and four honest unknowns on the domain page', () => {
    const { at, view } = twoOfSix()
    const situation = decide(view, at).situation
    const page = emotionalPage(situation)
    const rows = page.readings.filter((row) => SIX.some((concept) => concept === row.concept))
    expect(rows.length, 'the Emotional page does not show all six').toBe(6)

    const known = rows.filter((row) => row.state === 'explicit' || row.state === 'inferred')
    const unknown = rows.filter((row) => row.state === 'unknown')
    expect(known.map((row) => row.concept).sort()).toEqual(
      [CONCEPT.needForCompany, CONCEPT.overwhelm].sort(),
    )
    expect(unknown.length, 'a dimension nobody answered is not reading unknown').toBe(4)
  })

  it('aggregates them nowhere on the page', () => {
    const { at, view } = twoOfSix()
    const situation = decide(view, at).situation
    const printed = JSON.stringify(emotionalPage(situation))
    /*
     * The words a blended figure arrives under. This is a guard on drift rather
     * than on today's page: every one of them describes a number standing in
     * for several separate things, which is precisely what the six may not
     * become.
     */
    for (const word of ['wellbeing', 'well-being', 'overall score', 'emotional score']) {
      expect(printed.toLowerCase(), `the page prints "${word}"`).not.toContain(word)
    }
  })

  it('reads one dimension without touching the others', () => {
    const { at, view } = twoOfSix()
    const situation = decide(view, at).situation
    // Mental load is known and drives the limiter; the other five are not
    // consulted for it, and none of them acquires a value from it.
    expect(isUsable(situation.readings.get(CONCEPT.overwhelm))).toBe(true)
    for (const concept of [CONCEPT.mood, CONCEPT.stress, CONCEPT.motivation, CONCEPT.confidence]) {
      expect(isUsable(situation.readings.get(concept)), `${concept} acquired a value`).toBe(false)
    }
  })
})

describe('a tracked scale means one trajectory card per dimension — decided, not discovered', () => {
  /*
   * `trajectoryCards` gates on `definition.tracked` (D-089 moved it there on
   * purpose), so giving the dimensions a scale produces a card each once each
   * has readings of its own. §6.4 requires that to be an explicit decision with
   * copy written for it rather than a surprise found in QA. This is the
   * decision, held as behaviour.
   */
  function manyReadings() {
    const kit = createKit('DT', 'Europe/London', '2026-01-05T09:00:00Z')
    const now = kit.local('2026-03-20', '19:00')
    const records = []
    for (let day = 0; day < 8; day += 1) {
      const date = `2026-0${day < 4 ? 2 : 3}-${String(1 + day * 3).padStart(2, '0')}`
      records.push(
        kit.record(
          'observation',
          { occurredAt: kit.local(date, '19:00'), domains: [DOMAIN.emotional] },
          {
            concept: CONCEPT.overwhelm,
            value: { type: 'scale', value: day < 4 ? 2 : 4, of: 5 },
            method: 'self-report',
          },
        ),
        kit.record(
          'observation',
          { occurredAt: kit.local(date, '19:05'), domains: [DOMAIN.emotional] },
          {
            concept: CONCEPT.needForCompany,
            value: { type: 'scale', value: day < 4 ? 4 : 2, of: 5 },
            method: 'self-report',
          },
        ),
      )
    }
    const wire = kit.document({ entities: [], records, exportedAt: now })
    const loaded = snapshotFromWire(wire)
    expect(loaded.loaded).toBe(true)
    if (!loaded.loaded) throw new Error('unreachable')
    const at = { now, zone: kit.zone, weekStartsOn: 1 as const }
    return decide(buildView(loaded.snapshot, at), at).situation
  }

  it('gives each dimension its own card and never a seventh combined one', () => {
    const situation = manyReadings()
    const cards = insightsFor(situation).insights.filter((card) => card.kind === 'trajectory')
    const ids = cards.map((card) => card.id)
    expect(ids, 'mental load has no card of its own').toContain(`trajectory:${CONCEPT.overwhelm}`)
    expect(ids, 'wanting company has no card of its own').toContain(
      `trajectory:${CONCEPT.needForCompany}`,
    )
    // Two readings, two cards, and the two say opposite things — which is
    // exactly what a composite would have hidden.
    const load = cards.find((card) => card.id === `trajectory:${CONCEPT.overwhelm}`)
    const company = cards.find((card) => card.id === `trajectory:${CONCEPT.needForCompany}`)
    expect(load?.headline).toContain('Mental load')
    expect(company?.headline).toContain('Need for company')
    expect(load?.headline).not.toBe(company?.headline)
  })

  it('writes the card in the dimension’s own words', () => {
    const situation = manyReadings()
    const cards = insightsFor(situation).insights.filter((card) => card.kind === 'trajectory')
    for (const card of cards) {
      // The copy decision: the card's existing "Label: reading" shape, with the
      // dimension's label. No diagnosis, no cause, and no word about him.
      expect(card.headline, `${card.id}: says why`).not.toMatch(/because|due to|caused/i)
      expect(card.headline, `${card.id}: names a condition`).not.toMatch(
        /depress|anxiet|anxious|burnout|lonely/i,
      )
    }
  })
})

/**
 * Concepts too narrow to win in the ordinary library — §13B's closed exemption
 * discipline, and it is closed rather than a list of excuses.
 *
 * Each entry carries the concept, a written reason, the circumstance that makes
 * it decision-relevant, and **the dedicated test that proves the circumstance
 * can actually make it win**. A concept with no consumer may never use this.
 */
const RARE_BUT_REAL: readonly {
  readonly concept: string
  readonly why: string
  readonly when: string
  readonly file: string
  readonly test: string
}[] = [
  {
    concept: String(CONCEPT.workStrain),
    why: 'It competes with mental load for the same slot and loses on merit. Both ask what the owner has left for something effortful; the guide re-runs the decision under every answer and picks the question whose answers land furthest apart, and "how much have you got on your mind" moves more of them. Two questions about one evening is the burden section 4.5 forbids, so the app asking the better one is the guide working rather than the concept starving.',
    when: 'An afternoon or evening where the app is about to suggest something effortful, and the two questions that outrank it — how sore he is, and how much is on his mind — have both been answered today. What is left is the one reading that could still turn an effortful evening into an easier one.',
    file: 'tests/synthetic/reach-dimensions.test.ts',
    test: 'asks how work has been when it is about to ask something effortful',
  },
  {
    concept: String(CONCEPT.childPresent),
    why: 'A settled custody arrangement answers this indefinitely and is never re-asked — G-002, and section 4.5 in one line. Every shipped history has one, so the ordinary library is exactly the case where this question should not appear.',
    when: 'An owner whose arrangement the app has not been told about yet, on an afternoon where the answer would turn a solo walk into half an hour with his daughter.',
    file: 'tests/synthetic/adaptive-guide.test.ts',
    test: 'asks about the child when the answer would change the move',
  },
]

describe('every concept that says an answer matters wins a slot somewhere — §13B', () => {
  /*
   * The standing starvation gate, in the owner's words: *"a concept declaring
   * `materialToDecision: true` that wins zero question slots across the
   * complete scenario library is a defect."* STARVED and LEGITIMATELY RARE are
   * different, and the second is available only through a named, exhaustive
   * exemption registry — which lives in `reach-material.test.ts` beside the
   * measurement it qualifies, and is empty.
   */
  it('asks about each of them on some history, at some hour', () => {
    /*
     * *Wins a slot* means what it says: the guide put the question on screen,
     * not that a probe found it interesting. So this is `nextGuideStep`, which
     * is what Now calls, swept across the library and around the clock — the
     * hour matters because half the catalogue is block-shaped and a question
     * about how work has gone has no answer at half past six in the morning.
     */
    const HOUR = 3_600_000
    const won = new Set<string>()
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      for (const offset of [-9, -3, 0, 4, 8]) {
        const now = (scenario.now + offset * HOUR) as typeof scenario.now
        const at = {
          now,
          zone: scenario.zone,
          weekStartsOn: scenario.weekStartsOn ?? (1 as const),
        }
        /*
         * The whole session, not the first card of it. The guide asks up to
         * three in a day and re-ranks after every answer, so a concept that wins
         * the second slot has won a slot — reading only the opening question
         * would call a concept starved because a better one happened to go
         * first.
         */
        /*
         * Twice, answering low and then high. Which answer he gives changes
         * what the next question is worth — saying he is not up for people
         * closes the social branch, and with it the question about whether
         * company would help — so a single answer path is one owner's Tuesday
         * rather than what the library can show.
         */
        for (const pick of ['first', 'last'] as const) {
          let snapshot = loaded.snapshot
          for (let asked = 0; asked < QUESTIONS_PER_DAY; asked += 1) {
            const step = nextGuideStep(buildView(snapshot, at), at)
            const question = step.question
            if (question === undefined) break
            won.add(String(question.spec.concept))
            const option =
              pick === 'first' ? question.options[0] : question.options[question.options.length - 1]
            if (option === undefined) break
            snapshot = {
              ...snapshot,
              records: [
                ...snapshot.records,
                answerRecord(question.spec, option, {
                  now: at.now,
                  zone: at.zone,
                  recordedAt: (at.now + asked + 1) as typeof at.now,
                }),
              ],
            }
          }
        }
      }
    }

    /*
     * The gate applies to the concepts the guide can actually ask about.
     *
     * A material concept with **no question in the catalogue** cannot win a slot
     * at any history, at any hour, ever — it is authored on its own page, as a
     * learning topic and a week's direction are. Calling that starvation would
     * be a category error, and the rule that covers it is the next test.
     */
    const askable = new Set(QUESTIONS.map((question) => String(question.concept)))
    const starved: string[] = []
    for (const definition of coreConcepts.all()) {
      if (!definition.ask.materialToDecision) continue
      if (!askable.has(String(definition.id))) continue
      if (won.has(String(definition.id))) continue
      if (RARE_BUT_REAL.some((entry) => entry.concept === String(definition.id))) continue
      starved.push(String(definition.id))
    }
    expect(
      starved,
      'a concept says an answer to it would matter and no history in the library lets it prove that',
    ).toEqual([])
    // Every history, five clocks, two answer paths and three taps each. It is
    // the most expensive assertion in the suite and it is the gate §13B asks
    // for, so it gets the time rather than a thinner sweep.
  }, 120_000)

  it('gives a material concept with no question a route the owner can reach', () => {
    /*
     * The other half, and the one the `emotionalState` failure was really about:
     * a concept the app says an answer to matters, with **no way for the owner
     * to supply one**. A guide question is one route and naming the thing on its
     * own page is the other; what is forbidden is neither.
     */
    const askable = new Set(QUESTIONS.map((question) => String(question.concept)))
    const unreachable: string[] = []
    const first = SCENARIOS[0]
    if (first === undefined) throw new Error('unreachable')
    const at = {
      now: first.now,
      zone: first.zone,
      weekStartsOn: first.weekStartsOn ?? (1 as const),
    }
    const situation = decide(loadScenario(first.id).viewAt(at.now, at.zone), at).situation

    for (const definition of coreConcepts.all()) {
      if (!definition.ask.materialToDecision) continue
      if (askable.has(String(definition.id))) continue
      const page = pageForDomain(definition.domain)
      if (page === undefined) {
        unreachable.push(`${definition.id}: no page and no question`)
        continue
      }
      const data = assembleDomainPageData(situation, page)
      if (!data.readings.some((row) => row.concept === definition.id)) {
        unreachable.push(`${definition.id}: not on its own page either`)
      }
    }
    expect(unreachable, 'a concept the app wants an answer to, with no way to give one').toEqual([])
  })

  it('asks how work has been when it is about to ask something effortful', () => {
    /*
     * `work.strain`'s exemption, proved rather than asserted — §13B requires a
     * dedicated test showing the circumstance can actually make it win, because
     * an exemption without one is a hole in the gate rather than an entry in it.
     *
     * The circumstance, built exactly as the registry entry describes it: an
     * afternoon, a rested body so nothing else is in the way, a study topic so
     * the app has something effortful to propose, and mental load already
     * answered today — so the question that outranks this one is spent.
     */
    const kit = createKit('WS', 'Europe/London', '2026-04-01T09:00:00Z')
    const now = kit.local('2026-04-21', '17:00')
    const topic = kit.entity({
      kind: 'learning-topic',
      label: 'subnetting',
      domain: DOMAIN.career,
      privacy: 'normal',
    })
    const topicRef = { id: topic.id, kind: topic.kind }

    const nights = [7.5, 8, 7.75].map((value, offset) =>
      kit.record(
        'observation',
        {
          occurredAt: kit.local(`2026-04-${String(19 + offset).padStart(2, '0')}`, '07:00'),
          domains: [DOMAIN.sleep],
        },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value, unit: 'hours' },
          method: 'self-report',
        },
      ),
    )
    const studying = kit.record(
      'observation',
      {
        occurredAt: kit.local('2026-04-20', '20:00'),
        domains: [DOMAIN.career],
        entities: [topicRef],
      },
      {
        concept: CONCEPT.learningTopic,
        value: { type: 'entity', value: topicRef },
        method: 'self-report',
      },
    )
    const energy = kit.record(
      'observation',
      { occurredAt: kit.local('2026-04-21', '16:30'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
    )
    const time = kit.record(
      'observation',
      { occurredAt: kit.local('2026-04-21', '16:30'), domains: [DOMAIN.career] },
      {
        concept: CONCEPT.usableTimeTonight,
        value: { type: 'duration', minutes: 120 },
        method: 'self-report',
      },
    )
    // Nothing sore, so the other consequential question is spent too.
    const sore = kit.record(
      'observation',
      { occurredAt: kit.local('2026-04-21', '16:30'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    )
    // The question that would otherwise win, already answered today.
    const load = kit.record(
      'observation',
      { occurredAt: kit.local('2026-04-21', '16:30'), domains: [DOMAIN.emotional] },
      {
        concept: CONCEPT.overwhelm,
        value: { type: 'scale', value: 1, of: 5 },
        method: 'self-report',
      },
    )

    const wire = kit.document({
      entities: [topic],
      records: [...nights, studying, energy, time, sore, load],
      exportedAt: now,
    })
    const loaded = snapshotFromWire(wire)
    expect(loaded.loaded).toBe(true)
    if (!loaded.loaded) throw new Error('unreachable')

    const at = { now, zone: kit.zone, weekStartsOn: 1 as const }
    const standing = decide(buildView(loaded.snapshot, at), at)
    // The precondition the exemption names: something effortful is on offer.
    const verb = standing.evaluation?.candidate.semantics.target.verb
    expect(verb, 'nothing effortful is on offer, so the exception cannot fire').toBeDefined()
    expect(profileFor(verb!).demand).toBe('effortful')

    const step = nextGuideStep(buildView(loaded.snapshot, at), at)
    expect(step.kind).toBe('question')
    expect(step.question?.spec.concept, step.because).toBe(CONCEPT.workStrain)
    // And it is asked for the reason D-111 allows: one answer leaves the app
    // asking less of him, never more.
    expect(step.question?.outcomes.some((outcome) => outcome.easier)).toBe(true)
  })

  it('spends an exemption only with a circumstance and a test behind it', () => {
    for (const entry of RARE_BUT_REAL) {
      expect(entry.why.length, `${entry.concept}: exempt with no reason`).toBeGreaterThan(40)
      expect(entry.when.length, `${entry.concept}: exempt with no circumstance`).toBeGreaterThan(40)
      // And the named test is a file that exists, with that test in it.
      const text = readFileSync(join(ROOT, entry.file), 'utf8')
      expect(
        text.includes(entry.test),
        `${entry.concept}: ${entry.test} is not in ${entry.file}`,
      ).toBe(true)
      // A concept with no consumer may never use the rare-concept exemption.
      const definition = coreConcepts
        .all()
        .find((candidate) => String(candidate.id) === entry.concept)
      expect(definition?.ask.materialToDecision, `${entry.concept}: exempt and not material`).toBe(
        true,
      )
    }
  })
})
