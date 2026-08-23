import { expect, test, type Page } from '@playwright/test'

/**
 * The QA laboratory, in a real browser.
 *
 * These are the parts the unit suite cannot prove: that IndexedDB actually
 * keeps a history across a reload, that a damaged file leaves every surface
 * standing, and that the laboratory's code is not shipped to anyone who has
 * not asked for it.
 */

const APP = '/life-command-os-rebuild/preview/'

async function openQa(page: Page) {
  await page.goto(`${APP}#/qa`)
  await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
}

async function loadScenario(page: Page, title: string) {
  await page.getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.locator('.qa-scenario--active')).toContainText(title)
}

function block(page: Page, title: string) {
  return page.locator('details.qa-block', { has: page.locator('> summary', { hasText: title }) })
}

/** Some blocks open by default, so clicking blindly would close them. */
async function openBlock(page: Page, title: string) {
  const target = block(page, title)
  // `> summary` on purpose: the ranking block contains a <details> per move,
  // so a descendant match would resolve to several summaries.
  if ((await target.getAttribute('open')) === null) await target.locator('> summary').click()
  await expect(target).toHaveAttribute('open', '')
  return target
}

function rowValue(page: Page, label: string) {
  return page.locator('.rows__row', { hasText: label }).first().locator('dd')
}

test.describe('reaching the laboratory', () => {
  test('lives behind More rather than in the navigation', async ({ page }) => {
    await page.goto(APP)

    // The bar holds the four primary destinations. Neither QA nor More is one.
    await expect(page.locator('.nav .nav__item')).toHaveCount(4)
    await expect(page.locator('.nav').getByRole('button', { name: 'QA' })).toHaveCount(0)

    await page.locator('.topbar').getByRole('button', { name: 'More' }).click()
    await page.getByRole('link', { name: 'Open the QA laboratory' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
  })

  test('its code is not downloaded until it is asked for', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (request) => requested.push(request.url()))

    await page.goto(APP)
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()
    expect(requested.filter((url) => url.includes('QaScreen'))).toEqual([])

    await page.goto(`${APP}#/qa`)
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
    expect(requested.filter((url) => url.includes('QaScreen')).length).toBeGreaterThan(0)
  })
})

test.describe('a real store', () => {
  test('uses IndexedDB and says so', async ({ page }) => {
    await openQa(page)
    await expect(rowValue(page, 'Backend')).toHaveText('indexeddb')
    await expect(rowValue(page, 'Durable')).toHaveText('Yes')
  })

  test('keeps a loaded history across a reload', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A topic that keeps slipping')
    await expect(rowValue(page, 'Records')).toHaveText('4')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()
    // Nothing was reloaded from a fixture — this came back off the disk.
    await expect(rowValue(page, 'Records')).toHaveText('4')
    await expect(rowValue(page, 'Entities')).toHaveText('2')
  })

  test('reopens the database and finds the same history', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')

    await page.getByRole('button', { name: 'Reopen and verify' }).click()
    const result = page.getByTestId('storage-check')
    await expect(result).toBeVisible()
    await expect(result).toHaveClass(/qa-ok/)
    await expect(result).toContainText('came back identical')
  })

  test('never puts history in localStorage', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')

    const stored = await page.evaluate(() =>
      Object.entries(localStorage).map(([key, value]) => `${key}=${String(value)}`),
    )
    for (const entry of stored) {
      expect(entry).not.toContain('sleep.hours-last-night')
      expect(entry).not.toContain('schemaVersion')
    }
  })

  test('empties the laboratory back to nothing known', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')
    await page.getByRole('button', { name: 'Empty the laboratory' }).click()
    await expect(rowValue(page, 'Records')).toHaveText('0')
  })
})

test.describe('the subject survives to the screen', () => {
  test('renders a recommendation that names subnetting', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A topic that keeps slipping')
    const recorded = await openBlock(page, 'Recommendations in history')

    const sentence = page.getByTestId('recommendation-sentence')
    await expect(sentence).toHaveText(
      'Spend 10 minutes recalling subnetting before you reopen your notes.',
    )
    // Scoped to this block: the engine's own decision has a Subject and a
    // Follow-up too, and they are about the move it chose rather than the one
    // stored in the history.
    await expect(recorded.locator('.rows__row', { hasText: 'Subject' }).locator('dd')).toHaveText(
      'subnetting',
    )
    await expect(recorded.locator('.rows__row', { hasText: 'Follow-up' }).locator('dd')).toHaveText(
      'How did the subnetting recall go?',
    )
  })

  test('shows an entity fact as the thing it names, not as an identifier', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A topic that keeps slipping')

    // Both places the fact appears — what is believed, and what the decision
    // actually read. An id leaking onto either would be the same defect.
    const believes = await openBlock(page, 'What the system believes')
    await expect(
      believes.locator('.rows__row', { hasText: 'Current learning topic' }).locator('dd'),
    ).toHaveText('subnetting')

    const considered = await openBlock(page, 'Facts considered')
    await expect(
      considered.locator('.rows__row', { hasText: 'Current learning topic' }).locator('dd'),
    ).toContainText('subnetting')
  })
})

