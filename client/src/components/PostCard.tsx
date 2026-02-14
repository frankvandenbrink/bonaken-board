import type { Post } from '../types'
import { StatusBadge } from './StatusBadge'
import { TypeBadge } from './TypeBadge'
import styles from './PostCard.module.css'

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr + 'Z')
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'zojuist'
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`
  if (diff < 604800) return `${Math.floor(diff / 86400)} dagen geleden`
  return date.toLocaleDateString('nl-NL')
}

interface Props {
  post: Post
  onClick: () => void
}

export function PostCard({ post, onClick }: Props) {
  return (
    <button className={styles.card} onClick={onClick}>
      <div className={styles.badges}>
        <TypeBadge type={post.type} />
        <StatusBadge status={post.status} />
      </div>
      <h3 className={styles.title}>{post.title}</h3>
      <div className={styles.meta}>
        <span>{post.author}</span>
        <span className={styles.dot}>·</span>
        <span>{timeAgo(post.created_at)}</span>
        {post.comment_count > 0 && (
          <>
            <span className={styles.dot}>·</span>
            <span className={styles.comments}>
              {post.comment_count} {post.comment_count === 1 ? 'reactie' : 'reacties'}
            </span>
          </>
        )}
      </div>
    </button>
  )
}
