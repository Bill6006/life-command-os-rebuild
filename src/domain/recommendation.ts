import type { LifeDomainId } from './domains'
import type { EntityIndex, EntityRef } from './entities'
import type { RecordId } from './ids'

/**
 * Recommendation meaning, and the sentence derived from it
 * (canonical plan sections 13.4 and 46).
 *
 * The failure this file exists to prevent: an app that knows the owner was
 * struggling with subnetting, and then says "spend ten minutes on it".
 *
 * So a recommendation is not a string. It is a subject, a domain, an action
 * target, a why-now context, an optional goal and its evidence — and the
 * sentence is composed from those at render time by looking the subject's label
 * up in the entity index. If the subject does not resolve, rendering fails and
 * reports which reference broke. There is no fallback wording, because a
 * fallback is exactly how "it" gets on screen.
 */

export const ACTION_VERBS = [
  'recall-practice',
  'review-weak-topic',
  'hands-on-lab',
  'protect-sleep',
  'wind-down',
  'recover',
  'ease-off',
  'time-with',
  'growth-opportunity',
  'reach-out',
  'start-conversation',
  'reset-space',
  'handle-money-item',
  'move',
  'hold',
] as const

export type ActionVerb = (typeof ACTION_VERBS)[number]

export function isActionVerb(value: unknown): value is ActionVerb {
  return typeof value === 'string' && (ACTION_VERBS as readonly string[]).includes(value)
}

export interface ActionTarget {
  readonly verb: ActionVerb
  readonly object: EntityRef
  /** Omitted rather than guessed. An invented duration is invented precision. */
  readonly minutes?: number
}

export const WHY_NOW_TRIGGERS = [
  'recent-struggle',
  'stale-evidence',
  'goal-behind',
  'good-conditions',
  'constraint-active',
  'deficit',
  'opportunity-window',
  'nothing-better',
] as const

export type WhyNowTrigger = (typeof WHY_NOW_TRIGGERS)[number]

export function isWhyNowTrigger(value: unknown): value is WhyNowTrigger {
  return typeof value === 'string' && (WHY_NOW_TRIGGERS as readonly string[]).includes(value)
}

export interface WhyNowContext {
  readonly trigger: WhyNowTrigger
  /** Owner-facing, one line. Empty means "derive one from the trigger". */
  readonly summary: string
  readonly evidence: readonly RecordId[]
}

