import type { Destination } from '../../platform/routing'

/**
 * Line icons at a consistent 24px grid and 1.6 stroke.
 *
 * Deliberately plain shapes — no cockpit gauges, no circuitry, no "AI brain"
 * motifs (plan section 24). Final iconography is still open (section 69).
 */
const paths: Record<Destination, string> = {
  // A filled moment on a line: the present point in the day.
  now: 'M3 12h4.5M16.5 12H21M12 7.2v-2M12 18.8v2',
  // Layered areas of a life.
  life: 'M12 3.5 3.5 8l8.5 4.5L20.5 8 12 3.5ZM3.5 12.6 12 17l8.5-4.4M3.5 16.9 12 21.3l8.5-4.4',
  // Events along a thread.
  timeline: 'M12 3.5v17M12 7.6h6.2M12 13.4H5.8M12 18.4h4.4',
  // A rising read on something.
  insights: 'M4 19.2h16M6.8 19.2V11m5.2 8.2V5.4m5.2 13.8v-5.6',
  // Overflow.
  more: 'M5.2 12h.01M12 12h.01M18.8 12h.01',
  // A flask. Not in the navigation — QA is reached from More.
  qa: 'M9.5 3.5v5.2L4.8 17a2.6 2.6 0 0 0 2.2 4h10a2.6 2.6 0 0 0 2.2-4l-4.7-8.3V3.5M8.4 3.5h7.2M7.2 14.4h9.6',
}

const circles: Partial<Record<Destination, { cx: number; cy: number; r: number }[]>> = {
  now: [{ cx: 12, cy: 12, r: 3.6 }],
  timeline: [
    { cx: 12, cy: 7.6, r: 1.7 },
    { cx: 12, cy: 13.4, r: 1.7 },
    { cx: 12, cy: 18.4, r: 1.7 },
  ],
}

export function NavIcon({ destination }: { destination: Destination }) {
  return (
    <svg
      className="nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[destination]} />
      {circles[destination]?.map((circle) => (
        <circle key={`${circle.cx}-${circle.cy}`} {...circle} />
      ))}
    </svg>
  )
}
