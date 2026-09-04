import type { ConceptRegistry } from '../../domain/concepts'
import type { DomainRegistry } from '../../domain/domains'
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
  /**
   * The areas, because one entry names one — routing 91.
   *
   * An `aim-reading` says which area the app read the owner's words as being
   * about, and a row that said `money` rather than *Money & Financial
   * Resilience* would be printing a schema id at the owner (DEF-0007's
   * class). It arrives here rather than being reached for so that a history
   * rendered against an extended registry uses that registry's own words.
   */
  readonly domains: DomainRegistry
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
  // Not 'Goal': a destination has no date on it and cannot be finished, and
  // the tag is the one place a reader tells the two horizons apart at a glance.
  destination: 'Aiming at',
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
  // What a whole completion is called. A partial one is {@link PART_DONE_TAG},
  // which this table cannot express because it is keyed on kind alone.
  'action-completion': 'Done',
  'action-decline': 'Passed',
  'action-unable-now': 'Not then',
  outcome: 'Result',
  correction: 'Withdrawn',
  'belief-correction': 'Corrected',
  'relationship-event': 'Together',
  'domain-update': 'Changed',
  'coverage-update': 'Reviewed',
  // What the owner allowed, or stopped allowing. Not 'Preference': a preference
  // is about what he wants suggested, and this is about what the app may read.
  permission: 'Permission',
  // The second agenda's own memory, and the tag says which agenda it was —
  // "Asked" would be indistinguishable from the guide's three a day.
  /*
   * What the app worked out from his words, and the tag says whose sentence
   * it is — routing 91, D-143.
   *
   * Not 'Aiming at', which is the destination's own tag and is his. A reading
   * sitting under the same word as the thing it was read from would be the
   * app's conclusion wearing the owner's label, on the one surface that exists
   * to say what happened.
   */
  'aim-reading': 'Worked out',
  'discovery-response': 'Getting to know you',
  // What he set the check-in to. Not 'Preference' and not 'Permission': one is
  // about what gets suggested and the other about what the app may read, and
  // this is about how much he is asked.
  'check-in-setting': 'Check-in',
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

/**
 * The tag for a **kind**, which is what the exhaustiveness sweep asks for.
 *
 * Every record kind has one, and a twenty-first kind is a compile error here
 * rather than an undefined tag on whichever history contains it. What it cannot
 * answer is what a particular *entry* is called, because two entries of one kind
 * are not always the same thing — see {@link tagOf}.
 */
export function tagFor(kind: CanonicalRecord['kind']): string {
  return TAGS[kind]
}

/**
 * What a partial completion is called, wherever it is named — QA-84-009.
 *
 * The same two words Now puts on the row he can pick back up, because one thing
 * should have one name on every screen that shows it (D-178's discipline,
 * applied to copy).
 */
const PART_DONE_TAG = 'Part done'

/**
 * The tag **an entry** carries, extent included — QA-84-009.
 *
 * The round 1 repair gave a partial completion its own sentence and left the
 * tag alone, on the argument that a tag is one word and the sentence carries the
 * meaning. That was wrong in the plainest possible way: on Timeline the two sit
 * one above the other, so the entry read
 *
 *     Done
 *     Got part of the way — getting out for a walk.
 *
 * and the owner's own distinction was contradicted inside a single row. **A
 * rendered entry is one statement**, not a tag and a sentence that may disagree,
 * and `history-agrees-with-itself` in `timeline.test.ts` is the guard that says
 * so for every record in the library rather than for this one case.
 */
export function tagOf(record: CanonicalRecord): string {
  if (record.kind === 'action-completion' && record.extent === 'partial') return PART_DONE_TAG
  return TAGS[record.kind]
}

