import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel, Screen } from '../../components/ui'
import { systemClock } from '../../domain/time'
import { beliefCorrectionRecord, describeBelief } from '../../intelligence/corrections'
import { insightsFor, type Insight } from '../../intelligence/insights'
import type { EntityIndex } from '../../domain/entities'
import type { RecordId } from '../../domain/ids'
import { assembleSituation } from '../../intelligence/situation'
import { Discovery } from './Discovery'
import {
  EvidenceConfidence,
  EvidenceLines,
  EvidenceNote,
  EvidenceRate,
  GatheringList,
} from '../evidence/EvidencePieces'
import { originOfSources, originResolver, type RecordOrigin } from '../history/origin'
import { useMemory } from '../memory/memoryContext'
import './InsightsScreen.css'

/**
 * Insights — what the system is learning (canonical plan sections 27 and 51).
 *
 * Section 51's goal is one sentence and the whole design follows from it: make
 * memory and learning visible *without turning the normal experience into a
 * statistics dashboard*. So the first view of every card is a sentence, and the
 * machinery is behind one tap.
 *
 * ## Why the detail is closed
 *
 * Not for tidiness. Section 27 says "do not display research machinery by
 * default", and section 51 says the deeper view must not be "forced into the
 * first view". A card that opened with its counts would be a screen of numbers
 * the owner has to translate — which is the thing this surface is most likely
 * to become, and the thing section 24 rules out under "endless tiny metrics".
 * The closed-until-tapped pattern is the one the domain pages already use
 * (Phase 5), reused rather than reinvented.
 *
 * ## Why there is a correction on a card and not on Timeline
 *
 * A card here states a conclusion, and section 62 requires a learned pattern to
 * be correctable — a belief the owner cannot disagree with is a belief he
 * cannot correct. It writes the same `belief-correction` Now already writes
 * from beside the decision, so a disagreement recorded here is the same
 * watershed and is read by the same learner. Cards that report a *reading*
 * rather than a conclusion — a coverage gap, a run of numbers, a standing
 * arrangement — carry no correction, because there is nothing there to
 * disagree with.
 *
 * ## What this surface never does
 *
 * It never recommends anything. There is one arbitration path (section 17.2)
 * and it is on Now; `insightsFor` cannot reach the generator, the evaluator or
 * the arbiter, and a guard fails the build if that changes.
 */
export function InsightsScreen() {
  const memory = useMemory()
  const [open, setOpen] = useState<string | undefined>(undefined)
  const [working, setWorking] = useState(false)
  const inFlight = useRef(false)

  const situation = useMemo(() => {
    if (!memory.ready) return undefined
    return assembleSituation(memory.view, {
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
    })
  }, [memory.ready, memory.view, memory.now, memory.zone, memory.weekStartsOn])

  const report = useMemo(
    () => (situation === undefined ? undefined : insightsFor(situation)),
    [situation],
  )

  const correct = useCallback(
    (belief: string) => {
      if (inFlight.current) return
      inFlight.current = true
      setWorking(true)
      void memory
        .append([
          beliefCorrectionRecord(belief, 'reject', 'The owner said this is not right', {
            now: memory.now,
            zone: memory.zone,
            recordedAt: systemClock().now(),
          }),
        ])
        .finally(() => {
          inFlight.current = false
          setWorking(false)
        })
    },
    [memory],
  )

  if (!memory.ready || report === undefined || situation === undefined) {
    return (
      <Screen title="Insights">
        {/* The app talking about itself while it opens — quiet, always. */}
        <Panel tone="quiet">
          <p className="note">Opening your history…</p>
        </Panel>
      </Screen>
    )
  }

  const busy = working || memory.busy
  const { insights, gathering } = report

  return (
    <Screen title="Insights" lede="What the app has worked out about how your life actually goes.">
      {/*
        And the other half of the same subject — F02, D-163, D-169.

        What the app has worked out sits below; this is what it has not, and
        what it would ask one question a week to find out. It is first because
        it is the shorter of the two and because a screen about understanding
        should say what it is missing before it says what it has.
      */}
      <Discovery situation={situation} />

      {insights.length === 0 ? (
        <Panel title="Nothing worth saying here yet" tone="quiet">
          {/*
            An honest empty state, and carefully not a claim that the app is
            not learning — it is, on every answer given. What is missing is
            enough comparable occasions for anything said here to be worth
            relying on, which is a different sentence and a true one.
          */}
          <p>
            Patterns come from comparable occasions: the same kind of move, in the same kind of
            occasion, with what came of it recorded. There is not enough of that here to say
            anything you could lean on.
          </p>
          <p className="note">
            Nothing needs doing about this. It fills in through ordinary use — a suggestion taken,
            and an answer to what came of it.
          </p>
        </Panel>
      ) : (
        insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            entities={memory.view.entities}
            originFor={originResolver(memory.view.history)}
            open={open === insight.id}
            disabled={busy}
            onToggle={() => setOpen((held) => (held === insight.id ? undefined : insight.id))}
            onCorrect={correct}
          />
        ))
      )}

      {gathering.length === 0 ? null : (
        <Panel title="Still gathering" tone="quiet">
          {/*
            Section 51: "the absence of enough evidence is a valid result".
            Without this the honest answer is invisible — a move with two
            occasions simply produces no card, which reads as the app having
            nothing to say rather than as the app declining to say it.
          */}
          <GatheringList lines={gathering} />
        </Panel>
      )}
    </Screen>
  )
}

