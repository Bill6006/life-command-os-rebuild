/**
 * @vitest-environment jsdom
 */

/**
 * Everything the blocker path puts in front of the owner — QA-84-012, D-194.
 *
 * ## Why this file exists, and why it renders
 *
 * D-193 answered QA-84-011 by closing a catalogue over the blocker path, and
 * the catalogue was closed over `blockers.ts` and no further. QA-84-012 found
 * the gap: `BlockersPanel` composes a title, a paragraph and an accessible name
 * in JSX; `ResumePanel` composes a title, two state sentences and an
 * interpolated note. Every word of it is owner-visible. None of it could enter
 * a check that collects the **return values** of `blockerQuestionFor`, so a
 * future-adaptation promise written into any of it would have rendered on the
 * owner's screen with all three gates green.
 *
 * QA's sentence for it: *"A closed catalogue over data returned by `blockers.ts`
 * is not a closed catalogue over what the owner and accessibility tree
 * receive."*
 *
 * **So this renders the surfaces and reads what comes out** — every text-bearing
 * element and every `aria-label` — rather than assembling a set by hand. A
 * seventh string added to one of these panels tomorrow fails here without
 * anybody having thought of it, which is the property the last two attempts did
 * not have.
 *
 * ## And the enumeration of surfaces is structural too
 *
 * A collector over three components somebody listed is one component away from
 * the same defect. `blockerSurfacesInSource()` derives the list from what the
 * components **take** — a prop typed `StandingBlocker`, `BlockerDecision` or
 * `ResumableMove` — and the last test here asserts that the set rendered below
 * is exactly that set.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

/*
 * React only treats `act` as real when this is set; without it every render
 * prints a warning noisy enough to make the assertions harder to trust.
 */
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import {
  adaptationClaims,
  adaptationClaimsOnAnyScreen,
  APPROVED_FROM_RECORDS,
  APPROVED_FROM_SURFACES,
  isApprovedBlockerCopy,
  isApprovedExportShape,
  withoutApprovedNonPromises,
} from '../../scripts/adaptation-claims.mjs'
import { CONCEPT } from '../../src/domain/concepts'
import { BlockersPanel, BlockerQuestion } from '../../src/features/life/DomainPanels'
import { ResumePanel } from '../../src/features/now/NowScreen'
import { BLOCKER_OPTIONS } from '../../src/intelligence/blockers'
import { readable } from '../../src/intelligence/lifecycle'
import { renderRecommendation } from '../../src/domain/recommendation'
import { newRecordId } from '../../src/domain/ids'
import { RECORD_KINDS } from '../../src/domain/records'
import { describeRecord, tagFor, tagOf } from '../../src/features/history/describe'
import { originOf, originOfAll } from '../../src/features/history/origin'
import {
  blockerSurfacesInSource,
  NOT_OWNER_TEXT,
  openJourney,
  recordTextFunctionsInSource,
  recordTextSinksInSource,
  type JourneyApp,
} from './journey'
import { DISCREET_PRIMARY } from '../../src/domain/privacy'
import { DOMAIN } from '../../src/domain/domains'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { assembleDomainPageData, LIFE_PAGES } from '../../src/features/life/domainPages'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { composeFor, contextFor } from './exportHarness'
import { EXPORT_SECTION_IDS, type ExportSectionId } from '../../src/features/export/sections'

const flat = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * What the owner reads, one element at a time.
 *
 * Per element rather than per text node, because a node boundary is not a
 * sentence boundary: `ResumePanel`'s closing note is split into three text
 * nodes around `{readable(state)}`, and a checker reading nodes would ask the
 * catalogue about the fragment *"is a real place to leave something."*
 *
 * The accessibility tree is read with it. QA-84-012 named the withdrawal
 * control's `aria-label` specifically, and it is the clearest case of copy that
 * exists only at render: a template literal that never appears whole anywhere.
 */
function ownerReads(host: HTMLElement): readonly string[] {
  const out: string[] = []
  for (const element of host.querySelectorAll<HTMLElement>('*')) {
    if (element.querySelector('*') !== null) continue
    const text = flat(element.textContent ?? '')
    if (text !== '') out.push(text)
    const label = element.getAttribute('aria-label')
    if (label !== null)
      out.push(`Not true any more: ${flat(label).replace(/^Not true any more: /, '')}`)
  }
  /*
   * An element with children can still hold text of its own — the resume note
   * wraps an interpolation, so its own text lives beside a child. Read those
   * too, or the sentence the interpolation is inside is never asked about.
   */
  for (const element of host.querySelectorAll<HTMLElement>('*')) {
    if (element.querySelector('*') === null) continue
    const direct = [...element.childNodes]
      .filter((node) => node.nodeType === node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
    if (flat(direct) !== '') out.push(flat(element.textContent ?? ''))
  }
  return [...new Set(out)]
}

function render(element: React.ReactNode): readonly string[] {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(element)
  })
  const lines = ownerReads(host)
  act(() => {
    root.unmount()
  })
  host.remove()
  return lines
}

