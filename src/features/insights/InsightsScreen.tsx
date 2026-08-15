import { Panel, Screen } from '../../components/ui'

export function InsightsScreen() {
  return (
    <Screen eyebrow="Phase 0" title="Insights" lede="What the system is learning about your life.">
      <Panel title="Nothing learned yet">
        <p>
          Learning needs outcomes, and outcomes need the recommendation loop from Phase 3. Until
          then this stays honestly empty rather than showing patterns nothing has earned.
        </p>
      </Panel>
    </Screen>
  )
}
