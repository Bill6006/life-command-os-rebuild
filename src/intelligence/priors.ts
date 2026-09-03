import type { LifeDomainId } from '../domain/domains'
import { DOMAIN } from '../domain/domains'
import type { DiscoveryTopic } from './discovery'

/**
 * Research-grounded priors — owner decision #2, **option B only**.
 *
 * ## What this is allowed to do, in the owner's own words
 *
 * *"Research-grounded priors may influence what Life Command OS decides is
 * worth **asking** or **investigating** about the owner."* The four approved
 * uses are: identify potentially useful questions; spend the bounded discovery
 * agenda more intelligently; identify evidence that may be worth seeking; and
 * help the system know where caution or missing evidence matters.
 *
 * ## What it may never do
 *
 * A prior may **not** become a finding about the owner. It may **not**
 * determine recommendations. It may **not** influence recommendation ranking
 * merely because evidence about him is sparse. And it may **not** persist as a
 * substitute for personal evidence.
 *
 * So this module is imported by exactly one file — `discovery.ts` — and
 * `tests/unit/architecture-guards.test.ts` fails the build if anything else
 * reads it. That is the whole enforcement, and it is one line rather than a
 * discipline, because a rule about what a table may influence is otherwise a
 * rule about everybody who might one day import it.
 *
 * ## Why C was declined, and why that matters here
 *
 * Option C would have weakened a prior as personal evidence accumulated. The
 * owner's reasoning inverts the obvious one: **C gets *less* safe as evidence
 * gets sparser.** With no connected data source and a hard three-question daily
 * ceiling, evidence accumulates slowly and permanently — so a mechanism designed
 * to be temporary becomes the standing behaviour, and a rule whose safety
 * depends on a condition that will not arrive is not safe.
 *
 * That is why there is **no decay rule here and no confidence attached to a
 * prior**. There is nothing to decay: a prior orders a question and stops.
 *
 * ## The permission is self-extinguishing, and that is structural
 *
 * *"Research may help decide what is worth learning about the owner. Once he
 * answers, his evidence replaces the prior's role."* The agenda already removes
 * a prompt once the thing it asks about exists, so a prior stops applying the
 * moment he answers — not because it faded, but because there is no longer a
 * question for it to be about.
 *
 * ## And it can always say why it asked
 *
 * *"Provenance must support answering 'why did you ask me this?'"* Every entry
 * carries the claim in plain words and the citation, and `DiscoveryPrompt`
 * carries them to the surface. Nothing here is rendered as a fact about him;
 * what is rendered is why the app thought the question was worth one of two
 * slots a week.
 */

export interface ResearchPrior {
  /** Stable, so a decision-log entry and a rendered line can name the same one. */
  readonly id: string
  /** Which discovery topic it makes more worth asking about. */
  readonly topic: DiscoveryTopic
  readonly domain: LifeDomainId
  /**
   * The claim, in words the owner could read, and about **people** rather than
   * about him.
   *
   * The wording is load-bearing. *"Adults who…"* is a statement about a
   * population; *"you probably…"* is a finding about him, which is the first
   * thing option B forbids. The copy scan cannot tell those apart, so the
   * registry test does: an entry whose claim uses the second person fails the
   * build.
   */
  readonly claim: string
  /** Where the claim comes from, so the answer to "says who?" is not "the app". */
  readonly citation: string
}

/**
 * The priors, and there are two.
 *
 * Deliberately few. §13C's permission is narrow and its roadmap is *"inside
 * D-163's existing discovery agenda"* — not a knowledge base. Both of these are
 * claims the codebase already relies on and already cites, in `concepts.ts` and
 * in the audit's own AUD-0045 row, so nothing new is being asserted about the
 * world: what is new is that they are allowed to decide which of two questions
 * the app spends a slot on.
 */
export const RESEARCH_PRIORS: readonly ResearchPrior[] = [
  {
    id: 'sleep-self-report-understates',
    /*
     * Attached to *"what would tell you this was actually happening?"* rather
     * than to sleep's own baseline, and the pairing is the point: the research
     * says a felt sense is a weaker signal than a measured quantity, which is
     * exactly why it is worth asking what would count rather than assuming he
     * will notice when it does.
     */
    topic: 'evidence',
    domain: DOMAIN.health,
    claim:
      'Self-rated sleepiness under-reports the impairment of chronic sleep restriction, so how rested a person feels is a weaker signal than how much they actually slept.',
    citation: 'Van Dongen et al., Sleep 26(2):117–126, 2003',
  },
  {
    id: 'movement-has-two-halves',
    /*
     * Attached to the aspiration question because that is the one it makes
     * worth asking early: the app has one movement verb, and what he is aiming
     * at in this area is what decides whether the half it can express is the
     * half he means.
     */
    topic: 'aspiration',
    domain: DOMAIN.health,
    claim:
      'The standard adult recommendation has two halves — moderate aerobic activity across the week, and muscle-strengthening on two or more days — so knowing only that someone walks describes one of them.',
    citation: 'Bull et al., WHO 2020 guidelines, BJSM 54:1451–1462',
  },
]

/**
 * The prior that speaks to a prompt, if one does.
 *
 * Matched on the topic and the area together, because a prior about sleep says
 * nothing about what is worth asking in Career. Returns at most one: two priors
 * arguing for the same question would be a weight, and a weight is the thing
 * option D was refused for.
 */
export function priorFor(topic: DiscoveryTopic, domain: LifeDomainId): ResearchPrior | undefined {
  return RESEARCH_PRIORS.find((prior) => prior.topic === topic && prior.domain === domain)
}