export interface RecommendationSemantics {
  readonly subject: EntityRef
  readonly domain: LifeDomainId
  readonly target: ActionTarget
  readonly whyNow: WhyNowContext
  readonly relatedGoal?: EntityRef
  readonly evidence: readonly RecordId[]
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

interface TemplateParts {
  readonly subject: string
  readonly object: string
  readonly person: string | undefined
  readonly goal: string | undefined
  readonly minutes: number | undefined
}

interface VerbTemplate {
  readonly label: string
  /** Extra references that must resolve before a sentence can be composed. */
  readonly needsPerson: boolean
  action(parts: TemplateParts): string
  followUp(parts: TemplateParts): string
}

/**
 * Every sentence here names its subject and contains no pronoun.
 *
 * `tests/synthetic/g001-no-orphan-pronoun.test.ts` walks this whole catalogue
 * and fails if any template renders a bare pronoun, so a new verb cannot
 * reintroduce the defect one entry at a time.
 */
const TEMPLATES: Record<ActionVerb, VerbTemplate> = {
  'recall-practice': {
    label: 'Recall practice',
    needsPerson: false,
    action: ({ object, minutes }) =>
      minutes === undefined
        ? `Recall what you can about ${object} before you reopen your notes.`
        : `Spend ${minutes} minutes recalling ${object} before you reopen your notes.`,
    followUp: ({ object }) => `How did the ${object} recall go?`,
  },
  'review-weak-topic': {
    label: 'Weak-topic review',
    needsPerson: false,
    action: ({ object }) => `Go back over ${object} — the part you keep missing.`,
    followUp: ({ object }) => `How did the ${object} review go?`,
  },
  'hands-on-lab': {
    label: 'Hands-on lab',
    needsPerson: false,
    action: ({ object }) => `Build a small lab with ${object} rather than reading about ${object}.`,
    followUp: ({ object }) => `How did the ${object} lab go?`,
  },
  'protect-sleep': {
    label: 'Protect sleep',
    needsPerson: false,
    action: ({ object }) => `Start ${object} now and let tonight be a recovery night.`,
    followUp: ({ object }) => `Did ${object} happen last night?`,
  },
  'wind-down': {
    label: 'Wind down',
    needsPerson: false,
    action: ({ object }) => `Put the phone down and start ${object}.`,
    followUp: ({ object }) => `Did ${object} happen last night?`,
  },
  recover: {
    label: 'Recover',
    needsPerson: false,
    action: ({ object }) => `Take tonight as recovery — no ${object} session.`,
    followUp: ({ object }) => `Did skipping ${object} leave you better rested?`,
  },
  /*
   * The afternoon's recovery move — DEF-0016.
   *
   * `protect-sleep` and `wind-down` both refuse every block before six, and
   * they are right to: telling someone at a quarter to six to start winding
   * down for the night is worse than saying nothing. But when they were the
   * only recovery moves in the catalogue, being right left a man nine hours
   * short of sleep with "Nothing fits tonight" and no alternative.
   *
   * This is the alternative, and it is a different suggestion rather than the
   * same one with the hour filed off: not bed, but a lower bar for the rest of
   * today.
   */
  'ease-off': {
    label: 'Ease off',
    needsPerson: false,
    action: ({ object }) => `Start ${object} now — the rest of today can be a light one.`,
    followUp: ({ object }) => `Did the rest of the day stay easy after ${object}?`,
  },
  'time-with': {
    label: 'Time with someone',
    needsPerson: false,
    action: ({ object, minutes }) =>
      minutes === undefined
        ? `Spend some unhurried time with ${object}, phone away.`
        : `Spend the next ${minutes} minutes with ${object}, phone away.`,
    followUp: ({ object }) => `How did time with ${object} go?`,
  },
  'growth-opportunity': {
    label: 'Growth opportunity',
    needsPerson: true,
    action: ({ object, person }) => `Give ${person ?? ''} a chance at ${object} today.`,
    followUp: ({ object, person }) => `How did ${person ?? ''} do with ${object}?`,
  },
  'reach-out': {
    label: 'Reach out',
    needsPerson: false,
    action: ({ object }) => `Send ${object} a message today.`,
    followUp: ({ object }) => `Did you reach ${object}?`,
  },
  'start-conversation': {
    label: 'Start a conversation',
    needsPerson: false,
    action: ({ object }) => `Start one real conversation while you are at ${object}.`,
    followUp: ({ object }) => `How did the conversation at ${object} go?`,
  },
  'reset-space': {
    label: 'Reset a space',
    needsPerson: false,
    action: ({ object, minutes }) =>
      minutes === undefined
        ? `Clear ${object} before the evening gets away.`
        : `Spend ${minutes} minutes clearing ${object}.`,
    followUp: ({ object }) => `Did ${object} get cleared?`,
  },
  'handle-money-item': {
    label: 'Handle a money item',
    needsPerson: false,
    action: ({ object }) => `Deal with ${object} today.`,
    followUp: ({ object }) => `Did ${object} get handled?`,
  },
  move: {
    label: 'Move',
    needsPerson: false,
    action: ({ object, minutes }) =>
      minutes === undefined
        ? `Get some movement in: ${object}.`
        : `Move for ${minutes} minutes: ${object}.`,
    followUp: ({ object }) => `Did ${object} happen?`,
  },
  hold: {
    label: 'Hold',
    needsPerson: false,
    action: ({ object }) => `Nothing needs to move on ${object} tonight.`,
    followUp: ({ object }) => `Anything change with ${object}?`,
  },
}

const TRIGGER_REASONS: Record<WhyNowTrigger, (parts: TemplateParts) => string> = {
  'recent-struggle': ({ subject }) => `You missed parts of ${subject} recently.`,
  'stale-evidence': ({ subject }) => `Nothing has come in about ${subject} for a while.`,
  'goal-behind': ({ subject, goal }) => `${goal ?? subject} is behind where you wanted.`,
  'good-conditions': ({ subject }) => `Conditions suit ${subject} right now.`,
  'constraint-active': ({ subject }) => `The evening is limited, and ${subject} still fits.`,
  deficit: ({ subject }) => `${subject} is what is running short.`,
  'opportunity-window': ({ subject }) => `There is a natural opening for ${subject}.`,
  'nothing-better': ({ subject }) => `Nothing else is pressing, and ${subject} moves you forward.`,
}

export type RenderIssue =
  | { readonly problem: 'unresolved-subject'; readonly ref: EntityRef }
  | { readonly problem: 'unresolved-object'; readonly ref: EntityRef }
  | { readonly problem: 'unresolved-goal'; readonly ref: EntityRef }
  | { readonly problem: 'unresolved-person'; readonly ref: EntityRef }
  | { readonly problem: 'unknown-verb'; readonly verb: string }

export interface RenderedRecommendation {
  readonly sentence: string
  readonly reason: string
  readonly followUp: string
  readonly subjectLabel: string
  readonly verbLabel: string
}

export type RenderResult =
  | { readonly ok: true; readonly rendered: RenderedRecommendation }
  | { readonly ok: false; readonly issues: readonly RenderIssue[] }

/**
 * Compose the owner-facing sentence from the structure.
 *
 * Either every reference resolves and the sentence names the real subject, or
 * nothing is rendered and the caller is told which reference is broken. A
 * surface can show that a recommendation could not be displayed; what it must
 * never do is show a confident sentence about "it".
 */
export function renderRecommendation(
  semantics: RecommendationSemantics,
  index: EntityIndex,
): RenderResult {
  const issues: RenderIssue[] = []

  const subject = index.labelFor(semantics.subject)
  if (subject === undefined) issues.push({ problem: 'unresolved-subject', ref: semantics.subject })

  const object = index.labelFor(semantics.target.object)
  if (object === undefined) {
    issues.push({ problem: 'unresolved-object', ref: semantics.target.object })
  }

  let goal: string | undefined
  if (semantics.relatedGoal !== undefined) {
    goal = index.labelFor(semantics.relatedGoal)
    if (goal === undefined) issues.push({ problem: 'unresolved-goal', ref: semantics.relatedGoal })
  }

  const template = TEMPLATES[semantics.target.verb] as VerbTemplate | undefined
  if (template === undefined) {
    issues.push({ problem: 'unknown-verb', verb: semantics.target.verb })
    return { ok: false, issues }
  }

  let person: string | undefined
  if (template.needsPerson) {
    // Walk the subject's own links rather than accepting a loose name: the
    // person a development skill belongs to is part of the model, not a guess.
    person = index.linked(semantics.subject.id, 'about-person')?.label
    if (person === undefined) {
      issues.push({ problem: 'unresolved-person', ref: semantics.subject })
    }
  }

  if (issues.length > 0 || subject === undefined || object === undefined) {
    return { ok: false, issues }
  }

  const parts: TemplateParts = {
    subject,
    object,
    person,
    goal,
    minutes: semantics.target.minutes,
  }

  const summary = semantics.whyNow.summary.trim()
  return {
    ok: true,
    rendered: {
      sentence: template.action(parts),
      reason: summary === '' ? TRIGGER_REASONS[semantics.whyNow.trigger](parts) : summary,
      followUp: template.followUp(parts),
      subjectLabel: subject,
      verbLabel: template.label,
    },
  }
}

export function verbLabel(verb: ActionVerb): string {
  return TEMPLATES[verb].label
}

/** Every verb the catalogue can render. Used by the pronoun regression. */
export function allActionVerbs(): readonly ActionVerb[] {
  return ACTION_VERBS
}
