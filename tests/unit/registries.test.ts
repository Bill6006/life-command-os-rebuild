import { describe, expect, it } from 'vitest'
import {
  entityId,
  entityIdKind,
  isEntityId,
  isRecordId,
  newRecordId,
  slugify,
} from '../../src/domain/ids'
import {
  CORE_LIFE_DOMAINS,
  coreDomains,
  createDomainRegistry,
  DOMAIN,
} from '../../src/domain/domains'
import {
  CONCEPT,
  coreConcepts,
  createConceptRegistry,
  currentConcept,
  READING_SENSES,
  type TrackedReading,
} from '../../src/domain/concepts'
import {
  civilDateFromDayId,
  instantAtLocal,
  parseLocalDayId,
  timeZone,
  type Instant,
  type LocalDayId,
} from '../../src/domain/time'
import {
  approximateHorizonMs,
  freshnessWindow,
  isFreshAt,
  type FreshnessHorizon,
} from '../../src/domain/windows'
import { entityRef } from '../../src/domain/entities'
import type { FactValue } from '../../src/domain/records'
import { numericValue } from '../../src/intelligence/association'
import {
  DISCREET_PRIMARY,
  FULL_EXPORT,
  isPrivacyClass,
  mayShowDetail,
  mostSensitive,
  PRIVACY_CLASSES,
} from '../../src/domain/privacy'
import { conceptId } from '../../src/domain/windows'

describe('identifiers', () => {
  it('makes the same entity id for the same subject every time', () => {
    expect(entityId('learning-topic', 'Subnetting')).toBe('learning-topic:subnetting')
    expect(entityId('learning-topic', 'subnetting')).toBe('learning-topic:subnetting')
    expect(entityId('LearningTopic', 'Subnetting  ')).toBe('learningtopic:subnetting')
    expect(entityId('learning-topic', 'VLAN trunking')).toBe('learning-topic:vlan-trunking')
  })

  it('carries the kind inside the id so a bad reference is readable', () => {
    expect(entityIdKind(entityId('person', 'Adaya'))).toBe('person')
    expect(isEntityId('person:adaya')).toBe(true)
    expect(isEntityId('person:')).toBe(false)
    expect(isEntityId('Person:Adaya')).toBe(false)
  })

  it('refuses to build an entity id from nothing', () => {
    expect(() => entityId('person', '   ')).toThrow()
  })

  it('folds accents rather than dropping the letter', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume')
  })

  it('makes record ids that look like record ids and do not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newRecordId()))
    expect(ids.size).toBe(500)
    for (const id of ids) expect(isRecordId(id)).toBe(true)
    expect(isRecordId('short')).toBe(false)
    expect(isRecordId(42)).toBe(false)
  })
})

describe('life domains', () => {
  it('carries every core domain from section 4.1', () => {
    expect(coreDomains.all()).toHaveLength(11)
    expect(coreDomains.labelFor(DOMAIN.privateHealth)).toBe('Private / Sexual Health')
    expect(coreDomains.labelFor(DOMAIN.fatherhood)).toBe('Fatherhood / Family')
  })

  it('has no way to switch a domain off', () => {
    for (const domain of CORE_LIFE_DOMAINS) {
      expect(Object.keys(domain).sort()).toEqual(['defaultPrivacy', 'id', 'label'])
    }
  })

  it('defaults the private and family domains to a discreet class', () => {
    expect(coreDomains.defaultPrivacyFor(DOMAIN.privateHealth)).toBe('private')
    expect(coreDomains.defaultPrivacyFor(DOMAIN.fatherhood)).toBe('child-family-sensitive')
    expect(coreDomains.defaultPrivacyFor(DOMAIN.home)).toBe('normal')
  })

  it('extends without mutating the registry it came from', () => {
    const extra = { id: DOMAIN.health, label: 'Renamed', defaultPrivacy: 'sensitive' } as const
    const extended = coreDomains.extendedWith([extra])
    expect(extended.labelFor(DOMAIN.health)).toBe('Renamed')
    expect(coreDomains.labelFor(DOMAIN.health)).toBe('Health & Physical Capacity')
  })

  it('shows an unregistered domain as itself rather than as a blank', () => {
    const empty = createDomainRegistry([])
    expect(empty.labelFor(DOMAIN.health)).toBe('health')
  })
})

