import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTION_VERBS } from '../../src/domain/recommendation'
import { ACTION_FAMILIES } from '../../src/intelligence/association'
import { REBUILD_PHASE } from '../../src/platform/buildInfo'

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

/**
 * Every string literal in a file, as its contents.
 *
 * This exists because the sweeps below used to find literals with
 * `/'([^']{4,})'/g`, and a regex cannot pair quotes. The pairing survives right
 * up until a file contains an **empty** literal: `''` is shorter than the four
 * characters the pattern required, so it was skipped, the scan resumed at its
 * closing quote, and from there every subsequent quote was paired with the
 * wrong partner — opening to closing became closing to opening. The contents
 * of every literal after that point fell into a gap the sweep never looked at.
 *
 * It was found in Phase 7 by the export composer, whose first line of
 * owner-facing prose after an `''` said the word "cause" and passed the causal
 * guard. Nothing was wrong with the rule; the rule had silently stopped
 * reading the file. A guard that quietly covers less than it claims is worse
 * than no guard, because the passing result is read as evidence.
 *
 * So the literals are walked rather than matched, by the same scanner that
 * strips comments — which already had to understand quoting to do its job.
 */
function stringLiterals(text: string): readonly string[] {
  const found: string[] = []
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
    const quote = text[index] ?? ''
    if (quote === "'" || quote === '"' || quote === '`') {
      index += 1
      let content = ''
      while (index < text.length) {
        const inner = text[index] ?? ''
        index += 1
        if (inner === '\\') {
          content += inner + (text[index] ?? '')
          index += 1
          continue
        }
        if (inner === quote) break
        content += inner
      }
      found.push(content)
      continue
    }
    index += 1
  }
  return found
}

function literalsOf(file: string): readonly string[] {
  return stringLiterals(readFileSync(file, 'utf8'))
}

const MEANING_LAYER = [
  ...sourceFiles('src/domain'),
  ...sourceFiles('src/memory'),
  ...sourceFiles('src/intelligence'),
]
const SYNTHETIC = sourceFiles('src/synthetic')
const INTELLIGENCE = sourceFiles('src/intelligence')
const FEATURES = sourceFiles('src/features')
const LEGACY = sourceFiles('src/legacy')

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

  it('reads every literal in a file, including the ones after an empty one', () => {
    /*
     * The exact shape that defeated the old regex pairing. `''` is skipped by
     * a pattern needing four characters, the scan resumes at its closing
     * quote, and from there opening quotes pair with closing ones — so the
     * sentence below was never scanned at all.
     */
    const source = [
      'const lines = [',
      "  'a heading',",
      "  '',",
      "  'this sentence says the app improves your sleep',",
      ']',
    ].join('\n')

    expect(stringLiterals(source)).toContain('this sentence says the app improves your sleep')
    // And the pairing a regex would have produced, for contrast: nothing.
    const byRegex = [...source.matchAll(/'([^']{4,})'/g)].map((match) => match[1])
    expect(byRegex).not.toContain('this sentence says the app improves your sleep')
  })

  it('keeps a comment out of the literals, and a literal out of the comments', () => {
    const source = ["// a comment mentioning 'improves'", "const x = 'improves'"].join('\n')
    expect(stringLiterals(source)).toEqual(['improves'])
  })
})

/**
 * No invisible characters in source, with one named exception (DEF-0067).
 *
 * A guard in this file once read `/\x08Date\.now/` because the `\b` in its
 * pattern had been written through a layer that collapsed one backslash, and a
 * backspace is a perfectly valid character in a JavaScript regex. It matched
 * nothing, it passed with the defect it was written for sitting in the file,
 * and it looked exactly like a guard that was working. The same thing then
 * happened a second time in a browser spec written the same way, which is what
 * makes it a class rather than a slip.
 *
 * A regex, a string literal and a comment all accept these bytes silently.
 * Nothing renders them. So they are swept for directly, over every source file,
 * rather than being watched for in the one place they last appeared.
 */
/**
 * One badge, one appearance, one definition (D-106, D-108).
 *
 * Where an entry or a conclusion came from is one fact, and it shows on five
 * surfaces. It was styled separately in each of their stylesheets, and the
 * copies drifted the moment they existed: on an Insights card the badge sat
 * beside an eyebrow carrying `text-transform: uppercase` and inherited it,
 * rendering "OUT OF DATEIMPORTED" as one run of capitals.
 *
 * A badge that means the same thing everywhere has to look the same
 * everywhere, or the owner learns it five times. So there is one class, and
 * this fails the build if a surface starts styling its own.
 */
describe('the origin badge is defined once', () => {
  const SURFACE_CLASSES = [
    'tl-entry__origin',
    'domain-origin',
    'life-origin',
    'in-origin',
    'ev-origin',
  ]

  function stylesheets(): readonly string[] {
    const out: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (name.endsWith('.css')) out.push(full)
      }
    }
    walk(join(ROOT, 'src'))
    return out
  }

  it('is looking at the stylesheets', () => {
    expect(stylesheets().length).toBeGreaterThan(5)
  })

  it('exists, in the shared sheet', () => {
    const shared = readFileSync(join(ROOT, 'src/styles/base.css'), 'utf8')
    expect(shared).toContain('.origin-badge')
    // The properties a parent surface can impose are reset explicitly, which is
    // the whole reason one definition is enough.
    expect(shared).toMatch(/text-transform:\s*none/)
    expect(shared).toMatch(/letter-spacing:\s*normal/)
  })

  it('is styled by no surface of its own', () => {
    const offenders: string[] = []
    for (const file of stylesheets()) {
      const text = readFileSync(file, 'utf8')
      for (const cls of SURFACE_CLASSES) {
        if (text.includes(`.${cls}`)) offenders.push(`${repoPath(file)} styles .${cls}`)
      }
      if (repoPath(file) !== 'src/styles/base.css' && text.includes('.origin-badge')) {
        offenders.push(`${repoPath(file)} restyles .origin-badge`)
      }
    }
    expect(offenders, 'one badge, defined once').toEqual([])
  })

  it('is the class every surface actually renders', () => {
    const rendering = FEATURES.filter((file) => /data-testid="[a-z-]*origin"/.test(readCode(file)))
    expect(rendering.length, 'surfaces should render the badge').toBeGreaterThan(3)
    for (const file of rendering) {
      expect(readCode(file), repoPath(file)).toContain('className="origin-badge"')
    }
  })
})

