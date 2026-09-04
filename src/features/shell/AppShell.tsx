import { lazy, useEffect } from 'react'
import { CheckInScreen } from '../checkin/CheckInScreen'
import { useCheckInReminder } from '../checkin/useCheckInReminder'
import { DataScreen } from '../data/DataScreen'
import { DomainPage } from '../life/DomainPage'
import { pageBySlug } from '../life/domainPages'
import { InsightsScreen } from '../insights/InsightsScreen'
import { LifeScreen } from '../life/LifeScreen'
import { MoreScreen } from '../more/MoreScreen'
import { NowScreen } from '../now/NowScreen'
import { TimelineScreen } from '../timeline/TimelineScreen'
import { isPreview, runningBuild } from '../../platform/buildInfo'
import {
  hashForDestination,
  useDestination,
  useLifePageSlug,
  type Destination,
} from '../../platform/routing'
import { useMemory } from '../memory/memoryContext'
import { useBuildFreshness, type BuildFreshness } from '../../platform/useBuildFreshness'
import { BottomNav } from './BottomNav'
import { DESTINATION_LABELS } from './labels'
import { LazyScreen } from './LazyScreen'
import { NavIcon } from './NavIcons'
import './AppShell.css'

/**
 * The QA laboratory is a separate chunk.
 *
 * It carries the synthetic scenarios and the whole inspector, none of which a
 * production build should download — section 31 asks for test-only surfaces to
 * be unavailable there, and the cheapest way to be sure is for the bytes not
 * to ship.
 */
const QaScreen = lazy(async () => ({ default: (await import('../qa/QaScreen')).QaScreen }))

/**
 * The header, and the one way into everything that is not a primary
 * destination.
 *
 * Section 5 gives the phone four primary destinations. Data, exports, privacy,
 * settings and QA reach the owner through here instead of through a fifth tab,
 * which is what keeps the hierarchy the plan describes from quietly flattening.
 */
function TopBar({
  current,
  onNavigate,
}: {
  current: Destination
  onNavigate: (destination: Destination) => void
}) {
  const inSecondary = current === 'more' || current === 'data' || current === 'qa'

  return (
    <div className="topbar">
      {isPreview ? (
        <span className="preview-strip__label">
          <span className="preview-strip__dot" aria-hidden="true" />
          Preview
          <span className="visually-hidden">build </span>
          <span className="preview-strip__sha">{runningBuild.commitShort}</span>
        </span>
      ) : (
        <span className="topbar__wordmark">Life Command OS</span>
      )}

      <button
        type="button"
        className="topbar__more"
        aria-current={inSecondary ? 'page' : undefined}
        onClick={() => onNavigate('more')}
      >
        <NavIcon destination="more" />
        <span className="topbar__more-label">More</span>
      </button>
    </div>
  )
}

function StaleBuildNotice({ freshness }: { freshness: BuildFreshness }) {
  if (!freshness.isStale) return null

  return (
    <div className="build-notice" role="status">
      <span className="build-notice__text">
        A newer build is deployed ({freshness.deployed?.commitShort}).
      </span>
      <button
        type="button"
        className="build-notice__button"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  )
}

/**
 * Whose evening this is (R3-B1).
 *
 * The laboratory can be inspected from every surface, which is the point of it
 * — and that is exactly why a person standing on Now has to be told when the
 * evening in front of him is not his. Every other honesty rule in this app is
 * about not claiming more than the evidence supports; showing somebody a
 * synthetic history in the same frame as his own, unlabelled, is the largest
 * version of that mistake available.
 *
 * It says how to get out, and getting out costs nothing: his history was never
 * written over, so it comes back exactly as he left it.
 */
function LaboratoryNotice() {
  const memory = useMemory()
  if (memory.source !== 'laboratory') return null

  return (
    <div className="lab-notice" role="status">
      <span className="lab-notice__text">
        This is a test history, not yours. Nothing of yours has been changed.
      </span>
      <button
        type="button"
        className="lab-notice__button"
        disabled={memory.busy}
        onClick={() => void memory.clear()}
      >
        Show mine
      </button>
    </div>
  )
}

/**
 * Life or one of its ten domain pages (canonical plan section 50).
 *
 * A domain page is a second hash segment under Life rather than a
 * destination of its own (section 5's four stay fixed), so the routing here
 * reads the same hash `useDestination` already resolved to `life` and decides
 * only which of the two screens that destination shows.
 */
function LifeRoute() {
  const slug = useLifePageSlug()
  if (slug === undefined) return <LifeScreen />

  const page = pageBySlug(slug)
  if (page === undefined) {
    return (
      <div className="life-route-missing">
        <p>There is no page here.</p>
        <p>
          <a className="domain-linkish" href={hashForDestination('life')}>
            Back to Life
          </a>
        </p>
      </div>
    )
  }

  return <DomainPage page={page} />
}

function screenFor(destination: Destination, freshness: BuildFreshness) {
  switch (destination) {
    case 'now':
      return <NowScreen />
    case 'life':
      return <LifeRoute />
    case 'timeline':
      return <TimelineScreen />
    case 'insights':
      return <InsightsScreen />
    case 'more':
      return <MoreScreen freshness={freshness} />
    case 'data':
      return <DataScreen />
    case 'check-in':
      return <CheckInScreen />
    case 'qa':
      return (
        <LazyScreen label="the QA laboratory">
          <QaScreen />
        </LazyScreen>
      )
  }
}

export function AppShell() {
  const [destination, navigate] = useDestination()
  const freshness = useBuildFreshness()

  // Above the screens, so a reminder is not a property of which tab he happens
  // to be standing on — routing 94.
  useCheckInReminder()

  useEffect(() => {
    document.title = `${DESTINATION_LABELS[destination]} · Life Command OS`
  }, [destination])

  return (
    <div className="shell">
      {/*
        One sticky thing, not three (QA-07-006).

        The bar and both notices were each `position: sticky; top: 0`, which
        means that once the page scrolls they all occupy the same coordinate
        and the highest z-index wins. On Data the laboratory notice's **Show
        mine** ended up underneath the More button: the refusal in the Restore
        panel named it as the way out, and a real touch tap at that scroll
        position went to More instead. Only scrolling all the way back to the
        top made the named remedy reachable.

        Sticking the group rather than its members is what makes them stack.
        There are no magic offsets to keep in step with the bar's height, and a
        notice added later inherits the behaviour instead of having to
        rediscover it.
      */}
      <div className="shell__top">
        <TopBar current={destination} onNavigate={navigate} />
        <StaleBuildNotice freshness={freshness} />
        <LaboratoryNotice />
      </div>

      {/* Re-keying on the destination restarts the entry transition, which is
          what makes a tab change read as a change rather than a repaint. */}
      <main className="shell__content" key={destination}>
        {screenFor(destination, freshness)}
      </main>

      <BottomNav current={destination} onNavigate={navigate} />
    </div>
  )
}
