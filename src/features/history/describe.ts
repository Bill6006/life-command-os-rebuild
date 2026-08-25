import type { ConceptRegistry } from '../../domain/concepts'
import type { EntityIndex } from '../../domain/entities'
import type { RecordId } from '../../domain/ids'
import { discreetPlaceholder, mayShowDetail, type DisplayPolicy } from '../../domain/privacy'
import { renderRecommendation } from '../../domain/recommendation'
import { describeCommitmentWindow } from '../../domain/schedule'
import { describeThreadRecord } from '../../intelligence/threads'
import {
  describeFactValue,
  type CanonicalRecord,
  type FactValue,
  type OccasionContext,
  type OutcomeAspect,
} from '../../domain/records'
import type { ConceptId } from '../../domain/windows'
import { describeBelief } from '../../intelligence/corrections'
import { patternNameFor } from '../../intelligence/insights'
import { outcomeAnswerLabel } from '../../intelligence/outcomes'
import type { ResolvedHistory } from '../../memory/resolve'
import { originOf, type RecordOrigin } from './origin'

/**
 * One canonical record, as one line a person would recognise.
 *
 * Phase 5 built this inside `domainPages.ts` for a domain page's "Recently"
 * panel. Phase 6 needs the same sentences on Timeline, over more record kinds
 * and a whole life rather than one area — and two renderers producing sentences
 * about the same rows is precisely the arrangement that drifts. DEF-0028 and
 * DEF-0029 were both a line failing to say what it was about; fixing that twice,
 * separately, in two files, is how one of them gets fixed and the other does
 * not.
 *
 * So the sentence for a record is defined once, here, and the two surfaces
 * differ only in **which rows they ask about** and **what discretion they owe**.
 * The owner's deferral stands untouched: a domain page's panel is still
 * domain-scoped and still shows its own narrower set of kinds. What is shared
 * is the wording, not the panel.
 *
 * ## Discretion is a display decision, never a storage one
 *
 * `mayShowDetail` returning false means *show that it exists, not what it says*
 * — never "drop the row". A surface that silently omitted it would tell the
 * owner his history is thinner than it is (section 11, and `privacy.ts`'s own
 * contract). So a withheld row still appears, still carries its date, and
 * carries a placeholder in place of the detail.
 */

export interface DescribedRecord {
  /** A short owner-facing word for what kind of entry this is. */
  readonly tag: string
  /** The line itself. Never a broken reference and never a bare identifier. */
  readonly text: string
  /** True when the detail was withheld and a placeholder is standing in. */
  readonly withheld: boolean
  /**
   * Where it came from, when the owner did not write it himself (QA-08-001).
   *
   * Undefined for his own entries, which is almost all of them. Every surface
   * that renders one of these renders this too — a line that says what
   * happened and not where it came from is a line an imported reading and a
   * typed one are indistinguishable on, which is the defect this field exists
   * to close. See `origin.ts` for why the class is wider than legacy import.
   */
  readonly origin: RecordOrigin | undefined
}

export interface DescribeContext {
  readonly entities: EntityIndex
  readonly history: ResolvedHistory
  readonly concepts: ConceptRegistry
  readonly policy: DisplayPolicy
}

/**
 * What each kind of entry is called where the owner reads it.
 *
 * Ordinary words rather than the record kind. "action-unable-now" is a schema
 * name; "Not then" is what happened.
 */
