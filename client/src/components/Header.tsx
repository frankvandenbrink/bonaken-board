import { useState, useEffect } from 'react'
import { useLastVisit } from '../hooks/useLastVisit'
import styles from './Header.module.css'

interface Props {
  onNavigateHome: () => void
}

export function Header({ onNavigateHome }: Props) {
  const { lastVisit, updateLastVisit } = useLastVisit()
  const [updateCount, setUpdateCount] = useState(0)

  useEffect(() => {
    fetch(`/api/updates-since?since=${encodeURIComponent(lastVisit)}`)
      .then((r) => r.json())
      .then((data) => setUpdateCount(data.count))
      .catch(() => {})
  }, [lastVisit])

  const handleClick = () => {
    updateLastVisit()
    setUpdateCount(0)
    onNavigateHome()
  }

  return (
    <header className={styles.header}>
      <button className={styles.titleBtn} onClick={handleClick} type="button">
        <h1 className={styles.title}>Bonaken Board</h1>
        {updateCount > 0 && (
          <span className={styles.badge}>{updateCount}</span>
        )}
      </button>
    </header>
  )
}
