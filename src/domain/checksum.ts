/**
 * A content fingerprint for a backup (canonical plan section 29 — integrity
 * metadata).
 *
 * SHA-256, written out here rather than reached for through a platform API,
 * for two reasons. `crypto.subtle.digest` is asynchronous and is absent or
 * partial in several of the environments this code has to run in — a Node test
 * runner with no DOM, a jsdom suite, a page served over plain HTTP during
 * development — and a restore that could not check its own file *in one
 * environment* would be a restore whose guarantee depended on where it ran.
 * And it has to be synchronous to be usable inside the validate-then-apply
 * sequence without threading a promise through every step of it.
 *
 * **What this proves and what it does not.** Section 29 keeps two concerns
 * apart: "authenticated/tamper validation and structural validation are
 * separate concerns". This is neither of those on its own — it is the third
 * thing, an integrity check: it catches a file that was truncated by a failed
 * download, mangled by a text editor, or corrupted in storage. It does **not**
 * prove the file was written by this app, because the algorithm is public and
 * anyone editing the contents can recompute it. Authenticated validation needs
 * a key, and there is nowhere on a device to keep one that an attacker with
 * the device could not also read. That is recorded as a deliberate deferral
 * rather than papered over with a checksum pretending to be a signature.
 */

const K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function utf8Bytes(text: string): Uint8Array {
  const out: number[] = []
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const low = text.charCodeAt(index + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00)
        index += 1
      }
    }
    if (code < 0x80) out.push(code)
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  return Uint8Array.from(out)
}

function rotr(value: number, by: number): number {
  return ((value >>> by) | (value << (32 - by))) >>> 0
}

/** Lower-case hex, sixty-four characters. */
export function sha256Hex(text: string): string {
  const bytes = utf8Bytes(text)
  const bitLength = bytes.length * 8

  // Padding: one 1 bit, then zeros, then the length as a 64-bit big-endian
  // count. The length lives in the last eight bytes of the final block.
  const withPadding = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64)
  withPadding.set(bytes)
  withPadding[bytes.length] = 0x80
  const view = new DataView(withPadding.buffer)
  // A history large enough to overflow 32 bits of bit-count is not reachable
  // here, and writing the high word explicitly says so rather than assuming it.
  view.setUint32(withPadding.length - 8, Math.floor(bitLength / 0x1_0000_0000), false)
  view.setUint32(withPadding.length - 4, bitLength >>> 0, false)

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const w = new Uint32Array(64)

  for (let offset = 0; offset < withPadding.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) w[index] = view.getUint32(offset + index * 4, false)
    for (let index = 16; index < 64; index += 1) {
      const a = w[index - 15] ?? 0
      const b = w[index - 2] ?? 0
      const s0 = (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) >>> 0
      const s1 = (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) >>> 0
      w[index] = (((w[index - 16] ?? 0) + s0 + (w[index - 7] ?? 0) + s1) >>> 0) as number
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let index = 0; index < 64; index += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
      const ch = ((e & f) ^ (~e & g)) >>> 0
      const temp1 = (h + S1 + ch + (K[index] ?? 0) + (w[index] ?? 0)) >>> 0
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0
      const temp2 = (S0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((word) => word.toString(16).padStart(8, '0')).join('')
}