const TAGS = {
  observation: 'Noted',
  'explicit-fact': 'Noted',
  context: 'Standing',
  constraint: 'Limit',
  goal: 'Goal',
  commitment: 'Commitment',
  // Not 'Commitment': the two are different objects and the tag is the one
  // place a reader tells them apart at a glance. A promise has a due date; this
  // is a stretch of the day that is already spoken for.
  'commitment-window': 'On the day',
  // What a thread is on Timeline: something the owner set going, or stopped.
  thread: 'Course',
  preference: 'Preference',
  decision: 'Decision',
  'action-recommendation': 'Suggested',
  'action-start': 'Started',
  'action-completion': 'Done',
  'action-decline': 'Passed',
  'action-unable-now': 'Not then',
  outcome: 'Result',
  correction: 'Withdrawn',
  'belief-correction': 'Corrected',
  'relationship-event': 'Together',
  'domain-update': 'Changed',
  'coverage-update': 'Reviewed',
  /*
   * "Kept" rather than "Imported", now that the origin is its own field.
   *
   * The tag says what kind of entry it is and the origin says where it came
   * from, and this row is the one place they were the same word — so it read
   * "Imported · Imported from …" the moment origin arrived. What is distinctive
   * about an archived legacy row is not that it was imported (a mapped
   * observation was too) but that nothing was made of it.
   */
  'imported-legacy-record': 'Kept',
} as const satisfies Record<CanonicalRecord['kind'], string>

