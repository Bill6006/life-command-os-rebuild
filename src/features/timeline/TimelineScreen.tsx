import { Panel, Screen } from '../../components/ui'

export function TimelineScreen() {
  return (
    <Screen
      eyebrow="Phase 0"
      title="Timeline"
      lede="The chronological record of what actually happened."
    >
      <Panel title="Nothing recorded yet">
        <p>
          Timeline reads from the canonical record store, and that store does not exist until Phase
          1. This is an empty surface, not an empty life — there is genuinely no data behind it yet.
        </p>
      </Panel>
    </Screen>
  )
}
