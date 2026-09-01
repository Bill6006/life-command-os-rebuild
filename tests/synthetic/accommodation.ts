/**
 * The structural accommodation list, as a table a test can hold — routing 90,
 * package 90.3.
 *
 * ## What this is for
 *
 * Canonical section 54 names nine relationships the visual design must **leave
 * room for without building**, and the second adjudication (§6.2) adds six
 * more. The reason is stated in the plan and it is the whole point of the
 * exercise: *"passing the phone gate on a design that forecloses one of these
 * re-opens a passed gate later."* Routing 91 through 97 each land at least one
 * of these rows, and the owner's approval of the design is worth nothing if the
 * first of them has to redraw the screen it lands on.
 *
 * ## Why a table rather than a paragraph
 *
 * The prose version of this list has existed since D-158 and it is not
 * checkable. A phase can say "we left room" about anything. Each row here makes
 * two claims that a machine can falsify:
 *
 * - **`landsIn`** — the composition that would carry it exists **and takes a
 *   variable number of things**, so the row arrives as another item, another
 *   state or another sentence rather than as a redesign. This is the reservation.
 * - **`notBuilt`** — tokens that must be **absent** from the product. This is
 *   the half that stops a visual phase quietly doing routing 91 through 97's
 *   work, and it is the half most likely to catch a real mistake.
 *
 * ## What it does not claim
 *
 * It does not prove the future feature will be easy, and it is not a design for
 * one. `landsIn` proves a *shape* is open; a row could still turn out to need
 * more than the shape allows. What it forecloses is the failure this list was
 * written about — arriving at routing 94 and finding that the only place a
 * twelfth domain could go is a navigation pattern the owner has already
 * approved without it.
 */

export interface AccommodationRow {
  /** Stable id, used in the QA report and the design record. */
  readonly id: string
  /** The row, in the plan's own words. */
  readonly row: string
  /** Where it lands, and the routing that lands it. */
  readonly lands: string
  readonly routing: string
  /**
   * The reservation: a file, and text in it that proves the composition takes a
   * variable number of things rather than a fixed arrangement.
   */
  readonly landsIn: readonly { readonly file: string; readonly proof: readonly string[] }[]
  /**
   * Tokens that must not appear anywhere under `src/`, matched on word
   * boundaries. Absence is the claim, so each is chosen to be specific enough
   * that its presence would mean the feature and not merely a word — and the
   * boundary is why: a plain substring search reported the row for a twelfth
   * domain as *built* because `invalidating` and `redating` contain "dating".
   *
   * **Ignored once {@link landed} is set**, because a row the phase that owns it
   * has built is no longer a reservation.
   */
  readonly notBuilt: readonly string[]
  /**
   * The routing that actually built this row, once one has — routing 91.
   *
   * ## Why a row needs this at all
   *
   * The list is written as fifteen absences, and an absence check goes green on
   * a repository that has built the feature under different identifiers. That is
   * D-238's exact defect class — *green over the thing it was named for* — and
   * it would arrive here the first time one of these rows landed, silently, with
   * `routing` still saying which phase was supposed to land it.
   *
   * So a landed row swaps one claim for the other: the tokens stop being checked
   * for absence, and {@link built} is checked for presence instead. The row is
   * kept rather than deleted, because what it now records is that the shape the
   * visual phase reserved is the shape the later phase used.
   */
  readonly landed?: string
  /**
   * Where the landed row actually is, in the same file-and-text form as
   * {@link landsIn}. Required whenever {@link landed} is set, and checked.
   */
  readonly built?: readonly { readonly file: string; readonly proof: readonly string[] }[]
}

const PANELS = 'src/features/life/DomainPanels.tsx'
const PAGE = 'src/features/life/DomainPage.tsx'
const INSIGHTS = 'src/intelligence/insights.ts'
const PAGES = 'src/features/life/domainPages.ts'

