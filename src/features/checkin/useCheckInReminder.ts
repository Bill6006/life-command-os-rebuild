import { useEffect, useRef } from 'react'
import { CHECK_IN_OPENS_AT, CHECK_IN_SLOT_LABEL, SLOTS_AT_FREQUENCY } from '../../domain/checkIn'
import { readingsAt } from '../../domain/checkIn'
import { localDateTimeAt, localDayIdAt, minutesIntoDay, systemClock } from '../../domain/time'
import { checkInSettings, answeredInSlot } from '../../intelligence/checkIn'
import { hashForDestination } from '../../platform/routing'
import { reminderPermission, showReminder } from '../../platform/reminders'
import { useMemory } from '../memory/memoryContext'

/**
 * The reminder that brings the owner to a check-in — routing 94.
 *
 * ## Where the clock is, and why it is only here
 *
 * `domain/`, `memory/` and `intelligence/` are clock-free by rule: the moment is
 * an argument, which is what lets the whole engine be time-travelled from the
 * laboratory. A reminder is the one thing in this phase that genuinely needs a
 * wall clock, so it is the shell that holds it and the engine still answers
 * *which check-in is open at this instant* as a pure function of the instant it
 * is handed.
 *
 * ## Four things it refuses to do
 *
 * **It never fires on a travelled clock.** The laboratory can put the app in
 * next Tuesday evening, and a notification fired from there would be a real
 * interruption about an invented day. It reads the system clock for the timer
 * and stands down entirely on a laboratory history.
 *
 * **It never asks for permission.** Only the button in More does that. A page
 * that asks on load is the app interrupting him to ask whether it may interrupt
 * him.
 *
 * **It never fires twice for one check-in.** The tag is the owner-local day and
 * the slot, so a re-render, a navigation or a second tab produce one reminder
 * rather than several — and a slot he has already started is not reminded about
 * at all.
 *
 * **And it says nothing about him.** The body names the ritual and its size.
 * `showReminder` carries the reason: a notification lands on a lock screen in
 * front of whoever is there, and a reading's privacy class cannot survive that.
 */
export function useCheckInReminder(): void {
  const memory = useMemory()
  const alreadySent = useRef(new Set<string>())

  const ready = memory.ready
  const view = memory.view
  const zone = memory.zone
  const source = memory.source

  useEffect(() => {
    if (!ready) return
    // A test history is not his day. Nothing is scheduled from one.
    if (source === 'laboratory') return
    if (reminderPermission() !== 'granted') return

    const clock = systemClock()
    const settings = checkInSettings(view)
    const sent = alreadySent.current

    const fireable = () => {
      const now = clock.now()
      const today = localDayIdAt(now, zone)
      const minute = minutesIntoDay(localDateTimeAt(now, zone).timeOfDay)
      for (const slot of SLOTS_AT_FREQUENCY[settings.frequency]) {
        const opens = CHECK_IN_OPENS_AT[slot]
        // Within the ten minutes after it opens, and no later. A reminder two
        // hours after the fact is an interruption about a moment that has gone.
        if (minute < opens || minute >= opens + 10) continue
        const tag = `check-in-${String(today)}-${slot}`
        if (sent.has(tag)) return undefined
        // Started already, so there is nothing to bring him to.
        if (answeredInSlot(view, { now, zone }, slot).size > 0) return undefined
        return { slot, tag }
      }
      return undefined
    }

    const fire = () => {
      const due = fireable()
      if (due === undefined) return
      const count = readingsAt(due.slot, settings.depth).length
      const shown = showReminder({
        title: CHECK_IN_SLOT_LABEL[due.slot],
        body: `${count} readings.`,
        href: hashForDestination('check-in'),
        tag: due.tag,
      })
      if (shown) sent.add(due.tag)
    }

    // Once on mount, in case the app was already open when a check-in opened,
    // and then on a minute's tick. A minute is the resolution a schedule
    // measured in minutes deserves and costs nothing on a phone.
    fire()
    const timer = window.setInterval(fire, 60_000)
    return () => window.clearInterval(timer)
  }, [ready, view, zone, source])
}
