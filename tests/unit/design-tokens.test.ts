import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TOKENS = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')

/**
 * The palette, checked as numbers — routing 90, plan sections 24 and 37.
 *
 * ## Why contrast is tested here rather than in a browser
 *
 * Section 37 requires readable text and section 24 rejects "low-contrast text"
 * by name, and both are properties of the **palette** rather than of any one
 * screen. A browser check can only ever measure the pairs a fixture happens to
 * put on screen; this measures every pair the design permits, so a token nudged
 * a few points darker in some later phase fails immediately instead of failing
 * on whichever screen nobody had a test for.
 *
 * ## The specific claim routing 90 has to keep
 *
 * D-230 introduced a **quiet** surface tier for what the app has not settled,
 * and the rule attached to it is that it turns down the *surface* and never the
 * words — because dimming an honest "the app has not worked this out" would be
 * the app apologising for the thing that makes it trustworthy. That is easy to
 * say and easy to break by one hex value, so it is measured: **the quiet ground
 * must be at least as legible as the ordinary panel**, for every text colour.
 *
 * It currently is, comfortably, and for a reason worth stating: the quiet tier
 * recedes by going *darker* than the panel gradient, and this is a dark-first
 * palette, so receding and improving legibility are the same move.
 */

function token(name: string): string {
  const found = new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(TOKENS)
  expect(found, `tokens.css should define ${name}`).not.toBeNull()
  return found![1]!.toLowerCase()
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground)
  const b = luminance(background)
  const [high, low] = a > b ? [a, b] : [b, a]
  return (high + 0.05) / (low + 0.05)
}

const TEXT = ['--text-primary', '--text-secondary', '--text-muted'] as const
const GROUNDS = ['--ground', '--ground-deep', '--surface-1', '--surface-2'] as const

describe('the palette is legible everywhere it is allowed to be used', () => {
  it('reads its own colours out of the token sheet', () => {
    for (const name of [...TEXT, ...GROUNDS, '--accent']) {
      expect(token(name)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('clears AA for body text on every surface a panel can sit on', () => {
    const failures: string[] = []
    for (const ground of GROUNDS) {
      for (const text of TEXT) {
        const ratio = contrast(token(text), token(ground))
        if (ratio < 4.5) failures.push(`${text} on ${ground} is ${ratio.toFixed(2)}:1`)
      }
    }
    expect(failures, 'body text below AA').toEqual([])
  })

  it('keeps the accent legible as text, because it is used as a link', () => {
    // `.domain-linkish` and `.qa-link` are accent-coloured text at body size.
    for (const ground of GROUNDS) {
      const ratio = contrast(token('--accent'), token(ground))
      expect(ratio, `--accent on ${ground}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('never makes the quiet tier harder to read than the ordinary panel — D-230', () => {
    /*
     * The rule the quiet tier is most likely to be broken by, and the one that
     * cannot be checked by looking: a later change that "recedes" the surface by
     * washing it out would take the words with it. The quiet ground has to be at
     * least as legible as the panel gradient's own two stops, for every text
     * colour, or the tier has stopped meaning what D-230 says it means.
     */
    const quiet = token('--ground-deep')
    const failures: string[] = []
    for (const text of TEXT) {
      const onQuiet = contrast(token(text), quiet)
      for (const stop of ['--surface-1', '--surface-2'] as const) {
        const onPanel = contrast(token(text), token(stop))
        if (onQuiet < onPanel) {
          failures.push(
            `${text}: ${onQuiet.toFixed(2)}:1 quiet vs ${onPanel.toFixed(2)}:1 on ${stop}`,
          )
        }
      }
    }
    expect(failures, 'the quiet tier turns down the surface, never the words').toEqual([])
  })

  it('bites on a washed-out quiet ground', () => {
    /*
     * A comparison that only ever ran one way would pass on any palette. This
     * is the same arithmetic with the quiet ground moved toward the text, which
     * is exactly what "recede by washing out" would do.
     */
    const washed = '#6b7280'
    expect(contrast(token('--text-muted'), washed)).toBeLessThan(
      contrast(token('--text-muted'), token('--surface-1')),
    )
  })

  it('keeps the touch target above the gate’s own threshold', () => {
    const target = /--touch-target:\s*([0-9.]+)rem/.exec(TOKENS)
    expect(target, 'tokens.css should declare --touch-target').not.toBeNull()
    // 48px at the 16px root the app never overrides; the gate measures 44.
    expect(Number(target![1]) * 16).toBeGreaterThan(44)
  })

  it('turns every motion duration off under reduced motion', () => {
    /*
     * Section 25's compatibility requirement, at its source. Every animation in
     * the product is timed from one of these three, so zeroing them here is what
     * makes "no state is expressed by movement alone" true everywhere at once
     * rather than component by component.
     */
    const reduced = TOKENS.slice(TOKENS.indexOf('prefers-reduced-motion'))
    for (const name of ['--dur-fast', '--dur', '--dur-slow']) {
      expect(reduced, `${name} is zeroed under reduced motion`).toMatch(
        new RegExp(`${name}:\\s*0ms`),
      )
    }
  })
})
