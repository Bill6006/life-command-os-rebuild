import { useEffect } from 'react'
import { InsightsScreen } from '../insights/InsightsScreen'
import { LifeScreen } from '../life/LifeScreen'
import { MoreScreen } from '../more/MoreScreen'
import { NowScreen } from '../now/NowScreen'
import { TimelineScreen } from '../timeline/TimelineScreen'
import { isPreview, runningBuild } from '../../platform/buildInfo'
import { useDestination, type Destination } from '../../platform/routing'
import { useBuildFreshness, type BuildFreshness } from '../../platform/useBuildFreshness'
import { BottomNav } from './BottomNav'
import './AppShell.css'

const TITLES: Record<Destination, string> = {
  now: 'Now',
  life: 'Life',
  timeline: 'Timeline',
  insights: 'Insights',
  more: 'More',
}

function PreviewStrip() {
  return (
    <div className="preview-strip">
      <span className="preview-strip__label">
        <span className="preview-strip__dot" aria-hidden="true" />
        Preview
      </span>
      <span className="preview-strip__sha">
        <span className="visually-hidden">Build </span>
        {runningBuild.commitShort}
      </span>
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
  }
}

export function AppShell() {
  const [destination, navigate] = useDestination()
  const freshness = useBuildFreshness()

  useEffect(() => {
    document.title = `${TITLES[destination]} · Life Command OS`
  }, [destination])

  return (
    <div className="shell">
      {isPreview ? <PreviewStrip /> : null}
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
