import { REFRESH_ROUTES, type DomainCoverage } from '../../intelligence/situation'

/**
 * The word Life puts on a group of areas, and what that word may claim.
 *
 * Its own module rather than a function inside `LifeScreen`, for two reasons.
 * The mechanical one is that a component file exporting a non-component breaks
 * fast refresh. The real one is that this is copy with a rule attached, and the
 * rule is worth testing directly (`tests/unit/life-pages.test.ts`) rather than
 * through a rendered screen.
 *
 * **The rule.** `CoverageStatus` answers *how recently has anything come in
 * about this?* It does not answer *is what the app believes about it still
 * good?* Those are two questions about two different things, and Life used to
 * answer the second with the first: "Fresh — up to date on what matters",
 * printed directly above a belief carrying its own out-of-date line (DEF-0051).
 *
 * So no word here claims that what the app believes is current, and none says
 * a whole group has nothing out of date. Anything out of date says so on its
 * own row, where it can name itself.
 */

/**
 * Attention first, then the calm groups in descending order of interest.
 *
 * Here rather than in the screen because it is the same decision as the words
 * themselves, and keeping them apart cost an area its place on the page: the
 * word changed from "Fresh" to "Recent", the order still said "Fresh", and
 * Life silently stopped showing three of the eleven areas. `everyStandingWord`
 * below is what makes that unrepeatable.
 */
export const GROUP_ORDER: readonly string[] = [
  'Needs a check-in',
  'Going quiet',
  'Catching up',
  'Recent',
  'Quiet',
  'Nothing here yet',
]

/** The status words, and whether the group is asking to be looked at. */
export interface Standing {
  readonly word: string
  readonly attention: boolean
  /** Said once for the group rather than once per area. */
  readonly note: string
  /** Per area, and only where the group is worth reading line by line. */
  readonly detail?: (coverage: DomainCoverage) => string
}

export function standingFor(coverage: DomainCoverage): Standing {
  if (coverage.status === 'unheard') {
    /*
     * Two areas can be empty here for two different reasons — QA-82-013.
     *
     * `unheard` means nothing has come in **at the moment being read**. On a
     * history the owner has travelled behind, that is also true of an area he
     * has mentioned four times, because those records are dated later than
     * where he is standing. The group word is honest about the moment; the note
     * was not, and it told him he had never mentioned Sleep on a screen whose
     * own records say otherwise a week forward.
     *
     * The word stays, because "Nothing here yet" is a claim about now and is
     * true of both. The note becomes true of both as well, and the areas that
     * are merely ahead of him say so on their own line.
     *
     * **The line only appears when there is one to write.** A group grows the
     * per-area layout as soon as any of its areas has a detail, and on an
     * ordinary history at an ordinary clock nothing here is later, so the
     * compact list stays — which is what the note above `groupsFrom` is
     * protecting.
     */
    const ahead: Standing = {
      word: 'Nothing here yet',
      attention: false,
      note: 'Nothing here at the moment on screen, and nothing is asking you for it.',
      detail: (entry) =>
        `${entry.later} ${entry.later === 1 ? 'entry' : 'entries'} here, all later than the moment on screen.`,
    }
    const untouched: Standing = {
      word: ahead.word,
      attention: false,
      note: ahead.note,
    }
    return coverage.later > 0 ? ahead : untouched
  }
  if (coverage.status === 'current') {
    return {
      word: 'Recent',
      attention: false,
      note: 'Something has come in here lately. Anything out of date says so on its own line.',
    }
  }
  if (coverage.status === 'quiet') {
    return {
      word: 'Quiet',
      attention: false,
      note: 'Nothing new here, and nothing asking for your attention.',
    }
  }

  /*
   * The stale case splits by what the app intends to do about it, which is the
   * whole point of the coverage engine: an area it is already getting evidence
   * about needs nothing from the owner, and one where it has run out of ideas
   * does. Telling him to go and look at both would waste the distinction.
   */
  switch (coverage.refresh) {
    case 'normal-life':
      return {
        word: 'Catching up',
        attention: false,
        note: 'An answer is already on its way.',
        detail: (entry) => entry.summary,
      }
    case 'needs-review':
      return {
        word: 'Needs a check-in',
        attention: true,
        note: 'Nothing the app can do on its own will bring these back.',
        detail: (entry) => entry.summary,
      }
    default:
      return {
        word: 'Going quiet',
        attention: true,
        note: 'The app will try to bring these back on its own.',
        detail: (entry) => `${entry.summary} ${refreshWords(entry)}`,
      }
  }
}

function refreshWords(coverage: DomainCoverage): string {
  return coverage.refresh === 'a-question'
    ? 'A question will cover it.'
    : 'Something worth doing here may come up on Now.'
}

/**
 * Every word `standingFor` can produce, so nothing can be dropped for want of
 * a place in the order.
 *
 * The screen renders `GROUP_ORDER` and discards anything not in it, which is
 * the right behaviour for a fixed layout and the wrong behaviour to leave
 * unchecked: an unlisted word does not look wrong on screen, it simply is not
 * there. `tests/unit/life-pages.test.ts` walks this against `GROUP_ORDER`.
 */
export function everyStandingWord(): readonly string[] {
  const statuses = ['current', 'quiet', 'stale', 'unheard'] as const
  const words = new Set<string>()
  for (const status of statuses) {
    for (const refresh of REFRESH_ROUTES) {
      words.add(standingFor({ status, refresh } as unknown as DomainCoverage).word)
    }
  }
  return [...words]
}
