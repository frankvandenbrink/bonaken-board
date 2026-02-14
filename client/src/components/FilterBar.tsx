import type { PostType, PostStatus } from '../types'
import styles from './FilterBar.module.css'

interface Props {
  typeFilter: PostType | ''
  statusFilter: PostStatus | ''
  onTypeChange: (type: PostType | '') => void
  onStatusChange: (status: PostStatus | '') => void
}

export function FilterBar({ typeFilter, statusFilter, onTypeChange, onStatusChange }: Props) {
  return (
    <div className={styles.bar}>
      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value as PostType | '')}
        aria-label="Filter op type"
      >
        <option value="">Alle types</option>
        <option value="bug">Bugs</option>
        <option value="verzoek">Verzoeken</option>
      </select>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as PostStatus | '')}
        aria-label="Filter op status"
      >
        <option value="">Alle statussen</option>
        <option value="open">Open</option>
        <option value="opgelost">Opgelost</option>
        <option value="getest">Getest</option>
      </select>
    </div>
  )
}