/** Section 54's nine, then the second adjudication's six. */
export const ACCOMMODATION: readonly AccommodationRow[] = [
  {
    id: 'A1',
    row: 'A course of action carrying a review status and a verdict sentence.',
    lands: 'The thread object’s own position line, which is already a value rather than a branch.',
    routing: '95',
    landsIn: [
      { file: 'src/intelligence/threads.ts', proof: ['export function describeThreadPosition'] },
      { file: 'src/features/life/Threads.tsx', proof: ['describeThreadPosition'] },
    ],
    // A verdict is a judgement about whether his approach is working — routing 95.
    notBuilt: ['verdictSentence', 'reviewStatus', 'isWorking'],
  },
  {
    id: 'A2',
    row: 'A tradeoff clause naming a longer horizon, inside Q9’s one-additional-clause budget. Not a second card.',
    lands: 'The tradeoff row of the reasoning panel — one row, whose value is a sentence.',
    routing: '95',
    landsIn: [{ file: 'src/features/now/NowScreen.tsx', proof: ['Chosen over'] }],
    notBuilt: ['longerHorizonClause', 'tradeoffHorizon'],
  },
  {
    id: 'A3',
    row: 'A recurring constraint the owner can see and dismiss, on the domain page rather than a new screen.',
    lands: 'The standing-blockers panel, already a list of N with a dismissal on each.',
    routing: '92',
    landsIn: [{ file: PANELS, proof: ['export function BlockersPanel', 'blockers.map'] }],
    notBuilt: ['recurringConstraint', 'constraintRecurrence'],
  },
  {
    id: 'A4',
    row: 'A held intention resolving to fulfilled, missed or expired.',
    lands: 'The commitment’s own state, rendered from a value.',
    landsIn: [{ file: 'src/intelligence/commitments.ts', proof: ['export'] }],
    routing: '96',
    notBuilt: ['intentionOutcome', 'intentionResolution', 'heldIntentionState'],
  },
  {
    id: 'A5',
    row: 'A maintenance-versus-advancement distinction in the reason line, not a chart.',
    lands: 'The `proposedBecause` reason line — one sentence, composed from parts.',
    routing: '95',
    landsIn: [{ file: 'src/intelligence/explain.ts', proof: ['export function describePremise'] }],
    notBuilt: ['maintenanceVersusAdvancement', 'advancementRegister'],
  },
  {
    id: 'A6',
    row: 'An evidence card able to carry a competing explanation and an open question.',
    lands: '`PatternEvidence.reasoning`, which is a list of sentences and takes two more.',
    routing: '93',
    landsIn: [{ file: INSIGHTS, proof: ['readonly reasoning: readonly string[]'] }],
    notBuilt: ['competingExplanation', 'openQuestion'],
  },
  {
    id: 'A7',
    row: 'Domain pages composing a destination section with an existing progression object.',
    lands: 'The domain page, which already renders both a destination and its growth objects.',
    routing: '94',
    landsIn: [{ file: PAGE, proof: ['<DestinationPanel', 'data.skills'] }],
    notBuilt: ['destinationProgression'],
  },
  {
    id: 'A8',
    row: 'A compact reentry state after a long absence: one screen, not a wall of stale cards.',
    lands: 'The grouped stale-belief card — AUD-0044 is the mechanism, and it is built.',
    routing: '95',
    landsIn: [{ file: INSIGHTS, proof: ['function staleBeliefCards', "id: 'stale:several'"] }],
    notBuilt: ['reentryState', 'longAbsence'],
  },
  {
    id: 'A9',
    row: 'A restrained “why am I being asked this?” affordance. No dashboard, no score.',
    lands: 'The prompt’s own `because` sentence — one slot, filled by whatever aimed the question.',
    routing: '92',
    landsIn: [
      { file: 'src/intelligence/discovery.ts', proof: ['because'] },
      { file: 'src/features/insights/Discovery.tsx', proof: ['prompt.note'] },
    ],
    notBuilt: ['whyAsked', 'questionDashboard'],
  },
  {
    id: 'B1',
    row: 'A cross-domain re-file option inside a confirmation block — one option row, not a picker screen.',
    lands: 'The authoring confirmation block, which already draws a list of option rows.',
    routing: '91',
    landsIn: [{ file: PANELS, proof: ['authoring-proposal', 'domain-options'] }],
    notBuilt: ['refileDomain', 'crossDomainRefile'],
    /*
     * Landed, and the shape held: two option rows inside the confirmation
     * block on both aspiration surfaces, with the row that changes nothing
     * selected until the owner says otherwise. No picker screen was added, and
     * `domain-options` is the composition routing 90 reserved.
     */
    landed: '91',
    built: [
      {
        file: PANELS,
        proof: ['destination-keep', 'destination-refile', 'destination-reading-offer'],
      },
      {
        file: 'src/features/insights/Discovery.tsx',
        proof: ['discovery-keep', 'discovery-refile', 'discovery-reading'],
      },
      { file: 'src/intelligence/interpret.ts', proof: ['export function describeOffer'] },
    ],
  },
  {
    id: 'B2',
    row: 'An expectation-and-reconciliation line on an evidence surface: what the app expected, and what happened.',
    lands: '`PatternEvidence.reasoning` again — a second sentence in the same list.',
    routing: '96',
    landsIn: [{ file: INSIGHTS, proof: ['readonly reasoning: readonly string[]'] }],
    notBuilt: ['namedExpectation', 'reconciliationLine', 'whatWasExpected'],
  },
  {
    id: 'B3',
    row: 'A destination that is not moving, readable as a state of the destination rather than as a new card.',
    lands: 'A `data-` state on the destination itself, beside `data-stated` — not a sibling panel.',
    routing: '95',
    landsIn: [{ file: PANELS, proof: ['data-stated'] }],
    notBuilt: ['notMoving', 'destinationStalled', 'stagnation'],
  },
  {
    id: 'B4',
    row: 'Six emotional dimensions as six independently-unknown readings, with no arrangement in which they could be summed or averaged.',
    lands:
      'The concept-reading list, where each row carries its own knowledge state and there is no total row.',
    routing: '92',
    landsIn: [{ file: PAGES, proof: ['function conceptReadings', 'ConceptReading'] }],
    notBuilt: ['emotionalComposite', 'wellbeingScore', 'moodAverage'],
  },
  {
    id: 'B5',
    row: 'A twelfth domain page in navigation — Love / Dating / Romantic Life (D-168).',
    lands:
      '`LIFE_PAGES`, a list the Life overview groups by standing rather than by a fixed layout.',
    routing: '94',
    landsIn: [
      { file: PAGES, proof: ['export const LIFE_PAGES'] },
      { file: 'src/features/life/LifeScreen.tsx', proof: ['pageForDomain'] },
    ],
    notBuilt: ['romantic', 'romanticLife'],
  },
  {
    id: 'B6',
    row: 'A fifth correction gesture — “the record is incomplete here” — stating its consequence before it acts.',
    lands: '`CORRECTION_GESTURES` and its exhaustive consequence table, which is a list of N.',
    routing: '95',
    landsIn: [
      {
        file: 'src/intelligence/corrections.ts',
        proof: ['export const CORRECTION_GESTURES', 'Record<CorrectionGesture'],
      },
    ],
    notBuilt: ['recordIncomplete', 'knownIncomplete'],
  },
  {
    id: 'B7',
    row: 'The “why am I being asked this?” affordance must be able to carry a provenance answer (D-222), and may never render as a claim about the owner.',
    lands: 'The same one `because` slot as A9 — a provenance answer is a different sentence in it.',
    routing: '92',
    landsIn: [{ file: 'src/intelligence/discovery.ts', proof: ['because'] }],
    notBuilt: ['researchPrior', 'populationPrior', 'priorProvenance'],
  },
]