describe('concepts', () => {
  it('gives each concept its own freshness rather than one global number', () => {
    // A settled arrangement does not expire…
    expect(coreConcepts.definitionFor(CONCEPT.custodyArrangement).freshness).toEqual({
      unit: 'durable',
    })
    // …but a one-off answer about tonight is only good for tonight. The
    // standing answer comes from a context record's validity window, not from
    // stretching a concept's clock to forever.
    expect(coreConcepts.definitionFor(CONCEPT.childPresent).freshness).toEqual({
      unit: 'local-days',
      days: 1,
    })
    /*
     * …and last night's sleep is true of the day it describes rather than for a
     * fixed number of hours after somebody happened to say it — AUD-0005. The
     * unit is the claim: `local-days: 1` expired a 06:30 reading at 10:00 the
     * same morning, about the same night.
     */
    expect(coreConcepts.definitionFor(CONCEPT.sleepHours).freshness).toEqual({
      unit: 'this-local-day',
    })
    expect(coreConcepts.definitionFor(CONCEPT.sleepQuality).freshness).toEqual({
      unit: 'this-local-day',
    })
    /*
     * How much time there is is a fact about this part of the day, and it goes
     * when the part of the day does. Under its own id now — AUD-0006 renamed
     * `career.usable-time-tonight` to `time.free-now`, and the old id resolves
     * through `SUPERSEDED_CONCEPTS` rather than being registered twice.
     */
    expect(coreConcepts.definitionFor(CONCEPT.freeNow).freshness).toEqual({
      unit: 'this-block',
    })
    expect(
      coreConcepts.get(CONCEPT.usableTimeTonight),
      'the superseded id is registered as a concept in its own right',
    ).toBeUndefined()
    expect(currentConcept(CONCEPT.usableTimeTonight)).toBe(CONCEPT.freeNow)
    expect(coreConcepts.definitionFor(CONCEPT.energy).freshness).toEqual({
      unit: 'elapsed',
      ms: 6 * 3_600_000,
    })
  })

  it('says what every concept is read for, and says it as a use — AUD-0040', () => {
    /*
     * The purpose used to live in `assembleSituation`, beside a hand-written
     * read, and that is the asymmetry AUD-0040 is about: giving a concept a
     * *read* was a code change while everything else about it was registry
     * work. Moving it here is what let the situation walk the registry — so
     * the field has to be as checkable as the rest of the registry is.
     *
     * The sentence reaches the owner. The QA fact ledger and the export both
     * print "<label> — <reading> … for <purpose>", so a purpose that repeats
     * the label produces "Current energy — 3 of 5 … for current energy", which
     * is the schema talking to itself.
     */
    for (const definition of coreConcepts.all()) {
      expect(definition.purpose.trim().length, `${definition.id}: no stated use`).toBeGreaterThan(0)
      expect(
        definition.purpose.toLowerCase(),
        `${definition.id}: the use is the label again`,
      ).not.toBe(definition.label.toLowerCase())
      // The only placeholder there is. A second one would be substituted
      // nowhere and would reach the owner as a brace.
      const braces = definition.purpose.match(/\{[^}]*\}/g) ?? []
      for (const placeholder of braces) {
        expect(placeholder, `${definition.id}: a placeholder nothing fills in`).toBe('{when}')
      }
      // It is a use, not a heading: "for whether she is here today" reads;
      // "for Child in the owner's care today" does not.
      expect(
        /^[a-z]/.test(definition.purpose),
        `${definition.id}: a use is not a title, so it does not start capitalised`,
      ).toBe(true)
    }
  })

  it('does not spend a question on the private domain unprompted', () => {
    expect(coreConcepts.definitionFor(CONCEPT.privatePattern).ask).toEqual({
      materialToDecision: false,
      askWhenStale: false,
    })
  })

  it('covers every core domain', () => {
    const covered = new Set(coreConcepts.all().map((concept) => concept.domain))
    for (const domain of CORE_LIFE_DOMAINS) {
      expect(covered.has(domain.id)).toBe(true)
    }
  })

  it('treats an unregistered concept cautiously instead of refusing it', () => {
    const invented = conceptId('made.up.by.a.fixture')
    const definition = coreConcepts.definitionFor(invented)
    expect(definition.id).toBe(invented)
    expect(definition.privacy).toBe('sensitive')
    expect(definition.ask.materialToDecision).toBe(false)
    expect(coreConcepts.get(invented)).toBeUndefined()
  })

  it('extends without mutating', () => {
    const invented = conceptId('made.up')
    const extended = createConceptRegistry().extendedWith([
      {
        id: invented,
        label: 'Made up',
        domain: DOMAIN.home,
        freshness: { unit: 'durable' },
        privacy: 'normal',
        ask: { materialToDecision: false, askWhenStale: false },
        purpose: 'a concept invented by a fixture',
      },
    ])
    expect(extended.get(invented)?.label).toBe('Made up')
    expect(coreConcepts.get(invented)).toBeUndefined()
  })
})

