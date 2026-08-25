import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import type { CommitmentWindowRecord } from '../../src/domain/records'
import { describeCommitmentWindow, occursOn } from '../../src/domain/schedule'
import { instant, localDayId, type Instant } from '../../src/domain/time'
import {
  commitmentWindowRecord,
  removeCommitmentWindowRecord,
  reviseCommitmentWindowRecord,
  SCHEDULE_SEEDS,
  standingCommitments,
  unansweredSeeds,
  WEEKDAYS,
} from '../../src/intelligence/commitments'
import { decide, type Decision } from '../../src/intelligence/engine'
import { assembleSituation } from '../../src/intelligence/situation'
import { backupFromJson, backupToJson } from '../../src/memory/backup'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import {
  schoolMorning,
  SCHOOL_MORNING_LATER,
  SCHOOL_MORNING_NOW,
  SCHOOL_MORNING_ZONE,
} from '../../src/synthetic/scenarios'

/**
 * AUD-0004 — the day is more than clock arithmetic.
 *
 * The brief asks whether a recommendation ever considers *when*, not just
 * *whether*, and the audit's answer was clean: no. Five fixed blocks from
 * wall-clock minutes, and no representation of school, work, a handover or a
 * bedtime anywhere in the engine. 07:15 with the school run in twenty minutes
 * and 11:00 with the house quiet were the same block and got the same answer.
 *
 * The adversarial history the finding asks for is `school-morning`: one
 * Wednesday, one rested body, one live topic, read at two hours inside the same
 * `morning` block.
 */

const ZONE = SCHOOL_MORNING_ZONE

function decideAt(now: Instant): Decision {
  const loaded = snapshotFromWire(schoolMorning())
  expect(loaded.loaded, 'the school-morning document should load').toBe(true)
  const moment = { now, zone: ZONE }
  return decide(buildView(loaded.snapshot, moment), moment)
}

function sentenceOf(decision: Decision, id: string): string {
  const row = decision.trace.ranking.find((entry) => entry.id === id)
  expect(row, `${id} was not ranked`).toBeDefined()
  return row?.sentence ?? ''
}

function scoreOf(decision: Decision, id: string): number {
  const row = decision.trace.ranking.find((entry) => entry.id === id)
  expect(row, `${id} was not ranked`).toBeDefined()
  return row?.score ?? Number.NaN
}

// ---------------------------------------------------------------------------
// The adversarial history
// ---------------------------------------------------------------------------

describe('AUD-0004 — the same move, right at ten and wrong at twenty past eight', () => {
  const early = decideAt(SCHOOL_MORNING_NOW)
  const later = decideAt(SCHOOL_MORNING_LATER)

  it('reads both hours as the same part of the day, which is the point', () => {
    // If the blocks differed, everything below would be explained by the block
    // and would prove nothing about obligations.
    expect(early.situation.block).toBe('morning')
    expect(later.situation.block).toBe(early.situation.block)
  })

  it('finds the same body, the same topic and the same arrangement at both', () => {
    // The only difference between the two decisions is the clock against the
    // school day. Everything the old engine could see is identical.
    expect(early.situation.capacity.strain).toEqual(later.situation.capacity.strain)
    expect(early.situation.learningTopic.state).toBe(later.situation.learningTopic.state)
    /*
     * The arrangement, and only the arrangement — QA-82-001.
     *
     * This line used to be the whole assertion and it is why the finding
     * survived a green suite: it said the two hours agreed about the daughter,
     * which was true of the field and false of the day. Whose week it is has
     * not changed at ten past eight and does not change at twenty past ten, and
     * the app must never ask him again (section 62). Where she actually is
     * absolutely does change, and the test below is the one that says so.
     */
    expect(early.situation.childPresent).toEqual(later.situation.childPresent)
  })

  it('will not put the lab in the ten minutes before her school day', () => {
    const lab = 'career/hands-on-lab/learning-topic:subnetting'
    expect(scoreOf(early, lab)).toBeLessThan(0)
    expect(scoreOf(later, lab)).toBeGreaterThan(0)
  })

  it('says what the time is short of, rather than only that it is short', () => {
    /*
     * The sentence the app could not write at all before an obligation was
     * something it could see. "Only about 10 minutes left this morning" is true
     * and tells him nothing he does not know.
     */
    expect(early.situation.limiter?.kind).toBe('time')
    expect(early.situation.limiter?.summary).toBe('About 10 minutes before Adaya’s school day.')
  })

  it('goes quiet about the clock once the house is quiet', () => {
    // And this is the half that would be broken by reading her school day as
    // time *he* is busy: the five hours between drop-off and pick-up are the
    // freest stretch of a full-custody week, and the app must not fall silent
    // through them.
    expect(later.situation.limiter?.kind).not.toBe('time')
    expect(later.situation.inHand.minutes.state).toBe('inferred')
    expect(
      later.situation.inHand.minutes.state === 'inferred'
        ? later.situation.inHand.minutes.value
        : -1,
    ).toBe(300)
  })

  it('trims a move to what is actually left before the obligation', () => {
    /*
     * Read off the same move at both hours — QA-82-001.
     *
     * It used to read the headline at each hour and assert "10 minutes" then
     * "30 minutes". The second number came from *a different move* — half an
     * hour with a daughter who was in a classroom — so a test about durations
     * was holding a defect in place. The walk is proposed at both hours and is
     * the same move, which is what makes the two numbers comparable at all.
     */
    const walk = 'health/move/routine:a-walk'
    expect(sentenceOf(early, walk)).toContain('10 minutes')
    expect(sentenceOf(later, walk)).toContain('25 minutes')
  })
})

