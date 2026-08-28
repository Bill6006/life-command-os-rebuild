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
  APPROVED_FROM_SURFACES,
  isApprovedBlockerCopy,
} from '../../scripts/adaptation-claims.mjs'
import { CONCEPT } from '../../src/domain/concepts'
import { BlockersPanel, BlockerQuestion } from '../../src/features/life/DomainPanels'
import { ResumePanel } from '../../src/features/now/NowScreen'
import { BLOCKER_OPTIONS } from '../../src/intelligence/blockers'
import { readable } from '../../src/intelligence/lifecycle'
import { renderRecommendation } from '../../src/domain/recommendation'
import { blockerSurfacesInSource, openJourney, type JourneyApp } from './journey'

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
  ] as const) {
    const walked = await eveningIn()
    if (state === 'part-done') await walked.act('start')
    if (state === 'part-done-after-blocker') {
      await walked.act('unable-now')
      await walked.sayWhatBlocked('must-stay')
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