describe('privacy', () => {
  it('recognises the four classes the plan requires', () => {
    expect([...PRIVACY_CLASSES]).toEqual([
      'normal',
      'sensitive',
      'private',
      'child-family-sensitive',
    ])
    expect(isPrivacyClass('private')).toBe(true)
    expect(isPrivacyClass('secret')).toBe(false)
  })

  it('takes the most discreet class when several apply', () => {
    expect(mostSensitive(['normal', 'sensitive'])).toBe('sensitive')
    expect(mostSensitive(['normal', 'child-family-sensitive', 'sensitive'])).toBe(
      'child-family-sensitive',
    )
    expect(mostSensitive(['private', 'child-family-sensitive'])).toBe('private')
    expect(mostSensitive([])).toBe('normal')
  })

  it('keeps explicit private detail off an ordinary surface until asked', () => {
    expect(mayShowDetail('private', DISCREET_PRIMARY)).toBe(false)
    expect(mayShowDetail('private', { surface: 'primary', revealPrivate: true })).toBe(true)
    expect(mayShowDetail('sensitive', DISCREET_PRIMARY)).toBe(true)
    expect(mayShowDetail('child-family-sensitive', DISCREET_PRIMARY)).toBe(true)
  })

  it('never makes the private domain impossible to export', () => {
    for (const privacy of PRIVACY_CLASSES) {
      expect(mayShowDetail(privacy, FULL_EXPORT)).toBe(true)
      expect(mayShowDetail(privacy, { surface: 'export', revealPrivate: false })).toBe(true)
    }
  })
})

/**
 * What a tracked dimension means, and what it must not become (D-091).
 *
 * `tracked` says a concept is worth reading as a trend and learning from. The
 * invariant underneath it is that such a dimension has a **stable construct, a
 * stable scale and a stable direction** — and that separate dimensions stay
 * separate. Mood, stress, confidence and motivation are four things; one
 * generic emotional quantity standing in for all four is the wellness score the
 * owner rules out, and it is how a system starts telling somebody their life is
 * a 7.
 *
 * Which dimensions exist is the owner's to decide, so nothing here invents a
 * taxonomy. What it does enforce is that the registry cannot drift into an
 * aggregate: a tracked concept must be a reading of one thing, on a scale that
 * can be read as a number, in a window that expects it to change.
 */