async function eveningIn(): Promise<JourneyApp> {
  const app = await openJourney('the-first-evening')
  for (let taps = 0; taps < 3; taps += 1) {
    const step = app.guide()
    if (step.kind !== 'question' || step.question === undefined) break
    await app.answerGuide(
      step.question.spec.concept === CONCEPT.energy
        ? 'ok'
        : step.question.spec.concept === CONCEPT.soreness
          ? 'none'
          : undefined,
    )
  }
  return app
}

/**
 * The owner's own words and the engine's own sentence, put back as placeholders.
 *
 * The catalogue is of **the app's copy**. A stored cause is his, filed under its
 * own template above; the move sentence is the recommendation renderer's, with
 * its own guards. Leaving either in would make the catalogue a list of every
 * move in the library.
 */
function asTemplate(
  line: string,
  parts: { move?: string; statement?: string; recommendation?: string; state?: string },
): string {
  let out = flat(line)
  if (parts.recommendation !== undefined)
    out = out.split(flat(parts.recommendation)).join('{recommendation}')
  if (parts.statement !== undefined) out = out.split(flat(parts.statement)).join('{statement}')
  if (parts.state !== undefined) out = out.split(parts.state).join('{state}')
  if (parts.move !== undefined) out = out.split(parts.move).join('{move}')
  return flat(out)
}

/** Every surface, every branch, and what each one renders. */
async function everyRenderedString(): Promise<
  readonly { readonly surface: string; readonly line: string }[]
> {
  const out: { surface: string; line: string }[] = []
  const add = (
    surface: string,
    lines: readonly string[],
    parts: Parameters<typeof asTemplate>[1],
  ) => {
    for (const line of lines) out.push({ surface, line: asTemplate(line, parts) })
  }

  // ---- the standing panel on a domain page --------------------------------
  const statement = BLOCKER_OPTIONS['must-stay'].statement('a walk')
  add(
    'BlockersPanel',
    render(
      <BlockersPanel
        blockers={[{ record: 'r1' as never, description: statement, at: 0 as never }]}
        disabled={false}
        onLift={() => undefined}
      />,
    ),
    { statement, move: 'a walk' },
  )

  // ---- the question, and each silence -------------------------------------
  const app = await eveningIn()
  await app.act('unable-now')
  const asked = app.blockerFor()
  if (asked !== undefined) {
    add(
      'BlockerQuestion (asking)',
      render(
        <BlockerQuestion
          decision={asked}
          disabled={false}
          onAnswer={() => undefined}
          onLeave={() => undefined}
        />,
      ),
      { move: 'a walk' },
    )
  }
  for (const detail of [
    'You have already said what was in the way today.',
    'This was a restful thing rather than an effortful one, and there is nothing here worth asking about.',
  ]) {
    add(
      'BlockerQuestion (silent)',
      render(
        <BlockerQuestion
          decision={{ ask: false, because: 'just-asked', detail }}
          disabled={false}
          onAnswer={() => undefined}
          onLeave={() => undefined}
        />,
      ),
      {},
    )
  }

  /*
   * ---- the way back, in every state and with or without a stored cause ----
   *
   * Three walks rather than two. `unable-now` carries a cause; an ordinary
   * `part-done` does not; and a move he could not do, picked up later and left
   * part-finished, carries one **and** is part done — which is the combination
   * the first draft of this catalogued and could not reach.
   */
  for (const state of [
    'unable-now',
    'unable-now-unsaid',
    'part-done',
    'part-done-after-blocker',
    /*
     * And the third resume state — F09, routing 93.
     *
     * A move he pressed **Start** on and never marked finished. The catalogue
     * gained a sentence for it because the `else` arm said *"you said this did
     * not fit at the time"*, which about a move he was in the middle of is
     * false — and a catalogued string nothing renders is a check guarding
     * nothing, which is what this walk is here to stop.
     */
    'started',
  ] as const) {
    const walked = await eveningIn()
    if (state === 'started') {
      expect((await walked.act('start')).done, 'the move could not be started').toBe(true)
      const started = walked.resumable()
      if (started !== undefined) {
        const entities = walked.situation().entities
        const rendered = renderRecommendation(started.semantics, entities)
        add(
          'ResumePanel (started)',
          render(
            <ResumePanel
              resumable={started}
              entities={entities}
              disabled={false}
              onAct={() => undefined}
            />,
          ),
          {
            ...(rendered.ok ? { recommendation: rendered.rendered.sentence } : {}),
            ...(started.blocker === undefined ? {} : { statement: started.blocker }),
            state: readable(started.state),
            move: 'a walk',
          },
        )
      }
      continue
    }
    if (state === 'part-done') await walked.act('start')
    if (state === 'part-done-after-blocker') {
      await walked.act('unable-now')
      /*
       * `too-tired` now, and the change is the enforcement rather than the
       * fixture — for the second time.
       *
       * Routing 92 moved this from `must-stay` to `no-kit`, because C21's
       * concept half took a walk off Now the moment he said he could not leave,
       * leaving nothing to pick up later. Routing 93 is C21's **enforcement**
       * half, and it covers the whole closed list of standing causes: not having
       * the kit and not being where the thing happens now remove the move too.
       *
       * So the combination this branch catalogues — a stored cause **and** a
       * move that comes back — is only reachable through a cause that is about
       * the evening rather than about the world. That is exactly right, and it
       * is the distinction `BLOCKER_OPTIONS.standing` has always drawn: a tired
       * evening is not a standing fact about a man, it writes no constraint, and
       * the move is still his to pick up an hour later.
       */
      await walked.sayWhatBlocked('too-tired')
      await walked.resume('start')
    }
    if (state === 'unable-now' || state === 'unable-now-unsaid') await walked.act('unable-now')
    else await walked.act('part-done')
    /*
     * `unable-now-unsaid` is **Just leave it** — the way out the question always
     * offers. Nothing is recorded about why, so the panel says only where the
     * move was left. It is the ordinary case and the catalogue had it before the
     * walk could reach it.
     */
    if (state === 'unable-now') await walked.sayWhatBlocked('must-stay')
    const move = walked.resumable()
    if (move === undefined) continue
    const entities = walked.situation().entities
    const rendered = renderRecommendation(move.semantics, entities)
    add(
      `ResumePanel (${state})`,
      render(
        <ResumePanel
          resumable={move}
          entities={entities}
          disabled={false}
          onAct={() => undefined}
        />,
      ),
      {
        ...(rendered.ok ? { recommendation: rendered.rendered.sentence } : {}),
        ...(move.blocker === undefined ? {} : { statement: move.blocker }),
        state: readable(move.state),
        move: 'a walk',
      },
    )
  }

  return out
}

