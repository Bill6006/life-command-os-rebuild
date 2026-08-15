import { lazy, useEffect } from 'react'
import { InsightsScreen } from '../insights/InsightsScreen'
import { LifeScreen } from '../life/LifeScreen'
import { MoreScreen } from '../more/MoreScreen'
import { NowScreen } from '../now/NowScreen'
import { TimelineScreen } from '../timeline/TimelineScreen'
import { isPreview, runningBuild } from '../../platform/buildInfo'
import { useDestination, type Destination } from '../../platform/routing'
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
  const inSecondary = current === 'more' || current === 'qa'

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

function screenFor(destination: Destination, freshness: BuildFreshness) {
  switch (destination) {
    case 'now':
      return <NowScreen />
    case 'life':
      return <LifeScreen />
    case 'timeline':
      return <TimelineScreen />
    case 'insights':
      return <InsightsScreen />
    case 'more':
      return <MoreScreen freshness={freshness} />
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

  useEffect(() => {
    document.title = `${DESTINATION_LABELS[destination]} · Life Command OS`
  }, [destination])

  return (
    <div className="shell">
      <TopBar current={destination} onNavigate={navigate} />
      <StaleBuildNotice freshness={freshness} />

      {/* Re-keying on the destination restarts the entry transition, which is
          what makes a tab change read as a change rather than a repaint. */}
      <main className="shell__content" key={destination}>
        {screenFor(destination, freshness)}
      </main>

      <BottomNav current={destination} onNavigate={navigate} />
    </div>
  )
}
