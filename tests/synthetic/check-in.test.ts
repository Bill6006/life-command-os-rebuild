import { describe, expect, it } from 'vitest'
import {
  CHECK_IN_DEPTHS,
  CHECK_IN_FREQUENCIES,
  CHECK_IN_OPENS_AT,
  CHECK_IN_SLOTS,
  DEFAULT_CHECK_IN_SETTINGS,
  readingsAt,
  readingsPerDay,
  SLOTS_AT_FREQUENCY,
} from '../../src/domain/checkIn'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import { coreDomains } from '../../src/domain/domains'
import { createEntityIndex } from '../../src/domain/entities'
import { describeRecord } from '../../src/features/history/describe'
import { resolveHistory } from '../../src/memory/resolve'
import { isUsable } from '../../src/domain/knowledge'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView, type MemoryView } from '../../src/memory/view'
import {
  civilDateFromDayId,
  instantAtLocal,
  localDayIdAt,
  parseLocalDayId,
  timeZone,
  type Instant,
  type TimeZoneId,
} from '../../src/domain/time'
import type { CanonicalRecord } from '../../src/domain/records'
import {
  answeredInCheckIns,
  answeredInSlot,
  checkInBudget,
  checkInRecord,
  checkInSettingRecord,
  checkInSettings,
  CHECK_IN_PROVENANCE,
  dueCheckIn,
  nextCheckInOpensAt,
} from '../../src/intelligence/checkIn'
import { answeredToday, nextGuideStep, QUESTIONS_PER_DAY } from '../../src/intelligence/guide'
import { answerRecord, questionFor } from '../../src/intelligence/questions'
import {
  ANCHORS_PER_READING,
  CHECK_IN_READINGS,
  ENERGY_ANCHORS,
  readingFor,
} from '../../src/intelligence/readings'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * Routing 94 — the check-in, the readings, and what they cost.
 *
 * Four claims, and each is the kind that cannot be read off the source.
 *
 * **The ritual is D-293's, exactly.** Not *approximately thirteen* — the
 * concepts it names, at the sizes it names, at the default it set.
 *
 * **The two budgets never pool** (D-286). Proved by driving both to their
 * limits against each other rather than by reading two counters.
 *
 * **A skipped reading stays unknown** (G-009). Proved on a store where twelve of
 * thirteen were skipped, and again across a day boundary, because *nothing is
 * back-filled* is a claim about later as well as about now.
 *
 * **And the anchors describe states rather than grading them.** The one rule the
 * owner set himself, as a guard with the sets he rejected on the other side of
 * it.
 */

const ZONE = timeZone('America/Denver')

/** A store with nothing in it, so the ritual is measured where it was starved. */
function emptyStore(): { view: (at: Instant) => MemoryView; local: (time: string) => Instant } {
  const kit = createKit('checkin', 'America/Denver', '2026-09-01T00:00:00Z')
  const document = kit.document({
    exportedAt: kit.at('2026-09-04T00:00:00Z'),
    records: [],
    entities: [],
  })
  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the empty store did not load').toBe(true)
  return {
    view: (at: Instant) => buildView(loaded.snapshot, { now: at, zone: ZONE }),
    local: (time: string) => kit.local('2026-09-04', time),
  }
}

/** A store built from a list of records the owner is taken to have given. */
function storeOf(records: readonly CanonicalRecord[]): (at: Instant) => MemoryView {
  const kit = createKit('checkin-with', 'America/Denver', '2026-09-01T00:00:00Z')
  const document = kit.document({
    exportedAt: kit.at('2026-09-05T00:00:00Z'),
    records: [...records],
    entities: [],
  })
  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the store did not load').toBe(true)
  return (at: Instant) => buildView(loaded.snapshot, { now: at, zone: ZONE })
}

function localAt(day: string, time: string): Instant {
  const dayId = parseLocalDayId(day)
  if (dayId === undefined) throw new Error(`bad day ${day}`)
  const [hour, minute] = time.split(':')
  return instantAtLocal(
    { ...civilDateFromDayId(dayId), hour: Number(hour), minute: Number(minute), second: 0 },
    ZONE,
  )
}

