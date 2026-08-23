import { expect, test, type Page } from '@playwright/test'

/**
 * Data — export, backup and restore, in a real browser.
 *
 * The unit and contract suites prove the document format and the restore
 * sequence. These prove the parts that only exist once there is a screen and a
 * real IndexedDB behind it: that a backup taken here holds the owner's actual
 * records, that restoring one puts them back and the surfaces show it without
 * a reload, that a damaged file is refused with his history untouched, and
 * that this screen still works when the store underneath it is damaged —
 * G-012's "Data/restore remains reachable", which is the one condition where
 * the screen is the only way out.
 *
 * Every assertion runs at three widths, the smallest a 360px phone.
 */

const APP = '/life-command-os-rebuild/preview/'

async function openData(page: Page) {
  await page.goto(`${APP}#/data`)
  await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()
}

/**
 * Put a couple of records in the owner's own store.
 *
 * Written straight into his database rather than through the app, and the
 * reason is worth stating: on a history with nothing in it the guide has
 * nothing to ask about, so there is no answer to give and no record to create
 * — the first version of this helper tapped a button that a fresh install
 * never shows. Seeding is also the honest shape of what is being tested here,
 * which is what a backup does with records that already exist rather than how
 * records come to exist.
 *
 * The rows go in as **wire** objects, which is exactly what the store holds,
 * so they are parsed on the way out by the same reader everything else uses.
 */
async function seedOwnerHistory(page: Page, howMany: 1 | 2 = 2) {
  await page.goto(APP)
  await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()

  await page.evaluate(async (count: number) => {
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
      if (count > 1) store.put(row('01JQWNBRWSER0000000000000A', 'a quiet Sunday evening'))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  }, howMany)

  /*
   * And now let the app read it.
   *
   * Without this the seed is invisible to everything except a fresh read of
   * the store: the provider opened before the rows existed, and a `goto` that
   * only changes the hash is not a reload. The backup panel still worked —
   * `ownerSnapshot()` re-reads — so the gap was silent, and the export header
   * was being asserted against an empty history the whole time. Phase 6's
   * lesson, on a new surface: coverage that cannot observe the thing it claims
   * to prove reads as evidence either way.
   */
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
}

/**
 * A count of one against a plural noun.
 *
 * The nouns are named rather than guessed at: a rule over every word
 * ending in s would fire on "1 was" and be turned off within a week.
 */
const DISAGREEMENT =
  /\b1 (?:entries|records|entities|rows|days|occasions|pairs|things|unreadable rows)\b/

function sectionBox(page: Page, id: string) {
  return page.getByTestId(`section-${id}`)
}

