import { Panel, Row, Rows, Screen } from '../../components/ui'
import { formatBuildTime, runningBuild } from '../../platform/buildInfo'
import type { BuildFreshness } from '../../platform/useBuildFreshness'

const TARGET_LABEL: Record<typeof runningBuild.target, string> = {
  preview: 'Preview',
  production: 'Production',
  development: 'Local development',
}

function freshnessSummary(freshness: BuildFreshness): string {
  if (freshness.checking && !freshness.deployed) return 'Checking…'
  if (!freshness.deployed) return 'Could not reach the server'
  if (freshness.isStale) return `Newer build deployed (${freshness.deployed.commitShort})`
  return 'Showing the deployed build'
}

export function MoreScreen({ freshness }: { freshness: BuildFreshness }) {
  return (
    <Screen
      eyebrow="Phase 0"
      title="More"
      lede="Data, exports, privacy, settings and QA live here rather than taking a primary slot."
    >
      <Panel title="This build">
        <Rows>
          <Row label="Environment" value={TARGET_LABEL[runningBuild.target]} />
          <Row label="Commit" value={runningBuild.commitShort} mono />
          <Row label="Full SHA" value={runningBuild.commitSha} mono />
          <Row label="Branch" value={runningBuild.branch} />
          <Row label="Built" value={formatBuildTime(runningBuild.buildTime)} />
          <Row label="Freshness" value={freshnessSummary(freshness)} />
        </Rows>
        <p className="note">
          No service worker is registered, and any worker previously registered here is removed on
          load. A pull-to-refresh always gives you the deployed build.
        </p>
      </Panel>

      <Panel title="Your data">
        <Rows>
          <Row label="Owner data stored" value="None" />
          <Row label="Preview data" value="Synthetic only" />
          <Row label="Leaves your device" value="Nothing" />
        </Rows>
        <p className="note">
          There is no storage layer yet. When there is, real data stays on your device and never
          enters the repository.
        </p>
      </Panel>

      <Panel title="Where the rebuild is">
        <Rows>
          <Row label="Phase" value="0 — foundation and phone preview" />
          <Row label="Next" value="1 — canonical records and QA lab" />
        </Rows>
        <p className="note">
          Exports, backup and restore are Phase 7. The QA inspector arrives with the record store in
          Phase 1.
        </p>
      </Panel>
    </Screen>
  )
}
