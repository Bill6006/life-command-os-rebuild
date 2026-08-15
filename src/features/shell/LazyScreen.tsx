import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'

/**
 * Loading a screen that lives in its own chunk.
 *
 * Section 36: errors must be visible, and a fallback must not read as a
 * confident answer. A spinner that never resolves breaks both — on a phone
 * with bad signal it says "working on it" forever and never says "this did not
 * load, try again".
 *
 * So two things are covered. A chunk that fails outright rejects, React throws
 * on the next render, and the boundary offers a retry. A chunk that simply
 * never arrives gets no error at all, so the fallback itself speaks up after a
 * few seconds rather than waiting in silence.
 */

const PATIENCE_MS = 6000

function Loading({ label }: { label: string }) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), PATIENCE_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="lazy-screen" role="status">
      <p className="note">Loading {label}…</p>
      {slow ? (
        <>
          <p className="note">
            This is taking longer than it should. The connection may have dropped.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </>
      ) : null}
    </div>
  )
}

interface BoundaryProps {
  label: string
  children: ReactNode
}

interface BoundaryState {
  failed: boolean
}

class ChunkBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children

    return (
      <div className="lazy-screen" role="alert">
        <p className="note">{this.props.label} could not be loaded.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}

export function LazyScreen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ChunkBoundary label={label}>
      <Suspense fallback={<Loading label={label} />}>{children}</Suspense>
    </ChunkBoundary>
  )
}
