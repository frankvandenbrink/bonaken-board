import type { PostType } from '../types'
import styles from './TypeBadge.module.css'

const LABELS: Record<PostType, string> = {
  bug: 'Bug',
  verzoek: 'Verzoek',
}

export function TypeBadge({ type }: { type: PostType }) {
  return (
    <span className={`${styles.badge} ${styles[type]}`}>
      {LABELS[type]}
    </span>
  )
}