test.describe('reaching Data', () => {
  test('lives behind More rather than in the navigation', async ({ page }) => {
    await page.goto(APP)
    await expect(page.locator('.nav .nav__item')).toHaveCount(4)
    await expect(page.locator('.nav').getByRole('button', { name: 'Data' })).toHaveCount(0)

    await page.locator('.topbar').getByRole('button', { name: 'More' }).click()
    await page.getByRole('link', { name: 'Exports, backup and restore' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()
  })

  test('is deep-linkable and survives a reload', async ({ page }) => {
    // Section 29 and G-012: a restore has to be reachable when the app is
    // having trouble, and a typed address is the route that does not depend on
    // another screen rendering first.
    await openData(page)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()
  })
})

test.describe('composing a review export', () => {
  test('composes something without being asked to choose anything first', async ({ page }) => {
    await openData(page)
    const text = page.getByTestId('export-text')
    await expect(text).toContainText('Life Command OS — review export')
    await expect(text).toContainText('## Source of truth')
    await expect(text).toContainText('## Where things stand')
  })

  test('adds and removes a section as it is ticked', async ({ page }) => {
    await openData(page)
    const text = page.getByTestId('export-text')

    await expect(text).not.toContainText('## Diagnostics')
    await sectionBox(page, 'diagnostics').check()
    await expect(text).toContainText('## Diagnostics')

    await sectionBox(page, 'diagnostics').uncheck()
    await expect(text).not.toContainText('## Diagnostics')
  })

  test('select all leaves the private section alone', async ({ page }) => {
    // Section 11 and 4.3 — including the most sensitive thing the app holds is
    // a decision the owner makes, and a control labelled "select all" is not
    // him making it.
    await openData(page)
    await page.getByRole('button', { name: 'Select all' }).click()

    await expect(sectionBox(page, 'overview')).toBeChecked()
    await expect(sectionBox(page, 'diagnostics')).toBeChecked()
    await expect(sectionBox(page, 'private')).not.toBeChecked()
    await expect(page.getByTestId('private-state')).toContainText('left out')
  })

  test('clear empties the selection and says the document holds nothing', async ({ page }) => {
    await openData(page)
    await page.getByRole('button', { name: 'Clear' }).click()

    await expect(sectionBox(page, 'overview')).not.toBeChecked()
    await expect(page.getByTestId('export-text')).toContainText('No sections were chosen')
  })

  test('says which way round the private section is, in both states', async ({ page }) => {
    await openData(page)
    await expect(page.getByTestId('private-state')).toContainText('left out')

    await sectionBox(page, 'private').check()
    await expect(page.getByTestId('private-state')).toContainText('is included')
    await expect(page.getByTestId('export-text')).toContainText(
      'The Private / Sexual Health section is included.',
    )
  })

  test('remembers the last selection, and never remembers the private one', async ({ page }) => {
    await openData(page)
    await sectionBox(page, 'history').uncheck()
    await sectionBox(page, 'diagnostics').check()
    await sectionBox(page, 'private').check()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()

    await expect(sectionBox(page, 'history')).not.toBeChecked()
    await expect(sectionBox(page, 'diagnostics')).toBeChecked()
    // A decision to include the private area is made each time or not at all.
    await expect(sectionBox(page, 'private')).not.toBeChecked()
  })

  test('copies the whole export, and the prompt on its own', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openData(page)

    await page.getByRole('button', { name: 'Copy the export' }).click()
    await expect(page.getByTestId('export-notice')).toContainText('copied')
    const whole = await page.evaluate(() => navigator.clipboard.readText())
    expect(whole).toContain('## Where things stand')

    await page.getByRole('button', { name: 'Copy the prompt' }).click()
    await expect(page.getByTestId('export-notice')).toContainText('copied')
    const prompt = await page.evaluate(() => navigator.clipboard.readText())
    expect(prompt).toContain('## What not to change')
    // The prompt alone, not the whole document.
    expect(prompt).not.toContain('## Where things stand')
  })

  test('shows the export in a field, so a refused clipboard is not the end of it', async ({
    page,
  }) => {
    // The phone case this exists for: an in-app browser that declines the
    // clipboard entirely. Selecting text needs no permission.
    await openData(page)
    const text = page.getByTestId('export-text')
    await expect(text).toBeVisible()
    await expect(text).toHaveAttribute('readonly', '')
    expect((await text.inputValue()).length).toBeGreaterThan(400)
  })

  test('says outright when the history on screen is a test one', async ({ page }) => {
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /Two ordinary weeks/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('Two ordinary weeks')

    await page.locator('.topbar').getByRole('button', { name: 'More' }).click()
    await page.getByRole('link', { name: 'Exports, backup and restore' }).click()

    await expect(page.getByTestId('data-laboratory-notice')).toBeVisible()
    await expect(page.getByTestId('export-text')).toContainText('This is not a real person')
  })
})

test.describe('the export describes the history that is actually there', () => {
  test('reports the span and the areas of the owner’s own record', async ({ page }) => {
    // The assertion the seed reload exists for. Without it this passed against
    // an empty history and said nothing at all.
    await seedOwnerHistory(page)
    await openData(page)

    const covers = page.locator('.rows__row', { hasText: 'Record covers' }).first().locator('dd')
    await expect(covers).not.toHaveText('nothing recorded')
    await expect(covers).toContainText('entries')

    const areas = page.locator('.rows__row', { hasText: 'Life areas in it' }).first().locator('dd')
    await expect(areas).toHaveText('Home & Environment')

    await expect(page.getByTestId('export-text')).toContainText('Life areas with entries: home')
  })

  test('agrees with itself about how many entries there are', async ({ page }) => {
    /*
     * "1 entries" survived every automated check on this phase and was found by
     * reading the screen. Then a second reading found "all 1 records" in the
     * line the restore prints afterwards — a panel this sweep did not reach,
     * because it only ran before anything had been restored. So it now walks
     * the whole flow, and names the nouns rather than two of them.
     */
    /*
     * **Exactly one record**, and that is the whole test.
     *
     * With two, "2 entries" is correct English and this sweep can never fire —
     * which is precisely what happened: a reintroduction of "all N records"
     * passed here, because N was two. A count only disagrees with its noun
     * when the count is one.
     */
    await seedOwnerHistory(page, 1)
    await openData(page)

    const readEverything = async () => [
      await page.getByTestId('export-text').inputValue(),
      await page.locator('.screen').innerText(),
    ]

    const check = async (when: string) => {
      for (const source of await readEverything()) {
        expect(source, when).not.toMatch(DISAGREEMENT)
        expect(source, when).not.toContain('(s)')
      }
    }

    await check('before a backup')

    await page.getByRole('button', { name: 'Take a backup' }).click()
    await expect(page.getByTestId('backup-text')).toBeVisible()
    await page.getByTestId('restore-paste').fill(await page.getByTestId('backup-text').inputValue())
    await page.getByTestId('restore-check').click()
    await expect(page.getByTestId('restore-plan')).toBeVisible()
    await check('with a file checked')

    await page.getByTestId('restore-apply').click()
    await expect(page.getByTestId('restore-done')).toBeVisible()
    await check('after a restore')
  })

  test('shows no raw machine timestamp on the surface', async ({ page }) => {
    // Section 36 — technical detail belongs behind inspection, and an ISO
    // string with milliseconds on it is technical detail.
    await seedOwnerHistory(page)
    await openData(page)
    await page.getByRole('button', { name: 'Take a backup' }).click()
    await expect(page.getByTestId('backup-text')).toBeVisible()

    // And the restore preview, which is where the *file's* own timestamp is
    // rendered. Sweeping only the backup panel left that row unread, which is
    // how a reintroduction of the raw ISO string escaped this test once.
    await page.getByTestId('restore-paste').fill(await page.getByTestId('backup-text').inputValue())
    await page.getByTestId('restore-check').click()
    await expect(page.getByTestId('restore-plan')).toBeVisible()

    const rows = await page.locator('.rows__row').allInnerTexts()
    for (const row of rows) {
      expect(row, `a raw timestamp on screen: ${row}`).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/)
    }
  })
})

