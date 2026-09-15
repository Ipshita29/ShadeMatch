// Small hand-drawn line icons for primary navigation — kept dependency-free.
function iconProps(props) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

export function DashboardIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.2" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1.2" />
      <rect x="3.5" y="13" width="7" height="7.5" rx="1.2" />
    </svg>
  )
}

export function ClientsIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17" cy="7.5" r="2.4" />
      <path d="M15.2 14.8c2.7.2 4.8 2.3 4.8 5.2" />
    </svg>
  )
}

export function FoundationsIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="8.5" cy="8.5" r="4" />
      <circle cx="15.5" cy="9.5" r="3" />
      <circle cx="12" cy="16" r="3.4" />
    </svg>
  )
}

export function MatchHistoryIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function MenuIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
