import { expect, test, type Page } from '@playwright/test'

/**
 * Bringing the old app's history across, in a real browser.
 *
 * The contract suite proves the translation and the adversarial suite proves
 * the refusals. These prove the parts that only exist once there is a screen:
 * that a real encrypted file is opened by the page's own Web Crypto rather than
 * by a test runner's, that the owner is shown what an import would do before
 * anything is written, that the history he ends up with is longer and readable
 * afterwards without a reload, and that running the same file twice tells him
 * there is nothing left to do rather than doing it again.
 *
 * Every assertion runs at three widths, the smallest a 360px phone.
 */

const APP = '/life-command-os-rebuild/preview/'
const PASSPHRASE = 'the one from the old phone'

async function openData(page: Page) {
  await page.goto(`${APP}#/data`)
  await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()
}

/**
 * A genuinely encrypted legacy backup, built inside the page.
 *
 * Built in the browser rather than handed in as a constant, and that is the
 * point: the file is encrypted by the same Web Crypto implementation that has
 * to decrypt it a moment later, at parameters the old application actually
 * used. A hard-coded fixture would prove that this build can read one
 * particular blob; this proves it can read what a browser produces.
 *
 * A small iteration count, because the number is stored in the file and the
 * reader honours whatever it finds — the six-hundred-thousand case is proved in
 * `tests/adversarial/legacy-hostile.test.ts`, where it costs a third of a
 * second rather than one on every viewport.
 */
async function legacyFile(page: Page, passphrase: string): Promise<string> {
  return page.evaluate(async (secret: string) => {
    const toBase64 = (bytes: Uint8Array): string => {
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary)
    }

    const at = (days: number) =>
      new Date(Date.now() - days * 86_400_000).toISOString().replace(/\.\d+Z$/, '.000Z')

    const envelope = (id: string, type: string, occurredAt: string, extra: object) => ({
      recordId: id,
      recordType: type,
      schemaVersion: 1,
      occurredAt,
      recordedAt: occurredAt,
      localTime: { localIso: occurredAt, timeZone: 'America/Denver', utcOffsetMinutes: -360 },
      source: 'user-entry',
      provenance: { method: 'direct-report' },
      privacy: 'general',
      ...extra,
    })

    const records = [
      envelope('old-1', 'observation', at(3), {
        category: 'time-attention-capacity',
        attribute: 'state:energy',
        value: { kind: 'anchored-scale', scaleId: 'energy', ordinal: 4, label: 'Good' },
      }),
      envelope('old-2', 'observation', at(2), {
        category: 'time-attention-capacity',
        attribute: 'state:mood',
        value: { kind: 'anchored-scale', scaleId: 'mood', ordinal: 5, label: 'Very good' },
      }),
      envelope('old-3', 'goal', at(30), {
        statement: 'Pass the CCNA',
        category: 'career-work-learning',
        state: 'active',
        privacy: 'workplace',
      }),
      envelope('old-4', 'recommendation', at(5), { statement: 'Ten minutes of subnetting' }),
      envelope('old-5', 'move-preference', at(20), {
        engineCandidateId: 'social:message-someone',
        moveStatement: 'Message someone you have not spoken to',
        stance: 'forbidden',
      }),
    ]

    const serialised = JSON.stringify(
      [...records].sort((a, b) => a.recordId.localeCompare(b.recordId)),
    )
    const digestOf = async (value: string) => {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
      return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
    }

    const payload = {
      payloadVersion: 1,
      storageSchemaVersion: 1,
      recordCount: records.length,
      integrity: { algorithm: 'SHA-256', digest: await digestOf(serialised) },
      records: JSON.parse(serialised) as unknown[],
    }

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const meta = {
      cryptoVersion: 1,
      kdf: 'PBKDF2',
      kdfHash: 'SHA-256',
      iterations: 1000,
      cipher: 'AES-GCM',
      keyBits: 256,
      saltBase64: toBase64(salt),
      ivBase64: toBase64(iv),
    }
    const additionalData = new TextEncoder().encode(
      [
        String(meta.cryptoVersion),
        meta.kdf,
        meta.kdfHash,
        String(meta.iterations),
        meta.cipher,
        String(meta.keyBits),
        meta.saltBase64,
        meta.ivBase64,
      ].join('|'),
    )

    const material = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: meta.iterations, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    )
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData },
      key,
      new TextEncoder().encode(JSON.stringify(payload)),
    )

    return JSON.stringify({
      format: 'life-command-os.backup',
      formatVersion: 2,
      createdAt: at(1),
      encrypted: true,
      approximateRecordCount: records.length,
      crypto: meta,
      ciphertextBase64: toBase64(new Uint8Array(ciphertext)),
    })
  }, passphrase)
}

