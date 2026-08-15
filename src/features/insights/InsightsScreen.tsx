import { Panel, Screen } from '../../components/ui'

export function InsightsScreen() {
  return (
    <Screen title="Insights" lede="What the system is learning about your life.">
      <Panel title="Nothing learned yet">
        <p>
          Learning needs outcomes — what actually happened after a move was made — and the app is
          not yet asking. Until it does, this stays honestly empty rather than showing patterns
          nothing has earned.
        </p>
      </Panel>
    </Screen>
  )
}