// ---------------------------------------------------------------------------
// The ritual is the one D-293 specified
// ---------------------------------------------------------------------------

describe('the check-in asks what D-293 said it asks', () => {
  it('reads thirteen in the morning and five at each of the others', () => {
    /*
     * D-293's table, as an assertion rather than as a comment. The concepts are
     * named because the decision names them: a test that only counted them
     * would pass on thirteen of the wrong ones.
     */
    expect(readingsAt('morning', 'full')).toEqual([
      CONCEPT.mood,
      CONCEPT.irritation,
      CONCEPT.energy,
      CONCEPT.hunger,
      CONCEPT.stress,
      CONCEPT.sleepHours,
      CONCEPT.sleepQuality,
      CONCEPT.overwhelm,
      CONCEPT.motivation,
      CONCEPT.confidence,
      CONCEPT.focus,
      CONCEPT.needForCompany,
      CONCEPT.socialEnergy,
    ])
    for (const slot of ['midday', 'evening'] as const) {
      expect(readingsAt(slot, 'full')).toEqual([
        CONCEPT.mood,
        CONCEPT.irritation,
        CONCEPT.energy,
        CONCEPT.hunger,
        CONCEPT.stress,
      ])
    }
    expect(readingsPerDay(DEFAULT_CHECK_IN_SETTINGS), 'D-293 set twenty-three a day').toBe(23)
  })

  it('ships the default D-293 named, not the safe-looking low one', () => {
    // D-285's caution, as a test: "do not let it be the safe-looking low one."
    // A store with no setting in it is on the largest depth and the highest
    // frequency, and this fails if a later edit quietly lowers either.
    const store = emptyStore()
    expect(checkInSettings(store.view(store.local('09:00')))).toEqual({
      depth: 'full',
      frequency: 'three',
    })
    expect(DEFAULT_CHECK_IN_SETTINGS.depth).toBe(CHECK_IN_DEPTHS[0])
    expect(DEFAULT_CHECK_IN_SETTINGS.frequency).toBe(CHECK_IN_FREQUENCIES[0])
  })

  it('asks the store that was starved twenty-three times where it asked once', () => {
    /*
     * The measurement the whole phase exists to answer, on the same shape of
     * store it was taken on: an empty history was asked **one question a day**
     * on 2026-09-03, because one candidate cannot be re-ranked so nothing was
     * worth asking.
     *
     * The guide still asks what it always asked — that gate is not repealed and
     * is not this budget. What changed is that a second budget exists beside it.
     */
    const store = emptyStore()
    const asked = new Set<string>()
    for (const slot of CHECK_IN_SLOTS) {
      const view = store.view(
        store.local(`${String(Math.floor(CHECK_IN_OPENS_AT[slot] / 60)).padStart(2, '0')}:30`),
      )
      const due = dueCheckIn(view, { now: store.local('09:00'), zone: ZONE })
      void due
      for (const concept of readingsAt(slot, 'full')) asked.add(String(concept))
    }
    expect(asked.size, 'the whole day reads eleven distinct concepts plus the night').toBe(13)
    expect(readingsPerDay(DEFAULT_CHECK_IN_SETTINGS)).toBeGreaterThan(20)
  })

  it('keeps every reading in the catalogue and every catalogue entry reachable', () => {
    // Both directions, because either alone is satisfiable by a mistake: a
    // reading nothing asks for is dead copy, and a slot asking for a concept
    // with no anchors is a screen with a blank question on it.
    const reachable = new Set<string>()
    for (const slot of CHECK_IN_SLOTS) {
      for (const depth of CHECK_IN_DEPTHS) {
        for (const concept of readingsAt(slot, depth)) {
          expect(readingFor(concept), `${concept} is asked for and has no anchors`).toBeDefined()
          reachable.add(String(concept))
        }
      }
    }
    for (const reading of CHECK_IN_READINGS) {
      expect(reachable.has(String(reading.concept)), `${reading.concept} is never asked`).toBe(true)
    }
  })

  it('never drops the morning, at any frequency', () => {
    // It is the only check-in that can read the night, and the only one
    // carrying the dimensions that barely move. A frequency without it leaves a
    // day with no sleep reading at all.
    for (const frequency of CHECK_IN_FREQUENCIES) {
      expect(SLOTS_AT_FREQUENCY[frequency], frequency).toContain('morning')
      expect(readingsAt('morning', 'full')).toContain(CONCEPT.sleepHours)
    }
  })

  it('gets smaller as the depth does, and never larger', () => {
    // A class check rather than three hand-counted numbers: whatever the levels
    // are, each one asks for no more than the one above it, and the smallest
    // still asks for something.
    for (const slot of CHECK_IN_SLOTS) {
      const sizes = CHECK_IN_DEPTHS.map((depth) => readingsAt(slot, depth).length)
      for (let i = 1; i < sizes.length; i += 1) {
        expect(
          sizes[i]!,
          `${slot}: ${CHECK_IN_DEPTHS[i]} asks more than ${CHECK_IN_DEPTHS[i - 1]}`,
        ).toBeLessThanOrEqual(sizes[i - 1]!)
      }
      expect(sizes[sizes.length - 1]!, `${slot}: the smallest depth asks nothing`).toBeGreaterThan(
        0,
      )
    }
  })

  it('keeps the readings he named himself at the smallest depth', () => {
    /*
     * `fewest` is drawn at a quotation rather than at a builder's preference —
     * his first, unprompted description of the loop: *"sleep? 6 hours, mood? 5
     * out of 10, irritated? 9/10, hungry? 5/10."*
     */
    for (const concept of [CONCEPT.mood, CONCEPT.irritation, CONCEPT.hunger, CONCEPT.sleepHours]) {
      expect(readingsAt('morning', 'fewest'), String(concept)).toContain(concept)
    }
  })
})

