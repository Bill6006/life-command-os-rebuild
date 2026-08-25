import type { LifeDomainId } from '../domain/domains'
import type { ActionVerb } from '../domain/recommendation'
import type { Candidate } from './candidates'
import type { Situation } from './situation'

/**
 * The model-assisted seat (canonical plan section 18).
 *
 * Section 18 refuses to inherit "local-only deterministic, no paid AI" as a
 * hard requirement, and asks for an architecture that can put a model in the
 * loop where it demonstrably helps. This file is that seat — and, more
 * importantly, the fence around it.
 *
 * The advisor may do exactly two things:
 *
 *   - **nudge** a candidate the deterministic layer already produced, by a
 *     small bounded amount, with a stated reason;
 *   - **rephrase** the reason line of a candidate, in words that still name the
 *     subject.
 *
 * It may not add a candidate, remove one, write a record, set a fact, change a
 * constraint, or decide anything. Section 18's guardrails are not advice here;
 * they are the shape of the interface. A reply is validated field by field
 * before any of it is used, and anything that does not validate is discarded
 * with a note in the trace rather than partially applied.
 *
 * ## What runs today
 *
 * No network inference is wired up, and deliberately so: section 18 forbids
 * permanent API secrets in the browser and forbids parking the owner's life
 * history on a server so that inference can reach it. Doing this properly needs
 * a small owner-authorised inference service, which is an owner decision and
 * not a developer one. What exists now is the complete pipeline, a local
 * advisor that reads the free text the deterministic rules cannot, and an
 * adversarial advisor used by the tests to prove every guardrail bites.
 */

export interface CandidateDigest {
  readonly id: string
  readonly verb: ActionVerb
  readonly domain: LifeDomainId
  readonly subject: string
  readonly score: number
}

/**
 * What an advisor is allowed to see.
 *
 * Free text and labels, and nothing that identifies the owner. If this ever
 * leaves the device, this shape is the thing that leaves — which is why it is a
 * digest rather than a handle on the situation.
 */
export interface AdvisorRequest {
  readonly block: string
  readonly limiter: string | undefined
  readonly notes: readonly string[]
  readonly candidates: readonly CandidateDigest[]
}

export interface AdvisorNudge {
  readonly candidate: string
  /** Bounded at validation. An advisor can break a tie, not overturn a ranking. */
  readonly adjustment: number
  readonly because: string
}

export interface AdvisorReply {
  readonly nudges: readonly AdvisorNudge[]
}

export interface SemanticAdvisor {
  readonly id: string
  advise(request: AdvisorRequest): AdvisorReply | undefined
}

/**
 * The most an advisor can move a candidate, as a share of the field it is
 * judging — AUD-0039.
 *
 * ## What was wrong with a number
 *
 * The comment above this used to say a nudge "can settle a close contest and
 * cannot reverse a decided one", and 0.06 was chosen against an assumed score
 * range. On the range the evaluator actually produced, an ordinary evening's
 * whole ranked field spanned 0.137 to −0.023 and the top two were 0.002 apart:
 * **0.06 was large on that scale** and would have reversed most rankings the
 * audit observed. The fence was calibrated against a scale nobody had measured,
 * and AUD-0035 was about to change the real one.
 *
 * ## What it is now
 *
 * A quarter of the ranked spread. Two candidates can therefore be moved past
 * each other only if they were inside **half** the spread to begin with —
 * one nudged up by a quarter and the other down by a quarter — so the sentence
 * the old comment made is now a property rather than a hope: a decided contest
 * is one whose gap exceeds half the field, and no advice can turn it over.
 *
 * The ceiling stays, and it is the old absolute. A very wide field must not buy
 * a very large opinion: the advisor is allowed to settle a margin, never to
 * become a dimension in its own right.
 */
export const MAX_NUDGE_SHARE = 0.25

/** The most a nudge may ever be, however wide the field. The old absolute. */
export const MAX_NUDGE = 0.06

/**
 * The bound for one decision, from the spread of the field being judged.
 *
 * A field with one candidate has no spread and no contest to settle, so the
 * bound is zero: there is nothing for an opinion to be about.
 */
export function nudgeBoundFor(scores: readonly number[]): number {
  if (scores.length < 2) return 0
  const spread = Math.max(...scores) - Math.min(...scores)
  return Math.min(MAX_NUDGE, MAX_NUDGE_SHARE * Math.max(0, spread))
}

const MAX_REASON_LENGTH = 160

/** Words that would let a nudge speak with more certainty than it has earned. */
const OVERCONFIDENT = [
  'definitely',
  'certainly',
  'guaranteed',
  'always',
  'never fails',
  'proven',
  'must',
]

export interface AdvisorRejection {
  readonly candidate: string
  readonly problem: string
}

export interface ValidatedAdvice {
  readonly nudges: readonly AdvisorNudge[]
  readonly refused: readonly AdvisorRejection[]
}