describe('a tracked dimension is one thing, on one scale', () => {
  const tracked = coreConcepts.all().filter((concept) => concept.tracked !== undefined)

  it('has some, or the trend machinery is reading nothing', () => {
    expect(tracked.length).toBeGreaterThan(3)
  })

  it('can actually be read as a number by the path that tracks it', () => {
    /*
     * R3-B3, and the assertion whose absence let it through. `emotionalState`
     * was declared tracked and said to participate; its readings are free text,
     * which `numericValue` discards before any scale, direction, trajectory or
     * before-and-after comparison exists. The registry made a claim and nothing
     * checked that the machinery could honour it.
     *
     * This runs the declared shape through the real function rather than
     * trusting the label on it, so the two cannot drift apart.
     */
    const sample: Partial<Record<TrackedReading, FactValue>> = {
      scale: { type: 'scale', value: 3, of: 5 },
      number: { type: 'number', value: 7.5, unit: 'hours' },
      duration: { type: 'duration', minutes: 45 },
    }

    for (const concept of tracked) {
      const shape = concept.tracked
      if (shape === undefined) continue
      const reading = sample[shape]
      // Named rather than indexed blindly, so a shape nobody has a sample for
      // fails with a sentence instead of a null dereference.
      expect(
        reading,
        `${concept.id} declares "${shape}", which is not a reading shape`,
      ).toBeDefined()
      expect(
        reading === undefined ? undefined : numericValue(reading),
        `${concept.id} declares ${shape}, which the tracking path cannot read as a number`,
      ).toBeTypeOf('number')
    }
  })

  it('never declares a shape the tracking path would throw away', () => {
    /*
     * The other direction, and the one that matters for the next concept
     * somebody adds. Text and an entity reference are real things the owner
     * says; they are not dimensions with a scale and a direction, and a
     * concept holding one of those may not be marked tracked.
     */
    for (const value of [
      { type: 'text', value: 'flat' },
      { type: 'entity', value: entityRef('routine', 'a walk') },
    ] as readonly FactValue[]) {
      expect(
        numericValue(value),
        `${value.type} is not a quantity, so no tracked concept may hold it`,
      ).toBeUndefined()
    }
  })

  it('leaves the emotional taxonomy open rather than inventing one', () => {
    /*
     * D-091 invariant 6, as a standing decision rather than as today's state.
     * The repair for R3-B3 is *not* giving emotional state a scale — mood,
     * stress, confidence and motivation are four things, and one number for all
     * four is the wellness score the owner rules out.
     *
     * **What changed, and what did not — AUD-0041, correction 3.15.** The scale
     * is still not invented and the class is still discreet. What went is the
     * claim that an answer to it changes a decision: nothing anywhere reads it,
     * there is no question in the catalogue that could produce an answer, and
     * the flag said an answer mattered. That is the app holding three positions
     * on one concept and showing the owner the two that contradict. The words
     * he types are still kept as he typed them and still shown on his page.
     */
    const emotional = coreConcepts.definitionFor(CONCEPT.emotionalState)
    expect(emotional.tracked, 'a scale was invented for how he feels').toBeUndefined()
    expect(
      emotional.ask.materialToDecision,
      'it claims an answer would decide something, and nothing reads it',
    ).toBe(false)
    expect(emotional.privacy).toBe('sensitive')
  })

  it('says which way is the good way for its readings to move — AUD-0029', () => {
    /*
     * The declaration `trajectory-fit` rests on, held as something that can
     * fail. A direction is not a valence: six weeks of falling readings is a
     * fall whichever concept it is about, and falling sleep is a man getting
     * worse while falling soreness is a shoulder getting better.
     *
     * **Required rather than defaulted, and DEF-0156 is why.** A boolean on a
     * concept that nothing verifies was wrong in four cases of fifteen and
     * nobody noticed for a phase. So a concept that declares `tracked` and no
     * sense fails the build here rather than quietly reading as one of the
     * three.
     */
    for (const concept of tracked) {
      expect(
        concept.sense,
        `${concept.id}: tracked, and nothing says which way is the good way`,
      ).toBeDefined()
      expect(READING_SENSES, `${concept.id}: ${String(concept.sense)}`).toContain(concept.sense)
    }
  })

  it('leaves the sense off every concept that is not tracked', () => {
    // The reverse, so the field cannot become decoration. A series that cannot
    // be read as a number has no direction, so it can have no sense either.
    for (const concept of coreConcepts.all()) {
      if (concept.tracked !== undefined) continue
      expect(
        concept.sense,
        `${concept.id}: a sense on a concept with no series to have one about`,
      ).toBeUndefined()
    }
  })

  it('keeps a want from being read as a state going wrong', () => {
    /*
     * `neither` is a real answer and this is the concept it exists for.
     * Wanting company more is not a man doing worse and it is not him doing
     * better; a drift here is a fact about what would help. Named rather than
     * swept, because the whole point of the third value is that somebody
     * decided about this one.
     */
    expect(coreConcepts.definitionFor(CONCEPT.needForCompany).sense).toBe('neither')
  })

  it('expects to change, so it is never durable', () => {
    for (const concept of tracked) {
      expect(
        concept.freshness.unit,
        `${concept.id}: a durable fact is not a dimension to track`,
      ).not.toBe('durable')
    }
  })

  it('never becomes an aggregate score of several constructs', () => {
    /*
     * The names a wellness score arrives under. This is a guard on drift rather
     * than on today's registry: every one of these words describes a number
     * standing in for several separate things, which is exactly what a tracked
     * dimension may not be.
     */
    const aggregate =
      /overall|wellness|wellbeing|well-being|composite|\bscore\b|\bindex\b|readiness/i
    for (const concept of tracked) {
      expect(aggregate.test(concept.id), `${concept.id}: reads as an aggregate`).toBe(false)
      expect(
        aggregate.test(concept.label),
        `${concept.label}: reads as an aggregate of several things`,
      ).toBe(false)
    }
  })

  it('says who is most worth believing about it, per concept', () => {
    // D-059's rule, and the reason a tracked dimension can be compared at all:
    // two readings of one concept mean the same thing whoever supplied them.
    for (const concept of tracked) {
      expect(concept.reliability, `${concept.id}: no reliability`).toBeDefined()
      expect(concept.reliability?.owner, `${concept.id}: no owner reliability`).toBeGreaterThan(0)
    }
  })
})

