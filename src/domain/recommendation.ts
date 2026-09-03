import type { LifeDomainId } from './domains'
import type { EntityIndex, EntityRef } from './entities'
import { blockNoun, restOfWord } from './horizon'
import type { RecordId } from './ids'
import type { DayBlock } from './time'

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
  'lighten-the-day',
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
  /**
   * What part of the day the sentence is being said in — AUD-0002.
   *
   * Undefined where the caller genuinely does not know, which is a real case:
   * a Timeline line about a recommendation made months ago is rendered from a
   * record, and a record written before the decision context existed carries no
   * block. Every horizon word below is read from `src/domain/horizon.ts`, whose
   * fallbacks never claim the evening, so an unknown block produces a sentence
   * that is true at any hour rather than one that is true at six.
   */
  readonly block: DayBlock | undefined
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
    // The one live horizon word in this table. `recover` suits the afternoon as
    // well as the evening, so at three o'clock "take tonight as recovery" was
    // the app announcing the wrong time of day inside its own instruction.
    action: ({ object, block }) =>
      block === 'evening' || block === 'late-night'
        ? `Take tonight as recovery — no ${object} session.`
        : `Take ${restOfWord(block)} as recovery — no ${object} session.`,
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
  /*
   * The morning's recovery move — AUD-0003.
   *
   * `protect-sleep` and `wind-down` refuse every block before six and
   * `ease-off` suits only the afternoon, all correctly: telling someone at nine
   * in the morning to start winding down for the night is worse than saying
   * nothing. But when those three were the whole catalogue, a man the app had
   * just told was nine hours short of rest was offered a study session, because
   * the only candidates that could exist before noon were effortful ones.
   *
   * What the morning can honestly offer is not "sleep more now" — the night has
   * gone. After chronic restriction, deficits accumulate and recovery takes
   * several unrestricted nights (Van Dongen et al., *Sleep* 26(2):117–126,
   * 2003), and self-rated sleepiness under-reports the impairment, so the app
   * cannot read this off how he seems. The honest move is *don't put the hard
   * thing in today*.
   *
   * **It defers nothing to tomorrow**, and that is deliberate: the app has no
   * model of what is coming (AUD-0004), so naming tomorrow would be the same
   * confident wrongness this whole phase exists to remove. Deferral becomes
   * available later, through `hold`, once there is a real later block to name.
   */
  'lighten-the-day': {
    label: 'Lighten the day',
    needsPerson: false,
    action: ({ object }) => `Set today up as ${object} — nothing heavy needs to go in.`,
    followUp: ({ object }) => `Did today stay ${object}?`,
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
  /*
   * The move sits on the parent, not on the child — AUD-0016, section 4.4.
   *
   * "Give Adaya a chance at ordering her own food" asks him to test her. The
   * applicable evidence is about ordinary development rather than treatment:
   * scaffolding is the adult pitching assistance slightly ahead of the child's
   * current competence and handing back responsibility as she takes it (Wood,
   * Bruner & Ross, *J. Child Psychol. Psychiatry* 17(2):89–100, 1976), and
   * autonomy support is encouraging self-initiation and giving choice rather
   * than applying pressure (Grolnick & Ryan, *JPSP* 57(2):143–154, 1989). Both
   * describe something the **father** does, and letting her lead is a move he
   * can make.
   */
  'growth-opportunity': {
    label: 'Growth opportunity',
    needsPerson: true,
    action: ({ object, person }) => `Let ${person ?? ''} take the lead on ${object} today.`,
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
    action: ({ object, minutes, block }) =>
      minutes === undefined
        ? `Clear ${object} before ${blockNoun(block)} gets away.`
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
  /*
   * The verb that says *not now* — AUD-0024.
   *
   * "Nothing needs to move on X tonight" was written before there was anything
   * that could generate a hold, and it says the wrong thing: it is a statement
   * that the subject is fine, when the point of a deferral is that the move is
   * worth making and this is the wrong hour for it. Section 19 lists "wait"
   * among valid decisions, and what the app had instead was
   * `nothing-worth-doing` — "nothing is good enough" rather than "not now".
   *
   * **`block` is the block being held *for*, not the one being decided in**, and
   * it is the only template where that is true. A deferral whose sentence named
   * the current hour would be the app announcing the wrong time of day inside
   * its own instruction, which is the class `recover` was repaired for.
   */
  hold: {
    label: 'Later today',
    needsPerson: false,
    action: ({ object, block }) =>
      block === undefined
        ? `${capitaliseFirst(object)} would go better later today.`
        : `${capitaliseFirst(blockNoun(block))} suits ${object} better than now.`,
    followUp: ({ object }) => `Did ${object} happen in the end?`,
  },
}

const TRIGGER_REASONS: Record<WhyNowTrigger, (parts: TemplateParts) => string> = {
  'recent-struggle': ({ subject }) => `You missed parts of ${subject} recently.`,
  'stale-evidence': ({ subject }) => `Nothing has come in about ${subject} for a while.`,
  'goal-behind': ({ subject, goal }) => `${goal ?? subject} is behind where you wanted.`,
  'good-conditions': ({ subject }) => `Conditions suit ${subject} right now.`,
  'constraint-active': ({ subject, block }) =>
    `${capitaliseFirst(blockNoun(block))} is limited, and ${subject} still fits.`,
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
  block?: DayBlock,
  /**
   * When, appended — AUD-0051, and it is never composed here.
   *
   * The templates name a verb, an object and sometimes a duration, and are
   * silent about the moment — which is where a plan fails. Adding an if-then
   * cue is the best-evidenced single lever the product has, and the one rule
   * about it is that **an invented or wrong cue is worse than none**: *"when
   * Adaya's in bed"* on an evening she is not there is exactly the confident
   * wrongness the audit is full of.
   *
   * So this arrives from the caller, already composed from a known fact by
   * `intelligence/cue.ts`, and this layer appends it and nothing else. A
   * template cannot reach for one, because a template has no situation to read
   * and would have to guess.
   *
   * **Absent leaves the sentence byte-identical**, which is the acceptance item
   * — and it is absent almost everywhere.
   */
  cue?: string,
): RenderResult {
  const issues: RenderIssue[] = []

  const rawSubject = index.labelFor(semantics.subject)
  if (rawSubject === undefined) {
    issues.push({ problem: 'unresolved-subject', ref: semantics.subject })
  }
  const subject = rawSubject === undefined ? undefined : ownerPhrase(rawSubject)

  const rawObject = index.labelFor(semantics.target.object)
  if (rawObject === undefined) {
    issues.push({ problem: 'unresolved-object', ref: semantics.target.object })
  }
  const object = rawObject === undefined ? undefined : ownerPhrase(rawObject)

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
    block,
  }

  const summary = semantics.whyNow.summary.trim()
  const said = template.action(parts)
  return {
    ok: true,
    rendered: {
      /*
       * Appended rather than prepended — AUD-0051.
       *
       * Gollwitzer's contingent format is *"when X, then Y"*, and prepending
       * would need the action sentence lower-cased. Every template today opens
       * with an imperative verb and a sixteenth might not, so lower-casing a
       * rendered sentence is one entry away from mangling a proper noun. The
       * moment is named either way, and this way nothing touches the words the
       * catalogue wrote.
       */
      sentence: cue === undefined ? said : `${said.replace(/\.$/, '')} — ${cue}.`,
      reason: summary === '' ? TRIGGER_REASONS[semantics.whyNow.trigger](parts) : summary,
      followUp: template.followUp(parts),
      subjectLabel: subject,
      verbLabel: template.label,
    },
  }
}

function capitaliseFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

export function verbLabel(verb: ActionVerb): string {
  return TEMPLATES[verb].label
}

// ---------------------------------------------------------------------------
// Naming an action, with its subject in it
// ---------------------------------------------------------------------------

/**
 * What a pattern about this verb is called, with the subject in it.
 *
 * DEF-0028's rule applied one level up: a card that says "a suggestion here"
 * four times is the generic language section 4.6 asks the app not to settle for
 * when the subject is known. The object is used where the sentence reads
 * naturally with it, and the fallback names the kind of move rather than
 * reaching for a pronoun.
 *
 * Written per verb rather than composed from a pattern, for the reason the
 * outcome prompts are: a template general enough to cover a lab, a daughter and
 * a night's sleep produces a sentence nobody would say out loud.
 */
const PATTERN_NAME: Record<ActionVerb, (object: string | undefined) => string> = {
  'recall-practice': (o) => (o === undefined ? 'Recall practice' : `Recall practice on ${o}`),
  'review-weak-topic': (o) =>
    o === undefined ? 'Going back over a weak topic' : `Going back over ${o}`,
  'hands-on-lab': (o) => (o === undefined ? 'Hands-on labs' : `Building a lab with ${o}`),
  'protect-sleep': () => 'Protecting your sleep',
  'wind-down': () => 'Winding down',
  recover: () => 'Taking a recovery night',
  'ease-off': () => 'Easing off for the rest of the day',
  'lighten-the-day': () => 'Keeping a day light',
  'time-with': (o) => (o === undefined ? 'Unhurried time with someone' : `Time with ${o}`),
  // The skill label already carries whose it is — DEF-0027, which is why the
  // person is not named a second time here.
  'growth-opportunity': (o) => (o === undefined ? 'A chance to practise' : capitaliseFirst(o)),
  'reach-out': (o) => (o === undefined ? 'Reaching out' : `Reaching out to ${o}`),
  'start-conversation': (o) =>
    o === undefined ? 'Starting a conversation' : `Starting a conversation at ${o}`,
  'reset-space': (o) => (o === undefined ? 'Clearing a space' : `Clearing ${o}`),
  'handle-money-item': (o) => (o === undefined ? 'Dealing with a money job' : `Dealing with ${o}`),
  move: (o) => (o === undefined ? 'Getting some movement in' : `Getting out for ${o}`),
  hold: () => 'Holding off',
}

