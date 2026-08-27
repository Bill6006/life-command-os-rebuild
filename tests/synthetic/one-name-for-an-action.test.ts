import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  allActionVerbs,
  patternNameFor,
  verbLabel,
  type ActionVerb,
} from '../../src/domain/recommendation'
import {
  civilDateFromDayId,
  DAY_BLOCKS,
  instantAtLocal,
  localDayIdAt,
  type DayBlock,
} from '../../src/domain/time'
import { describeBelief } from '../../src/intelligence/corrections'
import { decide, type Decision } from '../../src/intelligence/engine'
import { evidenceForDecision } from '../../src/intelligence/insights'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'
import { THREE_DAYS_SINCE_ID } from '../../src/synthetic/journeys'

/**
 * QA-83-002 — one screen, one name for the action it is about.
 *
 * Independent QA read a single Now card that said four different things about
 * one walk:
 *
 * - the headline: _"Move for 25 minutes: **a walk**."_
 * - the learned statement under it: _"**Move** has made little difference…"_
 * - the button that corrects that statement: _"correct what **move** does for
 *   you"_
 * - the evidence panel one tap lower: _"how often **getting out for a walk**…"_
 *
 * The panel was right and it was right alone, and the reason was structural:
 * the table that names an action with its subject in it lived in `insights.ts`,
 * which sits above `learning.ts` and `corrections.ts`. The two files that write
 * the sentence and the button had nothing to reach for but `verbLabel` — a word
 * chosen for the eyebrow of a recommendation card, which is not a name for a
 * thing. **"Move" is not a noun phrase in English and never was.**
 *
 * The table moved down to `domain/recommendation.ts`, beside `verbLabel`, and
 * this holds every layer to it.
 *
 * ## The rule the name obeys, in both directions
 *
 * An `effect` belief pools every episode with a verb, whatever its object. So
 * the object is named **only where the pooled episodes agree on one** — the
 * rule `patternName` has always used in `insights.ts`. Naming one object across
 * a pooled walk and a pooled bike ride would be a claim narrower than its own
 * evidence, which is the same error as calling one occasion "the last few
 * times", pointing the other way.
 */

const ROOT = join(import.meta.dirname, '..', '..')

/** An hour that is unambiguously inside each block, in the owner's own zone. */
const HOUR_IN: Record<DayBlock, number> = {
  'early-morning': 5,
  morning: 9,
  afternoon: 15,
  evening: 20,
  'late-night': 23,
}

function everyDecision(): readonly { readonly where: string; readonly decision: Decision }[] {
  const out: { where: string; decision: Decision }[] = []
  for (const scenario of SCENARIOS) {
    const loaded = snapshotFromWire(scenario.build())
    expect(loaded.loaded, `${scenario.id} should load`).toBe(true)
    const date = civilDateFromDayId(localDayIdAt(scenario.now, scenario.zone))
    for (const block of DAY_BLOCKS) {
      const now = instantAtLocal(
        { ...date, hour: HOUR_IN[block], minute: 0, second: 0 },
        scenario.zone,
      )
      const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
      out.push({
        where: `${scenario.id} at ${block}`,
        decision: decide(buildView(loaded.snapshot, moment), moment),
      })
    }
  }
  return out
}

describe('QA-83-002 — the reported card, read the way QA read it', () => {
  it('names the walk in the statement and in the button that corrects it', () => {
    const scenario = scenarioById(THREE_DAYS_SINCE_ID)!
    const loaded = snapshotFromWire(scenario.build())
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const decision = decide(buildView(loaded.snapshot, moment), moment)
    const explanation = decision.explanation

    expect(explanation?.rendered.sentence).toContain('a walk')
    expect(explanation?.restsOn).toBe(
      'Getting out for a walk has made little difference in situations like tonight.',
    )
    expect(explanation?.restsOnNamed).toBe('Getting out for a walk')
    expect(
      describeBelief(
        explanation!.restsOnBelief!,
        decision.situation.entities,
        explanation!.restsOnNamed,
      ),
    ).toBe('what getting out for a walk does for you')

    // And the panel that was already right is still right, and now agrees.
    const evidence = evidenceForDecision(decision)
    expect(evidence?.rates.map((rate) => rate.measures).join(' ')).toContain(
      'getting out for a walk',
    )
    expect(evidence?.concluded).toBe(explanation?.restsOn)
  })
})

