import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { RECORD_KINDS } from '../../src/domain/records'
import { assembleTimeline, TIMELINE_PAGE } from '../../src/features/timeline/timelineEntries'
import { tagFor } from '../../src/features/history/describe'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario, ORPHAN_PRONOUNS } from './harness'

/**
 * Timeline against real synthetic histories (canonical plan section 26).
 *
 * Section 26 states four rules, and each has a test here rather than a comment:
 * it stays readable, private detail obeys the display policy, malformed rows
 * are isolated and reported rather than dropped, and nothing corrupt can become
 * an actionable item.
 *
 * The sweeps run over every history in the library, because the way a line goes
 * wrong on this surface is not that somebody wrote a bad one — it is that a
 * record kind nobody had a fixture for renders as a bare value with nothing
 * saying what it is, which is exactly what DEF-0029 was.
 */

function timelineFor(id: string, limit = 500) {
  const situation = loadScenario(id).decision().situation
  return assembleTimeline(situation, limit)
}

function allEntries(id: string) {
  return timelineFor(id).days.flatMap((day) => day.entries)
}

describe('every entry, across the whole library', () => {
  const everything = SCENARIOS.flatMap((scenario) =>
    allEntries(scenario.id).map((entry) => ({ scenario: scenario.id, entry })),
  )

  it('has plenty to check', () => {
    expect(everything.length).toBeGreaterThan(100)
  })

  it('says something, and never a bare identifier', () => {
    for (const { scenario, entry } of everything) {
      expect(entry.text.trim().length, `${scenario}: an empty line`).toBeGreaterThan(0)
      expect(entry.text, `${scenario}: "${entry.text}"`).not.toContain('undefined')
      // A record id is 25 characters of upper-case and digits. One reaching a
      // line means a reference was rendered instead of resolved.
      expect(/\b[A-Z0-9]{20,}\b/.test(entry.text), `${scenario}: "${entry.text}"`).toBe(false)
    }
  })

  it('carries an ordinary word for its kind rather than a schema name', () => {
    for (const { scenario, entry } of everything) {
      expect(entry.tag.length, `${scenario}: no tag`).toBeGreaterThan(0)
      expect(entry.tag, `${scenario}: "${entry.tag}" reads as a record kind`).not.toMatch(/-/)
      expect(entry.tag).not.toMatch(/^[a-z]/)
    }
  })

  it('names a tag for every record kind the schema has', () => {
    // The class rather than the cases: a twenty-first record kind fails here
    // rather than rendering an undefined tag on whichever history contains it.
    for (const kind of RECORD_KINDS) {
      expect(tagFor(kind), `no tag for "${kind}"`).toBeTruthy()
    }
  })

  it('reads in order, newest first, within each day and across days', () => {
    for (const scenario of SCENARIOS) {
      const data = timelineFor(scenario.id)
      let previous = Number.POSITIVE_INFINITY
      for (const day of data.days) {
        for (const entry of day.entries) {
          expect(entry.at, `${scenario.id}: out of order`).toBeLessThanOrEqual(previous)
          previous = entry.at
        }
      }
    }
  })

  it('shows nothing dated after the moment being viewed', () => {
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision().situation
      for (const entry of assembleTimeline(situation, 500).days.flatMap((day) => day.entries)) {
        expect(entry.at, `${scenario.id}: a future entry`).toBeLessThanOrEqual(situation.at)
      }
    }
  })

  it('never loses the noun on a lifecycle line', () => {
    /*
     * DEF-0028's class, on the whole-life version of the surface it was found
     * on. A completion carries a reference to the recommendation rather than a
     * subject of its own, and the generic sentence is only acceptable when the
     * reference genuinely cannot be resolved.
     */
    for (const { scenario, entry } of everything) {
      if (!/suggestion here/.test(entry.text)) continue
      // The generic form is allowed; what is not allowed is a pronoun standing
      // in for a subject the app could have named.
      const words = entry.text.toLowerCase().match(/[a-z']+/g) ?? []
      const orphans = words.filter(
        (word) => (ORPHAN_PRONOUNS as readonly string[]).includes(word) && word !== 'it',
      )
      expect(orphans, `${scenario}: "${entry.text}"`).toEqual([])
    }
  })
})

describe('the record kinds an owner reads chronologically', () => {
  it('describes an answer, a suggestion, what became of it, and the result', () => {
    const entries = allEntries('what-worked')
    const tags = new Set(entries.map((entry) => entry.tag))
    for (const expected of ['Noted', 'Suggested', 'Done', 'Result']) {
      expect(tags, `no "${expected}" entry on a month of real history`).toContain(expected)
    }
  })

  it('tells a result, an effect and a comfort apart in the sentence itself', () => {
    /*
     * DEF-0020's distinction, on the surface most likely to erase it. One
     * episode can produce three answers minutes apart, and a row whose meaning
     * lived only in the tag beside it would read on a domain page — which shows
     * no tag at all — as a bare statement about the kitchen with nothing saying
     * what was being asked.
     */
    const lines = SCENARIOS.flatMap((scenario) => allEntries(scenario.id))
      .filter((entry) => entry.tag === 'Result')
      .map((entry) => entry.text)
    expect(lines.length).toBeGreaterThan(10)

    for (const frame of [/^How far .+ got: /, /^What .+ was worth: /, /^How .+ felt: /]) {
      expect(
        lines.some((line) => frame.test(line)),
        `nothing anywhere matches ${frame}`,
      ).toBe(true)
    }
    // Every one of them says which question it answers.
    for (const line of lines) {
      expect(
        /^How far .+ got: |^What .+ was worth: |^How .+ felt: |suggestion here/.test(line),
        `"${line}" does not say which question it answers`,
      ).toBe(true)
    }
  })

  it('says what the owner answered, in the words the button used', () => {
    const lines = allEntries('long-run')
      .filter((entry) => entry.tag === 'Result')
      .map((entry) => entry.text)
    // The move is named and the answer is stated. Neither is composed here: the
    // name comes from the same table Insights uses, and the answer from the
    // same table the button was rendered from.
    expect(lines.some((line) => line === 'What getting out for a walk was worth: backfired.')).toBe(
      true,
    )
    expect(
      lines.some((line) => line === 'What clearing the kitchen was worth: a real difference.'),
    ).toBe(true)
    expect(
      lines.some((line) => line === 'How reaching out to your sister felt: a bit awkward.'),
    ).toBe(true)
  })

  it('says what became of a suggestion by naming the suggestion', () => {
    // DEF-0028's rule, on the four lifecycle kinds. The generic form is
    // permitted only where the reference genuinely cannot be resolved.
    const lines = SCENARIOS.flatMap((scenario) => allEntries(scenario.id)).filter((entry) =>
      ['Started', 'Done', 'Passed', 'Not then'].includes(entry.tag),
    )
    expect(lines.length).toBeGreaterThan(10)
    for (const entry of lines) {
      expect(entry.text, `"${entry.text}"`).not.toContain('a suggestion here')
    }
  })

  it('reads a day in one consistent order rather than an arbitrary one', () => {
    /*
     * Every event in one session shares an `occurredAt`, so the order within a
     * day comes down to the tiebreak. Sorting on the instant alone left it to
     * the record id, and a fixture showed "Done" above "Suggested" on some
     * dates and below it on others. The canonical order reversed puts what was
     * written last at the top, everywhere.
     */
    for (const scenario of SCENARIOS) {
      for (const day of timelineFor(scenario.id).days) {
        const suggested = day.entries.findIndex((entry) => entry.tag === 'Suggested')
        const done = day.entries.findIndex((entry) => entry.tag === 'Done')
        if (suggested === -1 || done === -1) continue
        expect(
          done,
          `${scenario.id} / ${day.dayId}: the suggestion is above what became of it`,
        ).toBeLessThan(suggested)
      }
    }
  })

  it('names the subject a completion was about', () => {
    // DEF-0028 verbatim: "Followed through on a suggestion here" on a history
    // whose only subject for a month was one place.
    const entries = allEntries('what-worked')
    const completion = entries.find((entry) => entry.tag === 'Done')
    expect(completion?.text).toContain('the kitchen')
  })

  it('leads a reading with the concept it is a reading of', () => {
    // DEF-0029: a bare "60 min" with nothing saying what it measured.
    const entries = allEntries('week-pointed-at-home')
    const readings = entries.filter((entry) => entry.tag === 'Noted')
    expect(readings.length).toBeGreaterThan(0)
    for (const reading of readings) {
      expect(reading.text, `"${reading.text}" has no label`).toMatch(/^[^:]+: /)
    }
  })

  it('does not call a temporary exception a standing arrangement', () => {
    /*
     * Found on the deployed build by reading a row: a situational context
     * rendered "Standing — child with the owner: no — for now", the tag saying
     * one thing and the sentence saying its opposite on one line. DEF-0033's
     * class at the smallest possible scale.
     */
    const entries = allEntries('durable-custody')
    const standing = entries.filter((entry) => entry.tag === 'Standing')
    const temporary = entries.filter((entry) => entry.tag === 'Temporary')

    expect(standing.length, 'no durable context on a history built around one').toBeGreaterThan(0)
    expect(temporary.length, 'no situational exception on the week-away history').toBeGreaterThan(0)
    for (const entry of standing) expect(entry.text, entry.text).not.toContain('for now')
    for (const entry of temporary) expect(entry.text, entry.text).toContain('for now')
  })

  it('shows a correction as a withdrawal and marks what replaced something', () => {
    const data = timelineFor('corrections')
    const entries = data.days.flatMap((day) => day.entries)
    expect(entries.some((entry) => entry.tag === 'Withdrawn')).toBe(true)
    expect(entries.some((entry) => entry.replacedSomething)).toBe(true)
  })
})

describe('private detail obeys the display policy', () => {
  const entries = allEntries('quiet-fortnight')

  it('keeps the row and withholds what it says', () => {
    /*
     * Section 11, and `privacy.ts`'s own contract: a false answer from
     * `mayShowDetail` means "show that it exists, not what it says" — never
     * "drop it". A surface that omitted the row would tell the owner his
     * history is thinner than it is.
     */
    const withheld = entries.filter((entry) => entry.withheld)
    expect(withheld.length, 'the private entry vanished from Timeline').toBeGreaterThan(0)
    for (const entry of withheld) {
      expect(entry.text).toBe('Private entry')
    }
  })

  it('puts the explicit private content nowhere on the surface', () => {
    // The scenario's own private note, which the private domain page does show.
    for (const entry of entries) {
      expect(entry.text.toLowerCase()).not.toContain('late scrolling')
    }
  })

  it('withholds it on every history that has one, not only this one', () => {
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision().situation
      const privateRecords = situation.view.history.effective.filter(
        (record) => record.privacy === 'private' && record.occurredAt <= situation.at,
      )
      if (privateRecords.length === 0) continue
      const shown = assembleTimeline(situation, 500)
        .days.flatMap((day) => day.entries)
        .filter((entry) => privateRecords.some((record) => record.id === entry.id))
      expect(shown.length, `${scenario.id}: a private record went missing`).toBe(
        privateRecords.length,
      )
      for (const entry of shown) {
        expect(entry.withheld, `${scenario.id}: private detail on Timeline`).toBe(true)
      }
    }
  })

  it('is not something a control on the surface can change', () => {
    // `assembleTimeline` takes no policy argument at all, so there is no way
    // for a surface to ask for the private detail. Section 11 as a signature
    // rather than as a setting.
    expect(assembleTimeline.length).toBeLessThanOrEqual(2)
  })
})

