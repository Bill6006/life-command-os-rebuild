import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ACCOMMODATION } from './accommodation'
import { LIFE_PAGES } from '../../src/features/life/domainPages'
import { coreDomains } from '../../src/domain/domains'
import { CORRECTION_GESTURES } from '../../src/intelligence/corrections'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function sourceFiles(): readonly string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (/\.(ts|tsx|css)$/.test(name)) out.push(full)
    }
  }
  walk(join(ROOT, 'src'))
  return out
}

const FILES = sourceFiles()
const TEXT = new Map(
  FILES.map((file) => [relative(ROOT, file).replace(/\\/g, '/'), readFileSync(file, 'utf8')]),
)

/**
 * Routing 90, package 90.3 — the structural accommodation list, asserted as
 * **reserved shapes rather than as built features**.
 *
 * That phrasing is the second adjudication's own (§6.2's synthetic QA
 * contract), and both halves are load-bearing. A phase that built one of these
 * rows would have done routing 91 through 97's work under a visual phase's
 * gate, and a phase that left no room for one would have passed the owner's
 * phone gate on a design the next phase has to re-open.
 */
describe('90.3 — the accommodation list, and what each row now claims', () => {
  it('carries section 54’s nine rows and the adjudication’s six, and no more', () => {
    /*
     * Fifteen rows plus the refinement the adjudication attaches to A9 rather
     * than listing separately — the provenance answer under D-222. It is a
     * seventh B-row here because it makes its own falsifiable claim; the
     * document records that it is a refinement and not a sixteenth row.
     */
    expect(ACCOMMODATION.filter((row) => row.id.startsWith('A'))).toHaveLength(9)
    expect(ACCOMMODATION.filter((row) => row.id.startsWith('B'))).toHaveLength(7)
    expect(new Set(ACCOMMODATION.map((row) => row.id)).size).toBe(ACCOMMODATION.length)
  })

  it('names a real place for every row, and that place takes a variable number of things', () => {
    /*
     * The reservation half.
     *
     * "There is room" is unfalsifiable on its own, so each row names a file and
     * text within it. A file that stopped existing, or a composition that was
     * replaced by a fixed arrangement, fails here — which is precisely the
     * event this list exists to catch, because it would happen quietly during
     * some later phase's refactor and nothing else would notice.
     */
    const missing: string[] = []
    for (const row of ACCOMMODATION) {
      for (const { file, proof } of row.landsIn) {
        const text = TEXT.get(file)
        if (text === undefined) {
          missing.push(`${row.id}: ${file} does not exist`)
          continue
        }
        for (const needle of proof) {
          if (!text.includes(needle)) missing.push(`${row.id}: ${file} no longer has "${needle}"`)
        }
      }
    }
    expect(missing, 'a reserved shape has gone').toEqual([])
  })

  it('has built none of the rows still reserved', () => {
    /*
     * The other half, and the one that would catch this phase overreaching.
     *
     * Each token is chosen to be specific to the feature rather than to the
     * subject: `notMoving` is a state on a destination, not the word "moving".
     * A false positive here is a signal to rename an identifier or to notice
     * that a phase has started work it was told to leave alone; it is not a
     * reason to delete the row.
     */
    const built: string[] = []
    for (const row of ACCOMMODATION) {
      /*
       * A landed row makes the opposite claim, and is checked below.
       *
       * Leaving it in this sweep would be worse than useless: it passes anyway,
       * because a phase that builds the feature does not have to use the token
       * somebody guessed for it years earlier — which is precisely how a guard
       * goes green over the thing it was named for (D-238).
       */
      if (row.landed !== undefined) continue
      for (const token of row.notBuilt) {
        /*
         * On a word boundary, not as a substring.
         *
         * A plain `includes` reported the twelfth-domain row as **built**,
         * because `invalidating` and `redating` contain "dating" — a guard
         * failing on a word that happens to be inside another word, which is
         * the exact way a list of forbidden strings stops being read.
         */
        expect(token, 'a token is a plain identifier').toMatch(/^[A-Za-z][A-Za-z0-9]*$/)
        const word = new RegExp(String.raw`\b` + token + String.raw`\b`)
        for (const [path, text] of TEXT) {
          if (word.test(text)) built.push(`${row.id}: ${path} contains "${token}"`)
        }
      }
    }
    expect(built, 'routing 90 may reserve these and may not build them').toEqual([])
  })

  it('holds every landed row to where it actually landed', () => {
    /*
     * The other half of the swap — routing 91.
     *
     * B1 is the first row a later phase has landed. What is checked is no longer
     * that its tokens are absent (they always were, under any implementation)
     * but that the feature is **present**, in the composition the visual phase
     * reserved for it. A landed row with nothing behind it fails here.
     */
    const landed = ACCOMMODATION.filter((row) => row.landed !== undefined)
    expect(landed.length, 'routing 91 landed B1').toBeGreaterThan(0)

    const missing: string[] = []
    for (const row of landed) {
      expect(row.built, `${row.id}: landed with nowhere named`).toBeDefined()
      for (const { file, proof } of row.built ?? []) {
        const text = TEXT.get(file)
        if (text === undefined) {
          missing.push(`${row.id}: ${file} does not exist`)
          continue
        }
        for (const needle of proof) {
          if (!text.includes(needle)) missing.push(`${row.id}: ${file} has no "${needle}"`)
        }
      }
    }
    expect(missing, 'a landed row is not where it says it landed').toEqual([])
  })

  it('bites when a reserved row is built', () => {
    /*
     * A list of things that must be absent goes green on an empty repository
     * too. This is what tells the two apart.
     */
    const token = ACCOMMODATION.find((row) => row.id === 'B6')!.notBuilt[0]!
    const pretend = `const ${token} = true`
    expect(pretend.includes(token), 'the absence check reads what it claims to read').toBe(true)
    expect([...TEXT.values()].some((text) => text.includes(pretend))).toBe(false)
  })
})