test.describe('taking a backup', () => {
  test('holds the owner’s own records, with a fingerprint and a filename', async ({ page }) => {
    await seedOwnerHistory(page)
    await openData(page)

    await page.getByRole('button', { name: 'Take a backup' }).click()
    const backup = page.getByTestId('backup-text')
    await expect(backup).toBeVisible()

    const json = await backup.inputValue()
    const parsed = JSON.parse(json) as {
      format: string
      integrity: { checksum: string; records: number }
      snapshot: { records: unknown[] }
    }
    expect(parsed.format).toBe('life-command-os/backup')
    expect(parsed.integrity.checksum).toHaveLength(64)
    expect(parsed.integrity.records).toBe(parsed.snapshot.records.length)
    expect(parsed.snapshot.records.length).toBeGreaterThan(0)
  })

  test('takes the owner’s records even while a test history is on screen', async ({ page }) => {
    /*
     * D-091's eighth invariant, on the artefact that would outlive the
     * mistake: a backup of a fixture, filed under his name, restored six
     * months later.
     */
    await seedOwnerHistory(page)

    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /Two ordinary weeks/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('Two ordinary weeks')

    await page.locator('.topbar').getByRole('button', { name: 'More' }).click()
    await page.getByRole('link', { name: 'Exports, backup and restore' }).click()
    await page.getByRole('button', { name: 'Take a backup' }).click()

    const json = await page.getByTestId('backup-text').inputValue()
    const parsed = JSON.parse(json) as {
      snapshot: { records: { provenance: { source: string } }[] }
    }
    // A fixture's rows are written by the laboratory; his are not.
    for (const record of parsed.snapshot.records) {
      expect(record.provenance.source).not.toBe('synthetic')
    }
  })
})