/**
 * A couple of the owner's own entries, written straight into his database.
 *
 * Needed here so the origin assertions have something *unmarked* to compare
 * against: a screen where every row is imported cannot show that the marking
 * distinguishes anything. The same helper `data.spec.ts` uses, for the reason
 * given there — a fresh install has nothing to answer, so there is no button
 * that creates a record.
 */
async function seedOwnerHistory(page: Page) {
  await page.goto(APP)
  await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()

  await page.evaluate(async () => {
    const at = new Date(Date.now() - 3_600_000).toISOString()
    const row = (id: string, text: string) => ({
      id,
      schemaVersion: 1,
      kind: 'observation',
      occurredAt: at,
      recordedAt: at,
      zone: 'America/Denver',
      domains: ['home'],
      entities: [],
      privacy: 'normal',
      provenance: { source: 'owner', writtenBy: 'a browser test' },
      concept: 'home.friction',
      value: { type: 'text', value: text },
      method: 'self-report',
    })

    const open = indexedDB.open('life-command-os:preview')
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['records'], 'readwrite')
      const store = transaction.objectStore('records')
      store.put(row('01JQWNBRWSER00000000000000', 'the kitchen counter, again'))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  })

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
}

async function readIt(page: Page, file: string, passphrase = PASSPHRASE) {
  await page.getByTestId('import-paste').fill(file)
  await page.getByTestId('import-identify').click()
  await expect(page.getByTestId('import-recognised')).toBeVisible()
  await page.getByTestId('import-passphrase').fill(passphrase)
  await page.getByTestId('import-read').click()
}

test.describe('recognising a file before asking for anything', () => {
  test('says what an old backup is, and what it holds, without the passphrase', async ({
    page,
  }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)

    await page.getByTestId('import-paste').fill(file)
    await page.getByTestId('import-identify').click()

    const recognised = page.getByTestId('import-recognised')
    await expect(recognised).toBeVisible()
    await expect(recognised).toContainText('a backup from the old app')
    await expect(recognised).toContainText('AES-GCM-256')
    // Nothing has been read yet, so there is nothing to apply.
    await expect(page.getByTestId('import-apply')).toHaveCount(0)
  })

  test('sends this app’s own backup to Restore rather than calling it unrecognised', async ({
    page,
  }) => {
    // The two format markers differ by one character. A person with both files
    // in a folder needs the right panel named, not a refusal.
    await openData(page)
    await page
      .getByTestId('import-paste')
      .fill(JSON.stringify({ format: 'life-command-os/backup', backupVersion: 1 }))
    await page.getByTestId('import-identify').click()

    await expect(page.getByTestId('import-refusal')).toContainText('Restore')
  })

  test('refuses something that is not a backup at all, and changes nothing', async ({ page }) => {
    await openData(page)
    await page.getByTestId('import-paste').fill('{"hello":"world"}')
    await page.getByTestId('import-identify').click()

    const refusal = page.getByTestId('import-refusal')
    await expect(refusal).toContainText('not a backup from the old app')
    await expect(refusal).toContainText('Nothing was changed')
  })
})

