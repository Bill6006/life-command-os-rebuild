import { DESTINATIONS, type Destination } from '../../platform/routing'
import { NavIcon } from './NavIcons'

const labels: Record<Destination, string> = {
  now: 'Now',
  life: 'Life',
  timeline: 'Timeline',
  insights: 'Insights',
  more: 'More',
  qa: 'QA',
}

interface BottomNavProps {
  current: Destination
  onNavigate: (destination: Destination) => void
}

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="nav" aria-label="Primary">
      {DESTINATIONS.map((destination) => (
        <button
          key={destination}
          type="button"
          className="nav__item"
          aria-current={destination === current ? 'page' : undefined}
          onClick={() => onNavigate(destination)}
        >
          <NavIcon destination={destination} />
          <span className="nav__label">{labels[destination]}</span>
        </button>
      ))}
    </nav>
  )
}