describe('QA-84-012 — the catalogue is closed over what the owner receives', () => {
  it('renders only copy that has been approved, on every surface and every branch', async () => {
    /*
     * The reproduction QA gave, inverted: six owner-visible strings answered
     * `false` to `isApprovedBlockerCopy` and no gate asked them the question.
     * Now every string every surface renders is asked.
     */
    const rendered = await everyRenderedString()
    const unapproved = rendered.filter((entry) => !isApprovedBlockerCopy(entry.line))
    expect(
      unapproved.map((entry) => `${entry.surface}: ${entry.line}`),
      'a blocker surface rendered copy nobody approved — add it to APPROVED_BLOCKER_COPY with the reason it is honest',
    ).toEqual([])

    // Not vacuous: the walk really did render every surface and both states.
    const surfaces = new Set(rendered.map((entry) => entry.surface))
    expect([...surfaces].sort()).toEqual([
      'BlockerQuestion (asking)',
      'BlockerQuestion (silent)',
      'BlockersPanel',
      'ResumePanel (part-done)',
      'ResumePanel (part-done-after-blocker)',
      'ResumePanel (started)',
      'ResumePanel (unable-now)',
      'ResumePanel (unable-now-unsaid)',
    ])
  })

  it('and none of it claims the app will change what it offers', async () => {
    /*
     * The classifier over the same rendered strings. It is the secondary net —
     * D-193 says the catalogue is the guarantee — but it is what would catch a
     * promise in the moment somebody wrote one, before the catalogue entry that
     * approves it was added.
     */
    const rendered = await everyRenderedString()
    const claiming = rendered
      .map((entry) => ({ ...entry, claims: adaptationClaims(entry.line) }))
      .filter((entry) => entry.claims.length > 0)
    expect(
      claiming.map((entry) => `${entry.surface}: ${entry.claims.join(' / ')}`),
      'a blocker surface promised an adaptation the engine does not perform',
    ).toEqual([])
  })

  it('and the surfaces are enumerated from what they take, not from a list', async () => {
    /*
     * The other half of QA-84-012, and the one that makes this last rather than
     * hold until somebody adds a fourth panel. A collector over three components
     * somebody remembered is one component away from the same defect, so the
     * list is derived from the props: anything taking a `StandingBlocker`, a
     * `BlockerDecision` or a `ResumableMove` renders blocker copy.
     */
    const inSource = blockerSurfacesInSource()
    expect(inSource.length, 'the instrument found no blocker surfaces at all').toBeGreaterThan(0)

    const rendered = new Set(
      (await everyRenderedString()).map((entry) => entry.surface.replace(/ \(.*\)$/, '')),
    )
    const unrendered = inSource.filter((surface) => !rendered.has(surface.component))
    expect(
      unrendered.map((surface) => `${surface.file}: ${surface.component} takes ${surface.takes}`),
      'a component renders blocker copy and nothing above renders it — add it, or its strings are unchecked',
    ).toEqual([])
  })

  it('and every catalogued string is one some surface can reach', async () => {
    /*
     * The direction that stops the catalogue becoming a drawer. Read together
     * with the same claim in `destination-and-discovery.test.ts`, which walks
     * the library for the strings `blockers.ts` assembles: between them every
     * entry is accounted for by something that renders it.
     */
    const fromSurfaces = new Set((await everyRenderedString()).map((entry) => entry.line))
    const unreached = APPROVED_FROM_SURFACES.filter((line) => !fromSurfaces.has(flat(line)))
    expect(
      unreached,
      'the catalogue lists surface copy nothing renders — remove it, or the check is guarding nothing',
    ).toEqual([])
  })
})

