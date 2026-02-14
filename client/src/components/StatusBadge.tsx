import type { PostStatus } from '../types'
import styles from './StatusBadge.module.css'

const LABELS: Record<PostStatus, string> = {
  open: 'Open',
  opgelost: 'Opgelost',
  getest: 'Getest',
}

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {LABELS[status]}
    </span>
  )
}
