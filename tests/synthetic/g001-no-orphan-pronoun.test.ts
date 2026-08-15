import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import {
  createEntity,
  createEntityIndex,
  entityRef,
  type SemanticEntity,
} from '../../src/domain/entities'
import {
  ACTION_VERBS,
  WHY_NOW_TRIGGERS,
  renderRecommendation,
  type ActionVerb,
  type RecommendationSemantics,
  type WhyNowTrigger,
} from '../../src/domain/recommendation'
import { instant, type Instant } from '../../src/domain/time'
import { loadScenario, orphanPronounsIn, recommendationsIn } from './harness'

/**
 * G-001 — no orphan pronoun.
 *
 * Input: the owner is studying a specific technical concept and recently
 * struggled with it. Expected: the recommendation names the concept, the
 * follow-up names the concept, and no vague "it".
 *
 * The scenario below proves the case. The sweep after it proves the class:
 * every verb and every reason the catalogue can produce is checked, so a new
 * template cannot reintroduce the defect one entry at a time (section 42).
 */

describe('G-001 — the recommendation keeps its subject', () => {
  const loaded = loadScenario('subnetting-struggle')
  const view = loaded.view()

  it('has exactly one recommendation to judge', () => {
    expect(recommendationsIn(view)).toHaveLength(1)
  })

  it('names subnetting in the sentence, the reason and the follow-up', () => {
    const [recommendation] = recommendationsIn(view)
    expect(recommendation).toBeDefined()
    if (recommendation === undefined) return

    const result = renderRecommendation(recommendation.recommendation, view.entities)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.rendered.sentence).toBe(
      'Spend 10 minutes recalling subnetting before you reopen your notes.',
    )
    expect(result.rendered.reason).toBe('You missed parts of subnetting recently.')
    expect(result.rendered.followUp).toBe('How did the subnetting recall go?')

    for (const line of [
      result.rendered.sentence,
      result.rendered.reason,
      result.rendered.followUp,
    ]) {
      expect(line.toLowerCase()).toContain('subnetting')
      expect(orphanPronounsIn(line), line).toEqual([])
    }
  })

  it('still names subnetting when the goal is what is behind', () => {
    const [recommendation] = recommendationsIn(view)
    if (recommendation === undefined) return

    const result = renderRecommendation(
      {
        ...recommendation.recommendation,
        whyNow: { trigger: 'goal-behind', summary: '', evidence: [] },
      },
      view.entities,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rendered.reason).toBe('the CCNA is behind where you wanted.')
    expect(orphanPronounsIn(result.rendered.reason)).toEqual([])
  })

  it('shows nothing at all rather than a sentence about "it"', () => {
    const [recommendation] = recommendationsIn(view)
    if (recommendation === undefined) return

    // The entity index has lost the topic — a broken import, a bad migration.
    const result = renderRecommendation(recommendation.recommendation, createEntityIndex([]))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.map((issue) => issue.problem)).toContain('unresolved-subject')
  })
})

// ---------------------------------------------------------------------------
// The class, not just the case
// ---------------------------------------------------------------------------

const T: Instant = instant(Date.parse('2026-03-10T02:30:00Z'))

/** Deliberately pronoun-free labels, so anything found came from a template. */
function fixtureEntities(): readonly SemanticEntity[] {
  const child = createEntity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
    createdAt: T,
  })

  return [
    child,
    createEntity({
      kind: 'development-skill',
      label: 'ordering food independently',
      domain: DOMAIN.fatherhood,
      privacy: 'child-family-sensitive',
      createdAt: T,
      links: [{ relation: 'about-person', target: child.id }],
    }),
    createEntity({
      kind: 'goal',
      label: 'the CCNA',
      domain: DOMAIN.career,
      privacy: 'normal',
      createdAt: T,
    }),
  ]
}

function semanticsFor(verb: ActionVerb, trigger: WhyNowTrigger): RecommendationSemantics {
  // One subject for every verb, which makes some pairings read oddly — sending
  // a message to a development skill, say. That is deliberate. This sweep is
  // about template shape, not about whether the engine would ever choose the
  // pairing; the growth verb needs a skill because it reaches through to the
  // child, so the skill is what every verb gets.
  const subject = entityRef('development-skill', 'ordering food independently')
  return {
    subject,
    domain: DOMAIN.fatherhood,
    target: { verb, object: subject, minutes: 15 },
    whyNow: { trigger, summary: '', evidence: [] },
    relatedGoal: entityRef('goal', 'the CCNA'),
    evidence: [],
  }
}

describe('G-001 — no template anywhere can produce an orphan pronoun', () => {
  const index = createEntityIndex(fixtureEntities())

  it('covers every verb in the catalogue', () => {
    expect(ACTION_VERBS.length).toBeGreaterThan(10)

    for (const verb of ACTION_VERBS) {
      const result = renderRecommendation(semanticsFor(verb, 'good-conditions'), index)
      expect(result.ok, verb).toBe(true)
      if (!result.ok) continue

      for (const line of [result.rendered.sentence, result.rendered.followUp]) {
        expect(orphanPronounsIn(line), `${verb}: "${line}"`).toEqual([])
        expect(line.toLowerCase(), `${verb} must name its subject`).toContain(
          'ordering food independently',
        )
      }
    }
  })

  it('covers every reason the catalogue can give', () => {
    for (const trigger of WHY_NOW_TRIGGERS) {
      const result = renderRecommendation(semanticsFor('recall-practice', trigger), index)
      expect(result.ok, trigger).toBe(true)
      if (!result.ok) continue

      const reason = result.rendered.reason
      expect(orphanPronounsIn(reason), `${trigger}: "${reason}"`).toEqual([])
      // Every reason names either the subject or the goal it serves — never
      // neither.
      const namesSomething =
        reason.toLowerCase().includes('ordering food independently') ||
        reason.toLowerCase().includes('the ccna')
      expect(namesSomething, `${trigger}: "${reason}"`).toBe(true)
    }
  })

  it('also renders cleanly with no duration and no goal', () => {
    for (const verb of ACTION_VERBS) {
      const base = semanticsFor(verb, 'nothing-better')
      const bare: RecommendationSemantics = {
        subject: base.subject,
        domain: base.domain,
        target: { verb, object: base.target.object },
        whyNow: base.whyNow,
        evidence: [],
      }

      const result = renderRecommendation(bare, index)
      expect(result.ok, verb).toBe(true)
      if (!result.ok) continue
      expect(orphanPronounsIn(result.rendered.sentence), verb).toEqual([])
      expect(orphanPronounsIn(result.rendered.reason), verb).toEqual([])
      expect(orphanPronounsIn(result.rendered.followUp), verb).toEqual([])
    }
  })

  it('refuses every verb when the subject cannot be resolved', () => {
    const empty = createEntityIndex([])
    for (const verb of ACTION_VERBS) {
      const result = renderRecommendation(semanticsFor(verb, 'good-conditions'), empty)
      expect(result.ok, `${verb} rendered without its subject`).toBe(false)
    }
  })
})
