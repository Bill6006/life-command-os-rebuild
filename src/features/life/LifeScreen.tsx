import { List, Panel, Screen } from '../../components/ui'

/**
 * Canonical plan sections 4.1 and 7. The domains are listed to confirm the
 * scope of the model — the inspection pages themselves are Phase 5 work.
 */
const CORE_DOMAINS = [
  'Health & Physical Capacity',
  'Sleep & Recovery',
  'Fatherhood / Family',
  'Career & Learning',
  'Money & Financial Resilience',
  'Social & Relationships',
  'Emotional Health',
  'Faith & Meaning',
  'Home & Environment',
  'Private / Sexual Health',
  'Long-Range Direction / Identity',
]

export function LifeScreen() {
  return (
    <Screen
      eyebrow="Phase 0"
      title="Life"
      lede="Where you come to inspect what the app believes — never to keep it running."
    >
      <Panel title="Eleven domains, none of them optional">
        <p>
          A domain can be quiet, stable, stale or urgent. It is never switched off, and the registry
          stays open so more can be added later.
        </p>
        <List items={CORE_DOMAINS} />
      </Panel>

      <Panel title="Not built yet">
        <p>
          Domain pages, corrections and coverage status arrive in Phase 5, after the decision engine
          has proven itself. Building them earlier would just be a large UI in front of a weak brain
          — the exact failure this rebuild exists to avoid.
        </p>
      </Panel>
    </Screen>
  )
}
