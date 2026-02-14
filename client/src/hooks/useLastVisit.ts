import { useState, useCallback } from 'react'

const STORAGE_KEY = 'bonaken-board-last-visit'

export function useLastVisit() {
  const [lastVisit] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || new Date(0).toISOString()
  })

  const updateLastVisit = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, now)
  }, [])

  return { lastVisit, updateLastVisit }
}