/**
 * A list in a sentence, with the last one joined by *and*.
 *
 * One word reads as one word rather than as a list of one, which is what a
 * bare `join(', ')` gets wrong on the ordinary case — the owner types two
 * words and one of them names the area.
 */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]!}`
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
  // The two later rungs — F05. Both are about a course rather than a session,
  // and both are deliberately about the world rather than about the record:
  // what is left of it, and whether it has been used.
  retained: (move, answer) => `What is left of ${move}: ${answer}.`,
  transfer: (move, answer) => `Where ${move} has been used: ${answer}.`,
}

/**
 * The line when the move behind an outcome cannot be resolved.
 *
 * A `Record<OutcomeAspect, string>` rather than a chain of ternaries, and the
 * reason is D-179 in miniature: the chain had three branches and an `else`, so
 * adding `retained` and `transfer` would have made both of them read *"Said how
 * a suggestion here felt"* — a true-looking sentence about the wrong question,
 * with nothing able to notice. A table fails to compile instead.
 */
const GENERIC_OUTCOME: Record<OutcomeAspect, string> = {
  result: 'Said how far a suggestion here got.',
  effect: 'Said what a suggestion here was worth.',
  comfort: 'Said how a suggestion here felt.',
  retained: 'Said what is left of something here.',
  transfer: 'Said where something here has been used.',
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

/**
 * What a completion says when only part of it happened — QA-84-002.
 *
 * The table above is keyed by record kind, and a partial completion is the same
 * kind as a whole one — so every line about an evening that ran out read
 * *"Followed through"*, on Timeline and in the correction list, while Now was
 * correctly offering the move back as **Part done**. One screen kept the owner's
 * distinction and the next erased it.
 */
const PART_DONE_FRAME = 'Got part of the way'

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
  const { entities, history, concepts, domains, policy } = context
  const tag = tagOf(record)
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
        `${record.milestoneOf === undefined ? 'Goal' : 'Milestone'}: ${record.statement}${
          record.status === 'active' ? '' : ` (${record.status})`
        }`,
      )
    case 'destination':
      /*
       * The aim, and nothing added to it — D-162.
       *
       * No count of the parts it has, no reading of how far along it is, no
       * word about whether it is going well. A destination is described, and
       * this surface is the one that describes what happened rather than what
       * it means.
       */
      return plain(
        `${record.aim}${record.state === 'active' ? '' : ` (${record.state.replace('-', ' ')})`}`,
      )
    case 'aim-reading':
      /*
       * A conclusion shown with its grounds — D-143.
       *
       * *"No" is a true row and a useless one*: the rule the decision states
       * about a derived belief applies exactly here. The row names the area the
       * words were read as being about **and the words that named it**, so a
       * reading the owner disagrees with is one he can see the reason for
       * rather than one he has to take on trust.
       */
      return plain(
        record.withdrawn === true
          ? `Took back reading this as being about ${domains.labelFor(record.named)}.`
          : `Read this as being about ${domains.labelFor(record.named)} — from ${listOf(
              record.words.map((word) => `“${word}”`),
            )}.`,
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
      const partial = record.kind === 'action-completion' && record.extent === 'partial'
      const said = describeLifecycle(
        partial ? PART_DONE_FRAME : LIFECYCLE_FRAME[record.kind],
        record.recommendation,
        history,
        entities,
      )
      if (said !== undefined) return plain(said)
      const generic =
        record.kind === 'action-start'
          ? 'Started a suggestion here.'
          : record.kind === 'action-completion'
            ? partial
              ? 'Got part of the way with a suggestion here.'
              : 'Followed through on a suggestion here.'
            : record.kind === 'action-decline'
              ? 'Passed on a suggestion here.'
              : "Said a suggestion here didn't fit at the time."
      return plain(about(generic, record.recommendation))
    }
    case 'outcome': {
      const said = describeOutcome(record, history, entities)
      return plain(said ?? about(GENERIC_OUTCOME[record.aspect], record.about))
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
    case 'permission':
      return plain(record.statement)
    /*
     * The words he was reading when he chose, rather than the level's own name.
     *
     * `full` and `three` mean nothing on Timeline a year later, and a row that
     * said "Changed the check-in to full" would be the app's vocabulary
     * appearing on the one surface that is meant to be an account of what he
     * did. The statement is what the control actually said at the time.
     */
    case 'check-in-setting':
      return plain(record.statement)
    case 'discovery-response':
      /*
       * A skip is a row, and that is deliberate — D-163.
       *
       * "Always skippable and a skip is respected" means the skip has to be
       * remembered, and a thing the app remembers about the owner is a thing he
       * can see and correct. What it must never read as is a failure to answer.
       */
      return plain(
        record.disposition === 'answered'
          ? 'Answered something the app was trying to understand.'
          : 'Left one of the app’s questions for another time.',
      )
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
