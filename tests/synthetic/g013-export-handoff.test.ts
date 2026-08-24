import { describe, expect, it } from 'vitest'
import { HANDOFF_PARTS, handoffPrompt } from '../../src/features/export/handoffPrompt'
import {
  DEFAULT_SELECTION,
  EXPORT_SECTIONS,
  SELECT_ALL,
  type ExportSectionId,
} from '../../src/features/export/sections'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { composeFor } from './exportHarness'

/**
 * G-013 — export handoff (canonical plan section 32).
 *
 * > Expected: selected sections are present; Private section can be included;
 * > handoff prompt is embedded; prompt says what to keep/change/remove/not
 * > change.
 *
 * All four, over the whole scenario library rather than one convenient
 * history. The library is what makes this a real test: a composer that only
 * ever meets a rich history will happily produce empty headings on a thin one
 * and nobody notices until the export is of an owner's actual first fortnight.
 */

function compose(scenarioId: string, sections: readonly ExportSectionId[]) {
  return composeFor(scenarioId, sections)
}

describe('G-013 — the selected sections are present', () => {
  for (const scenario of SCENARIOS) {
    it(`carries every chosen heading on ${scenario.id}`, () => {
      const composed = compose(scenario.id, SELECT_ALL)
      for (const id of SELECT_ALL) {
        const section = EXPORT_SECTIONS.find((entry) => entry.id === id)
        expect(composed.text, `${scenario.id} is missing "${id}"`).toContain(`## ${section?.title}`)
      }
      expect(composed.header.sections).toEqual(SELECT_ALL)
    })
  }

  it('carries only the chosen headings, and no others', () => {
    const composed = compose('what-worked', ['overview', 'now'])
    expect(composed.text).toContain('## Where things stand')
    expect(composed.text).toContain('## What the app is saying now')
    expect(composed.text).not.toContain('## Recent record')
    expect(composed.text).not.toContain('## Diagnostics')
  })

  it('says so plainly when nothing at all was chosen', () => {
    // Silence would read as an empty life rather than as an empty selection.
    const composed = compose('what-worked', [])
    expect(composed.text).toContain('No sections were chosen')
    expect(composed.header.sections).toEqual([])
  })

  it.each(SCENARIOS.map((scenario) => scenario.id))(
    'gives every chosen section a body on %s',
    (scenarioId) => {
      /*
       * The half of "sections are present" that is easy to lose: a heading with
       * nothing under it tells the reader nothing, and a reader who cannot tell
       * "the app looked and found nothing" from "this was not included" will
       * assume the area is fine.
       */
      const composed = compose(scenarioId, SELECT_ALL)
      const lines = composed.text.split('\n')
      const headings = lines
        .map((line, index) => ({ line, index }))
        .filter((entry) => entry.line.startsWith('## '))
      expect(headings.length).toBeGreaterThan(1)

      for (const [position, heading] of headings.entries()) {
        /*
         * Only as far as the **next** heading. Looking further would find the
         * following section's prose and call it this section's body, which is
         * exactly how this assertion first failed to notice an empty heading:
         * a deliberately emptied section still 'had a body', because the scan
         * ran on into the section after it.
         */
        const until = headings[position + 1]?.index ?? lines.length
        const body = lines.slice(heading.index + 1, until).filter((entry) => entry.trim() !== '')
        expect(body, `"${heading.line}" has nothing under it`).not.toEqual([])
      }
    },
  )
})

describe('G-013 — the private section can be included', () => {
  it('is left out by default, and says which way round it is', () => {
    const composed = compose('what-worked', DEFAULT_SELECTION)
    expect(composed.header.privateIncluded).toBe(false)
    expect(composed.text).toContain('The Private / Sexual Health section is left out.')
  })

  it('is included when it is chosen, and says so', () => {
    const composed = compose('what-worked', [...DEFAULT_SELECTION, 'private'])
    expect(composed.header.privateIncluded).toBe(true)
    expect(composed.text).toContain('The Private / Sexual Health section is included.')
    expect(composed.text).toContain('## Private / Sexual Health')
  })

  it('is not swept in by Select all', () => {
    // Section 11 and section 4.3: including the most sensitive thing the app
    // holds is a decision, and a control labelled "select all" is not one.
    expect(SELECT_ALL).not.toContain('private')
    expect(compose('what-worked', SELECT_ALL).header.privateIncluded).toBe(false)
  })

  it('shows private detail in full once it is included', () => {
    /*
     * Section 11 — discretion is a display decision, never a storage one, and
     * an export the owner deliberately included the private domain in is not
     * the surface discretion is owed to. The rest of the document still
     * withholds it, which is why this is checkable: the same entry reads one
     * way under Recent record and another under Private.
     */
    const withPrivate = compose('long-run', [...SELECT_ALL, 'private'])
    const privateStart = withPrivate.text.indexOf('## Private / Sexual Health')
    expect(privateStart).toBeGreaterThan(-1)
    const privateBody = withPrivate.text.slice(privateStart)
    expect(privateBody).not.toContain('Private entry')
  })

  it('distinguishes an empty private area from a withheld one', () => {
    const composed = compose('mostly-unknown', ['private'])
    expect(composed.text).toMatch(/nothing recorded in this area|Included deliberately/i)
  })
})

