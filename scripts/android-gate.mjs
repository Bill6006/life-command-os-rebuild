#!/usr/bin/env node
/**
 * The builder's own Android-style gate (canonical plan sections 33 and 37, and
 * owner decision D-076).
 *
 * A narrow desktop viewport is not a phone. Phase 4 closed five defects that
 * 171 passing browser tests at three widths had all missed, and every one of
 * them needed touch, a real device pixel ratio and an Android user agent to
 * appear at all. So this drives the **deployed Preview** — the same bytes the
 * owner's handset fetches, over the same network — in a Galaxy-class context,
 * and reports what a person would see rather than what an assertion was told
 * to look for.
 *
 * It is deliberately a script rather than a Playwright project. The suite
 * tests a locally built `dist`; this tests what is actually deployed, after
 * the deploy, which is the thing every phase handoff has to prove.
 *
 *   node scripts/android-gate.mjs [url]
 *
 * Default target is the Preview. Exits non-zero on any finding.
 */
import { chromium, devices } from '@playwright/test'

const BASE = process.argv[2] ?? 'https://bill6006.github.io/life-command-os-rebuild/preview/'

/** A Galaxy S24-class context: touch, Android Chrome, device pixel ratio 3. */
const ANDROID = {
  ...devices['Galaxy S24'],
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
}

/** A count of one against a plural noun. The nouns are named, not guessed. */
const DISAGREEMENT =
  /\b1 (?:entries|records|entities|rows|days|occasions|pairs|things|unreadable rows)\b/

const findings = []
const notes = []

function check(name, condition, detail) {
  if (condition) notes.push(`  ok   ${name}`)
  else findings.push(`${name}${detail === undefined ? '' : ` — ${detail}`}`)
}

/**
 * The smallest a control may be for a thumb — QA-82-004.
 *
 * One number, read by the name, the predicate and the diagnostic. It used to be
 * three: two checks were called "clears 44px of thumb" and asserted `>= 40`,
 * and the four that asserted `>= 44` printed the measurement rounded — so a
 * control measuring 43.9996 failed a check whose own diagnostic said it was
 * 44px tall. Whatever this gate reports has to be the thing it tested.
 */
const THUMB = 44

/**
 * A touch target, measured and reported unrounded.
 *
 * `toFixed(2)` rather than `Math.round`, because the value this exists to make
 * legible is the fractional one: a subpixel miss and an undersized button are
 * different findings and used to print identically.
 */
function clearsThumb(what, height) {
  check(
    `${what} clears ${THUMB}px of thumb`,
    height !== undefined && height !== null && height >= THUMB,
    height === undefined || height === null ? 'not on screen' : `${height.toFixed(2)}px tall`,
  )
}

