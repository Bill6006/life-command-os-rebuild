import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import { entityId } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import type { RecommendationSemantics } from '../../src/domain/recommendation'
import { BLOCKER_CAUSES, BLOCKER_OPTIONS, blockerConcept } from '../../src/intelligence/blockers'
import { applyConstraints } from '../../src/intelligence/constraints'
import { generateCandidates } from '../../src/intelligence/candidates'
import { assembleSituation } from '../../src/intelligence/situation'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit } from '../../src/synthetic/kit'

/**
 * C21's enforcement half — §6.5's completion condition.
 *
 * ## What was reversed, and what was not
 *
 * `constraints.ts` recorded non-enforcement as deliberate for **every**
 * constraint record: *"a constraint the owner wrote is free text, and guessing
 * which candidates it forbids would be inventing a rule the owner did not
 * state."* Half of that stands and half was too wide.
 *
 * Some constraint records are not free text at all. The app wrote them itself,
 * from a **closed list of causes**, at the moment the owner tapped one, and each
 * carries a structured cause and the object it is about. *"A walk needs
 * somewhere I was not"* needs no interpretation. Not enforcing those was the app
 * capturing an answer honestly and throwing it away — which D-187 named as the
 * honest state **until** something could act on it.
 *
 * ## The completion condition
 *
 * > C21's enforcement proved by reintroduction — **put the non-enforcement back
 * > and watch the test fail.**
 *
 * That is the second describe block. `FilterOptions.enforceStandingBlockers` is
 * the seam that lets the old rule be put back against the *same* history, which
 * is a stronger proof than removing the constraint and watching a rule need
 * evidence.
 */

const A_WALK = { kind: 'routine', id: entityId('routine', 'a walk') } as const
const KITCHEN = { kind: 'place', id: entityId('place', 'the kitchen') } as const

/**
 * An ordinary evening, with or without something he said stops a move.
 *
 * The constraint is written the way `standingBlockerRecords` writes one — the
 * same concept, the same statement — so what is being enforced is a record an
 * owner's tap actually produces.
 */
function anEvening(options: {
  readonly blocked?: (typeof BLOCKER_CAUSES)[number]
  readonly about?: typeof A_WALK | typeof KITCHEN
  readonly until?: string
  /** Which area he was answering about — DEF-0168. The walk's own, by default. */
  readonly recordedIn?: LifeDomainId
}) {
  const kit = createKit('C21', 'Europe/London', '2026-01-01T00:00:00Z')
  const walk = kit.entity({
    id: A_WALK.id,
    kind: 'routine',
    label: 'a walk',
    domain: DOMAIN.health,
    privacy: 'normal',
  })
  const kitchen = kit.entity({
    id: KITCHEN.id,
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })

  const now = kit.local('2026-05-12', '19:00')
  const records: CanonicalRecord[] = [
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-12', '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-12', '18:00'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-12', '18:00'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-12', '18:00'), domains: [DOMAIN.direction] },
      { concept: CONCEPT.freeNow, value: { type: 'duration', minutes: 90 }, method: 'self-report' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-12', '17:00'), domains: [DOMAIN.home] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'the kitchen table is buried again' },
        method: 'self-report',
      },
    ),
  ]

  if (options.blocked !== undefined) {
    const about = options.about ?? A_WALK
    const semantics: RecommendationSemantics = {
      subject: about,
      domain: DOMAIN.health,
      target: { verb: 'move', object: about },
      whyNow: { trigger: 'nothing-better', evidence: [], summary: 'nothing better on offer' },
      evidence: [],
    }
    records.push(
      kit.record(
        'constraint',
        {
          occurredAt: kit.local('2026-05-11', '20:00'),
          domains: [options.recordedIn ?? DOMAIN.health],
          entities: [about],
        },
        {
          concept: blockerConcept(options.blocked, semantics),
          description: BLOCKER_OPTIONS[options.blocked].statement('A walk'),
          ...(options.until === undefined ? {} : { until: kit.local(options.until, '23:59') }),
        },
      ),
    )
  }

  const loaded = snapshotFromWire(
    kit.document({ entities: [walk, kitchen], records, exportedAt: now }),
  )
  expect(loaded.loaded, 'the evening should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')

  const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
  const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
  return { situation, candidates: generateCandidates(situation) }
}

/** Every move that survived the filter, as ids. */
function kept(
  built: ReturnType<typeof anEvening>,
  options?: { readonly enforceStandingBlockers?: boolean },
): readonly string[] {
  return applyConstraints(built.candidates, built.situation, options ?? {}).kept.map(
    (candidate) => candidate.id,
  )
}

