import { useMemo } from 'react'
import { Panel, Row, Rows, Screen } from '../../components/ui'
import { assembleSituation, type DomainCoverage } from '../../intelligence/situation'
import { useMemory } from '../memory/memoryContext'

/**
 * Life — where the owner inspects the model (canonical plan sections 7 and 63).
 *
 * Section 7's first sentence about this screen is the one that shapes it: *the
 * owner should not need to visit Life for routine system maintenance.* So this
 * is a report, not a chore list. Every domain says how well the app currently
 * understands it, and the ones that need nothing say so in one word.
 *
 * Section 63 is what it exists for. A domain may be quiet, stable or low
 * priority; it may not silently remain based on months-old assumptions while
 * the interface implies the app is current. The word beside each area is the
 * whole of that promise made visible — and the interesting thing about it is
 * how often it should say nothing needs doing.
 *
 * **No technical evidence terminology**, which section 7 asks for by name. No
 * record counts, no confidence numbers, no "stale". The engine's four states
 * become five ordinary phrases, and the one about a stale area names what the
 * app would do about it rather than what the owner must.
 *
 * The status comes from `assembleSituation`, which is the same function and the
 * same reading the decision on Now was made from. It is not a second
 * computation over the same history — two of those would eventually disagree,
 * and the owner would have no way to tell which screen was lying.
 */

/**
 * Section 7's owner-facing states, in this app's words.
 *
 * The stale case splits in two, and that is the point of the whole coverage
 * engine: an area the app is already getting evidence about needs nothing from
 * him, and one where it has run out of ideas does. Telling him to go and look
 * at both would waste the distinction the engine exists to draw.
 */
function statusWords(coverage: DomainCoverage): { readonly word: string; readonly detail: string } {
  if (coverage.status === 'unheard') {
    return {
      word: 'Nothing here yet',
      detail: 'You have not mentioned this, and nothing is asking you to.',
    }
  }

  if (coverage.status === 'current') {
    return { word: 'Fresh', detail: 'Up to date on what matters here.' }
  }

  if (coverage.status === 'quiet') {
    return { word: 'Quiet', detail: 'Nothing new, and nothing that has gone out of date.' }
  }

  switch (coverage.refresh) {
    case 'normal-life':
      return { word: 'Catching up', detail: `${coverage.summary} An answer is already on its way.` }
    case 'an-action':
      return {
        word: 'Going quiet',
        detail: `${coverage.summary} Something worth doing here may come up on Now.`,
      }
    case 'a-question':
      return { word: 'Going quiet', detail: `${coverage.summary} A question will cover it.` }
    default:
      return { word: 'Needs a check-in', detail: coverage.summary }
  }
}

/**
 * The private domain says how it stands and never what it is about.
 *
 * Section 11: private detail stays off normal surfaces, and the owner comes
 * here deliberately when he wants to enter it. Saying "Fresh" or "Quiet" about
 * it exposes nothing; repeating a summary that could name a behaviour would.
 */
const PRIVATE_DETAIL = 'You keep this one yourself. Nothing about it appears elsewhere.'

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

  return (
    <Screen
      title="Life"
      lede="Where you come to see what the app understands — never to keep it running."
    >
      {coverage === undefined ? (
        <Panel title="Eleven areas, none of them optional">
          <p>
            An area can be quiet, stable, going out of date or urgent. It is never switched off.
            With no history loaded there is nothing to report about any of them yet.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="How well each area is understood">
            <Rows>
              {coverage.domains.map((domain) => {
                const { word, detail } = statusWords(domain)
                const isPrivate = domain.domain === 'private-health'
                return (
                  <Row
                    key={domain.domain}
                    label={domain.label}
                    value={`${word} — ${isPrivate ? PRIVATE_DETAIL : detail}`}
                  />
                )
              })}
            </Rows>
          </Panel>

          <Panel title="Why this is here">
            <p>
              An area is allowed to be quiet. What it is not allowed to be is quiet without anybody
              noticing — so nothing above is a task, and most of it should stay dull.
            </p>
            <p>
              When something does go out of date, the app tries four things before it asks you to
              come and look: it uses what your ordinary week already produces, works it out from
              something related, puts a move on Now that would bring it back, or asks one small
              question at a sensible moment.
            </p>
          </Panel>
        </>
      )}
    </Screen>
  )
}