describe('a file with damage in it', () => {
  const data = timelineFor('malformed-history')

  it('still renders the readable entries', () => {
    expect(data.total).toBeGreaterThan(0)
    expect(data.days.length).toBeGreaterThan(0)
  })

  it('reports the unreadable rows rather than dropping them', () => {
    expect(data.unreadable.length).toBeGreaterThan(0)
    for (const row of data.unreadable) {
      expect(row.where, 'no way to find the row in the file').toMatch(/^(Record|Entity) row \d+$/)
      expect(row.problem.length).toBeGreaterThan(0)
    }
  })

  it('says which list a bad row came from, and reports both', () => {
    /*
     * Records and entities are parsed from two arrays, each row's index is
     * relative to its own, and this fixture damages both. Numbering them all
     * "Row N" put a "Row 1" and a "Row 6" in one list with nothing saying they
     * were counted from different places.
     */
    const wheres = data.unreadable.map((row) => row.where)
    expect(wheres.some((where) => where.startsWith('Record row'))).toBe(true)
    expect(wheres.some((where) => where.startsWith('Entity row'))).toBe(true)
  })

  it('reports the damage without the parser talking to the owner', () => {
    /*
     * Section 36: "errors should be visible but concise; detailed technical
     * diagnostics belong behind inspection". The first version printed the
     * validator's own words — "missing a non-empty string (records[6].id), and
     * 8 other problems" — on a primary surface. The QA laboratory already
     * lists every issue with its path, which is where that belongs.
     */
    for (const row of [...data.unreadable, ...data.tangled]) {
      const text = `${row.where} ${row.problem}`
      expect(text, text).not.toMatch(
        new RegExp(String.raw`records\[|entities\[|\.id\b|ISO-8601|non-empty`),
      )
      // And no record identifier either.
      expect(text, text).not.toMatch(new RegExp(String.raw`\b[A-Z0-9]{20,}\b`))
    }
  })

  it('creates no entry that does not trace to a record the store accepted', () => {
    /*
     * Section 26's last rule — no phantom actionable item from corrupt data —
     * as the strongest form the data can carry: every line on the surface has a
     * record behind it in `history.effective`.
     *
     * Asserting instead that no unreadable row shares an id with an entry would
     * have been wrong, and this fixture is why: one of its broken rows is a
     * *copy of a valid record* with the date replaced by prose, so it carries a
     * legitimate id. The good row still renders and should. What must not
     * happen is a second entry appearing from the damaged copy.
     */
    /*
     * One load, and the two readings taken from it.
     *
     * A scenario's ids come from a counter inside its kit, so calling
     * `build()` a second time produces the same history under different ids.
     * Comparing a Timeline from one load against the records of another would
     * fail for that reason alone and say nothing about the surface.
     */
    const situation = loadScenario('malformed-history').decision().situation
    const entries = assembleTimeline(situation, 500).days.flatMap((day) => day.entries)
    const accepted = new Set(situation.view.history.effective.map((record) => record.id))

    for (const entry of entries) {
      expect(accepted.has(entry.id), `${entry.id} has no record behind it`).toBe(true)
    }

    const seen = new Set(entries.map((entry) => entry.id))
    expect(seen.size, 'a record rendered twice').toBe(entries.length)
  })

  it('says how many rows are affected without inflating the history', () => {
    const situation = loadScenario('malformed-history').decision().situation
    expect(data.total).toBeLessThanOrEqual(situation.view.history.effective.length)
  })
})