test.describe('the passphrase', () => {
  test('refuses a wrong one without saying how wrong, and writes nothing', async ({ page }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file, 'not the one from the old phone')

    const refusal = page.getByTestId('import-refusal')
    await expect(refusal).toContainText('did not work, or the file has been altered')
    await expect(page.getByTestId('import-report')).toHaveCount(0)

    /*
     * The sentence a person actually looks for on a screen about a destructive
     * operation, said **once** (QA-08-N2).
     *
     * It used to appear twice in slightly different words — "Nothing has been
     * changed." inside the refusal, then "Nothing was changed." underneath —
     * which reads as two separate reassurances and invites the question of
     * which is the real one. Asserted as a count rather than as one exact
     * phrasing, because the old assertion named the duplicate and would have
     * held it in place.
     */
    const said = (await refusal.innerText()).match(/nothing (?:has been|was) changed/gi) ?? []
    expect(said).toHaveLength(1)
  })

  test('is cleared from the field after it has been used', async ({ page }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await expect(page.getByTestId('import-report')).toBeVisible()

    // Held for one read and no longer. It is not kept anywhere, and the field
    // it was typed into is the last place it could still be sitting.
    await expect(page.getByTestId('import-passphrase')).toHaveCount(0)
  })
})

test.describe('what it would do, before it does anything', () => {
  test('shows the whole report and only then offers to bring it across', async ({ page }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)

    const report = page.getByTestId('import-report')
    await expect(report).toBeVisible()
    await expect(report).toContainText('Entries in the file')
    await expect(report).toContainText('Left out on purpose')
    await expect(report).toContainText('Nothing has been written yet')
    await expect(page.getByTestId('import-apply')).toBeVisible()
  })

  test('names the standing decision it cannot keep, rather than only counting it', async ({
    page,
  }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)

    const unkept = page.getByTestId('import-unkept')
    await expect(unkept).toBeVisible()
    await expect(unkept).toContainText('Message someone you have not spoken to')
  })

  test('says what became of every kind of entry, with a reason', async ({ page }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)

    await page.getByTestId('import-families').getByText('Every kind of entry in that file').click()

    const families = page.getByTestId('import-families')
    await expect(families).toContainText('recommendation')
    await expect(families).toContainText('left out on purpose')
    /*
     * The owner's sentence, not the registry's. `move catalogue` was asserted
     * here and passed while the screen was printing the audit trail at him —
     * an assertion on developer wording is an assertion that the developer
     * wording is on screen, which was the defect rather than the acceptance.
     */
    await expect(families).toContainText('the old app’s list of moves')
    await expect(families).toContainText('that list does not come back')
  })
})

