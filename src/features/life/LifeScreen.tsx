import { useMemo } from 'react'
import { Panel, Screen } from '../../components/ui'
import type { LifeDomainId } from '../../domain/domains'
import { assembleSituation, type DomainCoverage } from '../../intelligence/situation'
import { hashForLifePage } from '../../platform/routing'
import { originOfSources } from '../history/origin'
import { useMemory } from '../memory/memoryContext'
import { pageForDomain } from './domainPages'
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

  const coverage = useMemo(() => {
    if (!memory.ready || memory.snapshot.records.length === 0) return undefined
    return assembleSituation(memory.view, {
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
    }).coverage
  }, [memory.ready, memory.snapshot, memory.view, memory.now, memory.zone, memory.weekStartsOn])

  const groups = useMemo(
    () => (coverage === undefined ? [] : groupsFrom(coverage.domains)),
    [coverage],
  )

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
                          {area.detail}
                          <AreaOrigin coverage={area.coverage} />
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

          <Panel title="Why this is here">
            <p>
              An area is allowed to be quiet. What it is not allowed to be is quiet without anybody
              noticing — so nothing above is a task, and most of it should stay dull. When something
              does go out of date, the app tries what your ordinary week already produces, then what
              it can work out, then a move on Now, then one small question, before it ever asks you
              to come and look.
            </p>
          </Panel>
        </>
      )}
    </Screen>
  )
}