describe('G-013 — the handoff prompt is embedded', () => {
  it('appears in the document itself, not only beside it', () => {
    const composed = compose('what-worked', DEFAULT_SELECTION)
    expect(composed.text).toContain(composed.prompt.trimEnd())
  })

  it('is also available on its own, for the Copy Prompt action', () => {
    const composed = compose('what-worked', DEFAULT_SELECTION)
    expect(composed.prompt.length).toBeGreaterThan(500)
    expect(composed.prompt).toContain('## Source of truth')
  })

  it('leads the document, so a paste in one go arrives as an instruction first', () => {
    const composed = compose('what-worked', DEFAULT_SELECTION)
    const promptAt = composed.text.indexOf('## Source of truth')
    const firstSection = composed.text.indexOf('## Where things stand')
    expect(promptAt).toBeGreaterThan(-1)
    expect(promptAt).toBeLessThan(firstSection)
  })
})

describe('G-013 — the prompt says what to keep, change, remove and not change', () => {
  const prompt = handoffPrompt({
    source: 'owner',
    diagnosticsIncluded: false,
    privateIncluded: false,
  })

  it('asks for all four', () => {
    expect(prompt).toContain('## What is working')
    expect(prompt).toContain('## What to change')
    expect(prompt).toContain('## What to remove or simplify')
    expect(prompt).toContain('## What not to change')
  })

  it('carries every part canonical plan section 52 lists', () => {
    // Held as a list rather than as remembered sentences, so a rewording
    // cannot drop one.
    const required = [
      'source-of-truth',
      'current-state',
      'main-limiter',
      'working',
      'drifting',
      'change',
      'simplify',
      'leave-alone',
      'next-actions',
      'uncertainty',
      'questions',
    ]
    for (const id of required) {
      const part = HANDOFF_PARTS.find((entry) => entry.id === id)
      expect(part, `section 52 requires "${id}"`).toBeDefined()
      expect(prompt).toContain(`## ${part?.heading}`)
    }
  })

  it('asks for the app-tuning review only when diagnostics are in the document', () => {
    const tuning = HANDOFF_PARTS.find((part) => part.id === 'app-tuning')
    expect(tuning?.onlyWithDiagnostics).toBe(true)
    expect(prompt).not.toContain(`## ${tuning?.heading}`)

    const withDiagnostics = handoffPrompt({
      source: 'owner',
      diagnosticsIncluded: true,
      privateIncluded: false,
    })
    expect(withDiagnostics).toContain(`## ${tuning?.heading}`)
  })

  it('turns the app-tuning review on from the composed document, not from a flag beside it', () => {
    const composed = compose('what-worked', [...DEFAULT_SELECTION, 'diagnostics'])
    expect(composed.header.diagnosticsIncluded).toBe(true)
    expect(composed.prompt).toContain('How the app itself is tuned')
    expect(composed.text).toContain('Diagnostics are included')
  })

  it('names the source of truth and rules out filling gaps from what is typical', () => {
    expect(prompt).toContain('source of truth')
    expect(prompt).toMatch(/does not know rather than something to fill in/i)
  })

  it('asks for uncertainty to be stated rather than rounded away', () => {
    expect(prompt).toContain('## Where you are unsure')
    expect(prompt).toMatch(/do not round a guess up into a conclusion/i)
  })

  it('asks only for the questions that are actually needed', () => {
    expect(prompt).toContain('## Questions')
    expect(prompt).toMatch(/only the questions you actually need/i)
  })

  it('tells the reader which way round the private section is, either way', () => {
    const without = handoffPrompt({
      source: 'owner',
      diagnosticsIncluded: false,
      privateIncluded: false,
    })
    const included = handoffPrompt({
      source: 'owner',
      diagnosticsIncluded: false,
      privateIncluded: true,
    })
    expect(without).toMatch(/leaves out the Private/i)
    expect(included).toMatch(/includes the Private/i)
    // And the absent case says what the absence means, so an assistant does
    // not read it as an empty part of his life.
    expect(without).toMatch(/a choice about this document/i)
  })
})
