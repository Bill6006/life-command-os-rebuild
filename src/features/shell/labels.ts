import type { Destination } from '../../platform/routing'

/** One place to name a destination, so the tab, the title and the header agree. */
export const DESTINATION_LABELS: Record<Destination, string> = {
  now: 'Now',
  life: 'Life',
  timeline: 'Timeline',
  insights: 'Insights',
  more: 'More',
  data: 'Data',
  'check-in': 'Check-in',
  qa: 'QA',
}
