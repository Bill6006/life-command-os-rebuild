import { Panel, PrimarySurface, Screen } from '../../components/ui'

export function NowScreen() {
  return (
    <Screen eyebrow="Phase 0" title="Now">
      <PrimarySurface eyebrow="Foundation" headline="The ground is laid. The brain comes next.">
        <p>
          There is nothing to recommend yet — no records, no history, no engine. That is deliberate.
          Phase 1 builds the memory this needs, and Phase 2 has to prove it can choose one genuinely
          good move before the rest of the app is allowed to grow around it.
        </p>
      </PrimarySurface>

      <Panel title="What to judge right now">
        <p>
          Only the feel. The light, the spacing, the type, whether a dark screen reads as alive
          rather than like a cave or a control panel. If it looks bland or lifeless on your phone,
          this phase fails — even with every test green.
        </p>
      </Panel>
    </Screen>
  )
}
