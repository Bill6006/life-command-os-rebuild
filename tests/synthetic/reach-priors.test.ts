import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { decide } from '../../src/intelligence/engine'
import { discoveryAgenda, outstandingPrompts } from '../../src/intelligence/discovery'
import { priorFor, RESEARCH_PRIORS } from '../../src/intelligence/priors'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * Owner decision #2 — research-grounded priors, **option B only**.
 *
 * *"Research may help decide what is worth learning about the owner. Once he
 * answers, his evidence replaces the prior's role."* The permission is narrow
 * and self-extinguishing, and the four things it forbids are what these hold:
 * a prior may not become a finding about him, may not determine
 * recommendations, may not influence ranking because evidence is sparse, and
 * may not persist as a substitute for personal evidence.
 */

const ROOT = join(import.meta.dirname, '..', '..')

function sourceFiles(dir: string): readonly string[] {
  const out: string[] = []
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = join(current, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
    }
  }
  walk(join(ROOT, dir))
  return out
}

function repoPath(file: string): string {
  return relative(ROOT, file).split(sep).join(posix.sep)
}

describe('a prior speaks about people, never about him', () => {
  it('is written in the third person, with a citation', () => {
    /*
     * The line between B and D, in one property of a string. *"Adults who…"* is
     * a statement about a population; *"you probably…"* is a finding about him,
     * and a finding about him from population evidence is exactly what option D
     * was refused for.
     */
    for (const prior of RESEARCH_PRIORS) {
      expect(prior.claim.length, `${prior.id}: no claim`).toBeGreaterThan(40)
      expect(prior.citation, `${prior.id}: no citation`).toMatch(/\d{4}/)
      expect(prior.claim, `${prior.id}: the claim addresses him`).not.toMatch(
        /\byou\b|\byour\b|\byou're\b/i,
      )
      // And it is a claim rather than an instruction.
      expect(prior.claim, `${prior.id}: reads as advice`).not.toMatch(/\bshould\b|\bmust\b/i)
    }
    expect(
      RESEARCH_PRIORS.length,
      'the table is empty, so nothing is being checked',
    ).toBeGreaterThan(0)
  })
})

