import { useMemo } from 'react'
import { ObjectKind, Panel, Screen } from '../../components/ui'
import type { LifeDomainId } from '../../domain/domains'
import { assembleSituation, type DomainCoverage } from '../../intelligence/situation'
import { hashForLifePage } from '../../platform/routing'
import { originOfSources } from '../history/origin'
import { useMemory } from '../memory/memoryContext'
import { DayShape } from './DayShape'
import { pageForDomain } from './domainPages'
import { Threads } from './Threads'
import { GROUP_ORDER, standingFor } from './standing'
import './LifeScreen.css'

/**
 * Life — where the owner inspects the model (canonical plan sections 7 and 63).
 *
 * Section 7's first sentence about this screen is the one that shapes it: *the
 * owner should not need to visit Life for routine system maintenance.* So this
 * is a report, not a chore list, and the interesting thing about it is how
 * often it should say that nothing needs doing.
 *
 * Section 63 is what it exists for. An area may be quiet, stable or low
 * priority; it may not silently remain based on months-old assumptions while
 * the interface implies the app is current.
 *
 * ## Why it is grouped
 *
 * The first version gave all eleven areas a row of their own, each carrying a
 * whole sentence in a right-aligned value slot. Seven of them read identically
 * — *"Nothing here yet — you have not mentioned this, and nothing is asking you
 * to"* — and the page ran to two and a half phone screens of the same words.
 * Every sentence on it was true and the screen as a whole was homework.
 *
 * So the status does the sorting. Anything wanting attention is listed on its
 * own with the one line that explains it; everything calm is a heading and a
 * row of names, and the sentence that used to repeat seven times is said once
 * for the group. Nothing about the underlying reading changed — this is the
 * same `CoverageState`, from the same `assembleSituation` the decision on Now
 * was made from, presented so it can be read at a glance.
 *
 * **No technical evidence terminology**, which section 7 asks for by name: no
 * record counts, no confidence, no "stale", no phase.
 */

/**
 * The area's name, linked to its own page where one exists (section 50).
 *
 * A page not existing is not an error here — `pageForDomain` returning
 * `undefined` would mean a domain the D-078 registry test would already have
 * failed on — but the link degrades to plain text rather than a dead href on
 * the strength of that guarantee alone.
 */
/**
 * Where everything the app has heard about this area came from (QA-08-001).
 *
 * The overview's line is a conclusion — "nothing has come in about career &
 * learning for 3 months" — drawn from the area's whole record. Where that whole
 * record came across from the old app, the sentence is true and the impression
 * it leaves is not: it reads as the owner having gone quiet, when in fact he
 * has never said anything about it *to this app* and everything it knows was
 * migrated.
 *
 * Nothing is said where the sources disagree, which is almost always: one entry
 * of his own is enough to make this his area again.
 */
function AreaOrigin({ coverage }: { coverage: DomainCoverage }) {
  const origin = originOfSources(coverage.sources)
  if (origin === undefined) return null
  return (
    <span className="origin-badge" data-testid="life-origin" title={origin.detail}>
      {origin.label}
    </span>
  )
}

function AreaLink({ domain, label }: { domain: LifeDomainId; label: string }) {
  const page = pageForDomain(domain)
  if (page === undefined) return <>{label}</>
  return (
    <a className="life-area__link" href={hashForLifePage(page.slug)}>
      {label}
    </a>
  )
}

/**
 * The private area says how it stands and never what it is about.
 *
 * Section 11 — display discretion. A status exposes nothing; a summary that
 * could name a behaviour would.
 */
const PRIVATE = 'private-health'
const PRIVATE_NOTE = 'You keep this one yourself. Nothing about it appears elsewhere.'

interface Group {
  readonly word: string
  readonly attention: boolean
  readonly note: string
  readonly areas: readonly { readonly coverage: DomainCoverage; readonly detail?: string }[]
}