test.describe('bringing it across', () => {
  test('adds the history, reads it back, and shows it without a reload', async ({ page }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await page.getByTestId('import-apply').click()

    const outcome = page.getByTestId('import-outcome')
    await expect(outcome).toContainText('Brought')
    await expect(outcome).toContainText('read them back to check')
    await expect(page.getByTestId('restore-storage-check')).toContainText('reopened the database')

    // The history is longer, and Timeline is reading it without a reload.
    await page.locator('.nav').getByRole('button', { name: 'Timeline' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Timeline' })).toBeVisible()
    await expect(page.getByText('Nothing recorded yet')).toHaveCount(0)
  })

  test('what came across is recognisably not what the owner wrote — QA-08-001', async ({
    page,
  }) => {
    /*
     * The assertion this file was missing, and the reason the defect shipped.
     *
     * The test above proved Timeline was not empty after an import, which is
     * true of a build that renders imported readings as if the owner had typed
     * them this morning — and that is exactly what it was doing. Being on the
     * screen and being distinguishable on the screen are two claims, and only
     * the first was held.
     */
    await seedOwnerHistory(page)
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await page.getByTestId('import-apply').click()
    await expect(page.getByTestId('import-outcome')).toContainText('Brought')

    await page.locator('.nav').getByRole('button', { name: 'Timeline' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Timeline' })).toBeVisible()

    const marked = page.getByTestId('tl-origin')
    await expect(marked.first()).toBeVisible()
    await expect(marked.first()).toHaveText('Imported')

    /*
     * And his own entries carry nothing. A build that marked every row would
     * pass the assertion above and would teach him to stop reading the badge,
     * which is the same defect facing the other way.
     */
    const rows = page.locator('.tl-entry')
    const total = await rows.count()
    const badges = await marked.count()
    expect(total).toBeGreaterThan(badges)

    // The seeded owner entry is one of the unmarked ones.
    const own = page.locator('.tl-entry', { hasText: 'the kitchen counter, again' })
    await expect(own).toHaveCount(1)
    await expect(own.getByTestId('tl-origin')).toHaveCount(0)
  })

  test('a conclusion drawn only from imported history says so — QA-08-001 retest', async ({
    page,
  }) => {
    /*
     * The half the first repair missed, on the surfaces it missed.
     *
     * Marking the Timeline row and leaving Life's overview and an Insights card
     * unmarked satisfies "recognisably imported" only if the owner reads the
     * rows rather than the conclusion — and the conclusion is what those two
     * screens exist to show him.
     */
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await page.getByTestId('import-apply').click()
    await expect(page.getByTestId('import-outcome')).toContainText('Brought')

    await page.locator('.nav').getByRole('button', { name: 'Life' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Life' })).toBeVisible()
    const areas = page.getByTestId('life-origin')
    await expect(areas.first()).toBeVisible()
    await expect(areas.first()).toHaveText('Imported')

    await page.locator('.nav').getByRole('button', { name: 'Insights' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()
    const cards = page.getByTestId('insight-origin')
    await expect(cards.first()).toBeVisible()
    await expect(cards.first()).toHaveText('Imported')
  })

  test('the badge is separated by a space, not only by a margin', async ({ page }) => {
    /*
     * `margin-left` separates the badge on screen and nowhere else. Read aloud
     * or copied out, "…may come up on Now." and "Imported" ran together as one
     * word — and the surface this matters most on is the one whose whole job is
     * to say the two things are different.
     *
     * Asserted on the rendered text rather than on the style, because a margin
     * is exactly the thing that looks like it has solved this and has not.
     */
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await page.getByTestId('import-apply').click()
    await expect(page.getByTestId('import-outcome')).toContainText('Brought')

    for (const [destination, testId] of [
      ['Timeline', 'tl-origin'],
      ['Life', 'life-origin'],
      ['Insights', 'insight-origin'],
    ] as const) {
      await page.locator('.nav').getByRole('button', { name: destination }).click()
      await expect(page.getByRole('heading', { level: 1, name: destination })).toBeVisible()
      const badges = page.getByTestId(testId)
      if ((await badges.count()) === 0) continue

      const runTogether = await badges.first().evaluate((node) => {
        const parent = node.parentElement
        if (parent === null) return false
        const text = parent.innerText
        const at = text.lastIndexOf('Imported')
        if (at <= 0) return false
        return !/\s/.test(text.charAt(at - 1))
      })
      expect(runTogether, `${destination} runs the badge into the text before it`).toBe(false)
    }
  })

  test('the export says so too, where the reader was not there', async ({ page }) => {
    await seedOwnerHistory(page)
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await page.getByTestId('import-apply').click()
    await expect(page.getByTestId('import-outcome')).toContainText('Brought')

    const text = await page.getByTestId('export-text').inputValue()
    /*
     * Named sections rather than "somewhere in the document" — QA's own note on
     * the first version of this test. An assertion that finds one marker
     * anywhere passes while four whole sections carry none, which is what
     * happened.
     */
    const sectionOf = (heading: string) => {
      const start = text.indexOf(heading)
      if (start === -1) return undefined
      const next = text.indexOf(String.fromCharCode(10) + '## ', start + heading.length)
      return text.slice(start, next === -1 ? undefined : next)
    }
    for (const heading of ['## Recent record', '## Direction, goals and commitments']) {
      const section = sectionOf(heading)
      expect(section, `${heading} should be in the document`).toBeDefined()
      expect(section, `${heading} should disclose imported origin`).toMatch(/· Imported/)
    }
    // The owner's own seeded entry appears without it.
    const ownLine = text.split('\n').find((line) => line.includes('the kitchen counter, again'))
    expect(ownLine, 'the owner’s own entry should be in the export').toBeDefined()
    expect(ownLine).not.toMatch(/· Imported/)
  })

  test('the same file twice says there is nothing left rather than doing it again', async ({
    page,
  }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)

    await readIt(page, file)
    await page.getByTestId('import-apply').click()
    await expect(page.getByTestId('import-outcome')).toContainText('Brought')

    await readIt(page, file)
    await expect(page.getByTestId('import-report')).toContainText(
      'Already here from an earlier run',
    )
    await expect(page.getByTestId('import-apply')).toBeDisabled()
    await expect(page.getByTestId('import-apply')).toContainText('Nothing left to bring across')
  })

  test('speaks to the owner rather than to whoever wrote it', async ({ page }) => {
    /*
     * The registry sweep in tests/unit/legacy-mapping.test.ts holds the strings.
     * This holds the **screen**, which is where the defect actually appeared:
     * every automated check passed while the report told the owner about
     * "D-091 invariant 6", "Section 59" and a constant called
     * MOVE_PREFERENCE_NOTE, and it was found by opening the page and reading it.
     *
     * A rendered panel can grow developer vocabulary from somewhere the registry
     * sweep never looks — a label, a heading, a sentence written in the
     * component. So both exist, and they are not the same check.
     */
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    // Everything behind a disclosure counts as on screen: it is one tap away,
    // and the owner is the one who taps it.
    await page
      .getByTestId('import-report')
      .locator('details')
      .evaluateAll((nodes) => {
        for (const node of nodes) (node as HTMLDetailsElement).open = true
      })

    const screen = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
    for (const [what, pattern] of [
      ['a decision id', /\bD-\d{3}\b/],
      ['a plan section number', /\bsections?\s+\d+/i],
      ['an identifier from the codebase', /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/],
      ['plan vocabulary', /\binvariant\b|\bcanonical\b/i],
      ['developer vocabulary', /\bdefect\b|\bschema\b|\bprovenance\b|\bquarantine/i],
      ['the third person about the reader', /\bthe owner\b/i],
    ] as const) {
      expect(screen, `${what} on an owner surface`).not.toMatch(pattern)
    }
  })

  test('the counts describe the file, and the claim never outruns them', async ({ page }) => {
    /*
     * Both halves found by reading the deployed screen after the QA repair, and
     * both introduced by that repair.
     *
     * The heading became "What is in that file", and one of the rows under it
     * was still counting what this run would write — so a second run of the
     * same file reported zero readings in a file that plainly holds two. And
     * the closing line said "everything in that file is already here" whenever
     * there was nothing to append, including when an entry had come back saying
     * something different, which is exactly when it is false.
     */
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)

    const report = page.getByTestId('import-report')
    const readable = await report
      .locator('.rows__row', { hasText: 'this app can read' })
      .innerText()
    const firstCount = readable.replace(/\D+/g, '')
    expect(Number(firstCount)).toBeGreaterThan(0)

    await page.getByTestId('import-apply').click()
    await expect(page.getByTestId('import-outcome')).toContainText('Brought')

    // The same file again: the file has not changed, so neither has the count.
    await readIt(page, file)
    const after = await report.locator('.rows__row', { hasText: 'this app can read' }).innerText()
    expect(after.replace(/\D+/g, '')).toBe(firstCount)
    await expect(page.getByTestId('import-would-do')).toContainText(
      'everything in that file is already here',
    )
  })

  test('never shows a count of one against a plural noun', async ({ page }) => {
    await openData(page)
    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await page.getByTestId('import-apply').click()

    const screen = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
    expect(screen).not.toMatch(/\b1 (?:entries|records|entities|rows)\b/)
  })
})

test.describe('whose history is being written to is never in doubt', () => {
  test('will not run while a test history is on screen, and says why', async ({ page }) => {
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /Two ordinary weeks/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('Two ordinary weeks')

    await page.goto(`${APP}#/data`)
    const blocked = page.getByTestId('import-blocked')
    await expect(blocked).toBeVisible()
    await expect(blocked).toContainText('Show mine')

    const file = await legacyFile(page, PASSPHRASE)
    await readIt(page, file)
    await expect(page.getByTestId('import-apply')).toBeDisabled()
  })
})