function rejectionFor(built: ReturnType<typeof anEvening>, id: string) {
  return applyConstraints(built.candidates, built.situation, {}).rejected.find(
    (rejection) => rejection.candidate === id,
  )
}

const THE_WALK = 'health/move/routine:a-walk'

// ---------------------------------------------------------------------------
// The reversal itself
// ---------------------------------------------------------------------------

describe('a standing blocker the app wrote now removes the move — C21', () => {
  it('offers the move on an evening he has said nothing about', () => {
    // The control, and it comes first. A rule that removed the move on every
    // evening would pass every assertion below and mean nothing.
    expect(kept(anEvening({})), 'the walk was never on offer').toContain(THE_WALK)
  })

  it('removes it once he has said he has not got what he needs', () => {
    const blocked = anEvening({ blocked: 'no-kit' })
    expect(kept(blocked), 'a standing blocker changed nothing').not.toContain(THE_WALK)
  })

  it('removes it once he has said it needs somewhere he was not', () => {
    expect(kept(anEvening({ blocked: 'not-here' }))).not.toContain(THE_WALK)
  })

  it('says why, in the words he gave it', () => {
    /*
     * Section 35: a rejection nobody can see is indistinguishable from a
     * candidate that was never thought of. The explanation is the statement
     * stored on his own constraint, not a sentence this file composed — so the
     * trace says what he said rather than what the app made of it.
     */
    const rejection = rejectionFor(anEvening({ blocked: 'no-kit' }), THE_WALK)
    expect(rejection?.reason).toBe('blocked-before')
    expect(rejection?.explanation).toBe(BLOCKER_OPTIONS['no-kit'].statement('A walk'))
    expect(rejection?.evidence.length, 'the rejection cites nothing').toBeGreaterThan(0)
  })

  it('is scoped to the move he was talking about', () => {
    /*
     * The bound that keeps this from becoming a veto on a whole area. He said a
     * **walk** needs something he has not got; the kitchen is untouched, and so
     * is everything else the evening could offer.
     */
    const blocked = anEvening({ blocked: 'no-kit' })
    expect(kept(blocked)).not.toContain(THE_WALK)
    expect(kept(blocked), 'one blocked move took the rest of the evening with it').toContain(
      'home/reset-space/place:the-kitchen',
    )
  })

  it('stops the moment the bound he gave it passes', () => {
    /*
     * `ConstraintRecord.until` is the half S2 Tier 1 added and nothing read
     * before routing 84. A constraint that has expired is not a constraint, and
     * an enforcement that outlived its own date would be the app holding him to
     * something he explicitly said was for one evening.
     */
    const yesterday = anEvening({ blocked: 'no-kit', until: '2026-05-11' })
    expect(kept(yesterday), 'an expired constraint still bit').toContain(THE_WALK)
  })

  it('leaves an episode-scoped cause alone entirely', () => {
    /*
     * The other half of the closed list, and the distinction
     * `BLOCKER_OPTIONS.standing` has always drawn. A tired evening is not a
     * standing fact about a man: it writes no constraint at all, so there is
     * nothing here to enforce and the move is still his to pick up an hour
     * later.
     */
    for (const cause of BLOCKER_CAUSES) {
      if (BLOCKER_OPTIONS[cause].standing) continue
      expect(kept(anEvening({ blocked: cause })), cause).toContain(THE_WALK)
    }
  })

  it('enforces every standing cause and no others', () => {
    // The class rather than three examples. What the app enforces is exactly
    // what it declares standing, so a ninth cause added next year is enforced or
    // not by the same declaration that decides whether it writes a record.
    const enforced = BLOCKER_CAUSES.filter(
      (cause) => !kept(anEvening({ blocked: cause })).includes(THE_WALK),
    )
    const standing = BLOCKER_CAUSES.filter((cause) => BLOCKER_OPTIONS[cause].standing)
    expect([...enforced].sort()).toEqual([...standing].sort())
    expect(enforced.length, 'nothing is enforced, so the guard guards nothing').toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// The reintroduction — §6.5's completion condition, in as many words
// ---------------------------------------------------------------------------

describe('putting the non-enforcement back, and watching it fail — C21', () => {
  it('offers the blocked move again the moment the old rule is restored', () => {
    /*
     * **The completion condition, run rather than argued.** The history is
     * identical: the same constraint, the same evening, the same candidates.
     * The only thing that changes is whether the filter is allowed to read what
     * the owner said, and the answer the owner would see changes with it.
     *
     * This is what a reintroduction proof is for. A test that deleted the
     * constraint and watched the move come back would prove that a rule needs
     * evidence, which was never in doubt.
     */
    const blocked = anEvening({ blocked: 'no-kit' })

    expect(kept(blocked), 'enforcement is not doing anything').not.toContain(THE_WALK)
    expect(
      kept(blocked, { enforceStandingBlockers: false }),
      'the old shown-never-enforced rule no longer changes the answer',
    ).toContain(THE_WALK)
  })

  it('changes nothing at all on an evening with no standing blocker in it', () => {
    // And the seam is inert where it should be: with nothing to enforce, the two
    // rules agree, so a passing reintroduction above is about the constraint
    // rather than about the option.
    const plain = anEvening({})
    expect(kept(plain, { enforceStandingBlockers: false })).toEqual(kept(plain))
  })

  it('defaults to enforcing when nobody says otherwise', () => {
    // The safe answer is the default rather than the convenient one, so a caller
    // that forgets the option gets the rule rather than its absence.
    const blocked = anEvening({ blocked: 'no-kit' })
    expect(
      applyConstraints(blocked.candidates, blocked.situation).kept.map((candidate) => candidate.id),
    ).not.toContain(THE_WALK)
  })
})

// ---------------------------------------------------------------------------
// And the promise the capture path is now allowed to keep
// ---------------------------------------------------------------------------

describe('the app no longer knows something and offers it anyway — D-164', () => {
  it('declines to ask about a move it has already removed', () => {
    /*
     * The pair D-164 anticipated: *"extends from 'asked when the answer has a
     * use' to 'and the use is delivered' once C21's enforcement lands in 93"*.
     *
     * `blockerQuestionFor` stays silent about a move it already has a standing
     * answer for, and `applyConstraints` reads the **same function** to remove
     * it. So the app cannot be in the position of declining to ask because it
     * knows, and then offering the move anyway because nothing read what it
     * knew — which is what the two halves apart amounted to.
     */
    const blocked = anEvening({ blocked: 'no-kit' })
    const rejection = rejectionFor(blocked, THE_WALK)
    expect(rejection?.reason).toBe('blocked-before')
    // The statement the question path would have shown as "already known" is the
    // statement the filter cites. One reader, two consumers.
    expect(rejection?.explanation).toContain('needs something I have not got')
  })
})

// ---------------------------------------------------------------------------
// And the bound the walk through the surfaces found — DEF-0168
// ---------------------------------------------------------------------------

describe('a standing blocker stays in the area he answered about — DEF-0168', () => {
  /*
   * ## What the contract walk hit
   *
   * `blockerConcept` is `blocker.<cause>.<objectId>` — scoped to the **object**,
   * deliberately, because *"I haven't got what I need for subnetting"* is about
   * subnetting rather than about the one move he happened to be looking at. That
   * is right, and enforcement inherits it, so one answer removes every move on
   * that object. Also right: he said he cannot study it tonight.
   *
   * What the object alone cannot tell apart is **which side of the object a move
   * is on**. *"Take tonight as recovery — no subnetting session"* is a sleep move
   * whose object is the career topic, and object-scoped enforcement removed it:
   * the app refusing to let him rest on the grounds that he could not study.
   *
   * The area the constraint was recorded in separates them, and it is already on
   * the record. Nothing about capture changes.
   *
   * ## Why supervision is exempt
   *
   * *"I can't leave — someone's in my care"* is a fact about his evening and not
   * about an area, and it is matched by `requiresLeaving` rather than by the
   * object at all. Scoping it to the area it was first said in would let the app
   * propose leaving the house from a different domain.
   */

  it('does not remove a move in another area, however sure it is about the object', () => {
    const elsewhere = anEvening({ blocked: 'no-kit', recordedIn: DOMAIN.career })
    expect(kept(elsewhere), 'an answer about one area removed a move in another').toContain(
      THE_WALK,
    )
  })

  it('still removes the move in the area he was answering about', () => {
    // The narrowing is a bound and not a retreat: the case C21 exists for is
    // unchanged, and this is what says so.
    expect(kept(anEvening({ blocked: 'no-kit' }))).not.toContain(THE_WALK)
  })

  it('keeps supervision working across every area', () => {
    /*
     * `must-stay` is recorded in whichever area he was looking at when he said
     * it, which could be any of them. If it were scoped, the app would answer
     * *"I can't leave the house"* by proposing he leave the house for something
     * else — which is the failure the cause exists to prevent.
     */
    const supervising = anEvening({ blocked: 'must-stay', recordedIn: DOMAIN.career })
    expect(kept(supervising), 'supervision stopped travelling').not.toContain(THE_WALK)
  })
})