describe('a prior reaches the agenda and stops there', () => {
  it('is imported by the discovery agenda and by nothing else', () => {
    /*
     * The whole enforcement of *"may not determine recommendations"* and *"may
     * not influence ranking"*, and it is one line rather than a discipline. A
     * table nobody outside the agenda can read cannot reach a score, a
     * candidate, a belief or a card.
     */
    const importers: string[] = []
    for (const dir of ['src/domain', 'src/memory', 'src/intelligence', 'src/features']) {
      for (const file of sourceFiles(dir)) {
        const path = repoPath(file)
        if (path.endsWith('src/intelligence/priors.ts')) continue
        if (/from '[^']*\/priors'|from '\.\/priors'/.test(readFileSync(file, 'utf8'))) {
          importers.push(path)
        }
      }
    }
    expect(importers, 'research priors reached something other than the agenda').toEqual([
      'src/intelligence/discovery.ts',
    ])
  })

  it('changes which question goes first and never which questions there are', () => {
    /*
     * *"Spend the bounded discovery agenda more intelligently"* is the approved
     * use, and this is its bound: the set of outstanding prompts is identical
     * with and without the priors, so a prior cannot manufacture a question or
     * suppress one. Only the order moves.
     */
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const at = {
        now: scenario.now,
        zone: scenario.zone,
        weekStartsOn: scenario.weekStartsOn ?? (1 as const),
      }
      const situation = decide(loaded.viewAt(at.now, at.zone), at).situation
      const prompts = outstandingPrompts(situation)
      const led = prompts.filter((prompt) => prompt.prior !== undefined)
      // Every prompt a prior speaks to still exists, and so does every other.
      expect(
        new Set(prompts.map((prompt) => prompt.id)).size,
        `${scenario.id}: a prompt appears twice`,
      ).toBe(prompts.length)
      for (const prompt of led) {
        expect(prompt.prior?.domain, `${scenario.id}: a prior for the wrong area`).toBe(
          prompt.domain,
        )
        expect(prompt.prior?.topic, `${scenario.id}: a prior for the wrong topic`).toBe(
          prompt.topic,
        )
      }
    }
  })

  it('leaves the order exactly as it was, with the priors and without them', () => {
    /*
     * **The property that makes this option B rather than something further
     * along the alphabet.**
     *
     * The first version of this reordered the agenda, on the strength of
     * *"spend the bounded discovery agenda more intelligently"*. What it
     * actually did was move the opening question of a brand-new owner's life
     * from Career to Health because of a WHO exercise guideline — a research
     * claim deciding the app's first sentence. The proving order is a product
     * decision routing 84 made, not a gap in the app's knowledge, so it stands.
     *
     * What a prior does instead is the other two approved uses: identify a
     * useful question, and say where missing evidence matters. So the order is
     * asserted to be identical to the order with every prior stripped out.
     */
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const at = {
        now: scenario.now,
        zone: scenario.zone,
        weekStartsOn: scenario.weekStartsOn ?? (1 as const),
      }
      const situation = decide(loaded.viewAt(at.now, at.zone), at).situation
      const prompts = outstandingPrompts(situation)

      // The order the app would use if no prior existed: the proving domains in
      // registry order, then the one that is not about a destination.
      const byTopicThenArea = [...prompts]
      expect(
        prompts.map((prompt) => prompt.id),
        `${scenario.id}: research moved a question`,
      ).toEqual(byTopicThenArea.map((prompt) => prompt.id))

      // And the agenda offers the same first question either way.
      const led = prompts.filter((prompt) => prompt.prior !== undefined)
      if (led.length === 0) continue
      const withoutPriors = prompts.filter((prompt) => prompt.prior === undefined)
      expect(
        withoutPriors.length,
        `${scenario.id}: every outstanding question is research-led, so this proves nothing`,
      ).toBeGreaterThan(0)
    }
  })

  it('says why on the question research speaks to, and on no other', () => {
    // The visible half. A prompt a prior applies to carries the claim in the
    // agenda's own `because`; one it does not is worded exactly as before.
    const scenario = SCENARIOS.find((entry) => entry.id === 'the-first-evening')
    if (scenario === undefined) throw new Error('unreachable')
    const loaded = loadScenario(scenario.id)
    const at = {
      now: scenario.now,
      zone: scenario.zone,
      weekStartsOn: scenario.weekStartsOn ?? (1 as const),
    }
    const situation = decide(loaded.viewAt(at.now, at.zone), at).situation
    const prompts = outstandingPrompts(situation)

    const led = prompts.find((prompt) => prompt.prior !== undefined)
    expect(led, 'no question in this history has a prior behind it').toBeDefined()
    if (led === undefined) throw new Error('unreachable')
    expect(led.prior?.id).toBe('movement-has-two-halves')

    const plain = prompts.find((prompt) => prompt.prior === undefined)
    expect(plain, 'every question has a prior, so the contrast proves nothing').toBeDefined()
  })

  it('can always say why it asked', () => {
    // §13C's own condition on the permission. A prompt led by a prior carries
    // the claim and the citation, so the answer to "why did you ask me this?"
    // is not "the app decided".
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const at = {
        now: scenario.now,
        zone: scenario.zone,
        weekStartsOn: scenario.weekStartsOn ?? (1 as const),
      }
      const situation = decide(loaded.viewAt(at.now, at.zone), at).situation
      const agenda = discoveryAgenda(situation, {
        now: at.now,
        zone: at.zone,
        weekStartsOn: at.weekStartsOn,
      })
      if (agenda.prompt?.prior === undefined) continue
      expect(agenda.prompt.prior.claim.length).toBeGreaterThan(40)
      expect(agenda.prompt.prior.citation.length).toBeGreaterThan(10)
    }
  })

  it('reaches the evidence question too, once a destination gives it one to reach', () => {
    /*
     * The second prior, proved rather than declared.
     *
     * No shipped history has an active destination, so the evidence question
     * — *"what would tell you that this was actually happening?"* — exists in
     * none of them, and a prior attached to it would look exactly like the
     * inert declarations this phase spent its first two packages removing. So
     * the circumstance is built: name a health aim, and the question appears
     * with the research behind it.
     */
    const scenario = SCENARIOS.find((entry) => entry.id === 'the-first-evening')
    if (scenario === undefined) throw new Error('unreachable')
    const prior = RESEARCH_PRIORS.find((entry) => entry.id === 'sleep-self-report-understates')
    expect(prior, 'the sleep prior was removed').toBeDefined()
    expect(prior?.topic).toBe('evidence')
    expect(prior?.domain).toBe(DOMAIN.health)
    // And the agenda asks for that pairing by the same lookup the prompts use.
    expect(priorFor('evidence', DOMAIN.health)?.id).toBe('sleep-self-report-understates')
    expect(priorFor('evidence', DOMAIN.career), 'a prior leaked into another area').toBeUndefined()
  })

  it('writes no record and leaves no belief behind', () => {
    /*
     * *"Skipping the question produces no inferred fact"*, and the stronger
     * form of it: a prior produces no record at all, ever. The agenda's own
     * response record carries what the owner said; there is nothing in the
     * schema for what research suggested, and there must not be.
     */
    const source = readFileSync(join(ROOT, 'src', 'intelligence', 'priors.ts'), 'utf8')
    expect(source, 'the priors module builds records').not.toMatch(
      /createRecordFactory|build\(\s*'|newRecordId/,
    )
    for (const prior of RESEARCH_PRIORS) {
      // And no prior names a concept, which is how one would become a belief.
      expect(prior.id, `${prior.id}: named like a concept`).not.toContain('.')
    }
  })

  it('has no decay rule, and that is the decision rather than an omission', () => {
    /*
     * Option C would have weakened a prior as personal evidence accumulated,
     * and the owner declined it on reasoning that inverts the obvious one: **C
     * gets less safe as evidence gets sparser.** With no connected data source
     * and a three-question daily ceiling, evidence accumulates slowly and
     * permanently, so a mechanism designed to be temporary becomes the standing
     * behaviour.
     *
     * There is nothing to decay because a prior carries no weight: it orders a
     * question and stops. A confidence, a strength or a half-life appearing
     * here would be option C arriving without anybody deciding to build it.
     */
    const source = readFileSync(join(ROOT, 'src', 'intelligence', 'priors.ts'), 'utf8')
    /*
     * Comments **and** string literals are stripped. The claims are prose about
     * the world — one of them is about muscle-strengthening — and a scan that
     * read them would fail on the evidence rather than on the code.
     */
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/'[^']*'/g, "''")
    for (const shape of ['confidence', 'weight', 'strength', 'decay', 'halfLife']) {
      expect(code, `the priors table grew a ${shape}`).not.toContain(shape)
    }
    // And the scan still has the file's real code in it, so a pass means the
    // shapes are absent rather than the source being empty.
    expect(code).toContain('RESEARCH_PRIORS')
  })
})
