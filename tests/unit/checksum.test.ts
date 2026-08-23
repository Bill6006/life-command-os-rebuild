import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { sha256Hex } from '../../src/domain/checksum'

/**
 * A hand-written digest is worth exactly as much as its proof.
 *
 * Checked two ways: against published vectors, so the implementation is right
 * rather than self-consistent, and against Node's own SHA-256 over generated
 * input, so a length or padding case nobody thought of still fails here rather
 * than on the owner's restore.
 */

describe('sha256Hex', () => {
  it('matches the published vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256Hex('a'.repeat(1000))).toBe(
      '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3',
    )
  })

  it('agrees with Node on multi-byte text', () => {
    // A backup carries the owner's own words. A digest that only handled ASCII
    // would pass every test written in English and fail on his first em dash.
    const text = 'héllo — 世界 🌍'
    expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'))
  })

  it('agrees with Node across every block-boundary length', () => {
    // 55/56 and 119/120 are where the length field stops fitting in the final
    // block and a whole extra block is needed. Both are off-by-one country.
    for (let length = 0; length <= 130; length += 1) {
      const text = 'x'.repeat(length)
      expect(sha256Hex(text), `length ${length}`).toBe(
        createHash('sha256').update(text, 'utf8').digest('hex'),
      )
    }
  })

  it('agrees with Node on a document-sized input', () => {
    const text = JSON.stringify(
      Array.from({ length: 500 }, (_, index) => ({ id: `R-${index}`, note: `entry ${index} — é` })),
    )
    expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'))
  })

  it('changes when one character changes', () => {
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'))
  })
})