describe('QA-84-013 — and closed over what a record reads as, wherever it is read', () => {
  /**
   * Everything the blocker path writes, and every word any describer gives it.
   *
   * The boundary the Round 4 repair **declared** rather than closed, which is
   * not the same thing. `describeRecord` turns an `action-unable-now` into a
   * sentence, and Timeline, the domain page's "Recently", the correction list
   * and the owner export all render that one sentence — so all four are covered
   * by describing the record, and none of them was covered by rendering a panel.
   *
   * Round 5 proved the gap by changing the lifecycle frame to *"The app will
   * choose something better next time"* and watching 431 tests pass while the
   * owner read the promise.
   */
  async function everyRecordString(): Promise<
    readonly { readonly kind: string; readonly line: string }[]
  > {
    const app = await eveningIn()
    const before = new Set(app.snapshot().records.map((record) => record.id))
    await app.act('unable-now')
    await app.sayWhatBlocked('must-stay')
    const constraint = app.situation().constraints[0]
    if (constraint !== undefined) await app.withdraw(constraint.source, 'Not true any more')

    const written = app.snapshot().records.filter((record) => !before.has(record.id))
    const current = app.situation()
    const context = {
      entities: current.entities,
      history: current.view.history,
      concepts: current.concepts,
      domains: current.domains,
      policy: { surface: 'inspection' as const, revealPrivate: false },
    }

    const object = 'getting out for a walk'
    const statement = BLOCKER_OPTIONS['must-stay'].statement('a walk')
    const recommendation = 'Move for 25 minutes: a walk.'
    const out: { kind: string; line: string }[] = []
    const add = (kind: string, line: string | undefined) => {
      if (line === undefined || line.trim() === '') return
      /*
       * The longest owner-supplied phrase first. History names the move as
       * *"getting out for a walk"*, and replacing the bare move name before
       * that leaves *"getting out for {move}"* — a placeholder for half a
       * phrase, and a catalogue entry nobody could ever write.
       */
      out.push({
        kind,
        line: asTemplate(
          line.split(object).join('{object}').split('Not true any more').join('{reason}'),
          { statement, recommendation },
        ),
      })
    }

    for (const record of written) {
      /*
       * Every describer, not the one somebody remembered. The set is checked
       * against source below, so a fourth is a failure rather than an omission.
       */
      add(record.kind, describeRecord(record, context)?.text)
      add(record.kind, tagOf(record))
      add(record.kind, tagFor(record.kind))
      const origin = originOf(record)
      if (origin !== undefined) {
        add(record.kind, origin.label)
        add(record.kind, origin.detail)
      }
    }
    const shared = originOfAll(written)
    if (shared !== undefined) {
      add('origins', shared.label)
      add('origins', shared.detail)
    }

    /*
     * And the branch where the move no longer resolves, which is the generic
     * sentence rather than the framed one. An `action-unable-now` whose
     * recommendation is not in the history reaches it, and no ordinary walk
     * does — the record is written beside the recommendation it is about.
     */
    const orphan = written.find((record) => record.kind === 'action-unable-now')
    if (orphan !== undefined) {
      add(
        'action-unable-now (unresolvable)',
        describeRecord({ ...orphan, recommendation: newRecordId() }, context)?.text,
      )
    }

    return out
  }

  it('describes every record the blocker path writes in approved words', async () => {
    const described = await everyRecordString()
    const unapproved = described.filter((entry) => !isApprovedBlockerCopy(entry.line))
    expect(
      unapproved.map((entry) => `${entry.kind}: ${entry.line}`),
      'a record was described in words nobody approved — add them to APPROVED_FROM_RECORDS with the reason they are honest',
    ).toEqual([])

    // Not vacuous: the walk really did write the four kinds it is about.
    const kinds = new Set(described.map((entry) => entry.kind))
    for (const kind of ['action-recommendation', 'action-unable-now', 'constraint', 'correction']) {
      expect(kinds, `the walk never wrote a ${kind}`).toContain(kind)
    }
    expect(kinds, 'the unresolvable branch was never reached').toContain(
      'action-unable-now (unresolvable)',
    )
  })

  it('and none of those words claims the app will change what it offers', async () => {
    const described = await everyRecordString()
    const claiming = described
      .map((entry) => ({ ...entry, claims: adaptationClaims(entry.line) }))
      .filter((entry) => entry.claims.length > 0)
    expect(
      claiming.map((entry) => `${entry.kind}: ${entry.claims.join(' / ')}`),
      'a record was described with a promise the engine does not keep',
    ).toEqual([])
  })

  it('and every function that turns a record into words is one of the ones above', () => {
    /*
     * The enumeration QA asked for: *"must discover future record renderers
     * without relying on a hand-maintained list of the four surfaces QA
     * named."* So it is not a list of surfaces at all. It is every exported
     * function in `src/` that takes a `CanonicalRecord`, minus the ones that
     * give the owner no words for it — each named with its reason, the way
     * `NOT_A_CONTROL` and `PROPOSES_ELSEWHERE` are.
     *
     * A fourth describer fails here until somebody classifies it, which is the
     * moment to decide whether its words belong in the catalogue.
     */
    const exercised = ['describeRecord', 'tagOf', 'tagFor', 'originOf', 'originOfAll']
    const unclassified = recordTextFunctionsInSource().filter(
      (found) =>
        !exercised.includes(found.fn) && !NOT_OWNER_TEXT.some((exempt) => exempt.fn === found.fn),
    )
    expect(
      unclassified.map((found) => `${found.file}: ${found.fn}`),
      'a function turns a record into something and no blocker guard asks what it says — exercise it above, or name it in NOT_OWNER_TEXT with the reason it produces no owner text',
    ).toEqual([])

    // And the instrument is reading something: it finds the describers it should.
    const names = recordTextFunctionsInSource().map((found) => found.fn)
    for (const fn of exercised) expect(names, `the instrument cannot see ${fn}`).toContain(fn)
  })

  it('and the record half of the catalogue cannot rot', async () => {
    const described = new Set((await everyRecordString()).map((entry) => entry.line))
    const unreached = APPROVED_FROM_RECORDS.filter((line) => !described.has(flat(line)))
    expect(
      unreached,
      'the catalogue lists record copy nothing describes — remove it, or the check is guarding nothing',
    ).toEqual([])
  })

  it('and the four kinds it is about are still record kinds', () => {
    /*
     * Said out loud so that a fifth — a blocker that becomes something else, an
     * inability that grows a field — is a decision somebody makes rather than a
     * gap that opens quietly.
     */
    for (const kind of ['action-recommendation', 'action-unable-now', 'constraint', 'correction']) {
      expect(RECORD_KINDS, `${kind} is no longer a record kind`).toContain(kind)
    }
  })
})

