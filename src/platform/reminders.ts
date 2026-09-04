/**
 * The reminder that brings the owner to a check-in — routing 94.
 *
 * ## What this actually does, said before anything else
 *
 * The app registers **no service worker** and removes any it finds — `More`
 * says so on screen and `AppShell` does it on load. A page without one cannot
 * be woken by the operating system, so **a reminder can only appear while the
 * app is open in a tab or a window**. Nothing arrives when it is closed.
 *
 * That is a real limit and the control says it in those words rather than
 * offering a reminder and letting him find out on a morning he needed it. The
 * alternative — a service worker for a push — is a separate piece of work with
 * its own deployment and cache hazards, and this phase has six things in it.
 *
 * ## Why the browser's own permission is the whole of the setting
 *
 * There is no second on/off switch stored anywhere. The browser already holds
 * exactly one durable, per-device, owner-controlled answer to *may this site
 * interrupt me*, it survives a reload, and it is revocable from the address bar
 * on every browser that has the feature. A second flag beside it could only
 * disagree with it, and a settings screen showing *on* while the browser says
 * *blocked* is worse than no control at all.
 *
 * It is deliberately **not** a canonical record either. A permission the owner
 * gave this browser is a fact about a device; a backup carrying it would turn
 * up on his laptop claiming he had agreed to something there.
 *
 * ## And it is never asked for on its own initiative
 *
 * {@link askForReminders} runs only from a press. A page that asks on load is
 * the pattern every browser now penalises, and it would be the app deciding to
 * interrupt him in order to ask whether it may interrupt him.
 */

export type ReminderPermission = 'unsupported' | 'default' | 'granted' | 'denied'

/**
 * Whether this browser can show one, and whether it has been allowed to.
 *
 * Wrapped rather than read directly because the API is absent in the test
 * environment, absent in some embedded browsers, and **throws on access** in a
 * few privacy configurations rather than reporting `denied`. A settings panel
 * is not worth an exception.
 */
export function reminderPermission(): ReminderPermission {
  try {
    if (typeof Notification === 'undefined') return 'unsupported'
    const state = Notification.permission
    return state === 'granted' || state === 'denied' ? state : 'default'
  } catch {
    return 'unsupported'
  }
}

/** The owner pressed the button. Never called from anywhere else. */
export async function askForReminders(): Promise<ReminderPermission> {
  try {
    if (typeof Notification === 'undefined') return 'unsupported'
    const answer = await Notification.requestPermission()
    return answer === 'granted' || answer === 'denied' ? answer : 'default'
  } catch {
    return 'unsupported'
  }
}

export interface Reminder {
  readonly title: string
  /** Plain, and never a reading. See {@link showReminder}. */
  readonly body: string
  /** Where pressing it goes. A hash route, because that is what the app has. */
  readonly href: string
  /** One per slot per day, so a re-render cannot produce a second. */
  readonly tag: string
}

/**
 * Put one on the screen, and say nothing about him in it.
 *
 * **A notification is the least private surface the app has.** It appears on a
 * lock screen, over whatever he is doing, in front of whoever is next to him.
 * So the body names the ritual and its size and **never a reading, a score, a
 * dimension or a domain** — `tests/synthetic/check-in.test.ts` fails the build
 * on a body that names one. A reminder that said *"how lonely are you?"* on a
 * lock screen would breach the privacy class of the concept it came from
 * without any code having read the record.
 *
 * Returns whether one was actually shown, so a caller can tell *shown* from
 * *silently unavailable* rather than assuming.
 */
export function showReminder(reminder: Reminder): boolean {
  if (reminderPermission() !== 'granted') return false
  try {
    const shown = new Notification(reminder.title, { body: reminder.body, tag: reminder.tag })
    shown.onclick = () => {
      try {
        window.focus()
        window.location.hash = reminder.href
        shown.close()
      } catch {
        // A browser that will not focus its own window is not a reason to
        // throw out of a click handler.
      }
    }
    return true
  } catch {
    return false
  }
}