test.describe('a file with damage in it', () => {
  test('lists every unreadable row with a reason, and keeps the rest of the screen', async ({
    page,
  }) => {
    await openQa(page)
    await loadScenario(page, 'A file with damage in it')

    await expect(rowValue(page, 'Records')).toHaveText('5')
    await expect(rowValue(page, 'Unreadable rows').first()).toHaveText('6')

    const rows = await openBlock(page, 'Unreadable rows')
    await expect(rows.getByTestId('malformed-rows').locator('.qa-malformed__row')).toHaveCount(6)
    await expect(rows.locator('.qa-malformed__issues li').first()).not.toBeEmpty()

    // The surface that matters is still populated, not blanked.
    const believes = await openBlock(page, 'What the system believes')
    await expect(believes.locator('.qa-group[data-state="explicit"]')).toBeVisible()
  })
})

test.describe('time travel', () => {
  test('moves the owner-local day without touching the history', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')

    await expect(rowValue(page, 'Owner-local')).toHaveText('2026-02-15 21:00')
    await expect(rowValue(page, 'Local week')).toHaveText('2026-W07')

    await page.getByRole('button', { name: '+1 day' }).click()
    await expect(rowValue(page, 'Owner-local')).toHaveText('2026-02-16 21:00')
    await expect(rowValue(page, 'Local week')).toHaveText('2026-W08')

    await page.getByRole('button', { name: '−1 week' }).click()
    await expect(rowValue(page, 'Owner-local')).toHaveText('2026-02-09 21:00')

    // Travelling does not rewrite anything.
    await expect(rowValue(page, 'Records')).toHaveText('19')
  })

  test('does not leave a DST warning up after moving away from the gap', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'The same evenings, read from four places')
    await page.getByLabel('Timezone').selectOption('America/New_York')

    // 02:30 on the morning New York springs forward. That wall-clock time does
    // not exist, and the screen should say so.
    await page.getByLabel('Travel to').fill('2026-03-08T02:30')
    await expect(page.getByTestId('dst-note')).toContainText('does not exist')

    // …and should stop saying so about 04:30, which plainly does exist.
    await page.getByRole('button', { name: '+1 hour' }).click()
    await expect(page.getByTestId('dst-note')).toHaveCount(0)
  })

  test('relabels the same history when the timezone changes', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'The same evenings, read from four places')

    const before = await rowValue(page, 'Owner-local').innerText()
    await page.getByLabel('Timezone').selectOption('Pacific/Auckland')
    const after = await rowValue(page, 'Owner-local').innerText()

    expect(after).not.toBe(before)
    await expect(rowValue(page, 'Records')).toHaveText('4')
  })
})

test.describe('privacy', () => {
  test('withholds private detail until it is asked for', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')
    await openBlock(page, 'What the system believes')

    const privateRow = page
      .locator('.rows__row', { hasText: 'Recent private pattern' })
      .locator('dd')
    await expect(privateRow).toHaveText('Private entry')

    await page.getByText('Show private detail').click()
    await expect(privateRow).toHaveText('late scrolling again')
  })
})

