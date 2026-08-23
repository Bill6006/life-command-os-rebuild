import { coreDomains } from '../../src/domain/domains'
import type { Instant, TimeZoneId, WeekStartDay } from '../../src/domain/time'
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

export function composeFor(
  scenarioId: string,
  sections: readonly ExportSectionId[],
  source: HistorySource = 'owner',
): ComposedExport {
  const key = `${scenarioId}|${[...sections].sort().join(',')}|${source}`
  const held = composed.get(key)
  if (held !== undefined) return held

  const { loaded, situation, moment } = contextFor(scenarioId)
  const result = composeExport({
    sections,
    situation,
    decision: decide(loaded.view(), moment),
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source,
    app: TEST_APP,
    at: loaded.scenario.now,
  })
  composed.set(key, result)
  return result
}
