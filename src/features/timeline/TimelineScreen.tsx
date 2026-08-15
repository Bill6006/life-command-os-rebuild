import { Panel, Screen } from '../../components/ui'

export function TimelineScreen() {
  return (
    <Screen title="Timeline" lede="The chronological record of what actually happened.">
      <Panel title="Not built yet">
        <p>
          The history behind this is real and is being kept — every observation, correction and
          decision, in order, with what was superseded still there. What is missing is this view of
          it.
        </p>
        <p className="note">
          Nothing is lost in the meantime. When this arrives it will be reading a record that has
          been accumulating since the day it started.
        </p>
      </Panel>
    </Screen>
  )
}
