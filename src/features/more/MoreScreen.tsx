import { Panel, Row, Rows, Screen } from '../../components/ui'
import { CheckInSettingsPanel } from './CheckInSettingsPanel'
import { formatBuildTime, REBUILD_PHASE, runningBuild } from '../../platform/buildInfo'
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
      title="More"
      lede="Data, exports, privacy, settings and QA live here rather than taking a primary slot."
    >
      <CheckInSettingsPanel />

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
          <Row label="Leaves your device" value="Only what you export or back up yourself" />
        </Rows>
        <p>
          <a className="qa-link" href={hashForDestination('data')}>
            Exports, backup and restore
          </a>
        </p>
        <p className="note">
          Preview and production keep separate databases, so nothing loaded here can reach a real
          history. A backup is taken from your own records whichever history is on screen.
        </p>
      </Panel>

      <Panel title="Where the rebuild is">
        <Rows>
          <Row label="Phase" value={`${REBUILD_PHASE.number} — ${REBUILD_PHASE.title}`} />
          <Row label="Next" value={REBUILD_PHASE.next} />
        </Rows>
        <p className="note">{REBUILD_PHASE.summary}</p>
      </Panel>
    </Screen>
  )
}
