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

const MEANING_LAYER = [
  ...sourceFiles('src/domain'),
  ...sourceFiles('src/memory'),
  ...sourceFiles('src/intelligence'),
]
const SYNTHETIC = sourceFiles('src/synthetic')
const INTELLIGENCE = sourceFiles('src/intelligence')
const FEATURES = sourceFiles('src/features')

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
  it('is running with no DOM at all', () => {
    // Not a promise not to touch the DOM — there is no DOM here to touch.
    // Section 46 asks for the meaning layer to be testable without the app
    // shell, and this is what makes that claim checkable rather than stated.
    expect(typeof document).toBe('undefined')
    expect(typeof window).toBe('undefined')
  })

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

  it('keeps domain and memory unaware that intelligence exists', () => {
    const offenders: string[] = []
    for (const file of [...sourceFiles('src/domain'), ...sourceFiles('src/memory')]) {
      const text = readCode(file)
      if (/from '[^']*\/intelligence\//.test(text)) offenders.push(repoPath(file))
    }
    expect(offenders).toEqual([])
  })
})

describe('there is exactly one arbitration path', () => {
  /**
   * Canonical plan section 17.2.
   *
   * "No domain-specific module gets to independently present a competing final
   * recommendation." A comment saying so would be a hope. What makes it true is
   * that a surface cannot reach the parts it would need: generation, filtering,
   * ranking and selection are unreachable from `src/features/`, so the only way
   * to obtain a recommendation is to ask the engine for one.
   */
  /*
   * The line is between deciding and recording.
   *
   * `lifecycle`, `outcomes` and `corrections` joined the open list in Phase 3,
   * and they belong there for a reason worth stating: none of them chooses
   * anything. They turn a tap into canonical records and work out when a result
   * is due, which is the surface's own job — a button has to be able to write
   * down what the owner did. `learning` stays closed even though it also
   * chooses nothing, because it is part of how a move is ranked, and a surface
   * reading it directly could put a number on screen the arbitration never saw.
   */
  /*
   * `derived` joined in Phase 4, and it belongs on the recording side of the
   * line for the same reason `outcomes` does: it turns history into canonical
   * records and chooses nothing. `coverage` is deliberately **not** here — it
   * is reached through `situation`, which every surface already has, so the
   * status a Life page shows is the object the decision itself was made from
   * rather than a second computation that could drift away from it.
   */
  const OPEN_TO_SURFACES = [
    'engine',
    'guide',
    'questions',
    'trace',
    'situation',
    'explain',
    'lifecycle',
    'outcomes',
    'corrections',
    'derived',
  ]
  const DECIDES = [
    'candidates',
    'constraints',
    'evaluate',
    'arbitrate',
    'advisor',
    'moves',
    'learning',
  ]

  it('lets no feature reach the parts that decide', () => {
    const offenders: string[] = []
    for (const file of FEATURES) {
      const text = readCode(file)
      for (const match of text.matchAll(/from '([^']*\/intelligence\/[^']+)'/g)) {
        const specifier = match[1] ?? ''
        const module = specifier.slice(specifier.lastIndexOf('/') + 1)
        if (DECIDES.includes(module)) offenders.push(`${repoPath(file)} -> ${module}`)
        else if (!OPEN_TO_SURFACES.includes(module)) {
          offenders.push(`${repoPath(file)} -> ${module} (not part of the public surface)`)
        }
      }
    }
    expect(offenders, 'a surface may ask the engine, and may not do the deciding').toEqual([])
  })

  it('keeps the ranking and the choice ignorant of which life area a move is in', () => {
    /*
     * The guard behind G-005 and G-008.
     *
     * Section 32 asks for "no hardcoded career value", and the way that defect
     * gets written is not deliberately — it is one `if` in a scoring function,
     * added to make one scenario come out right. A move is judged on what it
     * demands, costs and pays back; the domain it belongs to is data that flows
     * through, never a name the scorer knows.
     */
    const DOMAIN_IDS =
      'career|sleep|fatherhood|health|money|social|emotional|faith|home|private-health|direction'
    // A whole string literal that *is* a domain id, which is what a comparison
    // looks like. Not a domain word appearing inside a sentence: the trace says
    // things like "nothing recent about sleep or energy", and prose in a note
    // cannot branch on anything.
    const asValue = new RegExp(`(['"\`])(${DOMAIN_IDS})\\1`)
    const offenders: string[] = []

    // Only the scorer and the chooser. Reading the situation and generating
    // candidates are per-area jobs by nature — a sleep generator has to know it
    // is about sleep. Judging and selecting must not.
    for (const file of [
      join(ROOT, 'src/intelligence/evaluate.ts'),
      join(ROOT, 'src/intelligence/arbitrate.ts'),
    ]) {
      const code = readCode(file)
      if (/\bDOMAIN\b/.test(code)) offenders.push(`${repoPath(file)}: names the domain registry`)
      const literal = asValue.exec(code)
      if (literal !== null) offenders.push(`${repoPath(file)}: compares against ${literal[0]}`)
      if (/from '[^']*\/domains'/.test(code)) offenders.push(`${repoPath(file)}: imports domains`)
    }

    expect(offenders, 'the evaluator and the arbiter must not know a domain by name').toEqual([])
  })
})

