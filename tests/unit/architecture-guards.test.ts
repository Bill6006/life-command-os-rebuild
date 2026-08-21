import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
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
    'growth',
    'insights',
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
    { near: 'Exports, backup and restore are not built yet', because: 'Phase 7' },
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
    expect(REBUILD_PHASE.number).toBe(6)
    expect(REBUILD_PHASE.title).toBe('Timeline and Insights')
    expect(REBUILD_PHASE.summary).not.toMatch(/domain pages? behind life are next/i)
    // QA-B1's own lesson, one phase on: the sentence describing what the build
    // does may not still be describing the phase before it.
    expect(REBUILD_PHASE.summary).not.toMatch(/timeline and insights are next/i)
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
      // produces one. Both are how a bare figure gets onto a screen.
      if (/'[^']*%[^']*'|"[^"]*%[^"]*"|`[^`]*%[^`]*`/.test(code)) {
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
