import type { ReactNode } from 'react'
import type { RecordId } from '../../domain/ids'
import type {
  EvidenceLine,
  GatheringLine,
  MeasuredRate,
  PatternConfidence,
} from '../../intelligence/insights'
import type { RecordOrigin } from '../history/origin'
import './evidence.css'

/**
 * The pieces of a deeper evidence view, shared by Insights and by Now.
 *
 * **This file is the only place in any owner surface that prints a percentage.**
 * That is a rule with a guard behind it
 * (`tests/unit/architecture-guards.test.ts`), and the reason is section 51's:
 *
 * > Any percentage must identify the quantity it measures. Do not merge direct
 * > result, downstream effect, comfort/friction, or follow-through into one
 * > generic success statistic.
 *
 * A rule about how numbers are worded cannot be kept by everyone remembering it
 * at every call site. It can be kept by there being exactly one component that
 * can render one, which takes the whole `MeasuredRate` — so the figure, the
 * sentence naming what it measures, and the count it is over cannot be
 * separated on the way to the screen. Rendering the figure without its sentence
 * is not something a caller is able to do.
 *
 * The counts travel with the percentage for the same reason. "80%" is a
 * measurement; "80% — 4 of 5" is an honest report of five evenings, and section
 * 22 forbids the first when only the second is true.
 */

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

export function EvidenceRate({ rate }: { rate: MeasuredRate }) {
  return (
    <div className="ev-rate" data-aspect={rate.aspect}>
      <p className="ev-rate__measures">{capitalise(rate.measures)}</p>
      {rate.percent === undefined ? (
        /*
         * The honest state, and it is a state rather than an absence.
         *
         * Section 51: "weak evidence produces an honest 'not enough evidence
         * yet' state rather than invented precision". The count still shows,
         * so the owner can see how far off it is instead of wondering whether
         * the app has forgotten about it.
         */
        <p className="ev-rate__withheld" data-testid="ev-withheld">
          {capitalise(rate.withheld ?? 'not enough to say')}
          {rate.of === 0 ? '' : ` (${rate.hit} of ${rate.of} so far)`}
        </p>
      ) : (
        <p className="ev-rate__figure">
          <strong className="ev-rate__percent">{rate.percent}%</strong>
          <span className="ev-rate__of">
            {' '}
            — {rate.hit} of {rate.of}
          </span>
        </p>
      )}
    </div>
  )
}

export function EvidenceConfidence({ confidence }: { confidence: PatternConfidence }) {
  return (
    <p className="ev-confidence" data-testid="ev-confidence">
      <span className="ev-confidence__word">{capitalise(confidence.word)}</span>
      <span className="ev-confidence__because"> · {confidence.because}</span>
    </p>
  )
}

/**
 * A piece of evidence, and where it came from (QA-08-001).
 *
 * `originFor` is passed in rather than resolved here, because this component
 * knows about lines and not about history — and because the caller is the one
 * that already holds the view. It is optional so a caller with nothing to
 * resolve against renders exactly what it used to.
 *
 * This is the deepest surface the fix reaches, and the one that matters most
 * for a claim: a figure supported by evidence the owner did not record is a
 * different figure from one supported by evidence he did, and the panel that
 * exists to show what a number rests on is the last place that should leave it
 * out.
 */
export function EvidenceLines({
  title,
  lines,
  limit = 6,
  originFor,
}: {
  title: string
  lines: readonly EvidenceLine[]
  limit?: number
  originFor?: (record: RecordId) => RecordOrigin | undefined
}) {
  if (lines.length === 0) return null
  const shown = lines.slice(0, limit)
  const rest = lines.length - shown.length

  return (
    <div className="ev-block">
      <p className="ev-block__title">{title}</p>
      <ul className="ev-list">
        {shown.map((line) => {
          const origin = originFor?.(line.record)
          return (
            <li key={line.record}>
              {line.text}{' '}
              {origin === undefined ? null : (
                <span className="origin-badge" data-testid="ev-origin" title={origin.detail}>
                  {origin.label}
                </span>
              )}
            </li>
          )
        })}
        {rest > 0 ? <li className="ev-list__more">and {rest} more</li> : null}
      </ul>
    </div>
  )
}

export function EvidenceNote({
  title,
  children,
  testId,
}: {
  title: string
  children: ReactNode
  /** Set only where a browser test has to find one block among several. */
  testId?: string
}) {
  return (
    <div className="ev-block" {...(testId === undefined ? {} : { 'data-testid': testId })}>
      <p className="ev-block__title">{title}</p>
      <div className="ev-block__body">{children}</div>
    </div>
  )
}

/**
 * What the app has not settled yet — AUD-0043.
 *
 * Insights has rendered this since Phase 6 and rendered it well; a domain page
 * now asks the same question about one area, and the audit's requirement is
 * that the two come from one read so they cannot diverge. One component and one
 * class is the version of that a reader can check by looking.
 *
 * Deliberately one quiet list rather than a card each. Nine cards saying nothing
 * is a wall, and this is the part of a screen that should be dull: it makes no
 * claim, so nothing here should look like one.
 */
export function GatheringList({ lines }: { lines: readonly GatheringLine[] }) {
  return (
    <ul className="gathering" data-testid="gathering">
      {lines.map((line) => (
        <li key={line.subject} className="gathering__row">
          <span className="gathering__subject">{line.subject}</span>
          <span className="gathering__needs">
            {line.occasions} so far — {line.needs}
          </span>
        </li>
      ))}
    </ul>
  )
}