async function seedOwnerHistory(page) {
  await page.evaluate(async () => {
    const at = new Date(Date.now() - 3_600_000).toISOString()
    const row = (id, text) => ({
      id,
      schemaVersion: 1,
      kind: 'observation',
      occurredAt: at,
      recordedAt: at,
      zone: 'America/Denver',
      domains: ['home'],
      entities: [],
      privacy: 'normal',
      provenance: { source: 'owner', writtenBy: 'the android gate' },
      concept: 'home.friction',
      value: { type: 'text', value: text },
      method: 'self-report',
    })

    const open = indexedDB.open('life-command-os:preview')
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(['records'], 'readwrite')
      const store = transaction.objectStore('records')
      store.put(row('01JQWNANDRXD00000000000000', 'the kitchen counter, again'))
      store.put(row('01JQWNANDRXD0000000000000A', 'a quiet Sunday evening'))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    db.close()
  })

  // And let the app read it: the provider opened before these rows existed,
  // and a hash change is not a reload.
  await page.reload()
  await page.waitForSelector('h1')
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...ANDROID,
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error)))

  console.log(`Android gate against ${BASE}\n`)

  // The deployed build, named, so this run can be tied to a checkpoint.
  const info = await page.request.get(`${BASE}build-info.json?t=${Date.now()}`)
  const build = await info.json()
  console.log(`  deployed build: ${build.commitSha} (${build.target}), built ${build.buildTime}\n`)

  await page.goto(BASE)
  await page.waitForSelector('h1')
  await seedOwnerHistory(page)

  // ---- Data is reachable the way an owner would reach it --------------------
  await page.locator('.topbar').getByRole('button', { name: 'More' }).tap()
  await page.getByRole('link', { name: 'Exports, backup and restore' }).tap()
  await page.waitForSelector('h1:has-text("Data")')
  check('Data opens from More by touch', true)

  // ---- Nothing pushes the page sideways ------------------------------------
  const sideways = async (where) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(`no horizontal overflow (${where})`, overflow <= 1, `${overflow}px of overflow`)
  }
  await sideways('on arrival')

  // ---- Section selection, by thumb -----------------------------------------
  await page.getByRole('button', { name: 'Select all' }).tap()
  const privateOn = await page.getByTestId('section-private').isChecked()
  check('Select all leaves the private section off', privateOn === false)
  check(
    'the private state is stated in words',
    (await page.getByTestId('private-state').innerText()).length > 10,
  )

  await page.getByTestId('section-private').tap()
  check(
    'turning the private section on says so',
    (await page.getByTestId('private-state').innerText()).includes('included'),
  )
  await page.getByTestId('section-private').tap()

  // ---- The screen agrees with itself, in words -----------------------------
  const onScreen = await page.locator('.screen').innerText()
  check(
    'the record on screen is the one in the store',
    !onScreen.includes('nothing recorded'),
    'the header says the history is empty while the store holds records',
  )
  check(
    'counts agree with their nouns',
    !DISAGREEMENT.test(onScreen) && !onScreen.includes('(s)'),
    'a count and its noun disagree',
  )
  check(
    'no raw machine timestamp on the surface',
    !/\d{4}-\d{2}-\d{2}T\d{2}:/.test(onScreen),
    'an ISO timestamp is on an owner surface',
  )

  // ---- Every control is a real target --------------------------------------
  const targets = page.locator('.data-actions button, .data-section')
  const count = await targets.count()
  let smallest = Infinity
  for (let index = 0; index < count; index += 1) {
    const box = await targets.nth(index).boundingBox()
    if (box !== null) smallest = Math.min(smallest, box.height)
  }
  // `Infinity` would sail through the comparison, so nothing found is reported
  // as nothing found rather than as a pass.
  clearsThumb(
    'the smallest control on the data screen',
    Number.isFinite(smallest) ? smallest : undefined,
  )

  // ---- Copying works on a phone --------------------------------------------
  await page.getByRole('button', { name: 'Copy the prompt' }).tap()
  const notice = await page.getByTestId('export-notice').innerText()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  check('Copy the prompt reports what happened', notice.length > 0)
  check(
    'the prompt reached the clipboard, or the field said so',
    copied.includes('What not to change') || notice.toLowerCase().includes('field below'),
  )

  // ---- A backup, and the whole restore, on the phone ------------------------
  await page.getByRole('button', { name: 'Take a backup' }).tap()
  await page.waitForSelector('[data-testid="backup-text"]')
  const backup = await page.getByTestId('backup-text').inputValue()
  const parsed = JSON.parse(backup)
  check('the backup carries a fingerprint', parsed.integrity?.checksum?.length === 64)
  check(
    'the backup holds the owner’s own records',
    parsed.snapshot.records.length >= 2,
    `${parsed.snapshot.records.length} records`,
  )
  await sideways('with a whole backup on screen')

  await page.getByTestId('restore-paste').fill(backup)
  await page.getByTestId('restore-check').tap()
  await page.waitForSelector('[data-testid="restore-plan"]')
  check('the preview appears before anything is applied', true)

  const checkBox = await page.getByTestId('restore-check').boundingBox()
  const applyBox = await page.getByTestId('restore-apply').boundingBox()
  check(
    'the destructive control is well below the one that checked the file',
    (applyBox?.y ?? 0) - (checkBox?.y ?? 0) > 100,
    `${Math.round((applyBox?.y ?? 0) - (checkBox?.y ?? 0))}px apart`,
  )

  await page.getByTestId('restore-apply').tap()
  await page.waitForSelector('[data-testid="restore-done"]')
  const afterRestore = await page.locator('.screen').innerText()
  check(
    'the restore result reads as English',
    !DISAGREEMENT.test(afterRestore) && !afterRestore.includes('(s)'),
    'a count and its noun disagree after the restore',
  )
  const done = await page.getByTestId('restore-done').innerText()
  check('the restore reports what it verified', done.includes('Restored and checked'))
  const storage = await page.getByTestId('restore-storage-check').innerText()
  check('and that it read the database again afterwards', storage.includes('reopened'))

  // ---- A damaged file, on the phone ----------------------------------------
  const damaged = backup.replace(/"checksum": "[0-9a-f]{64}"/, `"checksum": "${'f'.repeat(64)}"`)
  await page.getByTestId('restore-paste').fill(damaged)
  await page.getByTestId('restore-check').tap()
  await page.waitForSelector('[data-testid="restore-refusal"]')
  const refusal = await page.getByTestId('restore-refusal').innerText()
  check('a damaged file is refused in plain words', refusal.includes('changed or damaged'))
  check('and the refusal says nothing was changed', refusal.includes('Nothing was changed'))

  await page.getByTestId('restore-paste').fill(backup)
  await page.getByTestId('restore-check').tap()
  await page.waitForSelector('[data-testid="restore-plan"]')
  check('the same file is accepted again after a refusal', true)

  // ---- Bringing the old app's history across, by thumb ----------------------
  //
  // Driven on the deployed build, in a Galaxy-class context, because the whole
  // flow depends on the page's own Web Crypto: the file is encrypted here and
  // decrypted a moment later by the same implementation, at the parameters the
  // old application used. A desktop viewport would prove none of that, and a
  // hard-coded blob would prove only that one blob can be read.
  /*
   * One base moment for every file this gate builds.
   *
   * The row dates have to be **identical** across two builds, or the second
   * file is a genuinely different file and the later-backup checks below prove
   * nothing about the product. Recomputing them from `Date.now()` inside each
   * evaluate made every row differ by the milliseconds between the two calls,
   * which is a defect in this harness that reads exactly like the defect it is
   * checking for.
   */
  const baseMoment = Date.now()

  const buildLegacy = async (secret, createdAtDays, energyOrdinal) =>
    page.evaluate(
      async ({ secret, createdAtDays, energyOrdinal, baseMoment }) => {
        const b64 = (bytes) => {
          let binary = ''
          for (const byte of bytes) binary += String.fromCharCode(byte)
          return btoa(binary)
        }
        const at = (days) =>
          new Date(baseMoment - days * 86400000).toISOString().replace(/\.\d+Z$/, '.000Z')
        const row = (id, type, occurredAt, extra) => ({
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
          row('android-1', 'observation', at(3), {
            category: 'time-attention-capacity',
            attribute: 'state:energy',
            value: {
              kind: 'anchored-scale',
              scaleId: 'energy',
              ordinal: energyOrdinal,
              label: 'Good',
            },
          }),
          row('android-2', 'goal', at(30), {
            statement: 'Pass the CCNA',
            category: 'career-work-learning',
            state: 'active',
            privacy: 'workplace',
          }),
          row('android-3', 'recommendation', at(5), { statement: 'Ten minutes of subnetting' }),
          row('android-4', 'move-preference', at(20), {
            engineCandidateId: 'social:message-someone',
            moveStatement: 'Message someone you have not spoken to',
            stance: 'forbidden',
          }),
        ]

        const serialised = JSON.stringify(
          [...records].sort((a, b) => a.recordId.localeCompare(b.recordId)),
        )
        const digest = async (value) => {
          const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
          return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
        }
        const payload = {
          payloadVersion: 1,
          storageSchemaVersion: 1,
          recordCount: records.length,
          integrity: { algorithm: 'SHA-256', digest: await digest(serialised) },
          records: JSON.parse(serialised),
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
          saltBase64: b64(salt),
          ivBase64: b64(iv),
        }
        const aad = new TextEncoder().encode(
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
          { name: 'AES-GCM', iv, additionalData: aad },
          key,
          new TextEncoder().encode(JSON.stringify(payload)),
        )

        return JSON.stringify({
          format: 'life-command-os.backup',
          formatVersion: 2,
          createdAt: at(createdAtDays),
          encrypted: true,
          approximateRecordCount: records.length,
          crypto: meta,
          ciphertextBase64: b64(new Uint8Array(ciphertext)),
        })
      },
      { secret, createdAtDays, energyOrdinal, baseMoment },
    )

  const legacy = await buildLegacy('the one from the old phone', 1, 4)

  await page.getByTestId('import-paste').fill(legacy)
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  const recognised = await page.getByTestId('import-recognised').innerText()
  check(
    'an old backup is recognised before a passphrase is asked for',
    recognised.includes('old app'),
  )
  check('and it says how the file was encrypted', recognised.includes('AES-GCM'))
  await sideways('import, recognised')

  // A wrong passphrase, first. Nothing should be written, and the sentence has
  // to be one an owner can act on.
  await page.getByTestId('import-passphrase').fill('not the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-refusal"]')
  const wrong = await page.getByTestId('import-refusal').innerText()
  check('a wrong passphrase is refused in plain words', wrong.includes('did not work'))
  /*
   * Said once (QA-08-N2). It used to appear in the sentence and again in a
   * standing note underneath, in two slightly different wordings, which reads
   * as two separate reassurances. Counted rather than matched on one phrasing,
   * because the old check named the duplicate and would have held it in place.
   */
  const reassurance = wrong.match(/nothing (?:has been|was) changed/gi) ?? []
  check(
    'and says nothing was changed, once',
    reassurance.length === 1,
    `said ${String(reassurance.length)} times`,
  )

  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')

  const report = await page.getByTestId('import-report').innerText()
  check(
    'the whole report appears before anything is written',
    report.includes('Nothing has been written yet'),
  )
  check('it says what is deliberately left out', report.includes('Left out on purpose'))
  check(
    'and it names the standing decision it cannot keep',
    (await page.getByTestId('import-unkept').innerText()).includes('Message someone'),
  )
  check(
    'the passphrase field is gone once it has been used',
    (await page.getByTestId('import-passphrase').count()) === 0,
  )
  await sideways('import, report')

  const importTargets = page.locator('[data-testid="import-report"] ~ .data-actions button')
  const importSizes = await importTargets.evaluateAll((nodes) =>
    nodes.map((node) =>
      Math.min(node.getBoundingClientRect().height, node.getBoundingClientRect().width),
    ),
  )
  clearsThumb(
    'the smallest of the import controls',
    importSizes.length === 0 ? undefined : Math.min(...importSizes),
  )

  await page.getByTestId('import-apply').tap()
  await page.waitForSelector('[data-testid="import-outcome"]')
  const imported = await page.getByTestId('import-outcome').innerText()
  check(
    'the import reports what it brought and that it checked it',
    imported.includes('read them back to check'),
  )
  check('and it says nothing about a machine timestamp', !/\d{4}-\d{2}-\d{2}T\d{2}:/.test(imported))
  check(
    'and the app never prints a count of one against a plural noun',
    !/\b1 (?:entries|records|entities|rows)\b/.test(await page.locator('main').innerText()),
  )

  // The same file again. It has to say there is nothing left rather than
  // rewriting the store to change nothing.
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')
  const again = await page.getByTestId('import-report').innerText()
  check('a second run says it is already here', again.includes('Already here from an earlier run'))
  check('and offers nothing to press', await page.getByTestId('import-apply').isDisabled())
  await sideways('import, second run')

  // ---- A later backup of the same old history — QA-08-002 -------------------
  //
  // The ordinary way an append-first old history gains rows is a new backup,
  // and a new backup has a new creation time. That used to rewrite every
  // archived row's fingerprint and report six unchanged rows as changed.
  const laterSame = await buildLegacy('the one from the old phone', 0, 4)
  await page.getByTestId('import-paste').fill(laterSame)
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')
  check(
    'a newer backup of unchanged history reports no conflicts',
    (await page.getByTestId('import-conflicts').count()) === 0,
  )
  check(
    'and still says everything is already here',
    (await page.getByTestId('import-report').innerText()).includes(
      'Already here from an earlier run',
    ),
  )

  const laterChanged = await buildLegacy('the one from the old phone', 0, 1)
  await page.getByTestId('import-paste').fill(laterChanged)
  await page.getByTestId('import-identify').tap()
  await page.waitForSelector('[data-testid="import-recognised"]')
  await page.getByTestId('import-passphrase').fill('the one from the old phone')
  await page.getByTestId('import-read').tap()
  await page.waitForSelector('[data-testid="import-report"]')
  const conflictText = await page.getByTestId('import-conflicts').innerText()
  check('one changed old row reports exactly one entry', conflictText.startsWith('1 entry'))
  check('and reads as one thing rather than several', !/\b1 entries\b/.test(conflictText))

  // ---- What came across says so, where it is read — QA-08-001 ---------------
  await page.locator('.nav').getByRole('button', { name: 'Timeline' }).tap()
  await page.waitForSelector('h1:has-text("Timeline")')
  const badges = await page.getByTestId('tl-origin').count()
  const rows = await page.locator('.tl-entry').count()
  check('imported entries are marked on Timeline', badges > 0)
  check('and the owner’s own entries are not', rows > badges, `${rows} rows, ${badges} marked`)
  check(
    'the marker reads as a word rather than a code',
    (await page.getByTestId('tl-origin').first().innerText()) === 'Imported',
  )
  await sideways('Timeline, with imported history')

  // ---- A conclusion drawn only from imported history — QA-08-001 retest ----
  //
  // The half the first repair missed. Marking the Timeline row and leaving the
  // Life overview and an Insights card unmarked satisfies "recognisably
  // imported" only if the owner reads the rows rather than the conclusion, and
  // the conclusion is what those two screens exist to show him.
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  const lifeMarks = await page.getByTestId('life-origin').count()
  check('an area heard about only through an import says so on Life', lifeMarks > 0)
  await sideways('Life, with imported history')

  await page.locator('.nav').getByRole('button', { name: 'Insights' }).tap()
  await page.waitForSelector('h1:has-text("Insights")')
  const cardMarks = await page.getByTestId('insight-origin').count()
  check('and an Insights card drawn from it says so too', cardMarks > 0)
  await sideways('Insights, with imported history')

  // ---- Phase 81: the sentences and the controls, on a phone -----------------
  /*
   * Every check here is a thing the audit found by *reading a screen* rather
   * than by asserting a string, which is why they belong in this gate as well
   * as in the suite: a control the owner has to find with a thumb, and copy
   * that has to be true at the hour it is read.
   */
  const loadScenario = async (title) => {
    await page.goto(`${BASE}#/qa`)
    await page.waitForSelector('h1:has-text("QA")')
    await page.getByRole('button', { name: new RegExp(title) }).tap()
    await page.waitForSelector('.qa-scenario--active')
  }
  const openNow = async () => {
    await page.locator('.nav').getByRole('button', { name: 'Now' }).tap()
    await page.waitForSelector('h1:has-text("Now")')
  }

  await loadScenario('A morning after three bad nights')

  const sweep = page.getByTestId('qa-sweep')
  check('the laboratory offers a block sweep', (await sweep.count()) === 1)
  await sweep.tap()
  const sweptRows = await page.getByTestId('qa-sweep-rows').locator('.qa-sweep__row').count()
  check('and it answers for all five parts of the day', sweptRows === 5, `${sweptRows} rows`)
  await sideways('QA, block sweep open')

  await openNow()
  const morning = await page.locator('.screen').innerText()
  check(
    'a morning nine hours short of rest is not told to study',
    /light day/i.test(morning),
    morning.slice(0, 160),
  )
  check(
    'and nothing on that screen claims it is the evening',
    !/tonight|this evening/i.test(morning),
    (morning.match(/[^.]*(tonight|this evening)[^.]*/i) ?? [''])[0],
  )
  await sideways('Now, a morning')

  await loadScenario('Six chances, three managed')
  await openNow()
  const growth = await page.getByTestId('now-growth').innerText()
  check(
    'no run is claimed about a skill that never went well twice in a row',
    !/ordering her own food/i.test(growth),
    growth,
  )
  const growthEvidence = await page.getByTestId('now-growth-evidence').innerText()
  check(
    'and the occasions that went the other way are counted',
    /needed a hand/i.test(growthEvidence),
  )
  check(
    'with nothing that reads as a mark about a four-year-old',
    !/%|\bscore\b|\brate\b|\bout of\b/i.test(`${growth} ${growthEvidence}`),
    `${growth} ${growthEvidence}`,
  )
  await sideways('Now, a growth suggestion')

  await loadScenario('A week pointed at the house')
  await openNow()
  check(
    'stopping a recommendation family is not offered before a refusal',
    (await page.getByTestId('now-stop').count()) === 0,
  )
  await page.getByRole('button', { name: "Can't right now" }).tap()
  const stop = page.getByTestId('now-stop')
  check('and is offered behind one', (await stop.count()) === 1)

  const stopBox = await stop.boundingBox()
  clearsThumb('the stop control', stopBox?.height)

  await stop.tap()
  const confirm = await page.getByTestId('now-stop-confirm').innerText()
  check('it names the move rather than saying "this"', /kitchen/i.test(confirm), confirm)
  check('and says where it can be lifted', /lift it/i.test(confirm), confirm)
  await sideways('Now, stopping a family')

  await page.getByTestId('now-stop-move').tap()
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: /Home/ }).first().tap()
  // The page's own heading, not any heading: `h1` is already on screen while
  // Life is, so waiting for it resolves before the navigation has happened.
  await page.waitForSelector('h1:has-text("Home & Environment")')
  await page.waitForSelector('[data-testid="domain-veto"]', { timeout: 5000 }).catch(() => {})
  const listed = await page.getByTestId('domain-veto').count()
  check('the veto is listed on the area it was filed under', listed > 0)
  const lift = page.getByTestId('domain-veto-lift').first()
  const liftBox = await lift.boundingBox()
  clearsThumb('and lifting it', liftBox?.height)
  await lift.tap()
  // Appending a record is a round trip to IndexedDB, so the row leaves on the
  // render after it rather than on the tap.
  await page
    .waitForSelector('[data-testid="domain-veto"]', { state: 'detached', timeout: 5000 })
    .catch(() => {})
  check('and it goes when lifted', (await page.getByTestId('domain-veto').count()) === 0)
  await sideways('a domain page, standing vetoes')

  // ---- Phase 81.6: what QA found by pressing things -------------------------
  /*
   * QA-81-003 and QA-81-004 were both found on a deployed screen, in one
   * session, by pressing a button twice and by looking at the same sentence at
   * four hours of one day. Neither was visible to the unit suite, which was
   * green throughout. So both reproductions are pressed here, on a handset,
   * against the deployed bytes.
   */
  const nowHeadline = async () => {
    await openNow()
    return (await page.locator('.primary-surface__headline').innerText()).trim()
  }
  /** What the laboratory says the owner-local clock currently reads. */
  const ownerLocal = async () => {
    const row = await page.locator('.rows__row', { hasText: 'Owner-local' }).innerText()
    return (row.match(/(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/) ?? []).slice(1)
  }

  /*
   * Move the laboratory clock, and check that it moved.
   *
   * A hash change on the same document, which is how the owner would get there
   * and the only way the session ledger survives the trip. Each press is
   * confirmed against the clock the screen is showing rather than counted:
   * `travelTo` exists because a loop of presses can outrun the re-render and
   * land an hour short, and a gate that lands an hour short reports on a screen
   * nobody asked about.
   */
  const travel = async (direction, hours) => {
    await page.goto(`${BASE}#/qa`)
    await page.waitForSelector('h1:has-text("QA")')
    const button = page.getByRole('button', { name: `${direction}1 hour` })
    for (let step = 0; step < hours; step += 1) {
      const before = (await ownerLocal()).join(' ')
      await button.tap()
      await page
        .waitForFunction(
          (was) =>
            ![...document.querySelectorAll('.rows__row')]
              .find((row) => row.textContent?.includes('Owner-local'))
              ?.textContent?.includes(was),
          before,
          { timeout: 5000 },
        )
        .catch(() => {})
    }
  }

  /*
   * Forwards, and from the morning — QA-81-003's own hours.
   *
   * The ledger only reads entries earlier than the moment being decided, which
   * is deliberate: noting a render must not change the render it is noting. So
   * a day walked *backwards* is a day where nothing has been shown yet, and a
   * gate that walked backwards would report the defect as present forever. The
   * scenario is set at 19:30, so the trip to 06:30 happens before Now is opened
   * at all and nothing is recorded on the way.
   */
  await loadScenario('A week pointed at the house')
  await travel('−', 13)
  const acrossTheDay = [await nowHeadline()]
  for (const hours of [4, 4, 5]) {
    await travel('+', hours)
    acrossTheDay.push(await nowHeadline())
  }
  check(
    'the same sentence is not repeated through the hours of one day',
    new Set(acrossTheDay).size > 1,
    acrossTheDay.join(' | '),
  )
  await sideways('Now, later in the same session')

  await loadScenario('A week pointed at the house')
  await openNow()
  const refuseNow = () => page.getByTestId('now-actions').getByRole('button', { name: /right now/ })
  const headline = page.locator('.primary-surface__headline')
  /*
   * Waiting for the sentence to change, not for the button to exist.
   *
   * Writing the refusal is a round trip to IndexedDB and the button never
   * leaves the screen, so a second tap taken immediately lands on the same move
   * — and two refusals of one move are one refusal of one move. The gate would
   * then report the escalation missing when what it had done was refuse once,
   * twice.
   */
  const refuseAndWait = async () => {
    const before = await headline.innerText()
    await refuseNow().tap()
    await page.waitForFunction(
      (was) => document.querySelector('.primary-surface__headline')?.textContent?.trim() !== was,
      before.trim(),
      { timeout: 5000 },
    )
  }
  await refuseAndWait()
  await refuseAndWait()

  const stopped = await headline.innerText()
  check('two refusals stop the app offering', /not landing/i.test(stopped), stopped)
  check(
    'and there is nothing left to refuse a third time',
    (await page.getByTestId('now-actions').count()) === 0,
  )
  const asked = page.getByTestId('now-question')
  check('it asks instead of guessing again', (await asked.count()) === 1)
  const answerBox = await page.locator('.now-options button').first().boundingBox()
  clearsThumb('and the answer', answerBox?.height)
  await sideways('Now, two refusals in one block')

  await page.locator('.now-options button').first().tap()
  await page.waitForSelector('[data-testid="now-actions"]', { timeout: 5000 })
  check('answering it is worth something — the app looks again', true)
  await refuseAndWait()
  const stoppedForGood = await headline.innerText()
  check(
    'and the third refusal still stops the block',
    /nothing then/i.test(stoppedForGood),
    stoppedForGood,
  )
  await sideways('Now, the third refusal')

  /*
   * And the sentence the block turns over into — QA-81-007.
   *
   * This is the screen independent QA reached by pressing through the whole
   * refusal sequence and then waiting four hours, and what it printed was
   * "Nothing on the list is worth night it would cost." Broken English on a
   * real screen, in the phase about what the app says, under a green suite.
   */
  await travel('+', 4)
  const rolled = await nowHeadline()
  const rolledReason = await page.getByTestId('now-reason').innerText()
  check(
    'the block turns over into something to do or a sentence about not',
    rolled.length > 0 && rolledReason.length > 0,
    `${rolled} | ${rolledReason}`,
  )
  check(
    'and the late-night no-action copy is a sentence',
    !/worth (to)?night it would cost/i.test(rolledReason),
    rolledReason,
  )
  await sideways('Now, the block after the stop')

  /*
   * QA-81-006 — the repetition rule meeting the limiter, on a handset.
   *
   * One session on "A morning after three bad nights": 15:00, 20:00, 23:00,
   * pressing nothing. It used to end on ten minutes of subnetting recall, at
   * eleven at night, on a screen still saying he was nine hours short.
   */
  await loadScenario('A morning after three bad nights')
  await travel('+', 5)
  const afternoon = await nowHeadline()
  await travel('+', 5)
  const evening = await nowHeadline()
  await travel('+', 3)
  const lateNight = await nowHeadline()
  const lateNightScreen = await page.locator('.screen').innerText()

  check(
    'a day nine hours short opens on recovery and stays there',
    /recovery/i.test(afternoon) && /recovery/i.test(evening),
    `${afternoon} | ${evening}`,
  )
  check(
    'and never turns into the study session it spent the day declining',
    !/recalling subnetting/i.test(lateNightScreen),
    lateNight,
  )
  check(
    'and says why it has nothing rather than blaming the hour',
    /already been in front of you/i.test(lateNightScreen),
    lateNight,
  )
  await sideways('Now, the third hour of one day')

  /*
   * ------------------------------------------------------------------------
   * Phase 82 — the structural skeleton, on a handset
   * ------------------------------------------------------------------------
   *
   * Five packages end in something the owner has to find with a thumb, and
   * every one of them is new. A course he can stop, a deferral with nothing to
   * press, a day he can describe, a stage he can put back, and a date on a goal
   * that had none. The suite checks that they exist at three widths; this
   * checks that they are usable on a phone against the deployed bytes, which is
   * the distinction Phase 4 paid five defects to learn.
   */

  // ---- A course under way, and the one tap that stops it — AUD-0020 ---------
  await loadScenario('Two sessions in')
  await openNow()
  const partOf = await page.locator('.screen').innerText()
  check(
    'Now says which course the move belongs to',
    /Part of/.test(partOf) && /Three sessions on subnetting/.test(partOf),
  )
  check('and where in it, in words rather than a share', /third of three/.test(partOf))
  check('with no percentage anywhere on the screen', !/%/.test(partOf))
  await sideways('Now, a move inside a course')

  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  const stopControl = page.getByTestId('life-thread-stop')
  check('Life lists the course', (await stopControl.count()) === 1)
  const threadStopBox = await stopControl.boundingBox()
  clearsThumb('and the stop', threadStopBox?.height)
  await stopControl.tap()
  await page.waitForSelector('[data-testid="life-threads-past"]')
  const stoppedThread = await page.getByTestId('life-threads-past').innerText()
  check(
    'stopping it leaves it visible rather than vanishing',
    /Three sessions on subnetting/.test(stoppedThread) && /Stopped/.test(stoppedThread),
    stoppedThread.replace(/\s+/g, ' ').trim(),
  )
  await openNow()
  check(
    'and Now stops naming it the moment it is stopped',
    !/Part of/.test(await page.locator('.screen').innerText()),
  )
  await sideways('Life, a course stopped')

  // ---- The fifth state — AUD-0024 ------------------------------------------
  await loadScenario('Before the house is up')
  const held = await nowHeadline()
  const heldScreen = await page.locator('.screen').innerText()
  check(
    'a deferral names the part of today it is holding for',
    /The morning suits/.test(held),
    held,
  )
  check(
    'and says what is being held and why later is better',
    /has the room/.test(heldScreen) && /Adaya/.test(heldScreen),
  )
  check(
    'and offers nothing to press, because there is nothing to start',
    (await page.getByTestId('now-actions').count()) === 0,
  )
  /*
   * And one tap lower — QA-82-002.
   *
   * The round 1 report is explicit that this gate repeated the existence,
   * touch-target and overflow checks and none of the cross-line semantic
   * comparisons that found the defects. This is one of the two it was missing:
   * the panel that exists to answer *why this?* said nothing about the only
   * question a held decision raises.
   */
  await page.getByTestId('now-see-evidence').tap()
  await page.waitForSelector('[data-testid="now-evidence"]')
  const heldWhy = await page.getByTestId('now-evidence-deferral').innerText()
  check(
    'and the evidence says why later rather than now',
    /the morning/.test(heldWhy) && /not spoken for/.test(heldWhy),
    heldWhy.replace(/\s+/g, ' ').trim(),
  )
  check(
    'without arguing for doing it now under a sentence that says to wait',
    !/closes on its own/.test(heldWhy),
  )
  await sideways('Now, a deferral with its evidence open')

  // ---- The shape of the day — AUD-0004 -------------------------------------
  await loadScenario('A school morning')
  await openNow()
  const squeezed = await page.locator('.screen').innerText()
  check(
    'the time limiter says what the time is short of',
    /minutes before Adaya/.test(squeezed),
    (squeezed.match(/About \d+ minutes before [^.]*\./) ?? ['not found'])[0],
  )
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  const dayShape = await page.getByTestId('day-shape-list').innerText()
  check(
    'and Life reads the obligation back in the owner’s own words',
    /08:30 to 15:00, weekdays/.test(dayShape),
    dayShape.replace(/\s+/g, ' ').trim(),
  )
  await sideways('Life, the day’s shape')

  /*
   * And two hours on, inside the window — QA-82-001.
   *
   * The other comparison this gate was missing. It read the run-up to her
   * school day and never walked into it, so the hours the app was wrong about
   * her were the hours nothing here ever looked at.
   */
  await page.goto(`${BASE}#/qa`)
  await page.waitForSelector('h1:has-text("QA")')
  await page.getByRole('button', { name: '+1 hour' }).tap()
  await page.getByRole('button', { name: '+1 hour' }).tap()
  await openNow()
  const insideSchool = await page.getByTestId('now-premise').innerText()
  check(
    'the premise stops claiming she is here once her school day has started',
    !/Adaya is here/.test(insideSchool),
    insideSchool.replace(/\s+/g, ' ').trim(),
  )
  check(
    'and says where she is instead of going quiet about her',
    /school day is on until 15:00/.test(insideSchool),
  )
  const insideScreen = await page.locator('.screen').innerText()
  check(
    'and nothing on the screen offers time with someone at school',
    !/with Adaya/.test(insideScreen),
  )
  check(
    'while the middle of her school day is still his to use',
    !/About \d+ minutes before Adaya/.test(insideScreen),
  )
  /*
   * And the two fact surfaces one tap away — QA-82-001, round 2.
   *
   * Now was repaired in round 1 and this gate checked Now. The laboratory's
   * own ledger and the Fatherhood page render the concept registry, knew
   * nothing about the repair, and went on printing the durable arrangement as
   * the answer to whether she was here.
   */
  const ledger = await page.getByTestId('qa-facts').innerText()
  check(
    'the fact ledger separates whose day it is from where she is',
    /Child in the owner’s care today/.test(ledger) && /Child here right now/.test(ledger),
    ledger.replace(/\s+/g, ' ').slice(0, 160),
  )
  check(
    'and the current reading names the span that took her',
    /school day is on until 15:00/.test(ledger),
  )
  check(
    'and nothing on it is used for whether she is here',
    !/for whether she is here/.test(ledger),
  )

  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: 'Fatherhood / Family' }).tap()
  await page.waitForSelector('h1:has-text("Fatherhood")')
  const believes = await page.locator('.domain-reading').allInnerTexts()
  const presence = believes.find((row) => /Child here right now/.test(row)) ?? ''
  check(
    'the Fatherhood page says where she actually is',
    /school day is on until 15:00/.test(presence),
    presence.replace(/\s+/g, ' ').trim(),
  )
  check('and offers no correction on a thing the app worked out', !/Not right\?/.test(presence))
  await sideways('Fatherhood, inside the school window')

  await page.goto(`${BASE}#/qa`)
  await page.waitForSelector('h1:has-text("QA")')
  await page.getByRole('button', { name: new RegExp('A school morning') }).tap()
  await page.waitForSelector('.qa-scenario--active')
  await openNow()
  await sideways('Now, inside the school window')

  // ---- A stage on a child’s skill, set and unset — AUD-0015(a) --------------
  await loadScenario('Three times running, and the app noticed')
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: 'Fatherhood / Family' }).tap()
  await page.waitForSelector('h1:has-text("Fatherhood")')
  const stage = page.getByTestId('domain-skill-stage')
  const stageBox = await stage.boundingBox()
  clearsThumb('the growth stage', stageBox?.height)
  await stage.tap()
  await page.waitForSelector('[data-testid="domain-skill"]:has-text("Settled")')
  check('one tap settles it', true)
  await page.getByTestId('domain-skill-stage').tap()
  await page.waitForSelector('[data-testid="domain-skill"]:has-text("Being worked on")')
  check('and one tap puts it back — it is never permanent', true)
  const skillRow = await page.getByTestId('domain-skill').innerText()
  check(
    'and nothing on the row grades her',
    !/%|percent|score|rank|grade/i.test(skillRow),
    skillRow.replace(/\s+/g, ' ').trim(),
  )
  await sideways('Fatherhood, a growth stage')

  // ---- A goal with a date and pieces — AUD-0046, AUD-0021 -------------------
  await loadScenario('A week pointed at the house')
  await page.locator('.nav').getByRole('button', { name: 'Life' }).tap()
  await page.waitForSelector('h1:has-text("Life")')
  await page.getByRole('link', { name: 'Career & Learning' }).tap()
  await page.waitForSelector('h1:has-text("Career")')
  const trajectory = await page.getByTestId('domain-goal-trajectory').innerText()
  check(
    'the goal says how many pieces have moved and when the date is',
    /pieces/.test(trajectory) && /date you set/.test(trajectory),
    trajectory.replace(/\s+/g, ' ').trim(),
  )
  check('in counts, never a share', !/%|percent|score/i.test(trajectory))
  check(
    'and the date control is closed until it is asked for',
    (await page.getByTestId('domain-goal-date').count()) === 0,
  )
  await page.getByTestId('domain-goal-open').tap()
  await page.waitForSelector('[data-testid="domain-goal-date"]')
  check('and opens on a tap', true)
  await sideways('Career, a goal with a date')

  // ---- The rest of the app is still standing --------------------------------
  for (const destination of ['Now', 'Life', 'Timeline', 'Insights']) {
    await page.locator('.nav').getByRole('button', { name: destination }).tap()
    await page.waitForSelector(`h1:has-text("${destination}")`)
    await sideways(destination)
  }

  check('no errors in the console', consoleErrors.length === 0, consoleErrors.join(' | '))

  await browser.close()

  for (const note of notes) console.log(note)
  if (findings.length > 0) {
    console.error('\nAndroid gate findings:\n')
    for (const finding of findings) console.error(`  - ${finding}`)
    process.exit(1)
  }
  console.log(`\nAndroid gate clean — ${notes.length} checks.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
