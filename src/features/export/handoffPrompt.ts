import type { HistorySource } from '../memory/projection'

/**
 * The handoff prompt (canonical plan section 52).
 *
 * Section 52 fixes twelve things this prompt must contain, and they are held
 * here as data rather than as one long template literal for a reason the rest
 * of this repository keeps learning: a requirement written into prose is a
 * requirement nothing can check. `HANDOFF_PARTS` is the list section 52 asks
 * for, in order, and the composer builds the text from it — so a part cannot
 * be dropped by an edit to the wording, and the G-013 regression asserts the
 * parts rather than asserting remembered sentences.
 *
 * ## Why the prompt is this shape
 *
 * It is addressed to an assistant that has never seen this app, reading a
 * document with no other context. Two failure modes follow from that and the
 * prompt is built against both.
 *
 * The first is the assistant treating its own training as the authority on
 * what the owner's life is like. The source-of-truth instruction is the first
 * line for that reason: everything it is entitled to say rests on the document
 * below it, and where the document is silent, the honest answer is that the
 * app does not know — not a reasonable-sounding average.
 *
 * The second is the review coming back as a redesign. An assistant asked
 * "what should change" with no counterweight will find something to change in
 * everything it can see, including the parts that are working and the parts
 * that were deliberate. **What not to change** is therefore a required
 * heading, not a politeness — it is the one that makes the rest of the review
 * usable.
 */

export type HandoffPartId =
  | 'source-of-truth'
  | 'current-state'
  | 'main-limiter'
  | 'app-tuning'
  | 'working'
  | 'drifting'
  | 'change'
  | 'simplify'
  | 'leave-alone'
  | 'next-actions'
  | 'uncertainty'
  | 'questions'

export interface HandoffPart {
  readonly id: HandoffPartId
  /** The heading the reply is asked to use, so the answer comes back sorted. */
  readonly heading: string
  readonly instruction: string
  /** True for the part section 52 makes conditional on diagnostics. */
  readonly onlyWithDiagnostics: boolean
}

export const HANDOFF_PARTS: readonly HandoffPart[] = [
  {
    id: 'source-of-truth',
    heading: 'Source of truth',
    instruction:
      'The document below is the only evidence you have about this person. Treat it as the source of truth, and treat anything absent from it as something the app does not know rather than something to fill in from what is typical. Do not infer a habit, a diagnosis, a relationship or a circumstance that is not recorded here. Where a section says the evidence is thin, that thinness is the finding.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'current-state',
    heading: 'Current state',
    instruction:
      'Review where this person currently is, in your own words, using only what the document shows. Say what the record covers well and what it barely covers at all.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'main-limiter',
    heading: 'Main limiter',
    instruction:
      'Name the single thing most in the way right now, and say what in the document points at it. If the record does not support naming one, say that instead of choosing the most likely-sounding candidate.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'app-tuning',
    heading: 'How the app itself is tuned',
    instruction:
      'The diagnostics section is included, so also review the app rather than only the life it records. Where is it reasoning from too little evidence, stating more than it can support, asking for something it already knows, or staying quiet about something the record clearly shows?',
    onlyWithDiagnostics: true,
  },
  {
    id: 'working',
    heading: 'What is working',
    instruction:
      'What is going well and worth protecting. Be specific about which entries show it.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'drifting',
    heading: 'What is drifting',
    instruction:
      'What has quietly slipped — an area gone quiet, a goal with no recent movement, a pattern going the wrong way. Name the evidence, and distinguish a change in the life from a gap in the record.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'change',
    heading: 'What to change',
    instruction: 'The changes you would make, in priority order, each with the reason under it.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'simplify',
    heading: 'What to remove or simplify',
    instruction:
      'What to stop doing, drop or make smaller. A review that only adds is a review that makes the week heavier.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'leave-alone',
    heading: 'What not to change',
    instruction:
      'What to leave exactly as it is, and why. Include anything the document shows was a deliberate decision. This heading is required — an empty one is a sign the review has not looked for it.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'next-actions',
    heading: 'Next practical actions',
    instruction:
      'A short list of concrete next moves that fit the time, energy and constraints the document records. No programmes, no systems to adopt, nothing that assumes a free evening the record does not show.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'uncertainty',
    heading: 'Where you are unsure',
    instruction:
      'State your uncertainty plainly wherever it exists, and say what evidence would settle it. Do not round a guess up into a conclusion, and do not put a figure on something the document does not count.',
    onlyWithDiagnostics: false,
  },
  {
    id: 'questions',
    heading: 'Questions',
    instruction:
      'Ask only the questions you actually need answered to give a better review, and only where the document cannot answer them. If there are none, say so and finish.',
    onlyWithDiagnostics: false,
  },
]

export interface HandoffPromptOptions {
  /**
   * Whose history this document describes.
   *
   * The prompt's **first sentence** is an identity claim, and it was written
   * once for the owner and used for both (QA-07-002): a synthetic export
   * opened with "you are reviewing one person's own record of his life… he is
   * the owner of everything below", and only disclosed that it was an invented
   * history further down, under a heading. A later correction does not repair
   * an instruction already given — an assistant reading in order has already
   * been told whose life it is by then, and the two statements cannot both be
   * true. D-091's eighth invariant applies to the first line of the artefact,
   * not only to a section of it.
   */
  readonly source: HistorySource
  readonly diagnosticsIncluded: boolean
  readonly privateIncluded: boolean
}

export function handoffPartsFor(options: HandoffPromptOptions): readonly HandoffPart[] {
  return HANDOFF_PARTS.filter((part) => !part.onlyWithDiagnostics || options.diagnosticsIncluded)
}

/**
 * The prompt, as text.
 *
 * The private note is conditional and says which way round it is either way.
 * "This export includes the private section" and silence are not the same
 * message, and a reader who is not told cannot tell a life with nothing
 * private recorded from a document with that part taken out.
 */
export function handoffPrompt(options: HandoffPromptOptions): string {
  const lines: string[] = [
    options.source === 'laboratory'
      ? '**This is not a real person.** What follows was composed from a synthetic test history — an invented life loaded into this app’s QA laboratory to exercise it. Review it as an exercise, say so in your answer, and do not address it as though it were somebody’s own record.'
      : 'You are reviewing one person’s own record of his life, exported from an app he uses to keep it. He is the owner of everything below and has chosen to show it to you.',
    '',
    'Work through the headings below in order, and use them as your headings so the answer comes back in the same shape.',
    '',
  ]

  for (const part of handoffPartsFor(options)) {
    lines.push(`## ${part.heading}`, '', part.instruction, '')
  }

  lines.push(
    '## Tone',
    '',
    'Plain, specific and adult. No praise for having recorded anything, no shame about anything recorded, and no generic wellness language. Name the actual thing rather than the category it belongs to.',
    '',
  )

  lines.push(
    options.privateIncluded
      ? 'One more thing: this export includes the Private / Sexual Health section, deliberately. Treat it as ordinary health information, discuss it as directly as anything else here, and do not moralise about it.'
      : 'One more thing: this export leaves out the Private / Sexual Health section — the entries, and also whether there are any. Nothing below says anything about that area in either direction, and nothing below is worked out from it either, so what the app is saying on his own screen right now may rest on something this document does not have. Read the silence as a choice about this document, not as an empty part of his life, and do not reason from it.',
  )

  return `${lines.join('\n').trimEnd()}\n`
}