export function tagFor(kind: CanonicalRecord['kind']): string {
  return TAGS[kind]
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

/**
 * Which of the three questions an outcome answers, said in the sentence itself.
 *
 * DEF-0020's distinction, on the surface most likely to erase it: one episode
 * can produce a result, an effect and a comfort, and on a chronological list
 * they arrive as three rows minutes apart. They have to be told apart.
 *
 * The aspect is carried by the **sentence** rather than by the tag beside it,
 * and that is not a styling choice. This line is shared with a domain page's
 * "Recently" panel, which shows no tag at all — so a row whose meaning lived in
 * the tag would read on that page as a bare statement about the kitchen with
 * nothing saying what was being asked. It also keeps Timeline from printing the
 * same word twice in a row, which is section 61's repeated boilerplate.
 */
const OUTCOME_FRAME: Record<OutcomeAspect, (move: string, answer: string) => string> = {
  result: (move, answer) => `How far ${move} got: ${answer}.`,
  effect: (move, answer) => `What ${move} was worth: ${answer}.`,
  comfort: (move, answer) => `How ${move} felt: ${answer}.`,
}

/**
 * What the owner said about an episode, in his own answer's words.
 *
 * The generic form — "Said what a suggestion here was worth" — is true and says
 * nothing. On a domain page, where a handful sit under a heading that already
 * supplies the area, it was tolerable. On a whole-life chronological list it is
 * most of the screen, and four lines a day all beginning "Said what a
 * suggestion here…" is exactly the wall section 4.6 asks the app not to settle
 * for when the subject is known.
 *
 * Both halves are read rather than composed: the move's name from the same
 * table Insights uses, and the answer from the same table the button was
 * rendered from. When either cannot be resolved the sentence falls back to the
 * generic one rather than inventing a subject (D-018).
 */
function describeOutcome(
  record: Extract<CanonicalRecord, { kind: 'outcome' }>,
  history: ResolvedHistory,
  entities: EntityIndex,
): string | undefined {
  const found = history.byId(record.about)
  if (found === undefined || found.kind !== 'action-recommendation') return undefined
  const target = found.recommendation.target
  const subject = entities.labelFor(target.object)
  if (subject === undefined) return undefined
  const answer = outcomeAnswerLabel(target.verb, record.aspect, record.observation)
  if (answer === undefined) return undefined
  const line = OUTCOME_FRAME[record.aspect](
    lowerFirst(patternNameFor(target.verb, subject)),
    lowerFirst(answer),
  )
  /*
   * And where it happened, where the owner said — AUD-0017.
   *
   * The finding asks for the setting to show in the domain page's "Recently"
   * list, and the reason is the same one the field exists for: the run he is
   * being asked to judge is only meaningful if he can see whether it was all in
   * one place. Absent where he skipped it, which is not the same as familiar.
   */
  const where = describeSetting(record.occasion, entities)
  return where === undefined ? line : `${line} ${where}`
}

function describeSetting(
  occasion: OccasionContext | undefined,
  entities: EntityIndex,
): string | undefined {
  const setting = occasion?.setting
  if (setting === undefined) return undefined
  if (setting.kind === 'somewhere-new') return 'Somewhere new.'
  if (setting.kind === 'somewhere-familiar') return 'Somewhere familiar.'
  const place = entities.labelFor(setting.place)
  return place === undefined ? undefined : `At ${place}.`
}

/**
 * What became of a suggestion, naming the suggestion.
 *
 * Same rule as the outcome above and the same fallback: an em dash rather than
 * a preposition, because the move names are written to stand on their own and
 * "followed through on recall practice on subnetting" is what joining them with
 * one produces.
 */
const LIFECYCLE_FRAME = {
  'action-start': 'Started',
  'action-completion': 'Followed through',
  'action-decline': 'Turned down',
  'action-unable-now': 'Did not fit at the time',
} as const

function describeLifecycle(
  lead: string,
  recommendation: RecordId,
  history: ResolvedHistory,
  entities: EntityIndex,
): string | undefined {
  const found = history.byId(recommendation)
  if (found === undefined || found.kind !== 'action-recommendation') return undefined
  const target = found.recommendation.target
  const subject = entities.labelFor(target.object)
  if (subject === undefined) return undefined
  return `${lead} — ${lowerFirst(patternNameFor(target.verb, subject))}.`
}

/**
 * What a lifecycle or outcome record was about, in the owner's own words.
 *
 * `action-start`, `action-completion`, `action-decline`, `action-unable-now`
 * and `outcome` all point at the `action-recommendation` they belong to rather
 * than carrying a subject of their own. Without this a line can only say "a
 * suggestion here" — true, and exactly the generic language section 4.6 asks
 * the app not to settle for when the subject is known (DEF-0028).
 *
 * It never invents one: an unresolvable reference leaves the sentence as
 * generic as it was rather than showing a broken reference in its place.
 */
function subjectOf(
  recommendation: RecordId,
  history: ResolvedHistory,
  entities: EntityIndex,
): string | undefined {
  const found = history.byId(recommendation)
  if (found === undefined || found.kind !== 'action-recommendation') return undefined
  return entities.labelFor(found.recommendation.target.object)
}

export function describeRecord(
  record: CanonicalRecord,
  context: DescribeContext,
): DescribedRecord | undefined {
  const { entities, history, concepts, policy } = context
  const tag = tagFor(record.kind)
  const origin = originOf(record)

  if (!mayShowDetail(record.privacy, policy)) {
    /*
     * The row survives; the detail does not. Dated, tagged, and unmistakably a
     * real entry rather than a gap.
     *
     * The origin survives with it. Where an entry came from is not the private
     * detail — the detail is what it says — and withholding both would make a
     * private imported row read as one he wrote, which is the defect this
     * field closes, on the surface least able to correct it.
     */
    return { tag, text: discreetPlaceholder(record.privacy), withheld: true, origin }
  }

  const labelFor = (ref: Parameters<EntityIndex['labelFor']>[0]) => entities.labelFor(ref)

  const about = (base: string, recommendation: RecordId): string => {
    const subject = subjectOf(recommendation, history, entities)
    if (subject === undefined) return base
    // The full stop belongs at the end of the whole sentence, not stranded
    // before the em dash that names the subject (DEF-0028's own repair).
    const withoutFullStop = base.endsWith('.') ? base.slice(0, -1) : base
    return `${withoutFullStop} — ${subject}.`
  }

  /*
   * A concept's own label leads the line.
   *
   * Found on an Android gate: a record can carry a concept whose *registered*
   * domain differs from the domain the record itself is tagged with — how much
   * time is free tonight is filed under Career, and several histories tag the
   * record under Direction because it is evidence about the week. Without the
   * label, a chronological list read a bare "60 min" with nothing saying what
   * it measured (DEF-0029). Timeline is that list for the whole life, so the
   * same rule matters more here, not less.
   */
  const concept = (id: ConceptId, value: FactValue): string =>
    `${concepts.definitionFor(id).label}: ${describeFactValue(value, labelFor)}`

  const plain = (text: string): DescribedRecord => ({ tag, text, withheld: false, origin })

  switch (record.kind) {
    case 'observation':
    case 'explicit-fact':
      return plain(concept(record.concept, record.value))
    case 'context':
      /*
       * The tag follows the durability, because the row otherwise contradicts
       * itself: a situational exception rendered "Standing — child with the
       * owner: no — for now", which is the tag saying one thing and the
       * sentence saying its opposite, on one line. DEF-0033's class at the
       * smallest possible scale.
       */
      return record.durability === 'situational'
        ? {
            tag: 'Temporary',
            text: `${concept(record.concept, record.value)} — for now`,
            withheld: false,
            origin,
          }
        : plain(concept(record.concept, record.value))
    case 'constraint':
      return plain(record.description)
    case 'goal':
      return plain(
        `Goal: ${record.statement}${record.status === 'active' ? '' : ` (${record.status})`}`,
      )
    case 'commitment':
      return plain(`Commitment: ${record.statement}`)
    case 'commitment-window':
      return plain(describeCommitmentWindow(record))
    case 'thread':
      return plain(describeThreadRecord(record))
    case 'preference':
      return plain(record.statement)
    case 'decision':
      return plain(`${record.statement} — chose ${record.chosen}`)
    case 'action-recommendation': {
      /*
       * The suggestion itself, rendered the way Now rendered it.
       *
       * D-018: either every reference resolves and the sentence names the real
       * subject, or nothing is shown. There is no fallback wording here for the
       * same reason there is none on Now — a fallback is exactly how "it" gets
       * on screen.
       */
      // The block it was decided in, where the record carries one. A line
      // about a Tuesday evening is about that evening, not about the hour the
      // owner happens to be reading Timeline at.
      const rendered = renderRecommendation(record.recommendation, entities, record.context?.block)
      return rendered.ok ? plain(rendered.rendered.sentence) : undefined
    }
    case 'action-start':
    case 'action-completion':
    case 'action-decline':
    case 'action-unable-now': {
      const said = describeLifecycle(
        LIFECYCLE_FRAME[record.kind],
        record.recommendation,
        history,
        entities,
      )
      if (said !== undefined) return plain(said)
      const generic =
        record.kind === 'action-start'
          ? 'Started a suggestion here.'
          : record.kind === 'action-completion'
            ? 'Followed through on a suggestion here.'
            : record.kind === 'action-decline'
              ? 'Passed on a suggestion here.'
              : "Said a suggestion here didn't fit at the time."
      return plain(about(generic, record.recommendation))
    }
    case 'outcome': {
      const said = describeOutcome(record, history, entities)
      return plain(
        said ??
          about(
            record.aspect === 'result'
              ? 'Said how far a suggestion here got.'
              : record.aspect === 'effect'
                ? 'Said what a suggestion here was worth.'
                : 'Said how a suggestion here felt.',
            record.about,
          ),
      )
    }
    case 'correction':
      return plain(`Withdrew an earlier entry — ${record.reason}`)
    case 'belief-correction':
      /*
       * The index goes in, so the sentence can name the action rather than the
       * verb (R3-B2). A correction about a walk read as "stop assuming what the
       * app has worked out follows moving" here — a sentence that fits the bike
       * ride the owner never disputed, on the one surface that is meant to be
       * the canonical account of what he did.
       */
      return plain(
        record.stance === 'reject'
          ? `Told the app to stop assuming ${describeBelief(record.belief, entities)}.`
          : `Let the app go back to what it had learned about ${describeBelief(record.belief, entities)}.`,
      )
    case 'relationship-event':
      return plain(record.nature)
    case 'domain-update':
      return plain(record.summary)
    case 'coverage-update':
      return plain('Reviewed — the owner has looked at this.')
    case 'imported-legacy-record':
      /*
       * A marker, never the payload.
       *
       * Section 30 keeps imported legacy records from silently driving
       * intelligence until they are explicitly mapped, and rendering the raw
       * payload here would be the same mistake wearing a display hat: an
       * unmapped legacy field on a primary surface reads as something the app
       * understands.
       */
      return plain('An entry from the old app, kept exactly as written.')
  }
}