describe('QA-84-014 — and closed over the value the owner actually reads', () => {
  /**
   * The record kinds the blocker path writes, which are the rows this is about.
   *
   * Named here rather than inferred, and asserted against `RECORD_KINDS` in the
   * QA-84-013 block above so a fifth is a decision rather than a gap.
   */
  const BLOCKER_KINDS = ['action-unable-now', 'constraint', 'correction'] as const

  /**
   * **A sink renders the describer's value. It does not add to it.**
   *
   * That is the whole invariant, and it is the one QA-84-014 broke. D-195
   * catalogued what `describeRecord` *returns*; `assembleTimeline` took that
   * value, appended one more sentence from the same record, and put the result
   * on screen. The catalogue was asked about the honest half.
   *
   * Comparing the final value against the describer's own output needs no
   * normalisation, no placeholders and no second catalogue: any composition at
   * all — a promise, a helpful clause, a stray full stop — makes them differ.
   */
  function timelineContext(situation: ReturnType<typeof assembleSituation>) {
    return {
      entities: situation.entities,
      history: situation.view.history,
      concepts: situation.concepts,
      domains: situation.domains,
      policy: DISCREET_PRIMARY,
    }
  }

  function inspectionContext(
    situation: ReturnType<typeof assembleSituation>,
    revealPrivate: boolean,
  ) {
    return {
      entities: situation.entities,
      history: situation.view.history,
      concepts: situation.concepts,
      domains: situation.domains,
      policy: { surface: 'inspection' as const, revealPrivate },
    }
  }

  function everyScenario() {
    return SCENARIOS.map((entry) => {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const view = buildView(loaded.snapshot, moment)
      return { id: entry.id, situation: assembleSituation(view, moment), view }
    })
  }

  it('Timeline shows what the describer said, and nothing appended to it', () => {
    /*
     * QA's exact mutation site. It read
     *
     *     text: record.kind === 'action-unable-now'
     *       ? `${described.text} The app will choose something better next time.`
     *       : described.text,
     *
     * and 118 tests passed while the promise rendered.
     */
    const composed: string[] = []
    let checked = 0
    for (const { id, situation, view } of everyScenario()) {
      const context = timelineContext(situation)
      const byId = new Map(view.history.effective.map((record) => [record.id, record]))
      for (const day of assembleTimeline(situation, 500).days) {
        for (const entry of day.entries) {
          const record = byId.get(entry.id)
          if (record === undefined || !BLOCKER_KINDS.includes(record.kind as never)) continue
          const described = describeRecord(record, context)
          if (described === undefined) continue
          checked += 1
          if (entry.text !== described.text) {
            composed.push(`${id}: “${entry.text}” for a describer that said “${described.text}”`)
          }
          if (entry.tag !== described.tag) {
            composed.push(`${id}: tag “${entry.tag}” for a describer that said “${described.tag}”`)
          }
        }
      }
    }
    expect(
      composed,
      'a Timeline row says more than the describer did — a sink may render a described record and may not add to it',
    ).toEqual([])
    expect(checked, 'no blocker row was checked, so nothing was proved').toBeGreaterThan(0)
  })

  it('and so do the domain page’s recent list and its correction list', () => {
    /*
     * The class rather than the case. QA put the promise in Timeline; the same
     * append in either of these would have been just as invisible, and both
     * take a `Situation` rather than a record, so neither is discoverable by
     * looking for describers.
     */
    const composed: string[] = []
    let checked = 0
    for (const { id, situation, view } of everyScenario()) {
      const byId = new Map(view.history.effective.map((record) => [record.id, record]))
      for (const page of LIFE_PAGES) {
        const data = assembleDomainPageData(situation, page)
        const context = inspectionContext(situation, page.domains.includes(DOMAIN.privateHealth))
        for (const [what, rows] of [
          ['recent', data.recentChanges],
          ['correctable', data.correctable],
        ] as const) {
          for (const row of rows) {
            const record = byId.get(row.id)
            if (record === undefined || !BLOCKER_KINDS.includes(record.kind as never)) continue
            const described = describeRecord(record, context)
            if (described === undefined) continue
            checked += 1
            if (row.text !== described.text) {
              composed.push(
                `${id} ${page.slug} ${what}: “${row.text}” for a describer that said “${described.text}”`,
              )
            }
          }
        }
      }
    }
    expect(composed, 'a domain page row says more than the describer did').toEqual([])
    expect(checked, 'no blocker row was checked on any domain page').toBeGreaterThan(0)
  })

  it('and the export carries the describer’s sentence with nothing added anywhere', async () => {
    /*
     * QA-84-017, and the two vacuities it named.
     *
     * The old check took the **one** line found by
     * `text.split('\n').find((row) => row.includes(described.text))`, validated
     * its shape, and looked no further. So a second bullet pushed beside the
     * approved one — *"The app will choose something better next time."* — was
     * never inspected, and 441 tests passed with that promise in the owner's
     * export. And when no line matched a record it `continue`d in silence, so
     * the closing `checked > 0` proved only that *some* blocker line existed
     * somewhere.
     *
     * Three claims now, and none of them selects a single line:
     *
     * 1. **every** line of the document is free of adaptation claims;
     * 2. the history section holds **exactly one bullet per timeline entry** —
     *    an added bullet is a count mismatch whatever it says;
     * 3. every blocker record's line is **found**, and its shape approved.
     */
    const offenders: string[] = []
    let checked = 0
    for (const entry of SCENARIOS) {
      const { situation, loaded } = contextFor(entry.id)
      const id = entry.id
      const blockers = loaded
        .view()
        .history.effective.filter((record) => BLOCKER_KINDS.includes(record.kind as never))
      if (blockers.length === 0) continue
      /*
       * **Every document the owner can select**, not the one this check used to
       * compose - QA-84-021.
       *
       * Round 8 asserted "every line of the document is free of adaptation
       * claims" and then composed ['history']. There are ten selectable
       * sections and ten composers; Round 9 put the promise in
       * correctionsSection() and the whole suite - 1,860 tests - stayed green,
       * with the sentence sitting in a document the owner can produce from the
       * Data screen in two taps.
       *
       * The list is EXPORT_SECTION_IDS, which is what the product itself
       * offers, so an eleventh section is covered by existing. Each is composed
       * alone and all of them are composed together, because a composer can
       * also write something only when it is asked for beside another.
       */
      /*
       * Every section, on every history — the content half.
       */
      const everySelection: readonly (readonly ExportSectionId[])[] = [
        ...EXPORT_SECTION_IDS.map((one) => [one] as readonly ExportSectionId[]),
        EXPORT_SECTION_IDS,
      ]
      for (const selection of everySelection) {
        const document = composeFor(entry.id, selection).text
        for (const line of document.split('\n')) {
          /*
           * The **app-wide** calibration here, and the blocker-path one below
           * on the history document, for exactly the reason D-198 gives.
           *
           * `adaptationClaims` counts a bare `it` as the app and reads ability
           * as modality, which is right for the short controlled copy the
           * blocker path writes and wrong for Overview, whose job is to
           * describe the whole product in prose. Run over it, the narrow rule
           * flags a dozen honest sentences. **Narrowing the shared rule until
           * that stopped would be tuning a guard to pass** — so the rule that
           * runs over arbitrary product prose is the one already written for
           * arbitrary product prose: a named subject and futurity, never
           * ability. It catches Round 9's exact mutation, and the three
           * wordings it misses are the three D-198 names.
           */
          for (const claim of adaptationClaimsOnAnyScreen(withoutApprovedNonPromises(line))) {
            offenders.push(`${id}: the ${selection.join('+')} export claims “${claim}”`)
          }
        }
      }

      const text = composeFor(entry.id, ['history']).text
      const lines = text.split('\n')

      // 1. Nothing anywhere in the document promises an adaptation.
      for (const line of lines) {
        for (const claim of adaptationClaims(line)) {
          offenders.push(`${id}: a line of the export claims “${claim}”`)
        }
      }

      /*
       * 2. One bullet per entry, counted rather than sampled.
       *
       * The history is written as day blocks — a bolded label with its date,
       * then one bullet per entry — so the bullets that follow a day label are
       * exactly the entries. `assembleTimeline` is what those blocks are built
       * from, so the two numbers are the same number, or somebody has added a
       * line. Counting every bullet in the document instead would sweep in the
       * "About this document" list, which is what a first draft of this did.
       */
      const shown = assembleTimeline(situation).days.reduce(
        (total, day) => total + day.entries.length,
        0,
      )
      let inDay = false
      let bullets = 0
      for (const line of lines) {
        if (/^\*\*.+\*\* \(\d{4}-\d{2}-\d{2}\)$/.test(line)) {
          inDay = true
          continue
        }
        if (!inDay) continue
        if (line.startsWith('- ')) bullets += 1
        else if (line.trim() !== '') inDay = false
      }
      if (bullets !== shown) {
        offenders.push(`${id}: the day blocks hold ${bullets} bullets for ${shown} entries`)
      }

      // 3. Every blocker record is reached, and its line is a shape somebody approved.
      for (const record of blockers) {
        const described = describeRecord(record, inspectionContext(situation, false))
        if (described === undefined) continue
        const line = lines.find((row) => row.includes(described.text))
        if (line === undefined) {
          /*
           * Not a silent `continue`. A record the export cannot show is a fact
           * about the export, and the old loop swallowed it — which is how a
           * check can pass while covering nothing.
           */
          offenders.push(`${id}: no export line carries “${described.text}”`)
          continue
        }
        checked += 1
        const origin = originOf(record)
        let shape = line.split(described.text).join('{text}')
        if (origin !== undefined) shape = shape.split(origin.label).join('{origin}')
        shape = shape.split(described.tag).join('{tag}')
        shape = shape.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '{day}')
        if (!isApprovedExportShape(shape)) {
          offenders.push(`${id}: export line shape “${shape}” is not one anybody approved`)
        }
      }
    }
    expect(offenders, 'the export says more about a blocker than the describer did').toEqual([])
    expect(checked, 'no blocker line was found in any export').toBeGreaterThan(0)
  })

  it('and every sink that reads a described record is one of the three above', () => {
    /*
     * The enumeration, and why it is by **import** rather than by type. A sink
     * takes whatever it takes — `assembleTimeline` takes a `Situation`, the
     * domain assembler takes a page, the export takes a request — so nothing
     * about its signature says it renders a record. What every one of them must
     * do is import `describeRecord`, because that is the only way to have a
     * described record at all.
     *
     * A fourth sink is discovered the moment it exists.
     */
    const exercised = [
      '/src/features/timeline/timelineEntries.ts',
      '/src/features/life/domainPages.ts',
      '/src/features/export/compose.ts',
    ]
    const unexercised = recordTextSinksInSource().filter((sink) => !exercised.includes(sink.file))
    expect(
      unexercised.map((sink) => sink.file),
      'a file reads a described record and no guard asks what it does with it — walk it above',
    ).toEqual([])

    // And the instrument is reading something rather than returning nothing.
    const found = recordTextSinksInSource().map((sink) => sink.file)
    for (const file of exercised) expect(found, `the instrument cannot see ${file}`).toContain(file)
  })
})

