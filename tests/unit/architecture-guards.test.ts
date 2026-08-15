import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Boundaries the plan draws, enforced rather than remembered.
 *
 * Section 42 asks for the whole defect class, not the reported line. Each guard
 * below is a class of mistake that is cheap to make once and expensive to find
 * later: a stray `Date.now()` that quietly ignores time travel, history creeping
 * into `localStorage`, or the meaning layer growing a dependency on the app
 * shell it is supposed to be testable without.
 */

const ROOT = join(import.meta.dirname, '..', '..')

function sourceFiles(dir: string): readonly string[] {
  const absolute = join(ROOT, dir)
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
  walk(absolute)
  return out
}

function repoPath(file: string): string {
  return relative(ROOT, file).split(sep).join(posix.sep)
}

/**
 * These guards read code, not prose.
 *
 * Several of the files below explain in a comment exactly which thing they are
 * not allowed to do, and a scan that cannot tell a comment from a statement
 * would fail on the explanation. String literals are preserved so a URL with
 * `//` in it does not swallow the rest of the line.
 */
function codeOnly(text: string): string {
  let out = ''
  let index = 0
  while (index < text.length) {
    const two = text.slice(index, index + 2)
    if (two === '//') {
      const end = text.indexOf('\n', index)
      index = end === -1 ? text.length : end
      continue
    }
    if (two === '/*') {
      const end = text.indexOf('*/', index + 2)
      index = end === -1 ? text.length : end + 2
      continue
    }
    const char = text[index] ?? ''
    if (char === "'" || char === '"' || char === '`') {
      out += char
      index += 1
      while (index < text.length) {
        const inner = text[index] ?? ''
        out += inner
        index += 1
        if (inner === '\\') {
          out += text[index] ?? ''
          index += 1
          continue
        }
        if (inner === char) break
      }
      continue
    }
    out += char
    index += 1
  }
  return out
}

function readCode(file: string): string {
  return codeOnly(readFileSync(file, 'utf8'))
}

const MEANING_LAYER = [...sourceFiles('src/domain'), ...sourceFiles('src/memory')]
const SYNTHETIC = sourceFiles('src/synthetic')

describe('the guards themselves', () => {
  // A guard that cannot fail is decoration. These prove each scan bites on a
  // violation, so the passing results below mean something.
  const violation = [
    '// a comment mentioning Date.now() and localStorage',
    "const url = 'https://example.test//path'",
    'const t = Date.now()',
    'const fresh = new Date()',
    "window.localStorage.setItem('records', payload)",
  ].join('\n')

  it('sees through comments without eating string literals', () => {
    const code = codeOnly(violation)
    expect(code).not.toContain('a comment mentioning')
    expect(code).toContain('https://example.test//path')
  })

  it('catches every shape it is meant to catch', () => {
    const code = codeOnly(violation)
    expect(/\bDate\.now\s*\(/.test(code)).toBe(true)
    expect(/new Date\s*\(\s*\)/.test(code)).toBe(true)
    expect(code.includes('localStorage')).toBe(true)
  })

  it('is actually looking at files', () => {
    expect(MEANING_LAYER.length).toBeGreaterThan(10)
    expect(SYNTHETIC.length).toBeGreaterThan(0)
  })
})

describe('nothing below the UI reads the wall clock', () => {
  /** The one place a real clock is allowed to exist. */
  const CLOCK_HOME = 'src/domain/time.ts'

  it('keeps Date.now() inside the clock', () => {
    const offenders = [...MEANING_LAYER, ...SYNTHETIC]
      .filter((file) => repoPath(file) !== CLOCK_HOME)
      .filter((file) => /\bDate\.now\s*\(/.test(readCode(file)))
      .map(repoPath)

    expect(offenders, `only ${CLOCK_HOME} may read the wall clock`).toEqual([])
  })

  it('keeps `new Date()` out of the meaning layer', () => {
    // `new Date(value)` for formatting is fine; `new Date()` is the wall clock
    // wearing a different hat, and it is what makes time travel lie.
    const offenders = [...MEANING_LAYER, ...SYNTHETIC]
      .filter((file) => /new Date\s*\(\s*\)/.test(readCode(file)))
      .map(repoPath)

    expect(offenders).toEqual([])
  })
})

describe('localStorage is not the history store', () => {
  it('never appears in the meaning or memory layers', () => {
    const offenders = [...MEANING_LAYER, ...SYNTHETIC]
      .filter((file) => readCode(file).includes('localStorage'))
      .map(repoPath)

    expect(
      offenders,
      'canonical plan 13.1 — localStorage is not the authoritative lifetime history store',
    ).toEqual([])
  })
})

describe('the meaning layer stands on its own', () => {
  it('imports no React and no app shell', () => {
    const offenders: string[] = []
    for (const file of MEANING_LAYER) {
      const text = readCode(file)
      const imports = [...text.matchAll(/from '([^']+)'/g)].map((match) => match[1] ?? '')
      for (const specifier of imports) {
        const forbidden =
          specifier === 'react' ||
          specifier.startsWith('react') ||
          specifier.includes('/features/') ||
          specifier.includes('/platform/') ||
          specifier.includes('/components/')
        if (forbidden) offenders.push(`${repoPath(file)} -> ${specifier}`)
      }
    }

    expect(offenders, 'the meaning layer must be testable without the app shell').toEqual([])
  })

  it('keeps memory depending on domain and never the other way round', () => {
    const offenders: string[] = []
    for (const file of sourceFiles('src/domain')) {
      const text = readCode(file)
      if (/from '[^']*\/memory\//.test(text)) offenders.push(repoPath(file))
    }
    expect(offenders).toEqual([])
  })
})
