import type { ReactNode } from 'react'
import './ui.css'

export function Screen({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string
  title: string
  lede?: string
  children?: ReactNode
}) {
  return (
    <div className="screen">
      <header className="screen__header">
        {eyebrow ? <span className="screen__eyebrow">{eyebrow}</span> : null}
        <h1 className="screen__title">{title}</h1>
        {lede ? <p className="screen__lede">{lede}</p> : null}
      </header>
      {children}
    </div>
  )
}

/**
 * How much presence a surface has, and it is decided by what the surface is.
 *
 * ## The problem this exists to answer — routing 90, section 54's "card soup"
 *
 * Every panel on a domain page was the same panel: same gradient, same
 * hairline, same radius, same shadow, eight or nine of them down a phone
 * screen. Every sentence on them was true and the screen was flat, so the owner
 * had to read each one to find out which was a decision to act on, which was a
 * reading of his record, and which was the app saying it had not worked
 * something out yet. That is exactly the reject on section 54's list, and it is
 * a hierarchy failure rather than a decoration failure — which is why the answer
 * is one axis with three values and not a palette.
 *
 * - `loud` — the current decision. `PrimarySurface` already holds this and
 *   there is one per screen.
 * - `plain` — the ordinary surface. Most things.
 * - `quiet` — what the app has **not** settled: gathering lines, an area that
 *   has gone silent, a part of a destination the owner has not stated. It sits
 *   back rather than forward, because a surface that is loud about not knowing
 *   something is the app talking about itself (D-075's lesson).
 *
 * A tone is never a judgement about the owner and never an amount. It says how
 * settled the *app* is, so nothing here can become a score through the back
 * door (D-162) — there is no value it can take that means "more" or "better".
 */
export type SurfaceTone = 'plain' | 'quiet'

export function Panel({
  title,
  tone = 'plain',
  testId,
  children,
}: {
  title?: string
  tone?: SurfaceTone
  testId?: string
  children: ReactNode
}) {
  return (
    <section
      className={tone === 'quiet' ? 'panel panel--quiet' : 'panel'}
      data-tone={tone}
      {...(testId === undefined ? {} : { 'data-testid': testId })}
    >
      {title ? <h2 className="panel__title">{title}</h2> : null}
      <div className="panel__body">{children}</div>
    </section>
  )
}

/**
 * What kind of thing this is — routing 90, package 90.2.
 *
 * ## Why a product needs this at all
 *
 * Canonical section 54: *"A completed session, a completed course and a
 * milestone are three different things on the page."* Routing 84 built all
 * three and gave them one typeface, one weight and one colour, so the page was
 * literally true and told the owner nothing about what he was looking at. A
 * milestone had an eyebrow; nothing else did; and the eyebrow was written out
 * inside the one component that used it.
 *
 * ## Why it is typographic and has no colour
 *
 * A coloured badge per kind is the fastest route to two of section 24's
 * rejects at once — gamer RGB and tiny telemetry labels — and a worse one: a
 * set of coloured markers on progress objects reads as a ranking of them, which
 * is a score wearing a costume. **These are unordered, uncoloured and all the
 * same size.** Nothing here can say a milestone is worth more than a session.
 * What it says is that they are not the same kind of thing.
 *
 * The vocabulary is closed on purpose. A kind that is not in the union is a
 * compile error rather than a marker nobody designed.
 */
export type ObjectKindName =
  | 'destination'
  | 'milestone'
  | 'goal'
  | 'session'
  | 'course'
  | 'evidence'
  | 'correction'
  | 'permission'

const KIND_WORDS: Record<ObjectKindName, string> = {
  destination: 'Destination',
  milestone: 'Milestone',
  goal: 'Goal',
  session: 'Session',
  course: 'Course',
  evidence: 'Evidence',
  correction: 'Correction',
  permission: 'Permission',
}

/**
 * What the app is not assuming, as a set rather than as a sentence — QA-91-004.
 *
 * ## The finding
 *
 * *"More money"* leaves six things unconcluded: three the **words** did not say
 * and three the **destination** has not been told. Rendered as one comma-run
 * they became a seven-line paragraph on a 360-wide phone, inside a card that
 * already carried a question, a reading, two option rows and a confirmation.
 * Every item was true and the set was not scannable, so an honest admission
 * read as a disclaimer.
 *
 * ## What changed, and what deliberately did not
 *
 * **Every unknown survives.** None is dropped, summarised or capped: the whole
 * point of `unknowns` is that it is explicit, and a shorter list would be a
 * quieter lie. What changed is that the two halves are named and each is a
 * list, so the owner can see *which of these came from what I wrote* at a
 * glance and skip the half he does not care about.
 *
 * **And it is still not a question.** Six unknowns are not six prompts. Nothing
 * here is answerable in place; D-184's one-question-at-a-time budget is
 * untouched, and a card that offered a box per row would be the questionnaire
 * D-163 forbids by name.
 */
export function UnknownSet({
  fromWords,
  fromObject,
  testId,
}: {
  fromWords: readonly string[]
  fromObject: readonly string[]
  testId: string
}) {
  if (fromWords.length === 0 && fromObject.length === 0) return null
  return (
    <div className="unknowns" data-testid={testId}>
      {fromWords.length === 0 ? null : (
        <>
          <p className="unknowns__label">These words do not say</p>
          <ul className="unknowns__list">
            {fromWords.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      {fromObject.length === 0 ? null : (
        <>
          <p className="unknowns__label">And the app has not been told</p>
          <ul className="unknowns__list">
            {fromObject.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function ObjectKind({ kind }: { kind: ObjectKindName }) {
  return (
    <span className="kind" data-kind={kind} data-testid={`kind-${kind}`}>
      {KIND_WORDS[kind]}
    </span>
  )
}

export function PrimarySurface({
  eyebrow,
  headline,
  children,
}: {
  eyebrow: string
  headline: string
  children?: ReactNode
}) {
  return (
    <section className="primary-surface">
      <span className="primary-surface__eyebrow">{eyebrow}</span>
      <h2 className="primary-surface__headline">{headline}</h2>
      {children ? <div className="primary-surface__body">{children}</div> : null}
    </section>
  )
}

export function Rows({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <dl className="rows" {...(testId === undefined ? {} : { 'data-testid': testId })}>
      {children}
    </dl>
  )
}

export function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rows__row">
      <dt className="rows__key">{label}</dt>
      <dd className={mono ? 'rows__value rows__value--mono' : 'rows__value'}>{value}</dd>
    </div>
  )
}

export function List({ items }: { items: string[] }) {
  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item} className="list__item">
          {item}
        </li>
      ))}
    </ul>
  )
}