/**
 * A reading is valid for the thing it describes — AUD-0005.
 *
 * The audit put two windows side by side and showed they were the wrong way
 * round. "Hours slept last night" carried a rolling one-day countdown, so a
 * reading taken at 06:30 was `known` at 06:30 and `stale` at 10:00 on the same
 * morning — the same value, about the same night, on the same day — and the
 * morning lost its best fact at the hour it most needed it. Meanwhile "the
 * kitchen table is buried again", one of the most perishable claims the model
 * holds, stayed current for a week.
 *
 * These test the two new units directly rather than through a scenario, because
 * what changed is what a window *means* rather than what any particular history
 * says.
 */
describe('a reading expires with the thing it is about', () => {
  const DENVER = timeZone('America/Denver')

  const dayId = (value: string): LocalDayId => {
    const parsed = parseLocalDayId(value)
    if (parsed === undefined) throw new Error(`not a local day: ${value}`)
    return parsed
  }

  const at = (day: string, hour: number, minute = 0): Instant =>
    instantAtLocal({ ...civilDateFromDayId(dayId(day)), hour, minute, second: 0 }, DENVER)

  const stillFresh = (recordedAt: Instant, horizon: FreshnessHorizon, when: Instant): boolean =>
    isFreshAt(recordedAt, when, freshnessWindow(CONCEPT.sleepHours, horizon), DENVER)

  it('keeps last night’s sleep for the whole of the day it describes', () => {
    const horizon: FreshnessHorizon = { unit: 'this-local-day' }
    const morning = at('2026-05-12', 6, 30)

    // The exact reproduction: known at half past six, and still known at ten.
    expect(stillFresh(morning, horizon, at('2026-05-12', 6, 30))).toBe(true)
    expect(stillFresh(morning, horizon, at('2026-05-12', 10))).toBe(true)
    expect(stillFresh(morning, horizon, at('2026-05-12', 22))).toBe(true)
    // And gone once the following night has happened, which is what makes it
    // stop being an answer to "how did you sleep last night".
    expect(stillFresh(morning, horizon, at('2026-05-13', 0, 30))).toBe(false)
    expect(stillFresh(morning, horizon, at('2026-05-13', 6, 30))).toBe(false)
  })

  it('is not a widening — an evening reading goes at the same midnight', () => {
    /*
     * Worth asserting explicitly, because a change to a freshness window is a
     * change to what the app is willing to assert, and section 63 is breached
     * by widening exactly as much as by narrowing. A reading taken at ten at
     * night is good for two hours under this rule and was good for a further
     * twenty-two under the old one.
     */
    const horizon: FreshnessHorizon = { unit: 'this-local-day' }
    const lateEvening = at('2026-05-12', 22)

    expect(stillFresh(lateEvening, horizon, at('2026-05-12', 23, 30))).toBe(true)
    expect(stillFresh(lateEvening, horizon, at('2026-05-13', 0, 30))).toBe(false)
  })

  it('ends a block-scoped reading at the boundary of its own block', () => {
    const horizon: FreshnessHorizon = { unit: 'this-block' }

    // How much time there is is a fact about the morning it was said in.
    const inTheMorning = at('2026-05-12', 9, 40)
    expect(stillFresh(inTheMorning, horizon, at('2026-05-12', 11, 59))).toBe(true)
    expect(stillFresh(inTheMorning, horizon, at('2026-05-12', 12, 1))).toBe(false)

    // The afternoon runs to six, the evening to ten.
    const inTheAfternoon = at('2026-05-12', 13)
    expect(stillFresh(inTheAfternoon, horizon, at('2026-05-12', 17, 59))).toBe(true)
    expect(stillFresh(inTheAfternoon, horizon, at('2026-05-12', 18, 1))).toBe(false)

    const inTheEvening = at('2026-05-12', 19)
    expect(stillFresh(inTheEvening, horizon, at('2026-05-12', 21, 59))).toBe(true)
    expect(stillFresh(inTheEvening, horizon, at('2026-05-12', 22, 1))).toBe(false)
  })

  it('carries a late-night reading over midnight rather than dropping it there', () => {
    // Late night spans both ends of the day, and a reading taken at eleven is
    // about the same stretch of time as one taken at one in the morning.
    const horizon: FreshnessHorizon = { unit: 'this-block' }
    const beforeMidnight = at('2026-05-12', 23)

    expect(stillFresh(beforeMidnight, horizon, at('2026-05-13', 1))).toBe(true)
    expect(stillFresh(beforeMidnight, horizon, at('2026-05-13', 3, 59))).toBe(true)
    expect(stillFresh(beforeMidnight, horizon, at('2026-05-13', 4, 1))).toBe(false)
  })

  it('gives the readers that need a number one answer rather than three', () => {
    /*
     * `association.ts`, `coverage.ts` and `insights.ts` each had their own
     * `unit === 'local-days' ? … : …` line, which is three places to forget a
     * new unit in — and forgetting one is silent, because the expression still
     * compiles and simply reads the wrong field.
     */
    expect(approximateHorizonMs({ unit: 'durable' })).toBeUndefined()
    expect(approximateHorizonMs({ unit: 'local-days', days: 2 })).toBe(2 * 86_400_000)
    expect(approximateHorizonMs({ unit: 'elapsed', ms: 5_000 })).toBe(5_000)
    expect(approximateHorizonMs({ unit: 'this-local-day' })).toBe(86_400_000)
    // The longest block there is, so a fact that lasts all afternoon is not
    // treated as one that lasts an hour.
    expect(approximateHorizonMs({ unit: 'this-block' })).toBe(6 * 3_600_000)
  })

  it('shortens the claim about a room rather than lengthening it', () => {
    // The other half of the pair. Three days, not seven: he clears the table
    // without telling the app.
    expect(coreConcepts.definitionFor(CONCEPT.homeFriction).freshness).toEqual({
      unit: 'local-days',
      days: 3,
    })
  })
})
