import { useState, useEffect } from 'react'
import styles from './ApkDownload.module.css'

interface ApkInfo {
  version: string
  filename: string
  sizeFormatted: string
  downloadUrl: string
  uploadedAt: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  
  // Als het minder dan 24 uur geleden is, toon "Vandaag" of "X uur geleden"
  if (diffHours < 24) {
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins < 1 ? 'Zojuist' : `${diffMins} min geleden`
    }
    return `${Math.floor(diffHours)} uur geleden`
  }
  
  // Anders toon de datum
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function isNew(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return diffMs < (24 * 60 * 60 * 1000) // Minder dan 24 uur
}

export function ApkDownload() {
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/apk')
      .then((r) => {
        if (!r.ok) throw new Error('APK niet gevonden')
        return r.json()
      })
      .then((data) => setApkInfo(data))
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className={styles.container}>
        <span className={styles.icon}>📱</span>
        <span className={styles.error}>APK niet beschikbaar</span>
      </div>
    )
  }

  if (!apkInfo) {
    return (
      <div className={styles.container}>
        <span className={styles.icon}>📱</span>
        <span className={styles.loading}>Laden...</span>
      </div>
    )
  }

  const showNewBadge = isNew(apkInfo.uploadedAt)

  return (
    <a href={apkInfo.downloadUrl} className={styles.container} download>
      <span className={styles.icon}>📱</span>
      <div className={styles.info}>
        <div className={styles.titleRow}>
          <span className={styles.version}>Download APK v{apkInfo.version}</span>
          {showNewBadge && <span className={styles.badge}>Nieuw!</span>}
        </div>
        <span className={styles.meta}>{apkInfo.sizeFormatted} • {formatDate(apkInfo.uploadedAt)}</span>
      </div>
    </a>
  )
}