describe('QA-83-002 — the class, swept', () => {
  it('takes the subject of a belief sentence from the naming table, never from the verb label', () => {
    /*
     * The instance was `verbLabel('move')` — "Move". The class is a belief
     * sentence whose subject came from anywhere but the one naming table.
     *
     * Stated as *where the name came from* rather than as *which words it is
     * not*. A first draft of this asserted that the sentence never opens with a
     * verb label, and it failed on "Recall practice on subnetting", which is
     * the correctly named form and happens to extend its own label. Asking
     * whether the subject is a value the table can produce separates the two
     * without a list of exceptions.
     */
    const offenders: string[] = []

    for (const { where, decision } of everyDecision()) {
      const explanation = decision.explanation
      const named = explanation?.restsOnNamed
      const target = decision.evaluation?.candidate.semantics.target
      if (explanation?.restsOn === undefined || named === undefined || target === undefined)
        continue

      const fromTheTable =
        named === patternNameFor(target.verb, undefined) ||
        named === patternNameFor(target.verb, decision.situation.entities.labelFor(target.object))
      if (!fromTheTable) {
        offenders.push(`${where}: "${named}" is not a name \`patternNameFor\` can produce`)
      }
      if (named === verbLabel(target.verb) && named !== patternNameFor(target.verb, undefined)) {
        offenders.push(`${where}: "${named}" is the verb label rather than the action's name`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('says the same name in the statement, the button and the panel', () => {
    const offenders: string[] = []

    for (const { where, decision } of everyDecision()) {
      const explanation = decision.explanation
      const named = explanation?.restsOnNamed
      const belief = explanation?.restsOnBelief
      if (explanation?.restsOn === undefined || named === undefined || belief === undefined)
        continue

      if (!explanation.restsOn.startsWith(named)) {
        offenders.push(`${where}: "${explanation.restsOn}" does not open with "${named}"`)
      }

      const button = describeBelief(belief, decision.situation.entities, named)
      if (!button.toLowerCase().includes(named.toLowerCase())) {
        offenders.push(`${where}: the button says "${button}" about "${named}"`)
      }

      const concluded = evidenceForDecision(decision)?.concluded
      if (concluded !== undefined && concluded !== explanation.restsOn) {
        offenders.push(
          `${where}: the panel concludes "${concluded}" and Now says "${explanation.restsOn}"`,
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it('has a generic name for every verb, and puts the object in it where it takes one', () => {
    /*
     * The rates and the split are pooled by verb, so both are named from their
     * own set — and where a set spans two objects, neither is named and the
     * generic form has to be a sentence subject a person would say.
     *
     * Some verbs deliberately ignore the object: winding down and protecting
     * sleep are about the owner, not about a thing. Those are named here rather
     * than exempted, because a verb quietly dropping its subject is the defect
     * this file is about.
     */
    const ABOUT_THE_OWNER: readonly ActionVerb[] = [
      'protect-sleep',
      'wind-down',
      'recover',
      'ease-off',
      'lighten-the-day',
      'hold',
    ]

    for (const verb of allActionVerbs()) {
      const generic = patternNameFor(verb, undefined)
      const named = patternNameFor(verb, 'the kitchen')
      expect(generic.length, `${verb} has no generic name`).toBeGreaterThan(0)
      expect(generic, `${verb}'s generic name is a bare verb`).toMatch(/\s/)
      if (ABOUT_THE_OWNER.includes(verb)) {
        expect(named, `${verb} should not take an object`).toBe(generic)
        continue
      }
      // `growth-opportunity` capitalises the skill, because the skill label is
      // the whole subject there (DEF-0027). Compared case-insensitively so that
      // one deliberate difference does not need an exemption.
      expect(named.toLowerCase(), `${verb} drops its object`).toContain('the kitchen')
    }
  })

  it('keeps the table where every layer can reach it', () => {
    /*
     * The structural half. `learning.ts` and `corrections.ts` sit below
     * `insights.ts`, so while the table lived there they could not have named
     * an action however carefully they were written. A guard on the file it
     * lives in is what stops it drifting back up.
     */
    const domain = readFileSync(join(ROOT, 'src/domain/recommendation.ts'), 'utf8')
    expect(domain).toMatch(/const PATTERN_NAME: Record<ActionVerb/)
    expect(domain).toMatch(/export function patternNameFor/)

    for (const file of ['src/intelligence/learning.ts', 'src/intelligence/corrections.ts']) {
      const text = readFileSync(join(ROOT, file), 'utf8')
      expect(text, `${file} should read the one naming table`).toMatch(/patternNameFor/)
    }
  })

  it('has a name for every verb in the catalogue', () => {
    // A verb added without a name reaches a card as `undefined`, and does it on
    // whichever history happens to contain that verb.
    for (const verb of allActionVerbs() as readonly ActionVerb[]) {
      expect(patternNameFor(verb, undefined), verb).toBeTruthy()
      expect(patternNameFor(verb, 'something'), verb).toBeTruthy()
    }
  })
})
