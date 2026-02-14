import { useState, useEffect, useCallback } from 'react'
import type { PostDetail as PostDetailType, PostStatus } from '../types'
import { useApi } from '../hooks/useApi'
import { StatusBadge } from './StatusBadge'
import { TypeBadge } from './TypeBadge'
import { CommentSection } from './CommentSection'
import styles from './PostDetail.module.css'

const NAME_KEY = 'bonaken-board-name'

const NEXT_STATUS: Partial<Record<PostStatus, { status: PostStatus; label: string }>> = {
  open: { status: 'opgelost', label: 'Markeer als Opgelost' },
  opgelost: { status: 'getest', label: 'Markeer als Getest \u2713' },
  getest: { status: 'gearchiveerd', label: 'Archiveer' },
  gearchiveerd: { status: 'getest', label: 'Herstel uit archief' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'Z').toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  postId: number
  onBack: () => void
}

export function PostDetail({ postId, onBack }: Props) {
  const api = useApi()
  const [post, setPost] = useState<PostDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchPost = useCallback(async () => {
    const data = await api.get<PostDetailType>(`/posts/${postId}`)
    setPost(data)
    setLoading(false)
  }, [postId])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  const handleStatusChange = async () => {
    if (!post) return
    const next = NEXT_STATUS[post.status]
    if (!next) return

    const name = localStorage.getItem(NAME_KEY) || ''
    if (!name) {
      alert('Stel eerst je naam in door een bericht of reactie te plaatsen.')
      return
    }

    setUpdating(true)
    try {
      await api.patch(`/posts/${postId}/status`, { status: next.status, author: name })
      await fetchPost()
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <p className={styles.loading}>Laden...</p>
  if (!post) return <p className={styles.loading}>Post niet gevonden.</p>

  const nextAction = NEXT_STATUS[post.status]

  return (
    <div className={styles.detail}>
      <button className={styles.back} onClick={onBack} type="button">
        ← Terug
      </button>

      <div className={styles.header}>
        <div className={styles.badges}>
          <TypeBadge type={post.type} />
          <StatusBadge status={post.status} />
        </div>
        <h2 className={styles.title}>{post.title}</h2>
        <div className={styles.meta}>
          <span>{post.author}</span>
          <span className={styles.dot}>·</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
      </div>

      <div className={styles.description}>
        <p>{post.description}</p>
      </div>

      {nextAction && (
        <button
          className={`${styles.statusBtn} ${post.status === 'getest' ? styles.archiveBtn : ''} ${post.status === 'gearchiveerd' ? styles.restoreBtn : ''}`}
          onClick={handleStatusChange}
          disabled={updating}
        >
          {updating ? 'Bijwerken...' : nextAction.label}
        </button>
      )}

      <CommentSection
        postId={postId}
        comments={post.comments}
        onCommentAdded={fetchPost}
      />
    </div>
  )
}