describe('nothing in the source is invisible', () => {
  /**
   * The one control character this repository deliberately contains.
   *
   * `derivedRecordId` joins its parts with a NUL, which is a reasonable
   * separator for hashing precisely because it cannot occur in ordinary text.
   * It has been there since Phase 3 and it is **load-bearing**: changing the
   * separator changes every derived record id, which would break the identity
   * of every episode already written and every record a legacy import has
   * already brought across. It is named here rather than fixed.
   */
  const ALLOWED: readonly { readonly path: string; readonly code: number }[] = [
    { path: 'src/domain/ids.ts', code: 0 },
  ]

  /*
   * Documentation too, and it earned its place the first time this ran.
   *
   * A Phase 6 ledger entry quoted a regex with a backspace character where a
   * word boundary was meant — the same collapse, in prose, describing a
   * different defect of the same kind. Nothing renders it, so the entry had
   * been wrong and unreadable-as-intended for two phases. A document that
   * records why a pattern failed is worth exactly as much as the pattern it
   * quotes.
   */
  const FILES = [
    ...sourceFiles('src'),
    ...sourceFiles('tests'),
    ...readdirSync(join(ROOT, 'scripts'))
      .filter((name) => name.endsWith('.mjs'))
      .map((name) => join(ROOT, 'scripts', name)),
    ...readdirSync(join(ROOT, 'docs'), { recursive: true, encoding: 'utf8' })
      .filter((name) => name.endsWith('.md'))
      .map((name) => join(ROOT, 'docs', name)),
  ]

  it('is looking at the whole repository', () => {
    // A sweep over three files would pass and prove nothing.
    expect(FILES.length).toBeGreaterThan(60)
  })

  it('holds no control character nobody meant to type', () => {
    const offenders: string[] = []
    for (const file of FILES) {
      const path = repoPath(file)
      const text = readFileSync(file, 'utf8')
      for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index)
        /*
         * U+FFFD is here for a different reason from the control characters.
         *
         * It is not something anybody types — it is what a decoder leaves
         * behind when it could not read a byte, so its presence means a file
         * has **already** been mangled by a tool that said nothing. Prettier
         * did exactly that to a NUL quoted in a document during this phase.
         * A repository that has silently lost a character should say so.
         */
        if (code === 0xfffd) {
          offenders.push(`${path} holds U+FFFD — something already mangled it`)
          continue
        }
        if (code >= 32 || code === 9 || code === 10 || code === 13) continue
        if (ALLOWED.some((allowed) => allowed.path === path && allowed.code === code)) continue
        const line = text.slice(0, index).split('\n').length
        offenders.push(`${path}:${String(line)} holds U+${code.toString(16).padStart(4, '0')}`)
      }
    }
    expect(offenders, 'an invisible character in source is a pattern that cannot match').toEqual([])
  })

  it('names only exceptions that are still there', () => {
    // A stale allowance is the only way this guard can be defeated, and it
    // should take a deliberate edit rather than forgetting.
    for (const allowed of ALLOWED) {
      const text = readFileSync(join(ROOT, allowed.path), 'utf8')
      expect(text.includes(String.fromCharCode(allowed.code)), allowed.path).toBe(true)
    }
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

/**
 * The situation is the only door onto a fact — AUD-0040.
 *
 * ## The finding, and why no existing guard could see it
 *
 * `assembleSituation` was a hand-written list of nine reads, so anything that
 * needed a tenth reached round it: `candidates.ts` resolved `cashBuffer` from
 * `view.facts` itself, and the QA laboratory therefore reported *"Facts
 * considered: 9"* against *"What the system believes: 15"* — the decision
 * resting on a fact its own trace did not list, and possibly deciding on it.
 * The audit is explicit that the architecture guard could not catch this
 * because **reaching around the situation is not a boundary violation — it is a
 * shortcut inside one.** So here is the guard for the shortcut.
 *
 * ## Two things it makes true rather than hoped for
 *
 * **The trace is complete by construction.** The only place a decision can
 * obtain a reading is `situation.readings`, and everything in there was read
 * through `createFactReader`, which records what it was used for. A generator
 * cannot decide from a fact the trace does not list because it cannot get one.
 *
 * **The permission is not optional.** `createFactReader` is where
 * `mayReasonFrom` is applied (D-167). A module reading `view.facts` for itself
 * would see a private value the rest of the decision layer is structurally
 * unable to see — which is precisely how a promise about privacy becomes a
 * promise about six lines. Two of those existed, in `evaluate.ts`, scoring
 * confidence and uncertainty off the store rather than off the decision.
 */
describe('nothing in the decision layer reads a fact around the situation — AUD-0040', () => {
  /** Resolving a concept's value. Not the entry, not the ask policy: the value. */
  const RESOLVES_A_VALUE = /\bknowledgeFor\s*\(/

  it('lets only the situation resolve a concept from the store', () => {
    const offenders: string[] = []
    for (const file of sourceFiles('src/intelligence')) {
      if (repoPath(file).endsWith('src/intelligence/situation.ts')) continue
      if (RESOLVES_A_VALUE.test(readCode(file))) offenders.push(repoPath(file))
    }
    expect(
      offenders,
      'a decision was made from a fact the situation never read, so the trace cannot list it',
    ).toEqual([])
  })

  it('is looking at a real rule rather than a pattern nothing matches', () => {
    // The reintroduction proof, in place: the shape it bans is the shape the
    // one permitted file still uses, so a guard that had stopped matching
    // anything would fail here rather than passing quietly forever.
    const door = sourceFiles('src/intelligence').find((file) =>
      repoPath(file).endsWith('src/intelligence/situation.ts'),
    )
    expect(door, 'the situation is not where it was').toBeDefined()
    expect(RESOLVES_A_VALUE.test(readCode(door!))).toBe(true)
  })

  it('carries every registered concept rather than a list somebody maintains', () => {
    // The other half of the finding: a guard that only banned the shortcut
    // would be satisfied by a situation that still read nine concepts and
    // refused everyone else. What makes the trace true is that the read walks
    // the registry, so this asserts the walk exists rather than trusting it.
    const text = readCode(join(ROOT, 'src', 'intelligence', 'situation.ts'))
    expect(/for \(const definition of concepts\.all\(\)\)/.test(text)).toBe(true)
  })
})

/**
 * A reading is rendered in one place, and that place knows the privacy class —
 * AUD-0040's structural discretion guard.
 *
 * The audit names this as AUD-0040's **precondition**, not AUD-0011's: making
 * the situation registry-driven is what puts a private reading within one call
 * of an explanation. D-167 requires that it stay *structurally impossible —
 * not merely conventional —* for an explanation or an evidence panel to render
 * an explicit private reading, and a convention is exactly what a second call
 * site would be.
 *
 * So `describeFactValue` is unreachable from the decision layer, and
 * `discreetly` — the same renderer with the class consulted first — is the way
 * through. A new explanation clause that wants to name a reading has to come
 * through the function that decides whether it may.
 */
/**
 * The private class is compared in exactly one file — correction 3.11.
 *
 * The correction counted the sites that decided the private class in place and
 * found five: two in `coverage.ts`, three in `insights.ts`. Every one of them
 * was correct, and that was the problem — *"private material is never raised
 * unasked"* was a claim about five lines rather than a property of the code, and
 * a sixth site would have been written the same way with nothing noticing.
 *
 * Routing 91's package 91.3 closed those five behind `mayRaiseUnasked`. Routing
 * 92 closes the last three, in the export composer, which were left because they
 * ask a different question — *may a document the owner scoped describe this?* —
 * and the answer to that is now a named function beside the other three rather
 * than a comparison repeated in three places.
 *
 * The guard is the shape rather than the count: the string `'private'` may be
 * compared to a privacy class only in the file where the four questions are
 * answered.
 */
describe('the private class is decided in one file — correction 3.11', () => {
  /** Comparing something to the class, rather than naming an export section. */
  const COMPARES_THE_CLASS = /(privacy|class)\w*\s*(===|!==)\s*'private'|'private'\s*(===|!==)/

  it('compares it nowhere else', () => {
    const offenders: string[] = []
    for (const dir of ['src/domain', 'src/memory', 'src/intelligence', 'src/features']) {
      for (const file of sourceFiles(dir)) {
        if (repoPath(file).endsWith('src/domain/privacy.ts')) continue
        if (COMPARES_THE_CLASS.test(readCode(file))) offenders.push(repoPath(file))
      }
    }
    expect(
      offenders,
      'the private class was decided somewhere other than where the rules live',
    ).toEqual([])
  })

  it('is a rule with the permitted case still in it', () => {
    // The one file that may compare it still does, so a guard that had stopped
    // matching anything fails here rather than passing quietly.
    expect(COMPARES_THE_CLASS.test(readCode(join(ROOT, 'src', 'domain', 'privacy.ts')))).toBe(true)
  })
})

describe('an explanation cannot render a reading without the class deciding — D-167', () => {
  it('keeps the undiscreet renderer out of the decision layer', () => {
    const offenders: string[] = []
    for (const file of sourceFiles('src/intelligence')) {
      if (/\bdescribeFactValue\s*\(/.test(readCode(file))) offenders.push(repoPath(file))
    }
    expect(offenders, 'a reading was rendered without the privacy class being consulted').toEqual(
      [],
    )
  })

  it('is a rule with something on the other side of it', () => {
    // `discreetly` is the permitted route and it has callers; a guard whose
    // alternative nobody uses is a guard about nothing.
    const users = sourceFiles('src/intelligence').filter((file) =>
      /\bdiscreetly\s*\(/.test(readCode(file)),
    )
    expect(users.length, 'nothing renders a reading discreetly').toBeGreaterThan(0)
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
   * `derived` and `growth` joined in Phase 4, and both belong on the recording
   * side of the line for the same reason `outcomes` and `corrections` do: they
   * turn history into canonical records and choose nothing. Note which half of
   * `growth` a surface actually touches — the suggestion arrives on the
   * `Decision`, through the engine like everything else, and what Now imports
   * is the function that writes down his answer.
   *
   * `coverage` is deliberately **not** here. It is reached through `situation`,
   * which every surface already has, so the status a Life page shows is the
   * object the decision itself was made from rather than a second computation
   * over the same history — and two of those would eventually disagree, with
   * the owner having no way to tell which screen was lying.
   */
  /*
   * `insights` joined in Phase 6, and it is the most interesting entry on this
   * list because it looks like it should not be.
   *
   * It reads what has been learned, which is exactly why `learning` is closed.
   * The difference is where the numbers come from: `insights` never builds a
   * learning index. It takes the one already on the `Situation` — the object
   * the decision on Now was made from — and counts raw answers over the episode
   * set that same index selected. So a figure on Insights is over the evidence
   * the arbitration saw, rather than being a second reading of the same history
   * that would eventually disagree with it. That is D-071's argument for
   * coverage, applied to a second reader, and the guard below makes it
   * structural rather than a promise.
   */
  /*
   * `vocabulary` joined in Phase 81, and it is the least interesting entry
   * here: it is a table of words. `horizonWord`, `hereNowWord`, `blockNoun`,
   * `restOfWord` and `withinPhrase` turn a `DayBlock` into what a person calls
   * it, and nothing else. It decides nothing, reads nothing and computes
   * nothing about a move.
   *
   * It is open because the alternative is worse. The audit found the word
   * `tonight` typed by hand 113 times across 29 files — including on Now, in
   * the evidence panel's headings and on the decline button — and the whole
   * point of the fix is that there is now one definition of that word. A
   * surface that could not reach it would have to keep its own copy, which is
   * the defect with an extra step.
   */
  /*
   * `commitments` joined in Phase 82, on the recording side of the same line
   * `outcomes` and `corrections` sit on: it turns a tap on the Life panel into
   * a `commitment-window` record and answers which of the two seeds is still
   * unanswered. It chooses nothing. What an obligation *means* for a decision
   * is assembled by `situation.ts` and spent by the evaluator, and a surface
   * reaches that the same way it reaches everything else.
   */
  /*
   * `threads` joined in Phase 82. It is a projection and two record builders:
   * which courses are under way, which move belongs to which, and what to append
   * when the owner starts or stops one. It ranks nothing and selects nothing.
   *
   * The import list is the wrong instrument for what AUD-0020 actually needs
   * guarded — "nothing outside `arbitrate.ts` selects a move because a thread
   * said so" is a claim about *where a thread reaches a decision*, not about
   * which directory imported which file. It has its own test below, and that
   * test is the one the phase gate names.
   */
  /*
   * Five joined in routing 84, and every one of them is on the recording side
   * of the same line — the line `docs/ARCHITECTURE_BOUNDARIES.md` draws between
   * **deciding** and **recording what the owner did**.
   *
   * - `authoring` turns a confirmed draft into an entity and a record. It is
   *   the first thing in the product that can bring a semantic entity into
   *   being (F04), and it ranks nothing: what a new goal does to tonight
   *   happens in the ranking, through `goal-fit`, exactly as it always has.
   * - `destinations` reads destinations out of history and describes them.
   *   Every sentence it produces is the owner's own words or a state from a
   *   closed list, and there is no arithmetic in the file at all (D-162).
   * - `progress` sorts what happened onto the six evidence rungs and asks a
   *   finished course what is left of it. It concludes nothing about a move.
   * - `blockers` decides whether to **ask** what was in the way, which is a
   *   question on a screen and not a recommendation (D-164).
   * - `discovery` is the second information agenda. It is deliberately not on
   *   Now's critical path and by construction cannot move tonight's answer —
   *   which is the whole reason it is a separate instrument from the guide.
   * - `interpret` reads the words the owner types and **proposes**. It writes
   *   nothing, ranks nothing and decides nothing: it returns the same
   *   `AuthoringProposal` shape `authoring` returns, and the surface writes only
   *   after the owner has agreed. It is on this list for the same reason
   *   `authoring` is — a form that offers to create something has to be able to
   *   say what it would create.
   * - `checkIn`, `readings` and `state` are routing 94's three, and they are on
   *   the open side for the same reason `questions` and `guide` are: a screen
   *   that asks the owner something has to know what to ask and has to be able
   *   to write down the answer. `readings` is a catalogue of words, `checkIn`
   *   turns a tap into an observation and answers *is one open*, and `state`
   *   averages readings the situation has already resolved. **None of them
   *   proposes a move, ranks one, or is consulted by anything that does** — the
   *   check-in's whole purpose is to feed a history that later phases read, and
   *   the day one of them reaches the pipeline is the day it moves to `DECIDES`.
   *
   * Adding to this list stays an edit somebody makes deliberately, with a
   * sentence saying why. That is the guard's value, and it is why the list is
   * long rather than a pattern.
   */
  const OPEN_TO_SURFACES = [
    'engine',
    'commitments',
    'threads',
    'guide',
    'questions',
    'trace',
    'situation',
    'explain',
    'lifecycle',
    'outcomes',
    'corrections',
    'derived',
    'growth',
    'insights',
    'vocabulary',
    'authoring',
    'destinations',
    'progress',
    'blockers',
    'discovery',
    'interpret',
    // Routing 94's three: the ritual, its words, and the reading they make.
    'checkIn',
    'readings',
    'state',
    /*
     * What the record says about how it is going — routing 93, F03/F08/F44.
     *
     * It reads and never decides: `stalledStrategies`, `recurringBlockers` and
     * `burdenOver` count rows and return counts. Nothing in it proposes a move,
     * ranks one, or reaches the pipeline — which is why it belongs on the open
     * side of this list rather than beside the evaluator.
     */
    'review',
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

  it('lets a thread reach a decision in exactly one place — AUD-0020', () => {
    /*
     * The gate item, and it is a stronger claim than "no feature imports the
     * evaluator": **a thread influences the score and never the choice.**
     *
     * AUD-0020's own tests-required says it in those words — "an architecture
     * guard asserting nothing outside `arbitrate.ts` selects a move because a
     * thread said so" — and the failure it is written against is a real one
     * with a name: `engine.ts` already contains one deliberate override of the
     * ranking (`continuing`, D-049), so a second one is a plausible thing for
     * somebody to add, it would look reasonable, and no existing guard would
     * see it.
     *
     * Three assertions, and each is a different way for the rule to break.
     */
    const offenders: string[] = []
    const THREAD_SYMBOLS = /\bthreadFor\b|\bActiveThread\b|\bactiveThreads\b|situation\.threads/

    // 1. The chooser does not know threads exist. It cannot promote, tiebreak
    //    or rescue a move because a plan wanted it.
    for (const file of ['src/intelligence/arbitrate.ts', 'src/intelligence/engine.ts']) {
      const code = readCode(join(ROOT, file))
      const found = THREAD_SYMBOLS.exec(code)
      if (found !== null) offenders.push(`${file}: reads ${found[0]}`)
      if (/from '\.\/threads'/.test(code)) offenders.push(`${file}: imports threads`)
    }

    // 2. Inside the engine, a thread reaches a ranking in one file and a
    //    sentence in one other. `evaluate.ts` scores it; `explain.ts` says
    //    which course a move belongs to, which is what stops a thread being a
    //    hidden reason. Nothing else may look.
    /*
     * Four, and each is a different job.
     *
     * `situation.ts` assembles them, `threads.ts` is them, `evaluate.ts` scores
     * one dimension from them, and `explain.ts` says which course a move
     * belongs to — which is what stops a thread being a hidden reason.
     *
     * `lifecycle.ts` is the fifth and the one worth arguing about. It reads a
     * thread only to *write* one: a decline pauses the course the move belonged
     * to, which is AUD-0020's own mitigation and belongs beside the decline
     * record rather than on whichever screen happened to send it. It chooses
     * nothing — that is the line `docs/ARCHITECTURE_BOUNDARIES.md` draws
     * between deciding and recording, and the same reason `outcomes` and
     * `corrections` are open while `learning` is not.
     *
     * The list is short on purpose. Adding to it is an edit somebody makes
     * deliberately, with a sentence saying why, which is the whole value of the
     * guard.
     */
    const ALLOWED_READERS = [
      'evaluate.ts',
      'explain.ts',
      'situation.ts',
      'threads.ts',
      'lifecycle.ts',
      /*
       * The sixth, added by routing 84, and it is the same argument as
       * `lifecycle.ts`: it reads a finished course only to **ask about it**.
       *
       * `dueCourseReflections` finds threads in state `done` and puts one
       * question on screen days later — what is left of it, and whether it has
       * been used. It ranks nothing, proposes nothing and reaches no decision;
       * what it produces is an `outcome` record pointed at the thread. That is
       * the recording side of the line `docs/ARCHITECTURE_BOUNDARIES.md` draws,
       * which is why `outcomes.ts` and `corrections.ts` sit on the same side.
       */
      'progress.ts',
    ]
    for (const file of sourceFiles('src/intelligence')) {
      const name = file.split(sep).pop() ?? ''
      if (ALLOWED_READERS.includes(name)) continue
      const code = readCode(file)
      if (/from '\.\/threads'/.test(code)) offenders.push(`${repoPath(file)}: imports threads`)
    }

    // 3. And the positive half, so the three above are not passing because the
    //    dimension quietly stopped existing.
    const evaluator = readCode(join(ROOT, 'src/intelligence/evaluate.ts'))
    expect(evaluator, 'the thread dimension is gone').toContain("name: 'thread-fit'")
    expect(evaluator, 'thread-fit no longer reads the situation’s threads').toContain('threadFor(')

    expect(offenders, 'a thread reached a decision outside the ranking').toEqual([])
  })

  it('weighs a thread below what is actually in the way — AUD-0020', () => {
    /*
     * Gate item two, asserted where the numbers are rather than through a
     * scenario that happens to come out right. AUD-0020 names this as the first
     * mitigation of its own biggest risk: a plan that could beat a body needing
     * rest is the app nagging the owner with his own past intentions.
     *
     * `tests/synthetic/threads.test.ts` asserts the consequence on a real
     * evening. This asserts the instrument.
     */
    const code = readCode(join(ROOT, 'src/intelligence/evaluate.ts'))
    const weightOf = (name: string): number => {
      const found = new RegExp(`'${name}': ([0-9.]+),`).exec(code)
      expect(found, `no weight for ${name}`).not.toBeNull()
      return Number(found?.[1])
    }
    expect(weightOf('thread-fit')).toBeLessThan(weightOf('bottleneck-fit'))
  })

  it('keeps Insights an interpretation of history rather than a second brain', () => {
    /*
     * Section 51, in as many words: "Do not create a second analytics engine, a
     * second recommendation brain, or a parallel explanation truth."
     *
     * Two things make that structural rather than stated.
     *
     * `insights.ts` cannot reach the pipeline that decides — no generator, no
     * filter, no evaluator, no arbiter, no advisor — so it has nowhere to get a
     * recommendation from even if a future card wanted one. And it cannot
     * render one either: `renderRecommendation` is the only way a move becomes
     * a sentence, and it is out of reach here, so a card physically cannot
     * print an instruction.
     *
     * It also may not build a learning index. `buildLearning` and `noLearning`
     * are what would let this file compute beliefs of its own over the same
     * history the engine already read — two answers to "how well does this
     * work", one on Now and one on Insights, drifting apart with every change
     * to either. The situation's index is the only one there is.
     */
    const code = readCode(join(ROOT, 'src/intelligence/insights.ts'))
    const offenders: string[] = []

    for (const module of ['candidates', 'constraints', 'evaluate', 'arbitrate', 'advisor']) {
      if (new RegExp(`from '\\./${module}'`).test(code)) {
        offenders.push(`insights.ts imports ${module} — it must not be able to decide`)
      }
    }
    if (/\brenderRecommendation\b/.test(code)) {
      offenders.push('insights.ts can render a recommendation sentence')
    }
    for (const symbol of ['buildLearning', 'noLearning']) {
      if (new RegExp(`\\b${symbol}\\b`).test(code)) {
        offenders.push(`insights.ts builds its own learning index via ${symbol}`)
      }
    }
    // And the positive half: it really does read the situation's own index.
    expect(code).toContain('situation.learning')

    expect(offenders, 'Insights interprets history; it does not decide').toEqual([])
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
  /*
   * The export composer joins the list in Phase 7, and for the same reason the
   * other two are on it: a review export has to tell the assistant reading it
   * how complete the app it is describing actually is, and "current app/engine
   * version" is one of the things canonical plan section 52 requires the
   * document to carry. It reads the number from `REBUILD_PHASE` like the other
   * two, which the second guard below still holds it to.
   */
  const MAY_MENTION_PHASES = ['src/features/more/', 'src/features/qa/', 'src/features/export/']

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

  /*
   * From a list of past mistakes to a rule — P4-3.
   *
   * The first version of this guard held four literal sentences that had once
   * been wrong. It passed for two whole phases while Insights told the owner
   * the app was "not yet asking" for outcomes — untrue since Phase 3, and by
   * Phase 4 untrue twice over, since some answers are now worked out without
   * being asked at all. More carried the same claim in different words. A guard
   * made of remembered strings only ever catches the mistake somebody already
   * made.
   *
   * Two rules replace it, and neither is a list of bad phrases.
   *
   * The first is a **burden inversion**: every deferral claim in owner-facing
   * copy has to be acknowledged. New copy that says the app does not do
   * something fails the build until a person either fixes it or states, in the
   * list below, why it is still true. The list grows with deliberate decisions
   * rather than with defects.
   *
   * The second **ties the claim to the code**: a handful of capabilities the
   * kernel demonstrably has, each proved by an export that must exist, and each
   * with the ways of denying it. If the capability is there and a screen denies
   * it, the build fails — and if the capability is ever genuinely removed, the
   * proof fails first and says so.
   */

  /** Language that tells the owner something is absent, deferred or not built. */
  const DEFERRAL_CLAIMS = [
    /\bnot yet\b/i,
    /\byet to\b/i,
    /\bnot built\b/i,
    /\bdoes not exist\b/i,
    /\barrives? in Phase\b/i,
    /\buntil Phase\b/i,
    /\bwill arrive\b/i,
    // QA-B1: "The domain pages behind Life are next" shipped this same phase.
    // A claim phrased as "still ahead of us" rather than "missing" slipped
    // past every pattern above, on the one screen (More) that is one tap from
    // every other screen in the app.
    /\b(?:is|are) next\b/i,
  ]

  /**
   * Deferral claims that are still true, and why.
   *
   * Each entry is a substring that must appear near the claim. Adding one is a
   * statement that somebody checked; leaving a stale one here is the only way
   * this guard can be defeated, and it takes a deliberate edit rather than
   * forgetting.
   */
  const STILL_TRUE: readonly { readonly near: string; readonly because: string }[] = [
    {
      near: 'not built into a production release',
      because: 'the QA surface really is preview-only',
    },
    {
      near: 'That wall-clock time does not exist here',
      because: 'about a DST gap, not about the app',
    },
    { near: '> Not yet <', because: 'a button label — the owner answering, not a claim' },
  ]

  /**
   * Every owner-facing narrative sentence this guard has to hold to account —
   * not only the FEATURES files' own literal prose.
   *
   * `REBUILD_PHASE.summary` is exactly this kind of sentence and used to live
   * as hand-written JSX text inside `MoreScreen.tsx`, which is why it is
   * checked here rather than assumed to be covered by the FEATURES sweep
   * below: QA-B1 was reachable precisely because the claim moved to data
   * (`src/platform/buildInfo.ts`) that the FEATURES-only scan never reads.
   */
  function proseSources(): readonly { readonly path: string; readonly prose: string }[] {
    return [
      ...FEATURES.map((file) => ({
        path: repoPath(file),
        prose: readCode(file).replace(/\s+/g, ' '),
      })),
      { path: 'src/platform/buildInfo.ts (REBUILD_PHASE.summary)', prose: REBUILD_PHASE.summary },
    ]
  }

  it('acknowledges every claim that something is not built', () => {
    const offenders: string[] = []

    // Prose in JSX is split across lines by the formatter, so each FEATURES
    // file's text is joined back up before matching — otherwise a claim
    // escapes by wrapping. `REBUILD_PHASE.summary` is already one line.
    for (const { path, prose } of proseSources()) {
      for (const claim of DEFERRAL_CLAIMS) {
        const pattern = new RegExp(claim.source, `${claim.flags}g`)
        let found: RegExpExecArray | null
        while ((found = pattern.exec(prose)) !== null) {
          /*
           * A panel's worth of context, not the whole file.
           *
           * The claim is often the panel title and what makes it acceptable is
           * the sentence underneath — "Not built yet" is fine directly above
           * "what is missing is this view of it" and nowhere else. The window
           * reaches forward far enough to hold one panel's prose and no
           * further, so an acknowledgement cannot cover a claim three screens
           * away.
           */
          const window = prose.slice(Math.max(0, found.index - 120), found.index + 460)
          if (STILL_TRUE.some((allowed) => window.includes(allowed.near))) continue
          offenders.push(`${path} — “…${window.trim()}…”`)
        }
      }
    }

    expect(
      offenders,
      'an owner-facing claim that something is not built, with nothing saying it is still true',
    ).toEqual([])
  })

  it('the current phase is stated once, and matches what has actually shipped', () => {
    // Direct and deliberately unsubtle: this is the one line a human has to
    // remember to bump, and the whole point is that forgetting fails loudly
    // rather than silently, the way DEF-0031's stale "Phase 4" did.
    expect(REBUILD_PHASE.number).toBe(8)
    expect(REBUILD_PHASE.title).toBe('Legacy migration')
    expect(REBUILD_PHASE.summary).not.toMatch(/domain pages? behind life are next/i)
    // QA-B1's own lesson, one phase on: the sentence describing what the build
    // does may not still be describing the phase before it.
    expect(REBUILD_PHASE.summary).not.toMatch(/timeline and insights are next/i)
    expect(REBUILD_PHASE.summary).not.toMatch(/exports?[^.]*(?:is|are) next/i)
    expect(REBUILD_PHASE.summary).not.toMatch(/backup[^.]*(?:is|are) next/i)
    // And this phase's own version of it: the summary may not still be saying
    // that bringing the old history across is something the build will do later.
    expect(REBUILD_PHASE.summary).not.toMatch(/(?:legacy|old app)[^.]*(?:is|are) next/i)
    expect(REBUILD_PHASE.next).not.toMatch(/old app|legacy/i)
  })

  it('denies no capability the kernel demonstrably has', () => {
    const capabilities = [
      {
        what: 'asks what came of a move',
        provenBy: {
          file: 'src/intelligence/outcomes.ts',
          symbol: 'export function outcomeQuestionsFor',
        },
        denials: [/\bnot (?:yet )?asking\b/i, /\bdoes not (?:yet )?ask\b/i],
      },
      {
        what: 'watches what happens afterwards',
        provenBy: {
          file: 'src/intelligence/lifecycle.ts',
          symbol: 'export function collectEpisodes',
        },
        denials: [/\bnot (?:yet )?watch/i, /\bdoes not watch\b/i],
      },
      {
        what: 'learns from what happened',
        provenBy: { file: 'src/intelligence/learning.ts', symbol: 'export function buildLearning' },
        denials: [/\bnothing (?:has been )?learned\b/i, /\bnot (?:yet )?learn(?:ed|t|ing)\b/i],
      },
      {
        what: 'chooses one move and explains it',
        provenBy: { file: 'src/intelligence/arbitrate.ts', symbol: 'export function arbitrate' },
        denials: [/\bno engine\b/i, /\bdoes not decide\b/i, /\bnothing is chosen\b/i],
      },
      {
        what: 'keeps a canonical history',
        provenBy: { file: 'src/memory/facts.ts', symbol: 'export function resolveFacts' },
        denials: [/\bthere is no record store\b/i, /\bnothing is stored\b/i],
      },
      {
        what: 'notices when a life area has gone quiet',
        provenBy: {
          file: 'src/intelligence/coverage.ts',
          symbol: 'export function assembleCoverage',
        },
        denials: [/\bdoes not notice\b/i, /\bnothing notices\b/i],
      },
      {
        /*
         * Phase 6, and absolute for the same reason the domain pages are.
         *
         * The previous phase's own blocking defect was a screen still saying
         * these two were "next" on the checkpoint that shipped the phase before
         * them (DEF-0031). The acknowledgement that made that claim allowable
         * has been removed from STILL_TRUE, and this replaces it from the other
         * side: once Timeline and Insights exist, no wording anywhere may say
         * they do not, and no entry in STILL_TRUE can excuse it.
         */
        what: 'shows the record in order, and what it has learned',
        provenBy: {
          file: 'src/features/timeline/timelineEntries.ts',
          symbol: 'export function assembleTimeline',
        },
        denials: [
          /\btimeline (?:and insights )?(?:is|are) next\b/i,
          /\bno timeline\b/i,
          /\btimeline is not built\b/i,
        ],
      },
      {
        what: 'says what it has worked out, with the evidence behind it',
        provenBy: {
          file: 'src/intelligence/insights.ts',
          symbol: 'export function insightsFor',
        },
        denials: [
          /\binsights (?:is|are) next\b/i,
          /\bno insights\b/i,
          /\binsights is not built\b/i,
        ],
      },
      {
        /*
         * Phase 7, and absolute for the same reason the two above are.
         *
         * The sentence "Exports, backup and restore are not built yet" shipped
         * on More for six phases and was true every time — right up until the
         * checkpoint that made it false, which is exactly the moment nobody
         * re-reads a sentence that has always been correct. Its entry in
         * STILL_TRUE has been removed, and this replaces it from the other
         * side: once these exist, no wording anywhere may say they do not, and
         * no acknowledgement can excuse it.
         */
        what: 'composes an export and puts a backup back',
        provenBy: {
          file: 'src/memory/restore.ts',
          symbol: 'export async function restoreInto',
        },
        denials: [
          /exports?,? backup and restore are not built/i,
          /\bno backup\b/i,
          /\bcannot be (?:exported|backed up|restored)\b/i,
          /\b(?:export|backup|restore)s? (?:is|are) next\b/i,
        ],
      },
      {
        what: 'lets a review export be composed from chosen sections',
        provenBy: {
          file: 'src/features/export/compose.ts',
          symbol: 'export function composeExport',
        },
        denials: [/\bno (?:review )?export\b/i, /\bexport is not built\b/i],
      },
      {
        // QA-B1. Absolute rather than acknowledgeable on purpose: unlike
        // a genuinely future phase, it can never again become true that the
        // domain pages do not exist once they are shipped, so no
        // acknowledgment should be able to excuse denying this one.
        what: 'provides domain pages behind Life',
        provenBy: {
          file: 'src/features/life/domainPages.ts',
          symbol: 'export function assembleDomainPageData',
        },
        denials: [
          /domain pages? behind life (?:is|are) next/i,
          /no domain pages? (?:yet|behind life)/i,
        ],
      },
    ]

    const offenders: string[] = []
    for (const capability of capabilities) {
      // The proof first. If this ever fails, the capability has gone and the
      // guard is telling you before the copy does.
      const source = readFileSync(join(ROOT, capability.provenBy.file), 'utf8')
      expect(
        source.includes(capability.provenBy.symbol),
        `${capability.what}: ${capability.provenBy.symbol} is gone — the guard is out of date`,
      ).toBe(true)

      for (const { path, prose } of proseSources()) {
        for (const denial of capability.denials) {
          if (denial.test(prose)) {
            offenders.push(`${path} denies "${capability.what}" — ${denial.source}`)
          }
        }
      }
    }

    expect(offenders, 'a screen telling the owner the app cannot do something it does').toEqual([])
  })
})

describe('the owner is not asked to do the app’s thinking — D-089', () => {
  /*
   * QA-A1, held structurally.
   *
   * The app asked *"How much did a walk do for you?"* and offered four grades
   * of difference. That is the causal question the system exists to answer,
   * handed to the owner, and his answers were then counted back to him as
   * percentages labelled as observed facts. Three properties keep it gone, and
   * none of them is a promise:
   *
   * 1. a move that declares an observable state dimension has the grading
   *    question taken off it, in one place, for every such verb;
   * 2. the only thing that may state a relationship is `association.ts`, and it
   *    needs a comparison group to do so;
   * 3. nothing that states a relationship can reach the words that would turn
   *    it into a cause.
   */

  it('takes the grading question off every move that declares a state dimension', () => {
    // One rule, in one place, keyed on the profile — not a list of verbs, which
    // is how the walk ended up being the only one anybody noticed.
    const code = readCode(join(ROOT, 'src/intelligence/outcomes.ts'))
    expect(code).toContain('.affects !== undefined')
    expect(code, 'the suppression is not keyed on the profile').toMatch(
      /observes[\s\S]{0,400}question\.aspect === 'effect'/,
    )
  })

  it('lets only the association module state a relationship', () => {
    /*
     * `association.ts` is the one file that compares what happened with an
     * action against what happened without one. Nothing else may grow a second
     * one: two answers to "does this follow that" is QA-A1's shape returning,
     * and the second would not have a comparison group.
     */
    const offenders: string[] = []
    for (const file of [...INTELLIGENCE, ...FEATURES]) {
      const path = repoPath(file)
      if (path === 'src/intelligence/association.ts') continue
      const code = readCode(file)
      // The comparison group is what makes a relationship claim honest, so the
      // words for it are the marker.
      if (/withoutAction|comparisonGroup|controlGroup/.test(code)) {
        offenders.push(`${path} builds a comparison group of its own`)
      }
    }
    expect(offenders, 'one place compares, and it needs both sides').toEqual([])
  })

  it('cannot say one thing caused another, on any surface', () => {
    /*
     * D-089's second consequence, and D-066 generalized. An observed
     * relationship is association: "has more often been higher afterwards", not
     * "improves". A worse reading afterwards is a worse reading, not harm.
     *
     * Swept over the owner surfaces and over the module that words the finding,
     * because the sentence is composed in the kernel and rendered in the shell
     * and either end could reintroduce it.
     */
    const causal = [
      /\bcauses?\b/i,
      /\bcaused\b/i,
      /\bcausing\b/i,
      /\bimproves?\b/i,
      /\bboosts?\b/i,
      /\bmakes? you (?:feel|more|less)\b/i,
      // Phase 81 — AUD-0028. Two constructions the explanation templates
      // were using about the owner's own evenings with nothing behind them.
      /\bcosts you\b/i,
      /\bleads to\b/i,
    ]

    const offenders: string[] = []
    const sources = [
      ...FEATURES.filter((file) => !repoPath(file).startsWith('src/features/qa/')),
      join(ROOT, 'src/intelligence/association.ts'),
      join(ROOT, 'src/intelligence/insights.ts'),
      /*
       * The explanation templates joined in Phase 81 — AUD-0028.
       *
       * The sweep covered the surfaces and the module that words a finding,
       * and missed the module that words the *reason* — which is the sentence
       * the owner reads first. `explain.ts` was ending the home-friction
       * branch with "and it costs you the start of every evening": a causal
       * claim about his own evenings that nothing has ever measured, printed
       * directly above a learned line saying the move had made little
       * difference. A constant clause cannot be falsified by evidence,
       * because no evidence reaches it.
       *
       * `recommendation.ts` is here for the same reason one layer earlier: it
       * holds the action and trigger templates, and a causal clause typed
       * into one of those reaches every owner surface at once.
       */
      join(ROOT, 'src/intelligence/explain.ts'),
      join(ROOT, 'src/domain/recommendation.ts'),
    ]

    for (const file of sources) {
      const path = repoPath(file)
      // Only string literals: a comment explaining what the file may not say is
      // exactly the thing a naive scan would trip on. Walked rather than
      // matched — see `stringLiterals` for what the regex used to miss.
      for (const text of literalsOf(file)) {
        for (const pattern of causal) {
          if (pattern.test(text)) offenders.push(`${path}: “${text.slice(0, 80)}”`)
        }
      }
    }

    expect(offenders, 'association is not causation, in either direction').toEqual([])
  })

  it('keeps the owner’s judgments and the app’s findings in different types', () => {
    /*
     * The fifth consequence: history keeps its meaning. Every existing
     * `aspect: 'effect'` record is an owner attribution and stays one, so the
     * observed quantity had to be additive rather than a redefinition.
     * `ObservedAssociation` is not an `OutcomeRecord` and `association.ts`
     * writes no record at all — it reads.
     */
    const code = readCode(join(ROOT, 'src/intelligence/association.ts'))
    expect(code, 'the association module writes records').not.toMatch(
      /createRecordFactory|build\(\s*'outcome'/,
    )
    expect(code, "and it must not touch the owner's own aspect").not.toMatch(/aspect:/)
  })
})

describe('nothing in the product turns off a blocker he told it about — C21', () => {
  /*
   * `FilterOptions.enforceStandingBlockers` exists for one reason: §6.5's
   * completion condition asks for C21's enforcement to be *"proved by
   * reintroduction — put the non-enforcement back and watch the test fail"*, and
   * a proof needs a way to put the old rule back against the same history.
   *
   * A seam that lets a safety rule be switched off is worth exactly one guard:
   * that nothing but a test ever switches it. The default is the safe answer, so
   * a caller who forgets the option gets enforcement; this is about a caller who
   * remembers it.
   *
   * The shape is `DecideOptions.probe`'s, and so is the discipline.
   */
  const SWITCH = /enforceStandingBlockers/

  it('names the seam in exactly one source file', () => {
    const offenders: string[] = []
    for (const file of [...INTELLIGENCE, ...FEATURES]) {
      if (repoPath(file).endsWith('src/intelligence/constraints.ts')) continue
      if (SWITCH.test(readCode(file))) offenders.push(repoPath(file))
    }
    expect(offenders, 'a surface can turn off a blocker the owner told the app about').toEqual([])
  })

  it('is looking at a rule that is really there', () => {
    // The reintroduction proof of the guard itself: the shape it bans is the
    // shape the one permitted file still uses, so a guard that had stopped
    // matching anything fails here rather than passing quietly forever.
    expect(SWITCH.test(readCode(join(ROOT, 'src/intelligence/constraints.ts')))).toBe(true)
  })

  it('reads the same standing-blocker function the question path reads', () => {
    /*
     * D-164's extension: *"asked when the answer has a use"* becomes *"and the
     * use is delivered"* once enforcement lands. What makes that structural is
     * that one function answers *"is this move blocked?"* — so the app cannot
     * decline to ask because it knows and then offer the move anyway because
     * nothing read what it knew.
     */
    const filter = readCode(join(ROOT, 'src/intelligence/constraints.ts'))
    const asking = readCode(join(ROOT, 'src/intelligence/blockers.ts'))
    expect(filter).toContain('standingBlockerFor')
    expect(asking).toContain('standingBlockerFor')
  })
})

describe('the shown-ledger is not history — AUD-0025, D-043', () => {
  /*
   * D-043 settled that nothing is written when a screen renders, and every
   * reason it gives still holds: a row per render would be unreadable within a
   * week, would poison the duplication check, and would become learning evidence
   * about an evening nothing happened in.
   *
   * What was missing was cheaper — ignoring a suggestion is a response, and the
   * most common one, and the app could not count it at all. So it repeated
   * itself. The count is the surface's, it is session-scoped and non-durable,
   * and it arrives at the engine as an argument on the moment.
   *
   * Two things have to stay true and neither is the sort of thing a person
   * remembers: the ledger must not become evidence, and it must not become part
   * of the owner's history.
   */
  const READS_HISTORY = [
    'src/intelligence/learning.ts',
    'src/intelligence/insights.ts',
    'src/intelligence/association.ts',
    'src/features/timeline/timelineEntries.ts',
    'src/features/timeline/TimelineScreen.tsx',
    'src/features/history/describe.ts',
  ]

  it('is reachable from the duplication check and from nowhere else', () => {
    const offenders: string[] = []
    for (const file of [...INTELLIGENCE, ...FEATURES]) {
      const path = repoPath(file)
      if (!READS_HISTORY.includes(path)) continue
      const code = readCode(file)
      if (/\bsituation\.shown\b|\bShownMove\b/.test(code)) {
        offenders.push(`${path} reads what has merely been on screen`)
      }
    }
    expect(offenders, 'a render became evidence').toEqual([])

    // And the positive half: the one reader really does read it.
    expect(readCode(join(ROOT, 'src/intelligence/evaluate.ts'))).toContain('situation.shown')
  })

  it('is looking at files that exist', () => {
    const known = new Set([...INTELLIGENCE, ...FEATURES].map((file) => repoPath(file)))
    for (const path of READS_HISTORY) {
      expect(known.has(path), path).toBe(true)
    }
  })

  it('never reaches the store, a backup or an export', () => {
    /*
     * D-107's rule in a smaller key: nothing about the transport may enter the
     * identity of the thing transported. This is a fact about *screens*, and a
     * backup that carried it — or a fingerprint that hashed it — would make one
     * owner's two sessions produce two different backups of one history.
     */
    const offenders: string[] = []
    for (const file of [...sourceFiles('src/memory'), ...FEATURES]) {
      const path = repoPath(file)
      if (!path.startsWith('src/memory/') && !path.includes('/export/')) continue
      if (/\bShownMove\b|\bshownLedger\b|\bShownStore\b/.test(readCode(file))) {
        offenders.push(`${path} knows what has been on screen`)
      }
    }
    expect(offenders, 'a session note reached the owner’s own records').toEqual([])
  })

  it('lives in its own database, opened from exactly one place — AUD-0025', () => {
    /*
     * The durable half, and the reason it is a **separate database** rather than
     * a fourth object store beside the records.
     *
     * Every claim above — never a canonical record, never in a backup, never in
     * a fingerprint, never restored — is a property of where it lives rather
     * than a rule somebody has to remember. `replaceAll` and `clear` on the
     * canonical store name their object stores explicitly; a fifth one in the
     * same database would eventually be added to one of those lists by somebody
     * being tidy, and the count would start travelling with the history.
     *
     * So: one module owns it, one component opens it, and nothing that writes a
     * backup, composes an export or implements the canonical store may import it
     * at all.
     */
    const IMPORTS_IT = /from '[^']*shownStore'/
    const openers: string[] = []
    for (const file of sourceFiles('src')) {
      const path = repoPath(file)
      if (path.endsWith('src/features/memory/shownStore.ts')) continue
      if (IMPORTS_IT.test(readCode(file))) openers.push(path)
    }
    expect(
      [...new Set(openers)].sort(),
      'the shown ledger is opened somewhere other than the component that owns the clock',
    ).toEqual(['src/features/memory/MemoryProvider.tsx'])
  })

  it('opens a database of its own rather than a store beside the records', () => {
    // The positive half: the name really is a separate database, and the module
    // that implements the canonical store knows nothing about it.
    expect(readCode(join(ROOT, 'src/features/memory/MemoryProvider.tsx'))).toContain('SHOWN_DB')
    expect(readCode(join(ROOT, 'src/memory/indexedDbStore.ts'))).not.toMatch(/shown/i)
    expect(readCode(join(ROOT, 'src/memory/backup.ts'))).not.toMatch(/shown/i)
  })
})

describe('a figure never reaches a screen without what it measures', () => {
  /*
   * Canonical plan section 51, and DEF-0020's second form.
   *
   * > Any percentage must identify the quantity it measures. Do not merge
   * > direct result, downstream effect, comfort/friction, or follow-through
   * > into one generic success statistic.
   *
   * A rule about how a number is worded cannot be kept by everyone remembering
   * it at every call site — DEF-0020 is the record of what happens when four
   * facts share one carrier because nothing stopped them. So exactly one
   * component may render a percentage, it takes the whole `MeasuredRate`, and
   * the sentence naming the quantity and the count it is over are rendered by
   * the same function that renders the figure. Printing the figure alone is not
   * something a caller is able to do.
   *
   * The QA laboratory is exempt and says why: it is a developer surface whose
   * whole job is to show the machinery (section 35), and it is not in a
   * production build at all.
   */
  const MAY_PRINT_A_FIGURE = 'src/features/evidence/EvidencePieces.tsx'
  const DEVELOPER_SURFACES = ['src/features/qa/']

  it('renders the figure and its sentence from one place', () => {
    const source = readFileSync(join(ROOT, MAY_PRINT_A_FIGURE), 'utf8')
    // The figure, the sentence and the count, in one component.
    expect(source).toContain('rate.percent')
    expect(source).toContain('rate.measures')
    expect(source).toContain('rate.hit')
    expect(source).toContain('rate.of')
  })

  it('lets no other owner surface print one', () => {
    const offenders: string[] = []
    for (const file of FEATURES) {
      const path = repoPath(file)
      if (path === MAY_PRINT_A_FIGURE) continue
      if (DEVELOPER_SURFACES.some((allowed) => path.startsWith(allowed))) continue

      const code = readCode(file)
      // A literal per-cent sign in owner-facing text, or the arithmetic that
      // produces one. Both are how a bare figure gets onto a screen. The sign
      // is looked for in the walked literals rather than by a pattern over the
      // whole file, for the reason `stringLiterals` records.
      if (literalsOf(file).some((text) => text.includes('%'))) {
        offenders.push(`${path} prints a per-cent sign`)
      }
      if (/\*\s*100\b|\bpercent\b/i.test(code)) {
        offenders.push(`${path} computes a percentage`)
      }
    }

    expect(
      offenders,
      'only the shared evidence component may put a figure on an owner surface',
    ).toEqual([])
  })
})

describe('Timeline offers nothing to press', () => {
  it('has no button, no input and no correction on it', () => {
    /*
     * Section 26: "Timeline should never create phantom actionable items from
     * corrupt data." The usual way to satisfy that is to check that corrupt
     * rows produce no action — which proves it for the corruption somebody
     * thought of. This proves it for all of them: there is no action on the
     * surface at all, so there is nothing for a corrupt row to produce.
     *
     * The one exception is the pager, which reveals more of the same record and
     * changes nothing.
     */
    for (const file of FEATURES.filter((entry) =>
      repoPath(entry).startsWith('src/features/timeline/'),
    )) {
      const path = repoPath(file)
      const code = readCode(file)
      const offenders: string[] = []

      if (/<input\b|<textarea\b|<select\b/.test(code)) offenders.push('a field to type into')

      // Nothing on Timeline may write a record — not "does not currently", but
      // cannot reach anything that could.
      if (/\bappend\(/.test(code)) offenders.push('a write to the store')
      for (const module of ['corrections', 'lifecycle', 'outcomes', 'growth']) {
        if (new RegExp(`intelligence/${module}'`).test(code)) {
          offenders.push(`an import of ${module}, which writes records`)
        }
      }

      /*
       * The pager is counted rather than filtered out by shape. A second
       * handler appearing beside it is exactly the change this guard exists to
       * catch, and a filter written to remove the pager would remove that one
       * too.
       */
      const handlers = code.split('onClick=').length - 1
      if (handlers > 1) offenders.push(`${handlers} click handlers`)
      if (handlers === 1 && !code.includes('setLimit')) {
        offenders.push('a click handler that is not the pager')
      }

      expect(offenders, `${path} makes Timeline actionable`).toEqual([])
    }
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

/**
 * The wall around the previous generation's shapes (canonical plan section 30).
 *
 * Section 30's critical rule — do not contort the new architecture to make
 * legacy mapping easier — is a rule about *pressure*, and pressure arrives one
 * convenience import at a time. A legacy type reaching normal runtime is the
 * single failure that would make the whole exercise worse than not importing at
 * all: the old application's assumptions would come back wearing this one's
 * clothes, and nobody would be able to point at the commit where it happened.
 *
 * So the shapes stay behind a wall, and the wall is a test rather than a note
 * at the top of a file.
 */
describe('the previous generation’s shapes stay behind the importer', () => {
  it('is a real folder with real files in it', () => {
    // Every guard below is a filter over this list. An empty list would make
    // all of them pass while proving nothing — the shape of a sweep that cannot
    // fire, which this phase is under instructions not to ship.
    expect(LEGACY.length).toBeGreaterThan(4)
  })

  it('lets nothing below the UI know the old format exists', () => {
    const offenders = MEANING_LAYER.filter((file) =>
      /from '[^']*\/legacy\//.test(readCode(file)),
    ).map(repoPath)
    expect(offenders, 'domain, memory and intelligence may not import the legacy reader').toEqual(
      [],
    )
  })

  it('keeps the quarantined shapes and the registry inside the importer', () => {
    /*
     * The deeper of the two walls. `index.ts` is the whole public surface, and
     * `format.ts` and `translate.ts` are not on it — a feature reaching past
     * the entry point for `LegacyRecord` or `readValue` would be a surface
     * holding somebody else's data model.
     *
     * `mapping.ts` is deliberately reachable through `index.ts` only. The
     * import screen genuinely needs to show what the rules decided, and it
     * needs to show it as data rather than by re-deriving it — which is the
     * whole reason the tallies are computed in `plan.ts` and not in the panel.
     */
    const offenders = FEATURES.filter((file) =>
      /from '[^']*\/legacy\/[a-z]/.test(readCode(file)),
    ).map(repoPath)
    expect(offenders, 'a surface imports src/legacy, not a file inside it').toEqual([])
  })

  it('reaches no store of its own', () => {
    /*
     * Detection and planning are run against files nobody has committed to
     * importing, so neither may be able to write. `apply.ts` is the one file
     * that touches a store, and it takes the handle from its caller — which is
     * what keeps "whose history is this" a decision made one layer up, where
     * both stores are known (D-091's eighth invariant).
     */
    const offenders = LEGACY.filter((file) => {
      if (repoPath(file).endsWith('src/legacy/apply.ts')) return false
      return /openIndexedDbStore|createMemoryStore|indexedDB/.test(readCode(file))
    }).map(repoPath)
    expect(offenders, 'only the apply step may know a store exists').toEqual([])
  })

  it('never writes a legacy file, only reads one', () => {
    /*
     * There is no encryptor in `src/legacy/`, and there should never be one:
     * this app writes its own backup format, so an `encrypt` here would be code
     * whose only possible future is being misused. The fixture that builds test
     * files has its own, which is also what makes the decryptor provable
     * against a genuinely encrypted file rather than a mock.
     */
    const offenders = LEGACY.filter((file) =>
      /subtle\.encrypt|deriveKey\([^)]*\)\s*\.\s*then|\['encrypt'\]/.test(readCode(file)),
    ).map(repoPath)
    expect(offenders, 'the legacy reader decrypts and does not encrypt').toEqual([])
  })

  it('reads no wall clock, so an import is dated by the file and not by today', () => {
    // An imported row's moment is when the thing happened, which is in the
    // file. A `Date.now()` here would stamp a decade of history with the
    // afternoon it was imported.
    const offenders = LEGACY.filter((file) =>
      /\bDate\.now\s*\(|new Date\s*\(\s*\)/.test(readCode(file)),
    ).map(repoPath)
    expect(offenders, 'an import is dated by the file').toEqual([])
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

/**
 * Pooling two of the owner's subjects is a decision with a name on it (D-091).
 *
 * `ACTION_FAMILIES` exists because the app once pooled four walks and four bike
 * rides — both the `move` verb — and printed the averaged result as a finding
 * about *a walk*. The registry is the only route back to aggregation, and it
 * starts empty. An entry is a claim that two things the owner keeps apart are
 * the same thing for the purpose of a learned relationship, so it must say who
 * decided that and why.
 */
describe('an interchangeable-action family is a written decision', () => {
  it('carries a reason, a label and at least two members', () => {
    for (const family of ACTION_FAMILIES) {
      expect(family.id, 'a family needs an id').toMatch(/^[a-z][a-z0-9-]*$/)
      expect(family.label.trim().length, `${family.id}: a family needs a label`).toBeGreaterThan(0)
      expect(
        family.because.trim().length,
        `${family.id}: pooling two actions without saying why is the defect this registry exists to prevent`,
      ).toBeGreaterThan(20)
      expect(
        family.members.length,
        `${family.id}: a family of fewer than two is not an aggregation`,
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it('never puts one action in two families', () => {
    const seen = new Set<string>()
    const twice: string[] = []
    for (const family of ACTION_FAMILIES) {
      for (const member of family.members) {
        if (seen.has(member)) twice.push(member)
        seen.add(member)
      }
    }
    expect(twice, 'an action pooled two ways has two answers').toEqual([])
  })

  it('names members in the form a target key actually takes', () => {
    /*
     * `targetKey` is `${verb}/${object.id}`. A member written any other way
     * would silently never match, which is the worst outcome available here: a
     * registry that looks like it is doing something and is not.
     */
    for (const family of ACTION_FAMILIES) {
      for (const member of family.members) {
        const [verb, ...rest] = member.split('/')
        expect(ACTION_VERBS as readonly string[], `${member}: not a verb`).toContain(verb)
        expect(rest.join('/').length, `${member}: no object`).toBeGreaterThan(0)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// QA-82-004 — a target the size of its own threshold
// ---------------------------------------------------------------------------

/**
 * Every touch target reads one token, and that token clears the requirement.
 *
 * The Android gate asserts 44px of thumb, and every control in the app used to
 * be declared at exactly `2.75rem` — 44px. At a device pixel ratio of 3 the
 * measured height came back as 44.00006, so whether a button passed was decided
 * by subpixel rounding rather than by the design: one deployed run reported 126
 * checks clean and the next reported 125, on the same bytes and the same
 * control.
 *
 * Two rules, and the second is what makes the first worth anything:
 *
 * 1. No stylesheet states a target size of its own. Fifteen copies of one
 *    number is fifteen chances for the next one to be 40.
 * 2. The token is **strictly greater** than the threshold the gate measures
 *    against. A minimum a design sits exactly on is not a minimum it meets.
 */
/**
 * Every design token a surface reads is a token somebody defined — routing 90.
 *
 * ## What went wrong, and why nothing caught it
 *
 * Four declarations across three stylesheets read `var(--border-subtle)` and
 * `var(--edge)`. **Neither property has ever been defined.** A `var()` with no
 * fallback that resolves to nothing makes the whole declaration invalid at
 * computed-value time, so `border-top: 1px solid var(--border-subtle)` is not a
 * faint border or a wrong colour — it is **no border at all**, on a laboratory
 * panel and on the standing-veto row and on the notice that tells the owner he
 * is looking at somebody else's evening.
 *
 * Nothing failed. CSS has no undefined-variable error, the build does not link
 * stylesheets against the token sheet, and the result is a hairline quietly
 * missing on a dark surface where a missing hairline looks exactly like a
 * design decision. It survived every gate this campaign has: 1,861 tests, a
 * browser matrix at three widths, an Android pass and nineteen rounds of
 * independent QA.
 *
 * ## Why the guard is worth having rather than the fix alone
 *
 * The four uses were repaired in the same commit as this test, and repairing
 * them is not what stops it happening again — the next renamed token does the
 * same thing just as silently. This is a **link step for the design system**,
 * which a stylesheet language does not give you and a visual coherence phase is
 * the right place to add.
 *
 * Locally-scoped properties are legitimate: a component may define its own on a
 * selector and read it back. So the definitions are collected from every
 * stylesheet rather than from `tokens.css` alone, and what is left is genuinely
 * a name nobody wrote.
 */
describe('no surface reads a design token that does not exist', () => {
  const styleFiles = (): readonly string[] => {
    const out: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (name.endsWith('.css') || name.endsWith('.tsx')) out.push(full)
      }
    }
    walk(join(ROOT, 'src'))
    return out
  }

  /** `--name:` anywhere, which is where a custom property comes into being. */
  const DEFINED = /(^|[;{\s])(--[a-z0-9-]+)\s*:/gi
  /** `var(--name` — the fallback, if any, is a separate concern. */
  const USED = /var\(\s*(--[a-z0-9-]+)/gi

  it('is looking at the stylesheets and the components', () => {
    expect(styleFiles().length).toBeGreaterThan(8)
  })

  it('defines every custom property that anything reads', () => {
    const defined = new Set<string>()
    const used = new Map<string, string>()

    for (const file of styleFiles()) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(DEFINED)) defined.add(match[2]!)
      for (const match of text.matchAll(USED)) {
        if (!used.has(match[1]!)) used.set(match[1]!, repoPath(file))
      }
    }

    const orphans = [...used]
      .filter(([name]) => !defined.has(name))
      .map(([name, file]) => `${file} reads ${name}, which nothing defines`)
      .sort()

    expect(orphans, 'a token read but never written').toEqual([])
  })

  it('bites on a token nobody defined', () => {
    /*
     * A set-difference check goes green when both sets are empty, so this is
     * what says the comparison is real: the same arithmetic, over a made-up
     * name, must report it.
     */
    const defined = new Set(['--accent'])
    const used = ['--accent', '--not-a-real-token']
    expect(used.filter((name) => !defined.has(name))).toEqual(['--not-a-real-token'])
  })
})

describe('a touch target is bigger than the smallest allowed target', () => {
  const cssFiles = (): readonly string[] => {
    const out: string[] = []
    const walk = (current: string): void => {
      for (const name of readdirSync(current)) {
        const full = join(current, name)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (name.endsWith('.css')) out.push(full)
      }
    }
    walk(join(ROOT, 'src'))
    return out
  }

  /** The token, in pixels, at the 16px root the app never overrides. */
  const tokenPx = (): number => {
    const tokens = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')
    const found = /--touch-target:\s*([0-9.]+)rem/.exec(tokens)
    expect(found, 'tokens.css should declare --touch-target').not.toBeNull()
    return Number(found![1]) * 16
  }

  /** What the deployed Android gate actually measures against. */
  const gateThreshold = (): number => {
    const gate = readFileSync(join(ROOT, 'scripts/android-gate.mjs'), 'utf8')
    const found = /const THUMB = ([0-9]+)/.exec(gate)
    expect(found, 'the Android gate should name its threshold once').not.toBeNull()
    return Number(found![1])
  }

  it('clears the gate’s own threshold with room to spare', () => {
    expect(tokenPx()).toBeGreaterThan(gateThreshold())
  })

  /**
   * A line that sizes something, as opposed to one that names a breakpoint.
   *
   * `@media (min-width: 26rem)` is not a control with a hand-written size on
   * it — it is a statement about the viewport, and the rules inside it are
   * checked on their own lines like any others. This guard's own comment says
   * what it is for: *"a **control** sized by a number written here"*. Reading a
   * media query as one reported the first responsive breakpoint in the
   * repository as a touch target below the gate's threshold, which is the guard
   * being wrong about the layout rather than right about a control.
   */
  const sizesSomething = (line: string): boolean =>
    /min-(?:height|width)\s*:/.test(line) && !/^\s*@(?:media|container)\b/.test(line)

  it('is the only place a target size is written down', () => {
    const offenders: string[] = []
    for (const file of cssFiles()) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (!sizesSomething(line)) return
        if (line.includes('var(--touch-target)')) return
        /*
         * Not every minimum is a touch target — a panel or a chart can have
         * one for its own reasons. What may not happen is a *control* sized by
         * a number written here, because that number is then free to drift
         * below the one the gate measures.
         */
        if (/0|auto|100%|var\(--space/.test(line)) return
        offenders.push(`${repoPath(file)}:${index + 1}: ${line.trim()}`)
      })
    }
    expect(offenders, 'a target size written outside the token').toEqual([])
  })

  it('still bites on a control sized by hand', () => {
    /*
     * The narrowing above is only safe if what it excluded was the media query
     * and nothing else. A guard relaxed to make a failure go away, with nothing
     * proving it still catches what it was written for, is how a gate stops
     * being one.
     */
    expect(sizesSomething('  min-height: 44px;'), 'a hand-written control size').toBe(true)
    expect(sizesSomething('  min-width: 2.75rem;'), 'in either dimension').toBe(true)
    expect(sizesSomething('@media (min-width: 26rem) {'), 'a breakpoint is not a control').toBe(
      false,
    )
    expect(sizesSomething('  min-height: var(--touch-target);'), 'the token is still a size').toBe(
      true,
    )
  })

  it('the gate reports the measurement it tested, unrounded', () => {
    /*
     * The other half of the finding. The failing run's diagnostic said the
     * control was "44px tall" beside a predicate that had just rejected it for
     * being under 44 — because the diagnostic rounded. A gate whose report and
     * whose test state different numbers cannot be acted on.
     */
    const gate = readFileSync(join(ROOT, 'scripts/android-gate.mjs'), 'utf8')
    expect(gate, 'the measured height should be reported in full').toContain('height.toFixed(2)')
    expect(gate, 'a rounded height in a threshold diagnostic').not.toMatch(
      new RegExp(String.raw`Math\.round\([^)]*height`),
    )
    // And one number, read by the name, the predicate and the diagnostic. Two
    // checks used to be named for 44 and assert 40.
    expect(gate, 'a hand-written thumb threshold').not.toMatch(
      new RegExp(String.raw`(?:height|size|smallest)[a-zA-Z.?() ]*>=\s*\d`),
    )
  })
})

describe('how not knowing reads is written down once', () => {
  /*
   * QA-82-008. `UnknownReason` distinguishes six ways of not knowing, and two
   * surfaces then chose their own sentence from `state === 'unknown'` alone.
   * Both chose "never answered", which is true of exactly one of the six: the
   * review export said it of a soreness reading the owner gave at 06:41 and
   * withdrew at 06:55, in a document that printed the withdrawal three
   * sections above.
   *
   * The repair is one exhaustive table beside the type, so this asserts the
   * property that makes it hold — that nobody else writes those words. A
   * seventh reason is then a compile error in one file rather than a seventh
   * thing that silently reads as never having been asked.
   */
  const HOME = 'src/domain/knowledge.ts'

  it('is a table over the reasons, so a new reason cannot be forgotten', () => {
    const home = readFileSync(join(ROOT, HOME), 'utf8')
    expect(home, 'the sentences should be keyed by the reason itself').toContain(
      'Record<UnknownReason, string>',
    )
    expect(home).toContain('export function describeUnknown')
  })

  it('is not hand-written anywhere else', () => {
    const offenders: string[] = []
    for (const file of [...MEANING_LAYER, ...FEATURES, ...LEGACY]) {
      if (repoPath(file) === HOME) continue
      for (const literal of literalsOf(file)) {
        /*
         * The sentence, not the words. "Never answered" is also how the QA
         * laboratory's own headings and this repo's prose talk about the idea,
         * and a scan that forbade the phrase everywhere would be a rule about
         * vocabulary rather than about who decides what an unknown reads as.
         * What is forbidden is a **rendered fact line**: a label, an em dash
         * and one of the six meanings, composed anywhere but the table.
         */
        if (
          /\$\{[^}]*\b(?:label|concept\.label|definition\.label)[^}]*\}\s*—\s*never answered/.test(
            literal,
          )
        ) {
          offenders.push(`${repoPath(file)}: ${literal.slice(0, 80)}`)
        }
      }
    }
    expect(offenders, 'a surface composed its own sentence for an unknown').toEqual([])
  })

  it('bites on a reintroduction of the sentence it forbids', () => {
    // The guard above proves nothing unless it can fail. This is the exact
    // string `compose.ts` and `insights.ts` both held.
    const reintroduced = '${entry.definition.label} — never answered'
    expect(
      /\$\{[^}]*\b(?:label|concept\.label|definition\.label)[^}]*\}\s*—\s*never answered/.test(
        reintroduced,
      ),
    ).toBe(true)
  })
})

describe('a document that withholds rows carries no coordinate into the file', () => {
  /*
   * QA-82-007, round 6, and the last carrier the scoped store could not reach.
   *
   * `withheldFrom` removes private records, entities and unreadable rows, and
   * every count downstream is then honest. What it cannot remove is metadata a
   * *retained* row brought with it: a malformed row keeps its own `index`, and
   * the export printed that as "Record row 19". Insert one private record ahead
   * of it and the same line reads "Record row 20"; insert three and it reads
   * "Record row 22". The text mentions nothing private and the number is a
   * count of what was withheld.
   *
   * Renumbering the survivors is not the answer, and this is the reason rather
   * than a preference: `snapshotFromWire` carries a malformed row's `index`
   * through a backup verbatim, so a restored row's position refers to some
   * previous file's array. Subtracting today's removals from it would produce a
   * number that means nothing.
   *
   * So the coordinate stays on the owner's own screen, where the file is, and
   * the export names the row by what it is. This fails the build if any export
   * file reads the field again.
   */
  it('is not read anywhere under the export', () => {
    const offenders: string[] = []
    for (const file of FEATURES) {
      const path = repoPath(file)
      if (!path.includes('/export/')) continue
      const code = readCode(file)
      if (/\.where\b/.test(code)) offenders.push(`${path} reads a row's position in the file`)
    }
    expect(offenders, 'an export named where a row sits in a file it does not describe').toEqual([])
  })

  it('bites on the line it forbids', () => {
    // The guard above proves nothing unless it can fail. This is what
    // `historySection` held.
    expect(/\.where\b/.test('`${row.where} — ${row.problem}`')).toBe(true)
    expect(/\.where\b/.test("`${row.kind === 'entity' ? 'An entity' : 'A record'}`")).toBe(false)
  })

  it('is still on the owner’s own screen, which is where the file is', () => {
    const screen = readFileSync(join(ROOT, 'src/features/timeline/TimelineScreen.tsx'), 'utf8')
    expect(screen, 'the owner should still be told which row to go and look at').toMatch(
      /row\.where/,
    )
  })
})

/**
 * Every owner-facing input has an accessible name — F40, plan section 37.
 *
 * The reported defect was one field: a bare `<input type="text">` with
 * `placeholder="What's changed"`, in a file that uses `aria-label` correctly
 * three times a few hundred lines away. A second, worse one was directly
 * underneath it with not even a placeholder.
 *
 * The class is not "two fields in `DomainPage.tsx`". It is that nothing in the
 * gate could tell a labelled control from an unlabelled one, so a new form
 * inherits whichever pattern the author happened to copy — and canonical Phase
 * 9 designs repeated components. An unlabelled input inherited into the design
 * system becomes settled design, and Phase 11's accessibility attack would then
 * be re-opening a passed phone gate rather than finding a bug.
 *
 * The rule is the standard one: a control is named by `aria-label`, by
 * `aria-labelledby`, by being wrapped in a `<label>`, or by an `id` some
 * `htmlFor` points at. A placeholder is none of those — it is a hint, it
 * disappears as soon as there is anything in the field, and assistive
 * technology is not required to read it.
 */
describe('F40 — no owner-facing control without a name', () => {
  const CONTROLS = /<(input|textarea|select)\b/g

  /** The attributes of the tag starting at `start`, up to its closing bracket. */
  function attributesAt(text: string, start: number): string {
    let depth = 0
    for (let index = start; index < text.length; index += 1) {
      const char = text[index]
      if (char === '{') depth += 1
      else if (char === '}') depth -= 1
      else if (char === '>' && depth === 0) return text.slice(start, index)
    }
    return text.slice(start)
  }

  /** Whether the control at `start` sits inside an open `<label>`. */
  function insideALabel(text: string, start: number): boolean {
    const before = text.slice(0, start)
    return before.lastIndexOf('<label') > before.lastIndexOf('</label>')
  }

  function unnamedControlsIn(file: string): readonly string[] {
    const text = readFileSync(file, 'utf8')
    const code = codeOnly(text)
    const out: string[] = []
    for (const match of code.matchAll(CONTROLS)) {
      const start = match.index
      const attributes = attributesAt(code, start)
      const line = code.slice(0, start).split('\n').length

      if (/\baria-label\b|\baria-labelledby\b/.test(attributes)) continue
      if (insideALabel(code, start)) continue

      const id = /\bid=\{?([^\s}]+)\}?/.exec(attributes)?.[1]
      /*
       * An id is only a name when something points at it. `htmlFor` is searched
       * in the whole file rather than nearby, because the label and the control
       * are frequently a few lines apart and always in the same component.
       *
       * **Three forms, and the third was missing** — routing 84. It accepted a
       * template literal and a bare expression and not `htmlFor="a-string"`,
       * which is the plainest correct spelling there is and the one a new form
       * reaches for first. A guard that only recognises the shapes somebody has
       * already written is D-179's failure in its mildest form: it does not
       * pass a defect, it fails a repair, and what it teaches an author is to
       * match its habits rather than to name the control.
       *
       * The widening cannot weaken it. Every branch still requires a `htmlFor`
       * that names **this control's own id**; what changed is that three
       * spellings of that are now recognised instead of two, and the
       * reintroduction below still bites.
       */
      if (id !== undefined && code.includes('htmlFor=')) {
        const bare = id.replace(/^[`'"]|[`'"]$/g, '')
        if (
          code.includes(`htmlFor={\`${bare}`) ||
          code.includes(`htmlFor={${id}`) ||
          code.includes(`htmlFor="${bare}"`) ||
          code.includes(`htmlFor='${bare}'`)
        ) {
          continue
        }
      }

      out.push(`${repoPath(file)}:${line} — ${match[1]} with no accessible name`)
    }
    return out
  }

  it('names every input, textarea and select under src/features', () => {
    const offenders = FEATURES.flatMap((file) => unnamedControlsIn(file))
    expect(offenders).toEqual([])
  })

  it('bites on the field that was reported, and on a placeholder standing in for a label', () => {
    /*
     * The guard proves nothing unless it can fail, and the two shapes it has to
     * fail on are the two that were actually in the tree.
     */
    const reported = `
      <div className="domain-correction">
        <input
          type="text"
          className="domain-input"
          value={draft}
          placeholder="What's changed"
          disabled={disabled}
          onChange={(event) => onDraftChange(event.target.value)}
        />
      </div>`
    const nameless = `
      <div className="domain-correction">
        <input type="text" className="domain-input" value={draft} disabled={disabled} />
      </div>`
    const named = `
      <label className="data-field">
        <span>Or paste one</span>
        <textarea value={text} />
      </label>`

    const scan = (jsx: string): number => {
      const code = codeOnly(jsx)
      let found = 0
      for (const match of code.matchAll(CONTROLS)) {
        const attributes = attributesAt(code, match.index)
        if (/\baria-label\b|\baria-labelledby\b/.test(attributes)) continue
        if (insideALabel(code, match.index)) continue
        if (/\bid=/.test(attributes) && code.includes('htmlFor=')) continue
        found += 1
      }
      return found
    }

    expect(scan(reported), 'a placeholder is not a label').toBe(1)
    expect(scan(nameless), 'and nothing at all is certainly not').toBe(1)
    expect(scan(named), 'a wrapped control is named').toBe(0)
  })

  it('does not accept a placeholder as the whole of what the app asks for', () => {
    /*
     * The second half of F40, which a name alone does not satisfy: _"every
     * owner needs to know what the app expects and how the answer will be
     * used."_ Both free-text controls on a domain page now carry a note saying
     * where the answer goes, and this is what stops the note being quietly
     * dropped when the component is next touched.
     */
    /*
     * Both files, because one of the two controls moved — AUD-0038(a).
     *
     * The coverage-status field is now `StandingControls` in `DomainPanels.tsx`,
     * so that Now and the domain page offer the same control rather than two
     * copies of it. Reading only `DomainPage.tsx` would have counted one note
     * and reported the other as dropped, which is the guard being wrong about a
     * move rather than right about a deletion. The rule is unchanged: **there
     * are two free-text corrections and each says what happens to the answer**,
     * wherever the component that draws it lives.
     */
    const files = ['src/features/life/DomainPage.tsx', 'src/features/life/DomainPanels.tsx'].map(
      (path) => readFileSync(join(ROOT, path), 'utf8'),
    )
    const notes = files.flatMap((text) => [...text.matchAll(/domain-correction__note/g)])
    expect(notes.length, 'both free-text corrections say what happens to the answer').toBe(2)
    // The comments explaining the repair quote the attribute, so this reads the
    // code rather than the prose. `codeOnly` is what tells them apart.
    for (const text of files) expect(codeOnly(text)).not.toMatch(/placeholder=/)
  })
})