/**
 * What an action about this verb is called, given its object.
 *
 * Exported so the sweeps can walk the whole catalogue rather than sampling it —
 * the same reason `everyOutcomeQuestion` is exported from `outcomes.ts`. A
 * verb added without a name here would otherwise reach a card as `undefined`,
 * and would do it on whichever history happened to contain that verb.
 *
 * **This is the app's one name for an action, and it lives here so that every
 * layer can reach it — QA-83-002.** It used to live in `insights.ts`, above
 * `learning.ts` and `corrections.ts`, so the belief sentence and the button
 * that corrects it had only `verbLabel` to work with and said *"Move"* under a
 * card headed *"a walk"*. `verbLabel` is the word on the eyebrow of a
 * recommendation; it was never a name for a thing.
 */
/**
 * An owner-written phrase, ready to sit inside a sentence the app composes.
 *
 * One thing, and it is the thing that goes wrong: a generated sentence supplies
 * its own full stop, so a name the owner ended with one produces *"Finish the
 * subnetting lab.."*. Every template here ends its sentence, and every subject
 * inside one may be his words, so the trim belongs at the boundary rather than
 * in each template.
 *
 * **It does not touch his case, and that is deliberate.** Lower-casing a phrase
 * to make it read mid-sentence would also lower-case a person's name, and the
 * standing rule is that the app renders what he calls a thing exactly. A capital
 * inside a sentence is his; a doubled full stop is the app's.
 */
export function ownerPhrase(text: string): string {
  return text.trim().replace(/[.!?]+$/, '')
}

export function patternNameFor(verb: ActionVerb, object: string | undefined): string {
  return PATTERN_NAME[verb](object)
}

/** Every verb the catalogue can render. Used by the pronoun regression. */
export function allActionVerbs(): readonly ActionVerb[] {
  return ACTION_VERBS
}
