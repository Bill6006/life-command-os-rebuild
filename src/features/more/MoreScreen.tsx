import { Panel, Row, Rows, Screen } from '../../components/ui'
import { formatBuildTime, runningBuild } from '../../platform/buildInfo'
import { hashForDestination, QA_AVAILABLE } from '../../platform/routing'
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
      eyebrow="Phase 1"
      title="More"
      lede="Data, exports, privacy, settings and QA live here rather than taking a primary slot."
    >
      {QA_AVAILABLE ? (
        <Panel title="QA laboratory">
          <p>
            Synthetic histories, a clock you can move, and everything the system currently believes
            — including the rows it could not read.
          </p>
          <p className="note">
            Synthetic data only. This surface is not built into a production release.
          </p>
          <p>
            <a className="qa-link" href={hashForDestination('qa')}>
              Open the QA laboratory
            </a>
          </p>
        </Panel>
      ) : null}

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
          <Row label="Stored where" value="This device, in a browser database" />
          <Row label="Preview data" value="Synthetic only" />
          <Row label="Leaves your device" value="Nothing" />
        </Rows>
        <p className="note">
          Preview and production keep separate databases, so nothing loaded here can reach a real
          history. Exports, backup and restore arrive in Phase 7.
        </p>
      </Panel>

      <Panel title="Where the rebuild is">
        <Rows>
          <Row label="Phase" value="1 — canonical records and the QA lab" />
          <Row label="Next" value="2 — the intelligence kernel and a real Now" />
        </Rows>
        <p className="note">
          There is a memory now, and a way to inspect it. There is still no engine choosing
          anything: that has to prove itself in Phase 2 before the app grows around it.
        </p>
      </Panel>
    </Screen>
  )
}