// ---------------------------------------------------------------------------
// Whose time it is
// ---------------------------------------------------------------------------

describe('AUD-0004 — a span of someone else’s time shapes the day at its edges', () => {
  function windowRecord(whose: CommitmentWindowRecord['whose']): StoreSnapshot {
    const loaded = snapshotFromWire(schoolMorning())
    const records = loaded.snapshot.records.map((record) =>
      record.kind === 'commitment-window' ? { ...record, whose } : record,
    )
    return { ...loaded.snapshot, records }
  }

  function inHandAt(whose: CommitmentWindowRecord['whose'], now: Instant): number | undefined {
    const snapshot = windowRecord(whose)
    const moment = { now, zone: ZONE, weekStartsOn: 1 as const }
    const situation = assembleSituation(buildView(snapshot, moment), moment)
    const held = situation.inHand.minutes
    return held.state === 'inferred' || held.state === 'explicit' ? held.value : undefined
  }

  it('leaves the middle of her school day free and the middle of his work not', () => {
    // Ten o'clock, inside 08:30–15:00.
    expect(inHandAt('theirs', SCHOOL_MORNING_LATER)).toBe(300)
    expect(inHandAt('mine', SCHOOL_MORNING_LATER)).toBe(0)
  })

  it('constrains the run-up to it either way', () => {
    expect(inHandAt('theirs', SCHOOL_MORNING_NOW)).toBe(10)
    expect(inHandAt('mine', SCHOOL_MORNING_NOW)).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// The record, the rhythm and the words
// ---------------------------------------------------------------------------

describe('a commitment window is a rhythm rather than a list of days', () => {
  const AT = instant(Date.parse('2026-09-01T12:00:00Z'))
  const moment = { now: AT, zone: ZONE }

  const weekly = commitmentWindowRecord(
    {
      label: 'work',
      startsAt: 9 * 60,
      endsAt: 17 * 60,
      recurrence: { kind: 'weekly', days: WEEKDAYS },
      whose: 'mine',
      domain: DOMAIN.career,
      knownFrom: 'recurring',
    },
    moment,
  )

  it('falls on the weekdays it names and on none of the others', () => {
    // 2026-09-16 is a Wednesday and 2026-09-19 a Saturday.
    expect(occursOn(weekly.recurrence, localDayId({ year: 2026, month: 9, day: 16 }))).toBe(true)
    expect(occursOn(weekly.recurrence, localDayId({ year: 2026, month: 9, day: 19 }))).toBe(false)
  })

  it('reads as a sentence rather than as a schema', () => {
    expect(describeCommitmentWindow(weekly)).toBe('work, 09:00 to 17:00, weekdays')
  })

  it('carries where it came from, which is the field only the future needs', () => {
    /*
     * AUD-0004 asks for the provenance from the start even though only two of
     * the three can occur: owner-entered, recurring and calendar-derived
     * obligations are the same shape at different reliabilities, and adding a
     * trusted schedule source later should be an adapter rather than a
     * redesign of the record.
     */
    expect(weekly.knownFrom).toBe('recurring')
  })

  it('is taken back by a retraction and changed by a supersession', () => {
    const removal = removeCommitmentWindowRecord(weekly.id, moment)
    expect(removal.kind).toBe('correction')
    expect(removal.corrects).toBe(weekly.id)

    const revised = reviseCommitmentWindowRecord(
      weekly,
      {
        label: weekly.label,
        startsAt: 10 * 60,
        endsAt: 16 * 60,
        recurrence: weekly.recurrence,
        whose: weekly.whose,
        domain: DOMAIN.career,
        knownFrom: weekly.knownFrom,
      },
      moment,
    )
    // The distinction matters to the record and not to the owner: he moved his
    // hours, he did not decide work does not happen.
    expect(revised.kind).toBe('commitment-window')
    expect(revised.supersedes).toBe(weekly.id)
    expect(revised.startsAt).toBe(600)
  })
})

// ---------------------------------------------------------------------------
// The two seeds
// ---------------------------------------------------------------------------

describe('the two questions the owner would answer once', () => {
  const loaded = snapshotFromWire(schoolMorning())
  const moment = { now: SCHOOL_MORNING_NOW, zone: ZONE, weekStartsOn: 1 as const }
  const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)

  it('is exactly the two AUD-0004 names, and no general event form', () => {
    /*
     * Enumerated by name rather than counted: section 4.5 constrains input
     * burden, and the bound is the whole reason this is a seeded pair rather
     * than a calendar. A third seed appearing here is a decision somebody has
     * to make on purpose.
     */
    expect(SCHEDULE_SEEDS.map((seed) => seed.id)).toEqual(['school-day', 'working-hours'])
  })

  it('names her in the question it asks about her', () => {
    const school = SCHEDULE_SEEDS[0]
    expect(school?.prompt(situation)).toBe('What time does Adaya’s school day start and end?')
  })

  it('stops asking about the one already answered and keeps asking about the other', () => {
    // The school day is in this history and the working day is not.
    expect(standingCommitments(situation)).toHaveLength(1)
    expect(unansweredSeeds(situation).map((seed) => seed.id)).toEqual(['working-hours'])
  })
})

// ---------------------------------------------------------------------------
// The contract test the finding asks for
// ---------------------------------------------------------------------------

describe('a commitment window survives a backup and a restore', () => {
  it('comes back as the same hours, the same rhythm and the same provenance', () => {
    const before = snapshotFromWire(schoolMorning())
    const load = backupFromJson(
      backupToJson(before.snapshot, {
        app: {
          commitSha: 'a'.repeat(40),
          commitShort: 'aaaaaaa',
          branch: 'main',
          target: 'preview',
          buildTime: '2026-01-01T00:00:00.000Z',
        },
        createdAt: SCHOOL_MORNING_NOW,
      }),
    )
    expect(load.ok, load.ok ? '' : load.refusal.problem).toBe(true)
    if (!load.ok) return

    const window = load.snapshot.records.find(
      (record): record is CommitmentWindowRecord => record.kind === 'commitment-window',
    )
    // The values, not the container — D-108. A restored window with its hours
    // lost would satisfy `toBeDefined()` and would silently free the morning.
    expect(window?.label).toBe('Adaya’s school day')
    expect(window?.startsAt).toBe(510)
    expect(window?.endsAt).toBe(900)
    expect(window?.recurrence).toEqual({ kind: 'weekly', days: [1, 2, 3, 4, 5] })
    expect(window?.whose).toBe('theirs')
    expect(window?.knownFrom).toBe('recurring')

    // And it still means the same thing after the trip.
    const moment = { now: SCHOOL_MORNING_NOW, zone: ZONE, weekStartsOn: 1 as const }
    const situation = assembleSituation(buildView(load.snapshot, moment), moment)
    expect(situation.limiter?.summary).toBe('About 10 minutes before Adaya’s school day.')
  })
})