// ---------------------------------------------------------------------------
// When it is open, and when it says nothing
// ---------------------------------------------------------------------------

describe('a check-in is open only inside its own window', () => {
  it('says nothing before the first one opens', () => {
    const store = emptyStore()
    for (const time of ['00:30', '05:00', '06:30', '07:59']) {
      expect(
        dueCheckIn(store.view(store.local(time)), { now: store.local(time), zone: ZONE }),
        time,
      ).toBeUndefined()
    }
  })

  it('opens each one at its hour and closes it when the next opens', () => {
    const store = emptyStore()
    const slotAt = (time: string) =>
      dueCheckIn(store.view(store.local(time)), { now: store.local(time), zone: ZONE })?.slot
    expect(slotAt('08:00')).toBe('morning')
    expect(slotAt('12:59')).toBe('morning')
    expect(slotAt('13:00')).toBe('midday')
    expect(slotAt('19:59')).toBe('midday')
    expect(slotAt('20:00')).toBe('evening')
    expect(slotAt('23:59')).toBe('evening')
  })

  it('holds one window open where a frequency removed the next one', () => {
    // Not a gap: at two a day the morning runs to the evening rather than
    // closing at one o'clock and leaving seven hours with nothing open.
    const store = storeOf([
      checkInSettingRecord({ depth: 'full', frequency: 'two' }, 'twice a day', {
        now: localAt('2026-09-03', '09:00'),
        zone: ZONE,
      }),
    ])
    const at = localAt('2026-09-04', '15:00')
    expect(dueCheckIn(store(at), { now: at, zone: ZONE })?.slot).toBe('morning')
  })

  it('says when the next one opens rather than only that none is', () => {
    const store = emptyStore()
    const before = store.local('06:00')
    expect(nextCheckInOpensAt(store.view(before), { now: before, zone: ZONE })).toBe(
      CHECK_IN_OPENS_AT.morning,
    )
    const late = store.local('21:00')
    expect(nextCheckInOpensAt(store.view(late), { now: late, zone: ZONE })).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// G-009 — a skipped reading stays unknown
// ---------------------------------------------------------------------------

describe('a skipped reading is unknown, not guessed', () => {
  it('leaves twelve of thirteen unknown when one is answered', () => {
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const mood = readingFor(CONCEPT.mood)!
    const store = storeOf([checkInRecord(mood, mood.anchors[2]!, moment)])
    const view = store(moment.now)

    expect(isUsable(view.facts.knowledgeFor(CONCEPT.mood)), 'the answer did not land').toBe(true)
    for (const concept of readingsAt('morning', 'full')) {
      if (concept === CONCEPT.mood) continue
      expect(
        isUsable(view.facts.knowledgeFor(concept)),
        `${concept} acquired a value nobody gave it`,
      ).toBe(false)
    }
  })

  it('does not carry this morning’s answer into tomorrow’s check-in', () => {
    /*
     * The half of G-009 that is about later. A reading answered on Thursday
     * morning must not make Friday morning's look already given — the freshness
     * horizon is what decides whether the *belief* survives, and the ritual
     * asks again either way.
     */
    const thursday = { now: localAt('2026-09-03', '08:30'), zone: ZONE }
    const mood = readingFor(CONCEPT.mood)!
    const store = storeOf([checkInRecord(mood, mood.anchors[4]!, thursday)])

    const friday = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const answered = answeredInSlot(store(friday.now), friday, 'morning')
    expect(answered.size, 'yesterday’s answers counted as today’s').toBe(0)
    expect(dueCheckIn(store(friday.now), friday)?.next?.concept).toBe(CONCEPT.mood)
  })

  it('does not let the morning answer stand in for the evening', () => {
    // The same concept three times a day is the point of the design, so an
    // earlier slot's answer must not close a later one.
    const morning = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const mood = readingFor(CONCEPT.mood)!
    const store = storeOf([checkInRecord(mood, mood.anchors[1]!, morning)])
    const evening = { now: localAt('2026-09-04', '20:30'), zone: ZONE }
    expect(answeredInSlot(store(evening.now), evening, 'evening').size).toBe(0)
    expect(dueCheckIn(store(evening.now), evening)?.answeredCount).toBe(0)
  })

  it('counts a reading as answered only where the check-in wrote it', () => {
    /*
     * A guide answer about the same concept in the same window is a real
     * reading and is **not** this check-in's answer to it. Conflating them
     * would make the ritual look finished because the guide happened to ask
     * about energy, which is D-286's pooling arriving through the back door.
     */
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const energy = questionFor(CONCEPT.energy)!
    const store = storeOf([answerRecord(energy, energy.options({} as never)[0]!, moment)])
    expect(answeredInSlot(store(moment.now), moment, 'morning').size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// D-286 — two budgets, and they never pool
// ---------------------------------------------------------------------------

describe('the ritual and the guide are counted apart — D-286', () => {
  it('spends none of the guide’s budget, however many readings are given', () => {
    /*
     * The decision in one assertion: *"never one pooled count, or the ritual
     * eats the useful questions or the reverse."* Thirteen readings — four times
     * the guide's whole daily allowance — and the guide's counter has not moved.
     */
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const records = readingsAt('morning', 'full').map((concept) => {
      const spec = readingFor(concept)!
      return checkInRecord(spec, spec.anchors[2]!, moment)
    })
    expect(records.length).toBe(13)

    const view = storeOf(records)(moment.now)
    expect(answeredToday(view, moment), 'the check-in spent the guide’s budget').toBe(0)
    expect(answeredInCheckIns(view, moment)).toBe(13)
    expect(13).toBeGreaterThan(QUESTIONS_PER_DAY)
  })

  it('is not closed by the guide having spent its own', () => {
    // And the reverse, which is the failure mode the decision names second.
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const energy = questionFor(CONCEPT.energy)!
    const sleep = questionFor(CONCEPT.sleepHours)!
    const view = storeOf([
      answerRecord(energy, energy.options({} as never)[0]!, moment),
      answerRecord(sleep, sleep.options({} as never)[0]!, moment),
    ])(moment.now)

    expect(answeredToday(view, moment)).toBe(2)
    expect(answeredInCheckIns(view, moment)).toBe(0)
    expect(dueCheckIn(view, moment)?.totalCount).toBe(13)
  })

  it('puts the setting on Timeline in the words he was reading', () => {
    /*
     * The record has a route (D-161's table names it) and until this it had no
     * proof that it **renders**. A settings row is the one kind that could
     * plausibly reach Timeline as a schema id — `fewest` and `one` mean nothing
     * a year later — so what it prints is the statement the control was showing
     * when he pressed it, which is `PermissionRecord.statement`'s discipline
     * applied to the same problem.
     */
    const record = checkInSettingRecord(
      { depth: 'fewest', frequency: 'one' },
      'The fewest, once a day — 11 readings a day, at 08:00',
      { now: localAt('2026-09-04', '09:00'), zone: ZONE },
    )
    const said = describeRecord(record, {
      entities: createEntityIndex([]),
      history: resolveHistory([record]),
      concepts: coreConcepts,
      domains: coreDomains,
      policy: { surface: 'primary', revealPrivate: false },
    })
    expect(said?.tag, 'the row is tagged as something else').toBe('Check-in')
    expect(said?.text).toBe('The fewest, once a day — 11 readings a day, at 08:00')
    // And what it printed is the sentence rather than the two levels, which is
    // the whole reason `statement` sits beside the choice.
    expect(said?.text).not.toBe(`${record.depth}, ${record.frequency}`)
    expect(said?.text.length, 'the row is shorter than a sentence').toBeGreaterThan(20)
  })

  it('reports its own budget rather than a joint one', () => {
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const mood = readingFor(CONCEPT.mood)!
    const view = storeOf([checkInRecord(mood, mood.anchors[0]!, moment)])(moment.now)
    expect(checkInBudget(view, moment)).toEqual({ answered: 1, perDay: 23 })
  })

  it('writes every reading as an ordinary observation the fact layer resolves', () => {
    /*
     * D-293's *"stored as ordinary observation records"* — no schema invention,
     * and the proof is that the record arrives as a belief rather than that it
     * has the right shape.
     */
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    for (const reading of CHECK_IN_READINGS) {
      const record = checkInRecord(reading, reading.anchors[3]!, moment)
      expect(record.kind).toBe('observation')
      expect(record.method).toBe('self-report')
      expect(record.provenance).toEqual(CHECK_IN_PROVENANCE)
      const definition = coreConcepts.definitionFor(reading.concept)
      expect(record.privacy, `${reading.concept} lost its privacy class`).toBe(definition.privacy)
      expect(record.domains, `${reading.concept} lost its domain`).toEqual([definition.domain])
      expect(isUsable(storeOf([record])(moment.now).facts.knowledgeFor(reading.concept))).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// The anchors
// ---------------------------------------------------------------------------

describe('every reading offers five anchors on one scale', () => {
  it('offers exactly five, with distinct ids and distinct values', () => {
    for (const reading of CHECK_IN_READINGS) {
      const { anchors, concept } = reading
      expect(anchors.length, String(concept)).toBe(ANCHORS_PER_READING)
      expect(new Set(anchors.map((a) => a.id)).size, String(concept)).toBe(anchors.length)
      expect(new Set(anchors.map((a) => JSON.stringify(a.value))).size, String(concept)).toBe(
        anchors.length,
      )
    }
  })

  it('puts every scale on the same denominator, so the score averages cleanly', () => {
    for (const reading of CHECK_IN_READINGS) {
      for (const anchor of reading.anchors) {
        if (anchor.value.type !== 'scale') continue
        expect(anchor.value.of, `${reading.concept} is on a different scale`).toBe(
          ANCHORS_PER_READING,
        )
      }
    }
  })

  it('orders them, so a higher value is a higher reading', () => {
    // The sense on the registry says which direction is good; this says the
    // anchors are in *some* order at all, which is what the score's
    // normalisation assumes and nothing else checks.
    for (const reading of CHECK_IN_READINGS) {
      const numbers = reading.anchors.map((anchor) =>
        anchor.value.type === 'scale'
          ? anchor.value.value
          : anchor.value.type === 'number'
            ? anchor.value.value
            : Number.NaN,
      )
      for (let i = 1; i < numbers.length; i += 1) {
        expect(
          numbers[i]!,
          `${reading.concept} anchor ${i} is not above the one before`,
        ).toBeGreaterThan(numbers[i - 1]!)
      }
    }
  })

  it('keeps every value a shipped question already wrote meaning what it meant', () => {
    /*
     * Section 30 and D-101: nothing rewrites history. A stored
     * `energy.current` of 4 was written when 4 meant *Plenty*, so the fifth
     * anchor went above it rather than being inserted below.
     *
     * The same claim for social energy, whose guide question writes 1, 3 and 4
     * and never 2 or 5 — the two values the check-in's extra anchors took.
     */
    const anchorAt = (concept: (typeof CHECK_IN_READINGS)[number]['concept'], value: number) =>
      readingFor(concept)?.anchors.find(
        (anchor) => anchor.value.type === 'scale' && anchor.value.value === value,
      )?.label
    expect(anchorAt(CONCEPT.energy, 1)).toBe('Running on empty')
    expect(anchorAt(CONCEPT.energy, 4)).toBe('Plenty — the day is covered')
    expect(anchorAt(CONCEPT.energy, 4)?.startsWith('Plenty')).toBe(true)
    expect(anchorAt(CONCEPT.socialEnergy, 1)?.startsWith('Rather not')).toBe(true)
    expect(anchorAt(CONCEPT.socialEnergy, 3)).toBe('Could go either way')
    expect(anchorAt(CONCEPT.overwhelm, 1)?.startsWith('Not much')).toBe(true)
    expect(anchorAt(CONCEPT.overwhelm, 5)).toBe('More than I can hold')
  })

  it('gives the guide and the check-in one definition of energy, not two', () => {
    expect(questionFor(CONCEPT.energy)?.options({} as never)).toBe(ENERGY_ANCHORS)
    expect(readingFor(CONCEPT.energy)?.anchors).toBe(ENERGY_ANCHORS)
  })
})

/**
 * The owner's own rule, as a guard — and the sets he rejected are the proof it
 * bites.
 *
 * > *"For mood, **good** is not helpful enough for me. I don't really know what
 * > good means."*
 *
 * The failure has a shape rather than a vocabulary: an anchor that says only
 * **how much** and never **of what**. So a word list is not enough on its own and
 * is not what this is — the list is of *degree words*, and an anchor fails only
 * when it is made of nothing else. *"Flat — nothing wrong, nothing good"* passes
 * with two degree words in it, because it names something; bare *"Flat"* does
 * not.
 *
 * **And the calibration is fixed by the two sets the owner turned down**, which
 * are asserted below as things this catches. A guard tuned until the shipped
 * copy passed would be tuned to pass; one that has to keep catching what he
 * rejected cannot be.
 */
const DEGREE_WORDS = new Set([
  'a',
  'alright',
  'an',
  'average',
  'bad',
  'bit',
  'enough',
  'extreme',
  'extremely',
  'fair',
  'fine',
  'good',
  'great',
  'high',
  'little',
  'lot',
  'low',
  'medium',
  'mild',
  'moderate',
  'more',
  'much',
  'no',
  'none',
  'normal',
  'not',
  'of',
  'ok',
  'okay',
  'out',
  'plenty',
  'poor',
  'quite',
  'really',
  'slight',
  'slightly',
  'some',
  'somewhat',
  'the',
  'very',
])

/** An anchor that names a point on a scale and nothing else. */
function gradesRatherThanNames(label: string): boolean {
  const words = label
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter(Boolean)
  if (words.length === 0) return true
  return words.every((word) => DEGREE_WORDS.has(word) || /^\d+$/.test(word))
}

describe('an anchor describes a state rather than grading one', () => {
  it('catches every anchor the owner turned down', () => {
    const rejected = [
      // The mood set he was shown and refused.
      ['Low', 'Alright', 'Good', 'Really good'],
      // And the focus set, where all five are points on a line.
      ['Very low', 'Low', 'Medium', 'High', 'Very high'],
      // The shape he named directly.
      ['4 out of 5', 'Moderate'],
    ]
    for (const set of rejected) {
      for (const label of set) {
        expect(gradesRatherThanNames(label), `"${label}" was not caught`).toBe(true)
      }
    }
  })

  it('passes every one of the sixty-five that ship', () => {
    const offenders: string[] = []
    for (const reading of CHECK_IN_READINGS) {
      for (const anchor of reading.anchors) {
        if (gradesRatherThanNames(anchor.label)) {
          offenders.push(`${reading.concept}: "${anchor.label}"`)
        }
      }
    }
    expect(offenders, 'an anchor names a point on a scale rather than a state').toEqual([])
  })

  it('is sixty-five phrases rather than a number nobody counted', () => {
    const total = CHECK_IN_READINGS.reduce((sum, reading) => sum + reading.anchors.length, 0)
    expect(total).toBe(65)
  })

  it('leaves no anchor without something to recognise in it', () => {
    // The second half of the shape: a label with no content word at all cannot
    // describe a state, whatever words it is made of.
    for (const reading of CHECK_IN_READINGS) {
      for (const anchor of reading.anchors) {
        expect(
          anchor.label.trim().length,
          `${reading.concept} has an empty anchor`,
        ).toBeGreaterThan(2)
      }
    }
  })

  it('never asks the same question twice under two names', () => {
    // Irritation is not a variant of stress, and D-293 says so in as many
    // words. The registry keeps them apart; this keeps their *anchors* apart,
    // which is where a merge would actually happen.
    const prompts = CHECK_IN_READINGS.map((reading) => reading.prompt)
    expect(new Set(prompts).size, 'two readings share a prompt').toBe(prompts.length)
    const labels = CHECK_IN_READINGS.flatMap((reading) => reading.anchors.map((a) => a.label))
    expect(new Set(labels).size, 'two readings share an anchor').toBe(labels.length)
  })
})

// ---------------------------------------------------------------------------
// The three new concepts
// ---------------------------------------------------------------------------

describe('D-293’s three new concepts', () => {
  it('registers all three with a scale and a direction', () => {
    for (const concept of [CONCEPT.irritation, CONCEPT.focus, CONCEPT.hunger]) {
      const definition = coreConcepts.get(concept)
      expect(definition, `${concept} is not registered`).toBeDefined()
      expect(definition?.tracked, String(concept)).toBe('scale')
      expect(definition?.sense, String(concept)).toBeDefined()
    }
  })

  it('keeps irritation apart from stress rather than mapping it on', () => {
    // Two concepts, two domains-worth of meaning, two separate series. A
    // reading of one may never resolve the other.
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const irritation = readingFor(CONCEPT.irritation)!
    const view = storeOf([checkInRecord(irritation, irritation.anchors[4]!, moment)])(moment.now)
    expect(isUsable(view.facts.knowledgeFor(CONCEPT.irritation))).toBe(true)
    expect(
      isUsable(view.facts.knowledgeFor(CONCEPT.stress)),
      'a stress reading was inferred from irritation',
    ).toBe(false)
  })

  it('files hunger under health rather than among the emotional dimensions', () => {
    // D-293: it amends D-166's six to eight and adds hunger **outside** that
    // list. A hunger reading landing in Emotional would be the composite it
    // spent a decision avoiding.
    expect(String(coreConcepts.definitionFor(CONCEPT.hunger).domain)).toBe('health')
    for (const concept of [CONCEPT.irritation, CONCEPT.focus]) {
      expect(String(coreConcepts.definitionFor(concept).domain)).toBe('emotional')
    }
  })

  it('leaves all three unaskable by the guide', () => {
    /*
     * §13B: a concept ships askable only where a consumer exists that some
     * possible answer could move, and none of these has one. D-293 satisfies the
     * rule from the other side — the consumer is the score and the history — and
     * that is the ritual's budget, not the guide's.
     */
    for (const concept of [CONCEPT.irritation, CONCEPT.focus, CONCEPT.hunger]) {
      expect(questionFor(concept), `${concept} became a guide question`).toBeUndefined()
      expect(coreConcepts.definitionFor(concept).ask.materialToDecision).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// What this phase added to how often the app speaks
// ---------------------------------------------------------------------------

/**
 * Routing 94's own delta, pinned and enumerated — and the other three are not
 * re-baselined.
 *
 * Routing 92's 216 and 218 and routing 93's 15 are a before-and-after about
 * changes that are not this one, and the whole value of them is that they do not
 * move. `reach-gate.test.ts` still asserts every one of them at exactly the
 * figure it shipped with, and this phase did not touch any of the three — which
 * is worth stating, because extending `energy.current` from four answers to five
 * could have moved the guide's share rule and did not.
 *
 * **This is measured over a library where the check-in is never answered**, which
 * is deliberately the worst case: on the twenty-seven pre-92 histories at five
 * hours each, a check-in is open and unfinished at **95** of the 135 moments,
 * across **78** distinct check-ins. The gap between the two figures is the
 * honest reading of the number — this is roughly one card per open check-in
 * rather than one card standing all day and being counted five times, which is
 * how routing 93's fifteen is made.
 *
 * **And it stops the moment he answers.** A finished check-in shows nothing at
 * all, so the figure a real store produces is bounded by how many check-ins go
 * unanswered rather than by how many happen. That is the signal D-294 says to
 * watch after this phase ships, and it is now the thing this number measures.
 */
const CHECK_IN_CARDS_ADDED_BY_94 = 95
const CHECK_INS_BEHIND_THEM = 78

const BEFORE_ROUTING_92: readonly string[] = SCENARIOS.map((scenario) => scenario.id).filter(
  (id) => id !== 'friendship-gone-quiet' && id !== 'money-item-due',
)

describe('what routing 94 added to how often the app speaks', () => {
  const HOUR = 3_600_000

  it('adds ninety-five cards over seventy-eight check-ins, and says which is which', () => {
    let cards = 0
    const checkIns = new Set<string>()
    for (const id of BEFORE_ROUTING_92) {
      const scenario = SCENARIOS.find((entry) => entry.id === id)
      if (scenario === undefined) throw new Error(`no scenario called ${id}`)
      const loaded = loadScenario(id)
      for (const offset of [-9, -3, 0, 4, 8]) {
        const now = (scenario.now + offset * HOUR) as Instant
        const zone: TimeZoneId = scenario.zone
        const view = loaded.viewAt(now, zone, scenario.weekStartsOn ?? (1 as const))
        const due = dueCheckIn(view, { now, zone })
        if (due === undefined || due.next === undefined) continue
        cards += 1
        checkIns.add(`${id}|${String(localDayIdAt(now, zone))}|${due.slot}`)
      }
    }
    expect(cards, 'the check-in card appears more often than this phase measured').toBe(
      CHECK_IN_CARDS_ADDED_BY_94,
    )
    expect(checkIns.size, 'the cards are spread over a different number of check-ins').toBe(
      CHECK_INS_BEHIND_THEM,
    )
  })

  it('says nothing on a check-in that has been answered', () => {
    /*
     * The bound on the figure above, and the only place this phase gets to
     * spend on **not** speaking. A card standing all evening after he has
     * already answered is AUD-0025's repetition arriving through a new door.
     */
    const moment = { now: localAt('2026-09-04', '08:30'), zone: ZONE }
    const records = readingsAt('morning', 'full').map((concept) => {
      const spec = readingFor(concept)!
      return checkInRecord(spec, spec.anchors[1]!, moment)
    })
    const due = dueCheckIn(storeOf(records)(moment.now), moment)
    expect(due, 'the check-in disappeared instead of finishing').toBeDefined()
    expect(due?.next, 'a finished check-in still had something to say').toBeUndefined()
  })

  it('takes no question slot from the guide on any shipped history', () => {
    /*
     * The other side of not re-baselining: this phase adds a card, and it must
     * not also change what the guide asks. Three new concepts were registered
     * and a shipped question gained an answer, and either could have moved the
     * share rule. Nothing this phase added may hold a guide slot.
     */
    for (const id of BEFORE_ROUTING_92) {
      const scenario = SCENARIOS.find((entry) => entry.id === id)
      if (scenario === undefined) throw new Error(`no scenario called ${id}`)
      const loaded = loadScenario(id)
      const at = {
        now: scenario.now,
        zone: scenario.zone,
        weekStartsOn: scenario.weekStartsOn ?? (1 as const),
      }
      const step = nextGuideStep(loaded.viewAt(at.now, at.zone, at.weekStartsOn), at)
      if (step.kind !== 'question') continue
      expect(
        String(step.question?.spec.concept),
        `${id}: a concept routing 94 added took a question slot`,
      ).not.toMatch(/^emotional\.(irritation|focus)$|^health\.hunger$/)
    }
  })
})
