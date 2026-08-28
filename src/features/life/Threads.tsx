import { useState } from 'react'
import { Panel } from '../../components/ui'
import { systemClock } from '../../domain/time'
import {
  describeThreadPosition,
  setThreadStateRecord,
  type ActiveThread,
} from '../../intelligence/threads'
import type { Situation } from '../../intelligence/situation'
import { useMemory } from '../memory/memoryContext'

/**
 * Courses under way, and the one tap that stops them — AUD-0020.
 *
 * The finding is explicit about why this panel is not optional: *a thread must
 * be visible on the Life surface and cancellable in one tap; a hidden plan is
 * worse than no plan.* A structure that quietly weights the ranking for three
 * weeks and cannot be found is the app running the owner's life without asking,
 * which is the opposite of what section 4.3 gives him.
 *
 * ## What is shown, and what is not
 *
 * Live courses read as what they are and where they are: *"Three recovery
 * nights in a row — second of three. One to go."* Counts of occasions, which is
 * what they are; no share, no bar, no percentage. A progress bar over a man's
 * recovery week is a score about his week (section 22).
 *
 * Ones that have stopped are listed under them, quietly, and say why they
 * stopped — expired, paused after a decline, finished, or stopped by him. That
 * matters more than it looks: a course that quietly disappeared would leave him
 * unable to tell whether the app dropped it or he did.
 */

/*
 * `finished` rather than the state word — QA-84-003's class, third instance.
 *
 * The line under it read `thread.state === 'done'`, and **nothing writes that
 * state**: this very panel offers *Stop this* and *Pick this up again*, so the
 * only states an owner can write are `abandoned` and `running`. It was dead on
 * the day it was written, and it was dead here while the same assumption was
 * being repaired twice elsewhere — once in the course-reflection reader
 * (DEF-0119) and once in the progress reader (QA-84-003).
 *
 * The occasions line above it happened to cover the case, which is why nothing
 * looked wrong. One definition now answers it, computed where the rest of a
 * thread's standing is.
 */
function standing(thread: ActiveThread): string {
  if (thread.finished) return 'Finished.'
  if (thread.state === 'abandoned') return 'Stopped.'
  if (thread.expired) return 'Ran out of time on its own.'
  if (thread.state === 'paused') return 'Paused — you passed on one of these.'
  return describeThreadPosition(thread)
}

export function Threads({ situation }: { situation: Situation }) {
  const memory = useMemory()
  const [busy, setBusy] = useState(false)

  const threads = situation.threads
  if (threads.length === 0) return null

  const live = threads.filter((thread) => thread.live)
  const stopped = threads.filter((thread) => !thread.live)

  const setState = (thread: ActiveThread, state: 'running' | 'abandoned') => {
    if (busy) return
    const previous = situation.view.history.byId(thread.source)
    if (previous === undefined || previous.kind !== 'thread') return
    setBusy(true)
    void memory
      .append([
        setThreadStateRecord(thread, state, previous, {
          now: memory.now,
          zone: memory.zone,
          recordedAt: systemClock().now(),
        }),
      ])
      .finally(() => setBusy(false))
  }

  const disabled = busy || memory.busy

  return (
    <Panel title="Things you have going">
      {live.length === 0 ? (
        <p className="note">Nothing running just now.</p>
      ) : (
        <ul className="life-threads" data-testid="life-threads">
          {live.map((thread) => (
            <li key={thread.source} className="life-thread">
              <p className="life-thread__intent">{thread.intent}</p>
              <p className="life-thread__standing">{standing(thread)}</p>
              <button
                type="button"
                className="domain-linkish"
                disabled={disabled}
                aria-label={`Stop: ${thread.intent}`}
                data-testid="life-thread-stop"
                onClick={() => setState(thread, 'abandoned')}
              >
                Stop this
              </button>
            </li>
          ))}
        </ul>
      )}

      {stopped.length === 0 ? null : (
        <ul className="life-threads life-threads--past" data-testid="life-threads-past">
          {stopped.map((thread) => (
            <li key={thread.source} className="life-thread">
              <p className="life-thread__intent">{thread.intent}</p>
              <p className="life-thread__standing">{standing(thread)}</p>
              {thread.state === 'paused' && !thread.expired && thread.done < thread.steps ? (
                <button
                  type="button"
                  className="domain-linkish"
                  disabled={disabled}
                  aria-label={`Pick up again: ${thread.intent}`}
                  data-testid="life-thread-resume"
                  onClick={() => setState(thread, 'running')}
                >
                  Pick this up again
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