/**
 * Strict structured-output validation.
 *
 * Everything is checked against the candidates that actually exist, because the
 * failure that matters is not a malformed number — it is a reply that quietly
 * refers to something the deterministic layer never proposed and gets treated
 * as though it had.
 */
export function validateAdvice(
  reply: AdvisorReply | undefined,
  candidates: readonly Candidate[],
  /**
   * How far a nudge may reach on this decision — AUD-0039.
   *
   * Passed in rather than read from a constant, because it is a property of the
   * ranked field rather than of the advisor. Defaults to the absolute ceiling
   * so a caller that has no field to measure — a guardrail test poking the
   * validator directly — still gets the old, stricter behaviour.
   */
  bound: number = MAX_NUDGE,
): ValidatedAdvice {
  if (reply === undefined) return { nudges: [], refused: [] }

  const known = new Set(candidates.map((candidate) => candidate.id))
  const nudges: AdvisorNudge[] = []
  const refused: AdvisorRejection[] = []
  const seen = new Set<string>()

  const rawNudges: unknown = reply.nudges
  if (!Array.isArray(rawNudges)) {
    return { nudges: [], refused: [{ candidate: '—', problem: 'the reply had no list of nudges' }] }
  }

  for (const entry of rawNudges as readonly unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      refused.push({ candidate: '—', problem: 'not an object' })
      continue
    }
    const nudge = entry as Partial<AdvisorNudge>
    const id = typeof nudge.candidate === 'string' ? nudge.candidate : ''

    if (!known.has(id)) {
      refused.push({ candidate: id === '' ? '—' : id, problem: 'names a move nobody proposed' })
      continue
    }
    if (seen.has(id)) {
      refused.push({ candidate: id, problem: 'named twice' })
      continue
    }
    if (typeof nudge.adjustment !== 'number' || !Number.isFinite(nudge.adjustment)) {
      refused.push({ candidate: id, problem: 'the adjustment is not a number' })
      continue
    }
    if (typeof nudge.because !== 'string' || nudge.because.trim() === '') {
      refused.push({ candidate: id, problem: 'no reason given' })
      continue
    }
    if (nudge.because.length > MAX_REASON_LENGTH) {
      refused.push({ candidate: id, problem: 'the reason is too long to be a reason' })
      continue
    }
    const lowered = nudge.because.toLowerCase()
    if (OVERCONFIDENT.some((word) => lowered.includes(word))) {
      refused.push({ candidate: id, problem: 'speaks with more certainty than it has' })
      continue
    }

    seen.add(id)
    nudges.push({
      candidate: id,
      // Clamped rather than refused: an over-large number is an advisor
      // overreaching, not an advisor malfunctioning, and the cap is the answer.
      adjustment: Math.max(-bound, Math.min(bound, nudge.adjustment)),
      because: nudge.because.trim(),
    })
  }

  return { nudges, refused }
}

// ---------------------------------------------------------------------------
// The local advisor
// ---------------------------------------------------------------------------

/** Free text that says an attempt came apart on a specific thing. */
const SPECIFIC_TROUBLE = ['wrong', 'missed', 'confus', 'lost', 'failed', 'blank', 'stuck']

export function situationNotes(situation: Situation): readonly string[] {
  const notes: string[] = []
  for (const record of situation.view.history.effective) {
    if (record.kind === 'outcome' && record.observation.type === 'text') {
      notes.push(record.observation.value)
    }
    if (record.kind === 'constraint') notes.push(record.description)
  }
  return notes
}

/**
 * A stand-in for the model, reading the text the rules cannot.
 *
 * The deterministic layer knows an outcome was bad; it does not know that "the
 * /26 boundaries went wrong twice" describes a specific misunderstanding rather
 * than a general bad evening — and that distinction is what separates going
 * back over the material from practising recall. That is a genuinely semantic
 * judgement, which is what a model would be brought in for.
 *
 * Keyword matching is a poor imitation of one. It is here to exercise the whole
 * hybrid path end to end — the request, the reply, the validation, the bounded
 * nudge, the trace entry — so that swapping in real inference is a change of
 * adapter rather than a change of architecture.
 */
export const localAdvisor: SemanticAdvisor = {
  id: 'local-semantic',
  advise(request) {
    const specific = request.notes.some((note) =>
      SPECIFIC_TROUBLE.some((marker) => note.toLowerCase().includes(marker)),
    )
    if (!specific) return { nudges: [] }

    const nudges: AdvisorNudge[] = []
    for (const candidate of request.candidates) {
      if (candidate.verb === 'review-weak-topic') {
        nudges.push({
          candidate: candidate.id,
          adjustment: MAX_NUDGE,
          because: `what went wrong with ${candidate.subject} was specific, so going back over it beats practising it`,
        })
      }
      if (candidate.verb === 'recall-practice') {
        nudges.push({
          candidate: candidate.id,
          adjustment: -MAX_NUDGE / 2,
          because: `recall works better once the specific gap in ${candidate.subject} is closed`,
        })
      }
    }
    return { nudges }
  },
}
