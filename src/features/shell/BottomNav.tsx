import { PRIMARY_DESTINATIONS, type Destination } from '../../platform/routing'
import { DESTINATION_LABELS } from './labels'
import { NavIcon } from './NavIcons'

interface BottomNavProps {
  current: Destination
  onNavigate: (destination: Destination) => void
}

/**
 * The four primary destinations, and nothing else (canonical plan section 5).
 *
 * More is not here. A secondary surface with a permanent tab is a primary
 * surface, whatever the label says.
 */
export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="nav" aria-label="Primary">
      {PRIMARY_DESTINATIONS.map((destination) => (
        <button
          key={destination}
          type="button"
          className="nav__item"
          aria-current={destination === current ? 'page' : undefined}
          onClick={() => onNavigate(destination)}
        >
          <NavIcon destination={destination} />
          <span className="nav__label">{DESTINATION_LABELS[destination]}</span>
        </button>
      ))}
    </nav>
  )
}