function InsightCard({
  insight,
  entities,
  open,
  disabled,
  onToggle,
  onCorrect,
  originFor,
}: {
  insight: Insight
  /** So a correction control can name the action, not the verb (R3-B2). */
  entities: EntityIndex
  open: boolean
  disabled: boolean
  onToggle: () => void
  onCorrect: (belief: string) => void
  /** Where each piece of evidence came from, when it was not the owner. */
  originFor: (record: RecordId) => RecordOrigin | undefined
}) {
  const evidence = insight.evidence
  /*
   * Where the whole card came from, when the owner recorded none of it
   * (QA-08-001's retest).
   *
   * On the headline rather than only inside the evidence, because the headline
   * is the sentence he reads and the evidence is a disclosure he may never
   * open. A finding drawn entirely from migrated history is a different finding
   * from one drawn from what he did this month, and the difference belongs
   * where the claim is.
   */
  const origin = originOfSources(insight.sources)

  return (
    <section className="in-card" data-kind={insight.kind} data-testid={`insight-${insight.kind}`}>
      {/*
       * Beside the eyebrow rather than inside it.
       *
       * The eyebrow carries `text-transform: uppercase` and wide tracking, and
       * a badge nested in it inherited both — rendering "OUT OF DATEIMPORTED"
       * as one run of capitals. The badge resets those properties itself now,
       * and it also sits outside, because the two are different things saying
       * different kinds of thing about the card.
       */}
      <p className="in-card__meta">
        <span className="in-card__eyebrow">{insight.eyebrow}</span>{' '}
        {origin === undefined ? null : (
          <span className="origin-badge" data-testid="insight-origin" title={origin.detail}>
            {origin.label}
          </span>
        )}
      </p>
      <h2 className="in-card__headline">{insight.headline}</h2>
      <p className="in-card__detail">{insight.detail}</p>

      {insight.confidence === undefined ? null : (
        <EvidenceConfidence confidence={insight.confidence} />
      )}

      <button
        type="button"
        className="ev-open"
        aria-expanded={open}
        onClick={onToggle}
        // Named for anyone who cannot see which card it sits under — sections
        // 37 and D-039, the same rule Now's own correction link follows.
        aria-label={
          open
            ? `Hide the evidence for: ${insight.headline}`
            : `See the evidence for: ${insight.headline}`
        }
      >
        {open ? 'Hide the evidence' : 'See the evidence'}
      </button>

      {!open ? null : (
        <div className="ev-detail" data-testid="insight-evidence">
          {evidence.rates.length === 0 ? null : (
            <div className="ev-block">
              <p className="ev-block__title">What the record actually says</p>
              {evidence.rates.map((rate) => (
                <EvidenceRate key={rate.aspect} rate={rate} />
              ))}
            </div>
          )}

          {evidence.counted === undefined && evidence.mix === undefined ? null : (
            <EvidenceNote title="How much there is">
              {evidence.counted === undefined ? null : <p>{evidence.counted}</p>}
              {/* The unit named, for the same reason it is named on Now: the
                  occasions and the answers about them are different counts. */}
              {evidence.mix === undefined ? null : (
                <p>Answers behind these figures: {evidence.mix}.</p>
              )}
            </EvidenceNote>
          )}

          {evidence.strongerIn === undefined && evidence.weakerIn === undefined ? null : (
            <EvidenceNote title="Where it looks different">
              {evidence.strongerIn === undefined ? null : <p>{evidence.strongerIn}</p>}
              {evidence.weakerIn === undefined ? null : <p>{evidence.weakerIn}</p>}
            </EvidenceNote>
          )}

          {evidence.trend === undefined ? null : (
            <EvidenceNote title="Earlier and later">
              <p>{evidence.trend}</p>
            </EvidenceNote>
          )}

          <EvidenceLines
            title="Occasions that went the other way"
            lines={evidence.counterexamples}
            originFor={originFor}
          />
          <EvidenceLines
            title={evidence.includedTitle ?? 'Everything counted'}
            lines={evidence.included}
            limit={8}
            originFor={originFor}
          />
          <EvidenceLines
            title={evidence.excludedTitle ?? 'Left out'}
            lines={evidence.excluded}
            limit={8}
            originFor={originFor}
          />

          <EvidenceNote title="How this was arrived at">
            {evidence.reasoning.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </EvidenceNote>

          {insight.belief === undefined ? null : (
            <p className="in-card__correct">
              <button
                type="button"
                className="ev-open"
                disabled={disabled}
                aria-label={`Not right — stop the app assuming ${
                  insight.beliefLabel ?? describeBelief(insight.belief, entities)
                }`}
                onClick={() => onCorrect(insight.belief as string)}
              >
                That is not right
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
