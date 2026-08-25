import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import {
  createEntity,
  createEntityIndex,
  entityRef,
  type SemanticEntity,
} from '../../src/domain/entities'
import { renderRecommendation, type RecommendationSemantics } from '../../src/domain/recommendation'
import { instant, type Instant } from '../../src/domain/time'

const T: Instant = instant(Date.parse('2026-03-10T02:30:00Z'))

const subnetting = createEntity({
  kind: 'learning-topic',
  label: 'subnetting',
  domain: DOMAIN.career,
  privacy: 'normal',
  createdAt: T,
})

const ccna = createEntity({
  kind: 'goal',
  label: 'the CCNA',
  domain: DOMAIN.career,
  privacy: 'normal',
  createdAt: T,
})

const adaya = createEntity({
  kind: 'person',
  label: 'Adaya',
  domain: DOMAIN.fatherhood,
  privacy: 'child-family-sensitive',
  createdAt: T,
})

const orderingFood = createEntity({
  kind: 'development-skill',
  label: 'ordering food independently',
  domain: DOMAIN.fatherhood,
  privacy: 'child-family-sensitive',
  createdAt: T,
  links: [{ relation: 'about-person', target: adaya.id }],
})

function indexOf(entities: readonly SemanticEntity[]) {
  return createEntityIndex(entities)
}

function studyRecommendation(overrides: Partial<RecommendationSemantics> = {}) {
  const base: RecommendationSemantics = {
    subject: entityRef('learning-topic', 'subnetting'),
    domain: DOMAIN.career,
    target: {
      verb: 'recall-practice',
      object: entityRef('learning-topic', 'subnetting'),
      minutes: 10,
    },
    whyNow: { trigger: 'recent-struggle', summary: '', evidence: [] },
    evidence: [],
  }
  return { ...base, ...overrides }
}

describe('the sentence comes from the structure', () => {
  it('names the exact subject', () => {
    const result = renderRecommendation(studyRecommendation(), indexOf([subnetting]))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.rendered.sentence).toBe(
      'Spend 10 minutes recalling subnetting before you reopen your notes.',
    )
    expect(result.rendered.followUp).toBe('How did the subnetting recall go?')
    expect(result.rendered.subjectLabel).toBe('subnetting')
  })

  it('leaves out a duration nobody gave it rather than inventing one', () => {
    const result = renderRecommendation(
      studyRecommendation({
        target: { verb: 'recall-practice', object: entityRef('learning-topic', 'subnetting') },
      }),
      indexOf([subnetting]),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rendered.sentence).toBe(
      'Recall what you can about subnetting before you reopen your notes.',
    )
    expect(result.rendered.sentence).not.toMatch(/\d/)
  })

  it('derives a reason from the trigger when none was written', () => {
    const result = renderRecommendation(studyRecommendation(), indexOf([subnetting]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rendered.reason).toBe('You missed parts of subnetting recently.')
  })

  it('prefers the authored reason when there is one', () => {
    const result = renderRecommendation(
      studyRecommendation({
        whyNow: {
          trigger: 'recent-struggle',
          summary: 'The /26 cases went wrong twice yesterday.',
          evidence: [],
        },
      }),
      indexOf([subnetting]),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rendered.reason).toBe('The /26 cases went wrong twice yesterday.')
  })
})

describe('a broken reference produces nothing rather than a pronoun', () => {
  it('refuses when the subject is not in the index', () => {
    const result = renderRecommendation(studyRecommendation(), indexOf([]))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues).toContainEqual({
      problem: 'unresolved-subject',
      ref: entityRef('learning-topic', 'subnetting'),
    })
  })

  it('refuses when the reference names the wrong kind of thing', () => {
    // Same slug, different kind: a real mistake, not a near miss to smooth over.
    const result = renderRecommendation(
      studyRecommendation({ subject: entityRef('skill', 'subnetting') }),
      indexOf([subnetting]),
    )
    expect(result.ok).toBe(false)
  })

  it('refuses when a related goal is dangling', () => {
    const result = renderRecommendation(
      studyRecommendation({ relatedGoal: entityRef('goal', 'the CCNA') }),
      indexOf([subnetting]),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.map((issue) => issue.problem)).toContain('unresolved-goal')
  })

  it('renders once the goal is there', () => {
    const result = renderRecommendation(
      studyRecommendation({
        relatedGoal: entityRef('goal', 'the CCNA'),
        whyNow: { trigger: 'goal-behind', summary: '', evidence: [] },
      }),
      indexOf([subnetting, ccna]),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rendered.reason).toBe('the CCNA is behind where you wanted.')
  })
})

describe('a person comes from the model, never from a pronoun', () => {
  const growth: RecommendationSemantics = {
    subject: entityRef('development-skill', 'ordering food independently'),
    domain: DOMAIN.fatherhood,
    target: {
      verb: 'growth-opportunity',
      object: entityRef('development-skill', 'ordering food independently'),
    },
    whyNow: { trigger: 'opportunity-window', summary: '', evidence: [] },
    evidence: [],
  }

  it('walks the skill to the child it belongs to', () => {
    const result = renderRecommendation(growth, indexOf([orderingFood, adaya]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rendered.sentence).toBe(
      'Let Adaya take the lead on ordering food independently today.',
    )
    expect(result.rendered.followUp).toBe('How did Adaya do with ordering food independently?')
  })

  it('refuses rather than saying "her" when the link is missing', () => {
    const orphan = createEntity({
      kind: 'development-skill',
      label: 'ordering food independently',
      domain: DOMAIN.fatherhood,
      privacy: 'child-family-sensitive',
      createdAt: T,
    })
    const result = renderRecommendation(growth, indexOf([orphan]))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.map((issue) => issue.problem)).toContain('unresolved-person')
  })
})