describe('development scaffolding does not become the product — DEF-0007', () => {
  /*
   * Found on a phone: Life, Timeline and Insights each carried a hand-written
   * "PHASE 0" above the title, two phases after Phase 0 ended — and Timeline
   * still told the owner that the canonical record store "does not exist until
   * Phase 1", which by then was simply false.
   *
   * The class is not three stale strings. It is that a phase number written
   * into a screen has no reason to ever be revisited: it looks deliberate, it
   * survives every later phase, and the only person who finds it is the owner,
   * on a real phone, wondering why the product is talking about its own
   * construction. So the phase now lives in one constant, and only the two
   * surfaces that legitimately report on the build may mention it.
   */
  const MAY_MENTION_PHASES = ['src/features/more/', 'src/features/qa/']

  it('mentions a phase on no primary destination', () => {
    const offenders: string[] = []
    for (const file of FEATURES) {
      const path = repoPath(file)
      if (MAY_MENTION_PHASES.some((allowed) => path.startsWith(allowed))) continue
      // Comments explaining why something is deferred are fine; text the owner
      // can read is not.
      if (/Phase \d/.test(readCode(file))) offenders.push(path)
    }
    expect(offenders, 'a phase number on Now, Life, Timeline or Insights').toEqual([])
  })

  it('keeps the phase itself in one place', () => {
    // Two screens report it and neither of them writes it down.
    const source = readFileSync(join(ROOT, 'src/platform/buildInfo.ts'), 'utf8')
    expect(source).toContain('REBUILD_PHASE')

    for (const allowed of MAY_MENTION_PHASES) {
      const files = FEATURES.filter((file) => repoPath(file).startsWith(allowed))
      for (const file of files) {
        const code = readCode(file)
        if (!/Phase \d/.test(code)) continue
        expect(code, `${repoPath(file)} hardcodes a phase number`).toContain('REBUILD_PHASE')
      }
    }
  })

  it('claims nothing about the app that has stopped being true', () => {
    // The specific false sentence, and the shape of the ones like it: a screen
    // describing a part of the system as absent when it has since been built.
    const built = [
      /does not exist until/i,
      /there is no record store/i,
      /no engine (?:yet|choosing)/i,
      /nothing is stored/i,
    ]

    const offenders: string[] = []
    for (const file of FEATURES) {
      const code = readCode(file)
      for (const claim of built) {
        if (claim.test(code)) offenders.push(`${repoPath(file)} — ${claim.source}`)
      }
    }
    expect(offenders, 'a screen describing something that now exists as missing').toEqual([])
  })
})

describe('invented histories stay in the laboratory', () => {
  it('is imported by no surface except QA', () => {
    /*
     * Section 31: "no test bridge in production bundle", "test-only actions
     * unavailable in production".
     *
     * The QA screen is a separate chunk that a production build never
     * downloads, which is what keeps ten invented lives out of the app the
     * owner ships. One import of `src/synthetic` from a surface that is not QA
     * would put all of them in the main bundle, silently, and the only symptom
     * would be a slightly larger file.
     */
    const offenders = FEATURES.filter((file) => {
      const path = repoPath(file)
      if (path.startsWith('src/features/qa/')) return false
      return /from '[^']*\/synthetic\//.test(readCode(file))
    }).map(repoPath)

    expect(offenders, 'only the QA laboratory may import the scenario library').toEqual([])
  })
})

describe('the intelligence kernel keeps the layer below it honest', () => {
  it('is a real folder with real files in it', () => {
    expect(INTELLIGENCE.length).toBeGreaterThan(8)
  })

  it('takes its moment as an argument rather than reading a clock', () => {
    // Covered by the sweeps above, which now include src/intelligence — this
    // states the reason so the coverage is not lost in a list of folders.
    const offenders = INTELLIGENCE.filter((file) =>
      /\bDate\.now\s*\(|new Date\s*\(\s*\)/.test(readCode(file)),
    ).map(repoPath)
    expect(offenders, 'time travel has to reach the engine, not stop at the UI').toEqual([])
  })
})
