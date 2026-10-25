import { useSyncExternalStore } from 'react'

const queries = {
  compact: '(max-width: 1199px), (max-height: 599px)',
  phone: '(max-width: 599px)',
  landscape: '(min-width: 600px) and (max-height: 599px)',
}

function subscribe(onChange: () => void) {
  const media = Object.values(queries).map(query => window.matchMedia(query))
  media.forEach(query => query.addEventListener('change', onChange))
  return () => media.forEach(query => query.removeEventListener('change', onChange))
}

function getSnapshot() {
  if (!window.matchMedia(queries.compact).matches) return 'desktop'
  if (window.matchMedia(queries.phone).matches) return 'phone'
  return window.matchMedia(queries.landscape).matches ? 'landscape' : 'tablet'
}

export function useWorkspaceLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'desktop' as const)
}