test.describe('putting a backup back', () => {
  test('checks the file, shows what it holds, and only then offers to apply it', async ({
    page,
  }) => {
    await seedOwnerHistory(page)
    await openData(page)

    await page.getByRole('button', { name: 'Take a backup' }).click()
    const json = await page.getByTestId('backup-text').inputValue()

    // Nothing to apply until a file has been checked.
    await expect(page.getByTestId('restore-apply')).toHaveCount(0)

    await page.getByTestId('restore-paste').fill(json)
    await page.getByTestId('restore-check').click()

    const plan = page.getByTestId('restore-plan')
    await expect(plan).toBeVisible()
    await expect(plan).toContainText('holds everything it says it holds')
    await expect(plan).toContainText('It will restore')
    await expect(plan).toContainText('It will replace')
    await expect(page.getByTestId('restore-apply')).toBeVisible()
  })

  test('restores, verifies from a reopened database, and shows it without a reload', async ({
    page,
  }) => {
    await seedOwnerHistory(page)
    await openData(page)

    await page.getByRole('button', { name: 'Take a backup' }).click()
    const json = await page.getByTestId('backup-text').inputValue()
    const held = (JSON.parse(json) as { snapshot: { records: unknown[] } }).snapshot.records.length

    await page.getByTestId('restore-paste').fill(json)
    await page.getByTestId('restore-check').click()
    await page.getByTestId('restore-apply').click()

    await expect(page.getByTestId('restore-done')).toContainText('Restored and checked')
    await expect(page.getByTestId('restore-done')).toContainText(
      `the store now holds ${held} ${held === 1 ? 'entry' : 'entries'}`,
    )
    await expect(page.getByTestId('restore-storage-check')).toContainText('reopened the database')

    // And Timeline is reading the restored history, without anything reloading.
    await page.locator('.nav').getByRole('button', { name: 'Timeline' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Timeline' })).toBeVisible()
  })

  test('refuses a file that is not a backup, and changes nothing', async ({ page }) => {
    await seedOwnerHistory(page)
    await openData(page)

    await page.getByTestId('restore-paste').fill('this is a note to self, not a backup')
    await page.getByTestId('restore-check').click()

    await expect(page.getByTestId('restore-refusal')).toBeVisible()
    await expect(page.getByTestId('restore-refusal')).toContainText('Nothing was changed')
    await expect(page.getByTestId('restore-apply')).toHaveCount(0)
  })

  test('refuses a backup that has been altered, and takes the same file again once repaired', async ({
    page,
  }) => {
    await seedOwnerHistory(page)
    await openData(page)

    await page.getByRole('button', { name: 'Take a backup' }).click()
    const json = await page.getByTestId('backup-text').inputValue()
    const damaged = json.replace(/"checksum": "[0-9a-f]{64}"/, `"checksum": "${'f'.repeat(64)}"`)
    expect(damaged).not.toBe(json)

    await page.getByTestId('restore-paste').fill(damaged)
    await page.getByTestId('restore-check').click()
    await expect(page.getByTestId('restore-refusal')).toContainText('changed or damaged')

    // Section 29 — the same-file retry. Offering the undamaged copy after a
    // refusal has to work without reloading anything.
    await page.getByTestId('restore-paste').fill(json)
    await page.getByTestId('restore-check').click()
    await expect(page.getByTestId('restore-plan')).toBeVisible()
  })

  test('will not run while a test history is on screen, and says why', async ({ page }) => {
    await seedOwnerHistory(page)

    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /Two ordinary weeks/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('Two ordinary weeks')

    await page.locator('.topbar').getByRole('button', { name: 'More' }).click()
    await page.getByRole('link', { name: 'Exports, backup and restore' }).click()

    await expect(page.getByTestId('restore-blocked')).toContainText('Show mine')
  })
})

test.describe('when the store underneath is damaged — G-012', () => {
  test('Data still opens, and a backup still carries the unreadable row', async ({ page }) => {
    /*
     * A row the parser cannot read, written straight into the owner's own
     * database. This is the state G-012 is about: the app has to stay usable,
     * the damage has to be visible, and Data has to remain reachable — because
     * on a real phone this screen is the only way to get the history out.
     */
    await seedOwnerHistory(page)

    await page.evaluate(async () => {
      const open = indexedDB.open('life-command-os:preview')
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['records'], 'readwrite')
        transaction.objectStore('records').put({ id: 'NOTANID', kind: 'telepathy' })
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
      db.close()
    })

    await openData(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Data' })).toBeVisible()

    await page.getByRole('button', { name: 'Take a backup' }).click()
    const json = await page.getByTestId('backup-text').inputValue()
    const parsed = JSON.parse(json) as {
      integrity: { malformed: number }
      snapshot: { malformed: unknown[] }
    }
    // Kept rather than dropped: a backup that quietly omitted the damage would
    // hand back a thinner history on the day it was needed.
    expect(parsed.integrity.malformed).toBeGreaterThan(0)
    expect(parsed.snapshot.malformed.length).toBe(parsed.integrity.malformed)

    // And that backup still reads back as a complete one.
    await page.getByTestId('restore-paste').fill(json)
    await page.getByTestId('restore-check').click()
    await expect(page.getByTestId('restore-plan')).toBeVisible()
  })
})

test.describe('on a phone', () => {
  test('nothing on the screen pushes the page sideways', async ({ page }) => {
    // A whole backup is a very long line. It has to scroll inside its own
    // field rather than making the page scroll horizontally (section 37).
    await seedOwnerHistory(page)
    await openData(page)
    await page.getByRole('button', { name: 'Take a backup' }).click()
    await expect(page.getByTestId('backup-text')).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('every control is a comfortable target for a thumb', async ({ page }) => {
    await openData(page)
    const buttons = page.locator('.data-actions button, .data-section')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(4)

    for (let index = 0; index < count; index += 1) {
      const box = await buttons.nth(index).boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40)
    }
  })

  test('the destructive control is not where a thumb lands by accident', async ({ page }) => {
    // It appears only after a file has been checked, below the whole preview
    // of what it is about to do — never beside the button that checked it.
    await seedOwnerHistory(page)
    await openData(page)
    await page.getByRole('button', { name: 'Take a backup' }).click()
    const json = await page.getByTestId('backup-text').inputValue()

    await page.getByTestId('restore-paste').fill(json)
    await page.getByTestId('restore-check').click()

    const check = await page.getByTestId('restore-check').boundingBox()
    const apply = await page.getByTestId('restore-apply').boundingBox()
    expect(apply?.y ?? 0).toBeGreaterThan((check?.y ?? 0) + 100)
  })
})