describe('QA-84-025 — and over every document the owner can select', () => {
  it('walks every selection on every history', { timeout: 600_000 }, async () => {
    /*
     * Ten checkboxes are **1,023 documents**, and the owner produces any of
     * them with taps.
     *
     * Round 9's guard composed each section alone and all ten together and
     * called that every document. Round 10 added a sentence that appears only
     * when exactly `overview` and `corrections` are ticked; that document was
     * never composed, and the suite stayed green with the promise in it.
     * **"Singles plus the whole thing" is two shapes out of a space of a
     * thousand**, which is the same error as reading one navigation surface or
     * one DOM leaf: the sample was mistaken for the set.
     *
     * ## Why the selection space is walked here and the content space is not
     *
     * A rule keyed on the *selection* lives in `composeExport`, which is handed
     * a selection and a situation — so which sections were ticked is decided
     * there, the same way for every history. That space is small enough to walk
     * exactly, so it is walked exactly, on a history that **exercises the
     * blocker path**, so a rule keyed on both a selection and a blocker record
     * has something to fire on.
     *
     * A rule keyed on the *content* of a section lives in that section's
     * composer, and the case above walks every section on every history. The
     * two together are what "every document" means; neither is a sample of the
     * other.
     */
    /*
     * **Every selection on every history** — QA-84-030.
     *
     * Round 10 walked all 1,023 selections on one blocker-bearing history, and
     * every section on every history, and called the pair complete. Round 11
     * added a sentence that appears only for `overview`+`corrections` AND when
     * the record holds a `context` entry — a scenario the selection walk never
     * used. **Exhaustive coverage of each axis separately is not exhaustive
     * coverage of their product**, which is the same error as reading one
     * navigation surface, one leaf, or the endpoints of a selection: a
     * projection mistaken for the space.
     *
     * So the product is walked: every non-empty selection, on every history.
     * That is 1,023 x the library, which is large but finite, and finite is the
     * whole argument — there is no sampling left to be wrong about.
     */
    const offenders: string[] = []
    const total = 2 ** EXPORT_SECTION_IDS.length - 1
    for (const entry of SCENARIOS) {
      /*
       * The distinct lines first, then the classifier.
       *
       * A section's text is identical in every document that contains it, so
       * across 1,023 selections the same line arrives hundreds of times.
       * Classifying the set instead of the stream is the difference between a
       * gate that runs and one that starves the worker's heartbeat — which is
       * how the first version of this failed: 15 passed, exit 1.
       */
      const lines = new Set<string>()
      for (let mask = 1; mask <= total; mask += 1) {
        const selection = EXPORT_SECTION_IDS.filter((_id, at) => (mask >> at) & 1)
        for (const line of composeFor(entry.id, selection).text.split('\n')) {
          if (line.trim() !== '') lines.add(line)
        }
        // Let the runner breathe; a synchronous minute looks like a hung worker.
        if (mask % 64 === 0) await new Promise((resume) => setTimeout(resume, 0))
      }

      for (const line of lines) {
        for (const claim of adaptationClaimsOnAnyScreen(withoutApprovedNonPromises(line))) {
          offenders.push(`${entry.id}: “${claim}”`)
        }
      }
    }

    expect(
      offenders.slice(0, 5),
      'a document the owner can select claims the app will change what it offers',
    ).toEqual([])
    expect(total, 'the selection space is not the power set of the sections').toBe(1023)
  })
})

describe('QA-84-018 — and the host inventory that claimed too much is gone', () => {
  it('is replaced by the route sweep, which is where the claim now lives', () => {
    /*
     * `blockerHostsInSource()` found hosts by the literal JSX tag, and Round 8
     * defeated it with `import { BlockerQuestion as Surface }`. A list of
     * imports, of prop types, or of any other spelling would have gone the same
     * way: **a component can be named anything.**
     *
     * Round 8 offered the alternative in as many words — *"or the proof must
     * stop claiming exhaustive host discovery"* — and that is what happened. The
     * instrument is deleted rather than narrowed, because a narrowed version
     * would still read as an inventory and still be wrong, and the coverage
     * claim moved to `phase84.spec.ts`, which walks **every screen the owner can
     * reach** and compares it against the same screens before the block. A
     * screen cannot be aliased.
     *
     * This case exists so the removal is deliberate and visible rather than a
     * gap somebody has to notice.
     */
    const journey = readFileSync(join(process.cwd(), 'tests/synthetic/journey.ts'), 'utf8')
    expect(
      /export function blockerHostsInSource/.test(journey),
      'the unsound host inventory is back — the route sweep in phase84.spec.ts is the coverage claim',
    ).toBe(false)
  })
})