describe('a long history stays readable', () => {
  it('renders a page at a time and says how much is left', () => {
    const situation = loadScenario('long-run').decision().situation
    const first = assembleTimeline(situation, TIMELINE_PAGE)
    expect(first.shown).toBeLessThanOrEqual(TIMELINE_PAGE)
    expect(first.total).toBeGreaterThan(first.shown)

    const all = assembleTimeline(situation, 500)
    expect(all.shown).toBe(all.total)
  })

  it('groups by owner-local day', () => {
    const data = timelineFor('long-run')
    const days = data.days.map((day) => day.dayId)
    expect(new Set(days).size, 'a day appears twice').toBe(days.length)
    for (const day of data.days) {
      for (const entry of day.entries) expect(entry.dayId).toBe(day.dayId)
    }
  })

  it('reads a day the owner would recognise', () => {
    const data = timelineFor('long-run')
    for (const day of data.days) {
      expect(day.label).not.toBe(day.dayId)
      expect(day.label).toMatch(/Today|Yesterday|^\d+ [A-Z][a-z]+ \d{4}$/)
    }
  })
})

describe('an empty history', () => {
  it('reports nothing rather than inventing a first entry', () => {
    const situation = loadScenario('mostly-unknown').decision().situation
    const data = assembleTimeline(situation, 500)
    // This history is thin rather than empty; what matters is that whatever is
    // there is real and nothing was manufactured to fill the screen.
    expect(data.total).toBe(
      situation.view.history.effective.filter((record) => record.occurredAt <= situation.at).length,
    )
    expect(data.days.every((day) => day.entries.length > 0)).toBe(true)
  })
})

describe('what Timeline is not', () => {
  it('reports on every domain, including the private one, without exception', () => {
    /*
     * Section 4.1 — no domain shutoff. Timeline is the chronological record of
     * a whole life, so a domain being discreet changes what a row *says* and
     * never whether the row is there. Proved on the one domain where the
     * temptation to filter is real.
     */
    const situation = loadScenario('quiet-fortnight').decision().situation
    const entries = assembleTimeline(situation, 500).days.flatMap((day) => day.entries)
    expect(entries.some((entry) => entry.domain === DOMAIN.privateHealth)).toBe(true)
  })
})
