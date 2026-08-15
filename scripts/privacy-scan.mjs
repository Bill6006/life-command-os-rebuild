#!/usr/bin/env node
/**
 * Privacy scan (canonical plan section 39).
 *
 * Real owner data must never enter this repository's history. This runs over
 * tracked files at every gate. It is a guard against accidents, not a
 * substitute for judgement.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

/** Addresses that are infrastructure, not people. */
const ALLOWED_EMAIL = [/@users\.noreply\.github\.com$/i, /^support@github\.com$/i]

/** Filenames that look like a real backup or export rather than a fixture. */
const FORBIDDEN_NAMES = [
  /\.backup\.json$/i,
  /-export-\d/i,
  /^owner-data\//i,
  /^private\//i,
  /life-?command-?os.*\.html$/i,
]

/** Binary and generated files we do not read. */
const SKIP_CONTENT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|zip|map)$/i

const MAX_BYTES = 2_000_000

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
}

const findings = []

for (const file of trackedFiles()) {
  for (const pattern of FORBIDDEN_NAMES) {
    if (pattern.test(file)) {
      findings.push(`${file}: filename looks like real owner data (${pattern})`)
    }
  }

  if (SKIP_CONTENT.test(file)) continue

  let size = 0
  try {
    size = statSync(file).size
  } catch {
    continue
  }
  if (size > MAX_BYTES) continue

  let text = ''
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  for (const match of text.match(EMAIL) ?? []) {
    if (ALLOWED_EMAIL.some((allowed) => allowed.test(match))) continue
    findings.push(`${file}: possible email address "${match}"`)
  }
}

if (findings.length > 0) {
  console.error('Privacy scan failed:\n')
  for (const finding of findings) console.error(`  - ${finding}`)
  console.error('\nReal owner data must never enter this repository (canonical plan section 39).')
  process.exit(1)
}

console.log(`Privacy scan clean (${trackedFiles().length} tracked files).`)
