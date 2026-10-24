import { useSyncExternalStore } from 'react'

const compactQuery = '(max-width: 880px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(compactQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(compactQuery).matches
}

export function useCompactLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
