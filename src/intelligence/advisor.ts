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
 * The most an advisor can move a candidate.
 *
 * Chosen so that a nudge can settle a close contest and cannot reverse a
 * decided one. The deterministic layer stays responsible for the outcome; the
 * advisor is allowed to have an opinion about the margin.
 */
export const MAX_NUDGE = 0.06

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
      adjustment: Math.max(-MAX_NUDGE, Math.min(MAX_NUDGE, nudge.adjustment)),
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
