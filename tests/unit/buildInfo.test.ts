/**
 * @vitest-environment jsdom
 *
 * This suite is about browser behaviour — a hash, a location, a fetch — so it
 * asks for a DOM. Everything below the UI runs in plain Node.
 */
import { describe, expect, it, vi } from 'vitest'
import { fetchDeployedBuild, formatBuildTime, runningBuild } from '../../src/platform/buildInfo'

function stubFetch(impl: (input: string, init?: RequestInit) => Promise<Response> | Response) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response
}

describe('runningBuild', () => {
  it('is populated from compile-time definitions', () => {
    expect(typeof runningBuild.commitSha).toBe('string')
    expect(runningBuild.commitSha.length).toBeGreaterThan(0)
    expect(['preview', 'production', 'development']).toContain(runningBuild.target)
  })
})

describe('fetchDeployedBuild', () => {
  it('bypasses every cache layer so the answer reflects what is deployed now', async () => {
    const spy = stubFetch(() =>
      jsonResponse({
        commitSha: 'a'.repeat(40),
        commitShort: 'aaaaaaa',
        branch: 'main',
        target: 'preview',
        buildTime: '2026-08-15T10:00:00.000Z',
      }),
    )

    await fetchDeployedBuild()

    const [url, init] = spy.mock.calls[0] ?? []
    expect(url).toContain('build-info.json')
    // A cache-busting parameter as well as no-store: some mobile browsers
    // ignore the header on a same-URL request.
    expect(url).toMatch(/[?&]t=\d+/)
    expect(init?.cache).toBe('no-store')
  })

  it('reads the deployed identity', async () => {
    stubFetch(() =>
      jsonResponse({
        commitSha: 'b'.repeat(40),
        commitShort: 'bbbbbbb',
        branch: 'main',
        target: 'preview',
        buildTime: '2026-08-15T10:00:00.000Z',
      }),
    )

    const info = await fetchDeployedBuild()

    expect(info?.commitSha).toBe('b'.repeat(40))
    expect(info?.commitShort).toBe('bbbbbbb')
    expect(info?.target).toBe('preview')
  })

  it('derives a short SHA when the deployed file omits one', async () => {
    stubFetch(() => jsonResponse({ commitSha: 'c'.repeat(40) }))

    const info = await fetchDeployedBuild()

    expect(info?.commitShort).toBe('ccccccc')
  })

  it('returns null on a network failure so offline is never reported as stale', async () => {
    stubFetch(() => Promise.reject(new Error('offline')))

    await expect(fetchDeployedBuild()).resolves.toBeNull()
  })

  it('returns null on a non-OK response', async () => {
    stubFetch(() => jsonResponse({ commitSha: 'd'.repeat(40) }, false))

    await expect(fetchDeployedBuild()).resolves.toBeNull()
  })

  it('returns null on malformed JSON rather than throwing', async () => {
    stubFetch(
      () =>
        ({
          ok: true,
          json: async () => {
            throw new SyntaxError('unexpected token')
          },
        }) as unknown as Response,
    )

    await expect(fetchDeployedBuild()).resolves.toBeNull()
  })

  it('returns null when the payload has no commit SHA', async () => {
    stubFetch(() => jsonResponse({ buildTime: '2026-08-15T10:00:00.000Z' }))

    await expect(fetchDeployedBuild()).resolves.toBeNull()
  })

  it('returns null for a JSON payload that is not an object', async () => {
    stubFetch(() => jsonResponse('nope'))

    await expect(fetchDeployedBuild()).resolves.toBeNull()
  })
})

describe('formatBuildTime', () => {
  it('renders a valid timestamp', () => {
    expect(formatBuildTime('2026-08-15T10:00:00.000Z')).not.toBe('unknown')
  })

  it('reports unknown rather than Invalid Date', () => {
    expect(formatBuildTime('not-a-date')).toBe('unknown')
    expect(formatBuildTime('')).toBe('unknown')
  })
})
