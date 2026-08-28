import { countOf } from './counts'
import type { OutcomeAspect } from './records'

/**
 * What counts as progress, and what each kind of evidence is allowed to say
 * (F05, F11, package 2).
 *
 * ## The finding, in the owner's words
 *
 * *"I wish being busy and becoming capable were different things."* He could
 * complete many sessions and still fail to retain anything, build no strength,
 * improve no finances and deepen no relationship — and the product had one word
 * for all of it. A goal piece was "covered" when a move naming it completed; a
 * study course counted sessions; a milestone did not exist.
 *
 * ## The ladder
 *
 * Seven kinds, in order of how much they license. Each rung is a different
 * observation with a different window, and **a lower rung never speaks for a
 * higher one**:
 *
 * 1. `attempt` — it was started. Says the intention existed.
 * 2. `part-done` — some of it happened, and he said so. Not a session done.
 * 3. `completion` — the thing asked for was carried out. Says nothing about
 *    whether the intended end state happened; that is DEF-0020's distinction
 *    and it is the one the whole learning layer rests on.
 * 4. `quality` — the intended end state occurred. An `outcome` of aspect
 *    `result`.
 * 5. `retained-capability` — it is still there later. Asked about a **course**,
 *    days after it finished.
 * 6. `transfer` — it has been used somewhere real.
 * 7. `milestone` — the owner says a named step on the way to something is
 *    reached. **Never inferred**: it is his statement, not a conclusion from
 *    what he attended.
 *
 * ## The guard, and why it is a comparison rather than a word list
 *
 * D-177: a claim is compared with what is behind it, never matched against a
 * list of phrases. So each rung owns its own sentence, {@link progressSentence}
 * is the only place a progress sentence is made, and it takes the rung whose
 * evidence is actually present. Claiming capability from attendance is then not
 * a phrasing mistake somebody has to notice — it is rendering a rung above the
 * evidence, and `rankOf` is what makes that comparable and therefore checkable.
 *
 * D-179: `Record<ProgressEvidence, …>` throughout, so a seventh rung is a
 * compile error in this file rather than a rung that quietly reads as the one
 * before it.
 */

export const PROGRESS_EVIDENCE = [
  'attempt',
  /**
   * Some of it happened, and he said so — F10, QA-84-002.
   *
   * Its own rung, between starting and finishing, because it is its own fact.
   * The first version counted a partial completion as a **session done**: one
   * screen offered the move back as *"Part done"* and the next called it
   * *"1 session done"* and *"Followed through"*, which is the owner's own
   * distinction preserved by the state machine and erased by everything that
   * read it.
   *
   * A rung rather than a fold into `attempt`, because *"I got some of the
   * kitchen cleared"* is more than *"I started"* and less than *"I did it"*,
   * and the whole subject of this ladder is that those are three claims.
   */
  'part-done',
  'completion',
  'quality',
  'retained-capability',
  'transfer',
  'milestone',
] as const

export type ProgressEvidence = (typeof PROGRESS_EVIDENCE)[number]

export function isProgressEvidence(value: unknown): value is ProgressEvidence {
  return typeof value === 'string' && (PROGRESS_EVIDENCE as readonly string[]).includes(value)
}

/** How far up the ladder a kind of evidence sits. Higher licenses more. */
export function rankOf(kind: ProgressEvidence): number {
  return PROGRESS_EVIDENCE.indexOf(kind)
}

/**
 * Which rung an outcome answer lands on.
 *
 * `effect` and `comfort` are deliberately absent: what a move was worth and how
 * it felt are real observations and they are not claims about capability. An
 * evening that felt good is not a skill.
 */
export const RUNG_FOR_ASPECT: Partial<Record<OutcomeAspect, ProgressEvidence>> = {
  result: 'quality',
  retained: 'retained-capability',
  transfer: 'transfer',
}

/**
 * What each rung is called where the owner reads it.
 *
 * Short noun phrases, because they head a list rather than form a sentence.
 * "Sessions" and "courses" are different words on purpose — gate item 2 is that
 * a completed session, a completed course and a milestone are three different
 * things on screen.
 */
export const PROGRESS_LABEL: Record<ProgressEvidence, string> = {
  attempt: 'Started',
  'part-done': 'Got part way',
  completion: 'Sessions done',
  quality: 'How they went',
  'retained-capability': 'What has stuck',
  transfer: 'Used for real',
  milestone: 'Milestones reached',
}

/**
 * The one sentence each rung licenses, and the count it is generated from.
 *
 * Every quantity in here comes from the number passed in, so a sentence cannot
 * state a quantity the caller did not count — D-177 satisfied by construction
 * rather than by a sweep looking for phrases. `countOf` is the shared
 * pluraliser, so "1 sessions" is not reachable from here either.
 *
 * Read the wording carefully: `completion` says *sessions happened* and stops.
 * It does not say what was learned, whether anything stuck, or that he is
 * closer to anything. That restraint is the whole of F05.
 */
export const PROGRESS_SENTENCE: Record<ProgressEvidence, (count: number) => string> = {
  attempt: (count) => `${countOf(count, 'thing', 'things')} started here.`,
  'part-done': (count) => `${countOf(count, 'time', 'times')} you got part of the way and said so.`,
  completion: (count) =>
    `${countOf(count, 'session', 'sessions')} done. That is what happened, not what it came to.`,
  quality: (count) =>
    `${countOf(count, 'session', 'sessions')} you said something about afterwards.`,
  'retained-capability': (count) =>
    `${countOf(count, 'course', 'courses')} you have said what is left of.`,
  transfer: (count) => `${countOf(count, 'thing', 'things')} here you have used somewhere real.`,
  milestone: (count) => `${countOf(count, 'milestone', 'milestones')} you have said you reached.`,
}

/**
 * The sentence for a rung, generated only from that rung's own count.
 *
 * The single door. A surface that wants to say something about progress calls
 * this with the rung the evidence actually supports; there is nowhere else for
 * a progress sentence to come from, which is what makes "no surface claims
 * capability from attendance" a property something can fail rather than a
 * promise in a comment (D-179).
 */
export function progressSentence(kind: ProgressEvidence, count: number): string {
  return PROGRESS_SENTENCE[kind](count)
}

/**
 * What a finished course is allowed to say — gate item 2.
 *
 * Its own function rather than `completion` with a different noun, because a
 * course finishing and a session finishing are two different facts and the gate
 * is that they read as two different things. Deriving one sentence from the
 * other by swapping a word is how they end up meaning the same thing again.
 */
export function courseSentence(count: number): string {
  return `${countOf(count, 'course', 'courses')} finished. A course finishing is not a session finishing, and neither is getting there.`
}

/**
 * What a rung explicitly does **not** license, for the surface that shows it.
 *
 * The half a progress display usually leaves out, and the half the review is
 * about. Attendance is not capability; a finished course is not a retained one;
 * a reached milestone is not the destination.
 */
export const PROGRESS_DOES_NOT_SAY: Record<ProgressEvidence, string> = {
  attempt: 'Starting something is not doing it.',
  'part-done': 'Part of something is not the whole of it, and it is not a session done.',
  completion: 'Doing the sessions is not the same as getting better at it.',
  quality: 'How a session went is not how much of it stayed.',
  'retained-capability': 'Knowing it is not the same as having used it.',
  transfer: 'Using it once is not the whole of what you were aiming at.',
  milestone: 'A milestone is a step on the way, not the destination.',
}