function groupsFrom(domains: readonly DomainCoverage[]): readonly Group[] {
  const byWord = new Map<string, Group>()

  for (const coverage of domains) {
    const standing = standingFor(coverage)
    /*
     * The private area never shows its summary, and shows the discreet line
     * only where the group is being read line by line anyway.
     *
     * Giving it a line unconditionally would drag its whole group into the
     * per-area layout — which on most histories is the seven-area "nothing here
     * yet" group, and would put the wall straight back.
     */
    const own = standing.detail?.(coverage)
    const detail =
      coverage.domain === PRIVATE ? (own === undefined ? undefined : PRIVATE_NOTE) : own
    const held = byWord.get(standing.word)
    const entry = detail === undefined ? { coverage } : { coverage, detail }
    if (held === undefined) {
      byWord.set(standing.word, {
        word: standing.word,
        attention: standing.attention,
        note: standing.note,
        areas: [entry],
      })
    } else {
      byWord.set(standing.word, { ...held, areas: [...held.areas, entry] })
    }
  }

  return GROUP_ORDER.map((word) => byWord.get(word)).filter(
    (group): group is Group => group !== undefined,
  )
}

export function LifeScreen() {
  const memory = useMemory()

  /*
   * A store with nothing in it still has a situation — QA-84-007, D-189.
   *
   * This read `!memory.ready || memory.snapshot.records.length === 0`, and the
   * second half was the defect. `assembleSituation` on an empty view is
   * perfectly well defined — `InsightsScreen` has always called it that way,
   * which is why the second agenda was the **only** thing an owner could reach
   * on a first run. The record count was standing in for "there is nothing to
   * say", and it also switched off every control that exists so he can write
   * the first record.
   *
   * What is empty is the **report**, not the page. The panels below already
   * say nothing when they have nothing: `DestinationPanel` renders its own
   * "nothing named yet" line, `ProgressPanel` returns null on empty rungs, and
   * `AuthoringPanel` never needed a history at all.
   */
  const situation = useMemo(() => {
    if (!memory.ready) return undefined
    return assembleSituation(memory.view, {
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
    })
  }, [memory.ready, memory.view, memory.now, memory.zone, memory.weekStartsOn])

  const coverage = situation?.coverage

  const groups = useMemo(
    () => (coverage === undefined ? [] : groupsFrom(coverage.domains)),
    [coverage],
  )

  /**
   * The directions the owner has authored, in the order he set them.
   *
   * A read of `situation.direction.destinations` and nothing more: the aim is
   * his, the area label comes from the same registry the groups below use, and
   * the milestone line is a goal statement he wrote. An unreached milestone is
   * shown and a reached one is not — what is *next* is direction, and what is
   * done is history, which Timeline and the domain page already carry.
   */
  const directions = useMemo(() => {
    if (situation === undefined) return []
    return situation.direction.destinations.map((destination) => {
      const next = destination.milestones.find((milestone) => !milestone.reached)
      return {
        destination,
        label: situation.domains.labelFor(destination.domain) ?? destination.domain,
        next: next?.goal.statement,
      }
    })
  }, [situation])

  return (
    <Screen
      title="Life"
      lede="Where you come to see what the app understands — never to keep it running."
    >
      {coverage === undefined ? (
        <Panel title="Eleven areas, none of them optional">
          <p>
            An area can be quiet, stable, going out of date or urgent. It is never switched off.
            With no history loaded there is nothing to report about any of them.
          </p>
        </Panel>
      ) : (
        <>
          {/*
            What he is aiming at, before what has come in lately — QA-90-001.

            ## The finding

            The ordinary-owner contract for this phase ends *"repeat the first
            half in a second domain and confirm Life reads as direction rather
            than recency."* It did not. Every group on this screen is built from
            `DomainCoverage` through `standingFor`, which answers **how recently
            has anything come in** — so an owner who had authored a destination
            and a milestone in Health and again in Career opened Life and saw
            *Recent* and *Nothing here yet*, and neither thing he had said he
            was aiming at.

            That is the whole screen answering the wrong question. Coverage is a
            true and useful reading and it stays exactly as it was; what was
            missing is that it was the **only** reading.

            ## Why this is presentation and not a second brain

            `situation.direction.destinations` is already assembled by the same
            `assembleSituation` the coverage groups come from. Nothing is
            recomputed, nothing is concluded, and D-075's constraint — one
            coverage computation, presentation only — is untouched. Two readings
            of one history would eventually disagree; this is one reading, shown
            twice over.

            ## What it may say, and what it may not

            **His own words, and nothing else.** The aim is rendered verbatim
            from what he typed (D-188's byte-identity rule), the area is named,
            and the app adds no verb of its own — no "on track", no "you are
            getting closer", no count of how many parts are filled in. There is
            nothing here that could become a score (D-162), because there is
            nothing here the app authored.

            **Absent, not empty.** With no destination anywhere the panel does
            not render at all, so a first run and every history in the existing
            library are unchanged — DEF-0013's precedent, and the reason this
            could not become the homework D-075 took off this screen.
          */}
          {directions.length === 0 ? null : (
            <Panel title="Where you are heading">
              {directions.map((entry) => (
                <div
                  key={entry.destination.source}
                  className="life-direction"
                  data-testid="life-direction"
                >
                  <ObjectKind kind="destination" />
                  <p className="life-direction__area">
                    <AreaLink domain={entry.destination.domain} label={entry.label} />
                  </p>
                  <p className="life-direction__aim">{entry.destination.aim}</p>
                  {entry.next === undefined ? null : (
                    <p className="life-direction__next" data-testid="life-direction-next">
                      <ObjectKind kind="milestone" />
                      {entry.next}
                    </p>
                  )}
                </div>
              ))}
            </Panel>
          )}

          <Panel title="How each area stands">
            {groups.map((group) => (
              <section
                key={group.word}
                className={group.attention ? 'life-group life-group--attention' : 'life-group'}
                data-testid={`life-group-${group.word.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="life-group__word">
                  <span className="life-group__dot" aria-hidden="true" />
                  {group.word}
                </span>

                {group.areas.some((area) => area.detail !== undefined) ? (
                  group.areas.map((area) => (
                    <div key={area.coverage.domain} className="life-area">
                      <p className="life-area__name">
                        <AreaLink domain={area.coverage.domain} label={area.coverage.label} />
                      </p>
                      {area.detail === undefined ? null : (
                        <p className="life-area__detail">
                          {area.detail} <AreaOrigin coverage={area.coverage} />
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="life-names">
                    {group.areas.map((area, index) => (
                      <span key={area.coverage.domain}>
                        {index === 0 ? '' : ' · '}
                        <AreaLink domain={area.coverage.domain} label={area.coverage.label} />
                      </span>
                    ))}
                  </p>
                )}

                <p className="life-group__note">{group.note}</p>
              </section>
            ))}
          </Panel>

          {/*
            How the day is already spoken for — AUD-0004.

            Under the areas rather than above them, because it is a fact the
            owner supplies rather than a reading the app made: Life's first job
            is to report, and this is the one thing on the page he is invited to
            add. Two questions, answered once, never re-asked.
          */}
          {/*
            Courses under way, and the one tap that stops them — AUD-0020.

            Above the day's shape because it is the part of the model most
            likely to be doing something the owner has forgotten agreeing to.
          */}
          {situation === undefined ? null : <Threads situation={situation} />}

          {situation === undefined ? null : <DayShape situation={situation} />}

          {/*
            The app explaining its own arrangement — quiet, and last.

            D-075 took this screen from two and a half phone screens back to
            about one and a half by refusing to make it homework. This paragraph
            is the one thing on it that is about the app rather than about him,
            so it takes the recessed tier rather than competing with the areas
            above it.
          */}
          <Panel title="Why this is here" tone="quiet">
            {/*
              Trimmed in Phase 82, and not to make room.

              The four-step account of how the app repairs stale coverage is the
              app explaining its own machinery — DEF-0005's class, on a screen
              whose complaint was being homework. What is load-bearing is the
              first two sentences: an area may be quiet, and it may not be quiet
              unnoticed.
            */}
            <p>
              An area is allowed to be quiet. What it is not allowed to be is quiet without anybody
              noticing — so nothing above is a task, and most of it should stay dull.
            </p>
          </Panel>
        </>
      )}
    </Screen>
  )
}