test.describe('mobile layout', () => {
  test('does not overflow sideways, however much is on screen', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'A file with damage in it')

    for (const title of ['What the system believes', 'Ranking', 'The document']) {
      await openBlock(page, title)
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('the inspector says where a belief came from', () => {
  test('separates what the owner answered from what was worked out', async ({ page }) => {
    // Owner requirement 2. "3 comparable results" could be three things he
    // said, three things the app concluded, or a mix, and he cannot judge
    // whether to correct a belief without knowing which.
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: /A month of what actually worked/ }).click()
    await expect(page.locator('.qa-scenario--active')).toContainText('what actually worked')

    await page.locator('summary', { hasText: 'What it has learned' }).click()
    const said = page.locator('.rows__row', { hasText: 'Who said so' }).first()
    await expect(said).toContainText('you answered')
  })
})

/**
 * R3-B1 — the laboratory cannot reach the owner's own history.
 *
 * The defect this replaces was reproducible in four steps and destroyed real
 * data: record something on a normal Now, open QA, load any scenario, and the
 * owner's history was gone — `replaceAll` on a store both surfaces shared. No
 * warning, no undo, and every automated test passed, because none of them had
 * ever put an owner record in front of the laboratory.
 *
 * The two halves have to hold together. A fixture must still be inspectable
 * from every normal surface, which is the whole point of the laboratory; and
 * the owner's history must be exactly where he left it afterwards.
 */
test.describe('the laboratory and the owner keep separate histories', () => {
  const HIS_OWN = 'weekly review on Sunday'

  /**
   * Something of the owner's own, in the owner's own database.
   *
   * Written straight into IndexedDB rather than through a screen, and that is
   * deliberate: this test is *about* the two databases, so naming one of them
   * is the subject rather than a leak of an implementation detail. It also has
   * to be: a domain page on a completely empty store has nothing to correct and
   * offers no control, so there is no owner-surface route to a first record in
   * a fresh browser context.
   *
   * The row is the same wire shape `recordToWire` writes, so the app reads it
   * exactly as it would read one of its own.
   */
  async function seedHisOwnHistory(page: Page) {
    await page.goto(APP)
    await expect(page.getByRole('heading', { level: 1, name: 'Now' })).toBeVisible()

    await page.evaluate(async (text: string) => {
      const open = indexedDB.open('life-command-os:preview', 1)
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
      const transaction = db.transaction(['records'], 'readwrite')
      transaction.objectStore('records').put({
        // A real record id: 26 characters of Crockford base32, no I, L, O or U.
        id: '01JQWNSEED0000000000000000',
        schemaVersion: 1,
        kind: 'observation',
        /*
         * Deliberately **later than every scenario clock** (R5-B1). This row
         * used to be dated 1 May against a 2 May fixture, one day earlier, so
         * no assertion here could notice a record being hidden for not having
         * happened yet: the coverage proved the store boundary and was blind
         * to the temporal half of the same screen.
         */
        occurredAt: '2026-08-20T18:00:00.000Z',
        recordedAt: '2026-08-20T18:00:00.000Z',
        zone: 'America/Denver',
        domains: ['home'],
        entities: [],
        privacy: 'normal',
        provenance: { source: 'owner', writtenBy: 'life' },
        concept: 'home.friction',
        value: { type: 'text', value: text },
        method: 'self-report',
      })
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
      db.close()
    }, HIS_OWN)

    await page.reload()
    await page.goto(`${APP}#/timeline`)
    await expect(page.getByText(HIS_OWN)).toBeVisible()
  }

  test('a loaded scenario does not overwrite what the owner recorded', async ({ page }) => {
    await seedHisOwnHistory(page)

    // The fixture is still inspectable from a normal surface — the behaviour
    // that must survive the repair rather than be traded away for it.
    await openQa(page)
    await loadScenario(page, 'Two months of readings, and nothing graded')
    await page.goto(`${APP}#/timeline`)
    await expect(page.getByText(HIS_OWN)).toHaveCount(0)
    await expect(page.getByText('Current energy').first()).toBeVisible()

    // And his own history is not gone — it was never written over.
    await page.goto(`${APP}#/qa`)
    await page.getByRole('button', { name: 'Empty the laboratory' }).click()
    await page.goto(`${APP}#/timeline`)
    await expect(page.getByText(HIS_OWN)).toBeVisible()
  })

  test('says whose evening is on screen, from a normal surface', async ({ page }) => {
    /*
     * Inspecting a fixture from Now is intended. Being unable to tell that is
     * what it is would be the largest version of the claim-wider-than-the-
     * evidence mistake this whole phase has been about.
     */
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')

    await page.goto(`${APP}#/now`)
    const notice = page.locator('.lab-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('not yours')

    await notice.getByRole('button', { name: 'Show mine' }).click()
    await expect(page.locator('.lab-notice')).toHaveCount(0)
  })

  /**
   * R4-B1 — the return has to actually show him his own history, and keep
   * showing it.
   *
   * The notice disappearing was all the first version of this checked, and the
   * notice disappeared correctly while Timeline said "Nothing here yet"
   * indefinitely. His bytes were safe in their own database the whole time;
   * what was wrong was the picture of them, and a reload being able to fix it
   * does not make a false empty-history claim acceptable — least of all one
   * printed under a promise that nothing of his had been changed.
   *
   * Both assertions matter and they are different. The immediate one catches a
   * return that never publishes his history. The delayed one catches the
   * actual defect: a slower operation, started against the laboratory, landing
   * afterwards and publishing the store it was working against.
   */
  for (const route of [
    {
      name: 'Show mine, from a normal surface',
      async leave(page: Page) {
        await page.goto(`${APP}#/now`)
        await page.locator('.lab-notice').getByRole('button', { name: 'Show mine' }).click()
      },
    },
    {
      name: 'Empty the laboratory, from QA',
      async leave(page: Page) {
        await page.goto(`${APP}#/qa`)
        await page.getByRole('button', { name: 'Empty the laboratory' }).click()
      },
    },
  ]) {
    test(`gives him his history back and keeps it — ${route.name}`, async ({ page }) => {
      await seedHisOwnHistory(page)
      await openQa(page)
      await loadScenario(page, 'Two months of readings, and nothing graded')

      await route.leave(page)

      await page.goto(`${APP}#/timeline`)
      await expect(page.getByText(HIS_OWN)).toBeVisible()
      await expect(page.locator('.lab-notice')).toHaveCount(0)

      // And it stays his. Anything still in flight against the laboratory has
      // had time to land by now, and none of it may reach the screen.
      await page.waitForTimeout(1500)
      await expect(page.getByText(HIS_OWN)).toBeVisible()
      await expect(page.getByText('Current energy: 2 of 5')).toHaveCount(0)
      await expect(page.locator('.lab-notice')).toHaveCount(0)
    })
  }

  test('gives back his clock as well as his records, after answering the fixture', async ({
    page,
  }) => {
    /*
     * R5-B1's own reproduction, both halves of it.
     *
     * A scenario sets the zone, the week start and the moment, and the library
     * is full of fixtures set in the past. Answering one and then returning is
     * the sequence the owner actually performs, and it is the one that used to
     * leave his August records evaluated against a June clock — invisible, with
     * the notice already gone.
     */
    await seedHisOwnHistory(page)
    await openQa(page)
    await loadScenario(page, 'One answer, and a lot of silence')

    // Answer the fixture's live question, so there is a real write against it.
    await page.goto(`${APP}#/now`)
    const option = page.locator('.now-option').first()
    if (await option.isVisible()) await option.click()

    await page.locator('.lab-notice').getByRole('button', { name: 'Show mine' }).click()

    await page.goto(`${APP}#/timeline`)
    await expect(page.getByText(HIS_OWN)).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.getByText(HIS_OWN), 'his August record is hidden as future').toBeVisible()

    // And the clock came back with the records.
    await page.goto(`${APP}#/qa`)
    await expect(page.getByText(/2026-06-15/)).toHaveCount(0)
  })

  test('a load still in flight cannot pull him back into the laboratory', async ({ page }) => {
    /*
     * The race made deterministic, rather than waited for.
     *
     * QA's focused run failed this three-for-three and the full suite passed
     * it 300/300 on the same code — an order-dependent false green, which is
     * worth less than no test at all because it reads as evidence. So this one
     * does not hope to catch two operations overlapping: it starts a slow one
     * (replacing the store with a 142-record fixture) and interrupts it with a
     * fast one, every run.
     *
     * Whichever way the two land in the store, only the newer one may reach
     * the screen.
     */
    await seedHisOwnHistory(page)
    await openQa(page)

    // Deliberately not awaited: the load is still running when the next line
    // clicks.
    void page.getByRole('button', { name: /Two months of readings/ }).click()
    await page.getByRole('button', { name: 'Empty the laboratory' }).click()

    await page.goto(`${APP}#/timeline`)
    await expect(page.getByText(HIS_OWN)).toBeVisible()

    await page.waitForTimeout(1500)
    await expect(page.getByText(HIS_OWN), 'the abandoned load published over him').toBeVisible()
    await expect(page.locator('.lab-notice')).toHaveCount(0)
  })

  test('survives a reload while the laboratory is loaded, and still says so', async ({ page }) => {
    await openQa(page)
    await loadScenario(page, 'Two ordinary weeks')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'QA' })).toBeVisible()

    await page.goto(`${APP}#/now`)
    await expect(page.locator('.lab-notice')).toBeVisible()
  })
})