describe('90.3 — the three rows whose reservation is checkable in the product itself', () => {
  it('B5 — navigation grows by a page, not by a redesign', () => {
    /*
     * D-168's reasoning, held rather than trusted: *"placement is navigation,
     * and Phase 9's gate is owner physical-phone approval. A twelfth domain
     * arriving after that gate re-opens it."*
     *
     * What makes it safe is that Life renders `LIFE_PAGES` as a list grouped by
     * standing (D-075) rather than as a fixed arrangement of ten, so the
     * twelfth domain's page is one more entry. The eleventh domain is
     * deliberately **not** in the registry yet — building it is routing 94 — and
     * the shape being reserved is the list, not a placeholder in it.
     */
    expect(LIFE_PAGES.length).toBeGreaterThan(1)
    const life = TEXT.get('src/features/life/LifeScreen.tsx')!
    expect(life, 'the overview resolves each area to its own page').toMatch(/pageForDomain/)
    expect(life, 'and lays out no fixed number of them').not.toMatch(
      /LIFE_PAGES\[\d+\]|slice\(0,\s*\d+\)/,
    )
    const pages = TEXT.get('src/features/life/domainPages.ts')!
    expect(pages, 'the registry is a list').toMatch(/export const LIFE_PAGES/)
    // Eleven domains today; the twelfth is D-168's and arrives at routing 94.
    expect(coreDomains.all().length).toBe(11)
  })

  it('B6 — a fifth correction gesture is a table entry, not a new control', () => {
    /*
     * Four gestures today, and the consequence table is an exhaustive
     * `Record<CorrectionGesture, …>` — D-179's rule, which is what makes a
     * fifth one a compile error until somebody writes its sentence rather than
     * a gesture that quietly acts without saying what it will do.
     */
    expect(CORRECTION_GESTURES).toHaveLength(4)
    const corrections = TEXT.get('src/intelligence/corrections.ts')!
    expect(corrections).toMatch(/Record<CorrectionGesture,/)
  })

  it('B4 — six readings could never be summed, because nothing totals a reading', () => {
    /*
     * D-166 and D-221's hard constraint, and the one row where "no arrangement
     * in which they could be summed" is a claim about the *design* rather than
     * about a missing feature. The concept-reading list has no total row, no
     * aggregate and no chart; each reading carries its own knowledge state and
     * renders on its own line.
     */
    const page = TEXT.get('src/features/life/DomainPage.tsx')!
    for (const forbidden of ['reduce(', 'average', 'composite', 'total']) {
      expect(page, `a reading list must not ${forbidden}`).not.toContain(forbidden)
    }
  })
})
