import type { PostType, PostStatus } from '../types'
import styles from './FilterBar.module.css'

interface Props {
  typeFilter: PostType | ''
  statusFilter: PostStatus | ''
  onTypeChange: (type: PostType | '') => void
  onStatusChange: (status: PostStatus | '') => void
}

const TYPE_OPTIONS: { value: PostType | ''; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'bug', label: 'Bugs' },
  { value: 'verzoek', label: 'Verzoeken' },
]

const STATUS_OPTIONS: { value: PostStatus | ''; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'open', label: 'Open' },
  { value: 'opgelost', label: 'Opgelost' },
  { value: 'getest', label: 'Getest' },
  { value: 'gearchiveerd', label: 'Archief' },
]

export function FilterBar({ typeFilter, statusFilter, onTypeChange, onStatusChange }: Props) {
  return (
    <div className={styles.bar}>
      <div className={styles.group} role="radiogroup" aria-label="Filter op type">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.chip} ${typeFilter === opt.value ? styles.active : ''} ${opt.value === 'bug' ? styles.bugAccent : ''} ${opt.value === 'verzoek' ? styles.verzoekAccent : ''}`}
            onClick={() => onTypeChange(opt.value)}
            aria-pressed={typeFilter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className={styles.divider} />
      <div className={styles.group} role="radiogroup" aria-label="Filter op status">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.chip} ${statusFilter === opt.value ? styles.active : ''} ${opt.value === 'opgelost' ? styles.opgelostAccent : ''} ${opt.value === 'getest' ? styles.getestAccent : ''} ${opt.value === 'gearchiveerd' ? styles.archiefAccent : ''}`}
            onClick={() => onStatusChange(opt.value)}
            aria-pressed={statusFilter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
