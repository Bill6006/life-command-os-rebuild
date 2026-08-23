/**
 * Which history is on screen, and which piece of work is still entitled to say
 * so (R4-B1).
 *
 * Two stores, one screen. Every operation over them reads, awaits, and then
 * publishes — and two can be in the air at once, which means the last one to
 * *finish* is not necessarily the last one the owner *asked for*. That gap is
 * where the defect lived:
 *
 * > A derived outcome is being appended to the laboratory. The owner presses
 * > **Show mine**. The laboratory is emptied and his history published. Then
 * > the append finishes and publishes the snapshot it was working against —
 * > the laboratory's, now empty. Timeline says "Nothing here yet", directly
 * > under a notice promising nothing of his had been changed, and only a
 * > reload puts it right.
 *
 * Nothing was lost; the bytes were in their own database throughout. What was
 * wrong was the picture of them, and a reload being able to fix it does not
 * make a false empty-history claim acceptable.
 *
 * ## The rule
 *
 * **Only the newest work may publish, and only about the source it was asked
 * about.** Older work still finishes — its records are already going somewhere
 * real, and cancelling an IndexedDB transaction would be a worse promise than
 * letting it land in a store that is about to be cleared anyway — but it
 * publishes nothing: not a snapshot, not `busy`, not an error, not the source.
 *
 * ## What this rule does *not* cover, and where the rest lives
 *
 * Source and snapshot are two thirds of what a reader sees. The third is the
 * moment — `buildView(snapshot, { now, zone, weekStartsOn })` — and time can
 * contradict the other two: returning the owner's records under the
 * laboratory's clock showed his August entries as things that had not happened
 * yet, on a screen with the notice already gone (DEF-0058). Restoring the
 * owner's frame belongs to the operation that gives the screen back, in
 * `MemoryProvider.clear()`, because it is the frame rather than the arbitration
 * that changes. This file decides *whether* work may publish; it does not
 * decide what a coherent context is.
 *
 * ## Why this is not inside the provider
 *
 * Because a rule about interleaving cannot be tested by hoping two things
 * overlap. Round 4's browser regression failed three-for-three in a focused
 * run and passed 300-for-300 in the full suite on identical code, which is
 * worth less than no test at all: it reads as evidence. Here the sequence is
 * written down and asserted directly, in order, every run
 * (`tests/unit/memory-projection.test.ts`).
 */

/** Whose history the surfaces are reading. */
export type HistorySource = 'owner' | 'laboratory'

export interface Job {
  /** The source this work was started against. */
  readonly against: HistorySource
  /**
   * Whether anything newer has been asked for since this began.
   *
   * The question a job asks before *moving* the screen, which it may do even
   * though the screen does not yet show what it read — `clear` works against
   * the laboratory and ends by showing the owner.
   */
  isCurrent(): boolean
  /**
   * Whether this work may put what it read on the screen.
   *
   * Both halves are load-bearing. The token alone would let work that began
   * against the laboratory publish after a switch to the owner; the source
   * alone would let two jobs over one store publish out of order.
   */
  mayPublish(): boolean
}

export interface Projection {
  /** Whose history is currently on screen. */
  readonly source: HistorySource
  /** Begin work against a named source. Everything older becomes stale. */
  begin(against: HistorySource): Job
  /** Begin work against whatever is on screen now. */
  beginHere(): Job
  /**
   * Show a different source, on behalf of the job that did the work.
   *
   * Takes the job so that work already superseded cannot move the screen —
   * the case where a scenario load the owner walked away from pulls him back
   * into the laboratory he has just left. Returns whether the switch happened,
   * so the caller can stop rather than publish into a screen it no longer owns.
   */
  show(next: HistorySource, job: Job): boolean
}

export function createProjection(initial: HistorySource = 'owner'): Projection {
  let source: HistorySource = initial
  let latest = 0

  const begin = (against: HistorySource): Job => {
    const token = (latest += 1)
    const isCurrent = () => token === latest
    return {
      against,
      isCurrent,
      mayPublish: () => isCurrent() && source === against,
    }
  }

  return {
    get source() {
      return source
    },
    begin,
    beginHere: () => begin(source),
    show: (next, job) => {
      if (!job.isCurrent()) return false
      source = next
      return true
    },
  }
}
