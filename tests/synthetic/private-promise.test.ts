import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import {
  DISCREET_PRIMARY,
  discreetPlaceholder,
  mayShowDetail,
  PRIVATE_PAGE_PROMISE,
} from '../../src/domain/privacy'
import { assembleDomainPageData, pageBySlug } from '../../src/features/life/domainPages'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'

/**
 * F30, plan section 11 — the Private page's promise and Timeline's behaviour
 * agree, proved from both ends.
 *
 * The page said **"Nothing here appears anywhere else."** Timeline rendered a
 * dated row reading **"Private entry"**, and `compose.ts` documents that
 * behaviour knowingly one layer up. The detail was concealed; the existence and
 * the timing were not, and concealing the sentence is not concealing the entry.
 *
 * Section 11 allows two repairs and this is the second — the promise now says
 * what it actually covers. So the test has to run in both directions, because a
 * one-directional test is exactly how the two drifted apart in the first place:
 *
 * - **from the promise**: the sentence claims only what the display policy
 *   does, and claims all of it;
 * - **from the behaviour**: a real private record, written the way the owner
 *   writes one, renders on Timeline exactly as the sentence says it will, and
 *   on its own page in full.
 *
 * This is a truthfulness repair and it is not D-167's permission. Whether
 * private evidence may *influence* a recommendation is one owner control,
 * default off, and routing 84's.
 */

const ZONE = 'America/Denver'

/** A history with one private entry in it, written the way the owner writes one. */
function aPrivateEvening() {
  const kit = createKit('PP', ZONE, '2026-07-01T12:00:00Z')
  const now = kit.local('2026-07-06', '21:30')

  const entry = kit.record(
    'observation',
    {
      occurredAt: kit.local('2026-07-06', '20:15'),
      domains: [DOMAIN.privateHealth],
      privacy: 'private',
    },
    {
      concept: CONCEPT.privatePattern,
      value: { type: 'text', value: 'Late again, and the phone was the start of it' },
      method: 'self-report',
    },
  )

  const sleep = kit.record(
    'observation',
    { occurredAt: kit.local('2026-07-06', '07:00'), domains: [DOMAIN.sleep] },
    {
      concept: CONCEPT.sleepHours,
      value: { type: 'number', value: 6, unit: 'hours' },
      method: 'self-report',
    },
  )

  const loaded = snapshotFromWire(
    kit.document({ entities: [], records: [sleep, entry], exportedAt: now }),
  )
  expect(loaded.loaded).toBe(true)

  const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
  const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
  return { situation, entry, now, zone: kit.zone }
}

describe('F30 — from the promise', () => {
  it('claims the words stay on the page, and nothing wider', () => {
    expect(PRIVATE_PAGE_PROMISE).not.toContain('anywhere else')
    expect(PRIVATE_PAGE_PROMISE.toLowerCase()).toContain('stay on this page')
  })

  it('says out loud the one thing a primary surface does show', () => {
    // The half the old sentence denied. `mayShowDetail` is what makes it true.
    expect(mayShowDetail('private', DISCREET_PRIMARY)).toBe(false)
    expect(discreetPlaceholder('private')).toBe('Private entry')

    expect(PRIVATE_PAGE_PROMISE.toLowerCase()).toContain('timeline shows that an entry exists')
    expect(PRIVATE_PAGE_PROMISE.toLowerCase()).toContain('when')
    expect(PRIVATE_PAGE_PROMISE.toLowerCase()).toContain('never what it says')
  })

  it('is the sentence the Private page actually renders', () => {
    const page = pageBySlug('private')
    expect(page?.lede).toBe(PRIVATE_PAGE_PROMISE)
  })

  it('promises nothing about influence, which is a different question and is off', () => {
    /*
     * D-167 is one owner control, default OFF, and routing 84's. A promise on
     * this page that reached into what the engine may reason over would be
     * making a commitment this phase has no way to keep and no authority to
     * make.
     */
    expect(PRIVATE_PAGE_PROMISE.toLowerCase()).not.toContain('recommend')
    expect(PRIVATE_PAGE_PROMISE.toLowerCase()).not.toContain('influence')
    expect(PRIVATE_PAGE_PROMISE.toLowerCase()).not.toContain('learn')
  })
})

describe('F30 — from the behaviour', () => {
  it('shows that an entry exists and when, and never what it says', () => {
    const { situation, entry, zone } = aPrivateEvening()
    const timeline = assembleTimeline(situation)

    const rows = timeline.days.flatMap((day) => day.entries).filter((row) => row.id === entry.id)
    expect(rows.length, 'the row is kept, not dropped').toBe(1)

    const row = rows[0]!
    expect(row.withheld).toBe(true)
    expect(row.text).toBe(discreetPlaceholder('private'))
    expect(row.text).not.toContain('phone')
    expect(row.at, 'and it carries the moment it happened').toBe(entry.occurredAt)
    expect(row.dayId).toBe('2026-07-06')
    expect(zone).toBe(ZONE)
  })

  it('shows the words in full on the page that promised to keep them', () => {
    const { situation } = aPrivateEvening()
    const page = pageBySlug('private')
    const data = assembleDomainPageData(situation, page!)

    const reading = data.readings.find((row) => row.concept === CONCEPT.privatePattern)
    expect(reading?.text).toContain('Late again')

    const recent = data.recentChanges.map((change) => change.text).join(' ')
    expect(recent, 'the private page is the one surface that may show the detail').toContain(
      'Late again',
    )
  })

  it('keeps the detail off every other Life page', () => {
    /*
     * The sentence says the words stay on *this* page. Sleep is the neighbour
     * most likely to pick a private record up, because the same evening
     * produced both.
     */
    const { situation } = aPrivateEvening()
    const sleepPage = assembleDomainPageData(situation, pageBySlug('health-recovery')!)
    const everything = [
      ...sleepPage.readings.map((row) => row.text),
      ...sleepPage.recentChanges.map((change) => change.text),
    ].join(' ')

    expect(everything).not.toContain('Late again')
    expect(everything).not.toContain('phone')
  })

  it('fails the moment the two are allowed to disagree again', () => {
    /*
     * The reintroduction, in the only form a headless run can take it: if
     * Timeline stopped withholding, the sentence would be describing behaviour
     * that no longer happens — and the assertion above it is what notices.
     * Stated here as the pair of facts the promise rests on, so a change to
     * either has a test with the promise's own words in it.
     */
    const { situation, entry } = aPrivateEvening()
    const row = assembleTimeline(situation)
      .days.flatMap((day) => day.entries)
      .find((entryRow) => entryRow.id === entry.id)

    const promiseSaysWithheld = PRIVATE_PAGE_PROMISE.includes('never what it says')
    const promiseSaysListed = PRIVATE_PAGE_PROMISE.includes('an entry exists')

    expect(promiseSaysWithheld).toBe(row?.withheld)
    expect(promiseSaysListed).toBe(row !== undefined)
  })
})
