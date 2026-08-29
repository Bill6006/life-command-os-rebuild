import { coreDomains } from '../../src/domain/domains'
import {
  instant,
  timeZone,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../../src/domain/time'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation, type Situation } from '../../src/intelligence/situation'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import {
  composeExport,
  type ComposedExport,
  type ExportApp,
} from '../../src/features/export/compose'
import type { ExportSectionId } from '../../src/features/export/sections'
import type { HistorySource } from '../../src/features/memory/projection'
import { REBUILD_PHASE } from '../../src/platform/buildInfo'
import { loadScenario, type LoadedScenario } from './harness'

/**
 * Composing an export from a golden scenario, once per distinct request.
 *
 * The memo is not a micro-optimisation. Composing runs `assembleSituation`,
 * the whole decision and the insights report, and the two export suites
 * between them ask for that over every scenario in the library several times
 * over. Unmemoised it was enough load to time out two *unrelated* pure suites
 * running beside it — a test that makes another test fail is worse than a slow
 * one, because the failure lands somewhere nobody will look for it.
 */

/** When the test documents are composed, and where. Never a scenario's clock. */
export const COMPOSED_AT = instant(Date.parse('2026-08-23T18:00:00Z'))
export const COMPOSED_ZONE = timeZone('America/Denver')

export const TEST_APP: ExportApp = {
  commitShort: 'abc1234',
  commitSha: 'abc1234'.padEnd(40, '0'),
  target: 'preview',
  buildTime: '2026-05-01T09:00:00.000Z',
  phaseNumber: REBUILD_PHASE.number,
  phaseTitle: REBUILD_PHASE.title,
  phaseSummary: REBUILD_PHASE.summary,
}

export interface ScenarioContext {
  readonly loaded: LoadedScenario
  readonly situation: Situation
  readonly moment: {
    readonly now: Instant
    readonly zone: TimeZoneId
    readonly weekStartsOn: WeekStartDay
  }
}

const scenarios = new Map<string, ScenarioContext>()
const composed = new Map<string, ComposedExport>()

export function contextFor(scenarioId: string): ScenarioContext {
  const held = scenarios.get(scenarioId)
  if (held !== undefined) return held

  const loaded = loadScenario(scenarioId)
  const moment = {
    now: loaded.scenario.now,
    zone: loaded.scenario.zone,
    weekStartsOn: loaded.scenario.weekStartsOn ?? (1 as WeekStartDay),
  }
  const situation = assembleSituation(loaded.view(), { ...moment, domains: coreDomains })
  const context: ScenarioContext = { loaded, situation, moment }
  scenarios.set(scenarioId, context)
  return context
}

interface ScenarioEngines {
  readonly decision: ReturnType<typeof decide>
  readonly insights: ReturnType<typeof insightsFor>
  readonly timeline: ReturnType<typeof assembleTimeline>
}

const engines = new Map<string, ScenarioEngines>()

export function composeFor(
  scenarioId: string,
  sections: readonly ExportSectionId[],
  source: HistorySource = 'owner',
): ComposedExport {
  const key = `${scenarioId}|${[...sections].sort().join(',')}|${source}`
  const held = composed.get(key)
  if (held !== undefined) return held

  const { loaded, situation, moment } = contextFor(scenarioId)

  /*
   * The decision, the insights and the timeline are functions of the history,
   * not of which sections were ticked — so they are worked out once per
   * scenario rather than once per document.
   *
   * QA-84-030 made the guarantee a walk over every selection on every history,
   * which is 1,023 documents per scenario. Recomputing all three for each of
   * them made the walk cost minutes; they are identical every time.
   */
  let parts = engines.get(scenarioId)
  if (parts === undefined) {
    parts = {
      decision: decide(loaded.view(), moment),
      insights: insightsFor(situation),
      timeline: assembleTimeline(situation),
    }
    engines.set(scenarioId, parts)
  }

  const result = composeExport({
    sections,
    situation,
    decision: parts.decision,
    insights: parts.insights,
    timeline: parts.timeline,
    source,
    app: TEST_APP,
    // A fixed real moment, so a scenario's own clock never dates the document.
    composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
  })
  composed.set(key, result)
  return result
}
