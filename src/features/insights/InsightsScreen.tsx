import { Panel, Screen } from '../../components/ui'

/**
 * Insights — what the system is learning (canonical plan section 27).
 *
 * The view is Phase 6. What this screen has to get right until then is the
 * thing it previously got wrong: it said the app was "not yet asking" for
 * outcomes, which stopped being true in Phase 3 and is doubly untrue now that
 * some answers are worked out without being asked at all. A screen describing a
 * capability as absent is a claim, and a claim that quietly expires is worse
 * than no claim — it is the only sentence on the page and it was false.
 */
export function InsightsScreen() {
  return (
    <Screen title="Insights" lede="What the system is learning about your life.">
      <Panel title="Not built yet">
        <p>
          The learning behind this is real and is happening. The app asks what came of a move once
          there is something to say about it, works some answers out from readings you have already
          given rather than asking twice, and lets what it finds change what it suggests next. What
          is missing is this view of it.
        </p>
        <p>
          Nothing is lost in the meantime. When this arrives it will be reading beliefs that have
          been accumulating since the first move you answered.
        </p>
      </Panel>
    </Screen>
  )
}
