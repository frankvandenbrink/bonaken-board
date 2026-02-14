import { useState } from 'react'
import type { Comment } from '../types'
import { useApi } from '../hooks/useApi'
import styles from './CommentSection.module.css'

const NAME_KEY = 'bonaken-board-name'

function formatTime(dateStr: string): string {
  const date = new Date(dateStr + 'Z')
  return date.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Props {
  postId: number
  comments: Comment[]
  onCommentAdded: () => void
}

export function CommentSection({ postId, comments, onCommentAdded }: Props) {
  const api = useApi()
  const [author, setAuthor] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!author.trim()) { setError('Vul je naam in'); return }
    if (!body.trim()) { setError('Vul een reactie in'); return }

    setSubmitting(true)
    try {
      localStorage.setItem(NAME_KEY, author.trim())
      await api.post(`/posts/${postId}/comments`, { author: author.trim(), body: body.trim() })
      setBody('')
      onCommentAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Reacties ({comments.length})</h3>

      {comments.length > 0 && (
        <div className={styles.list}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`${styles.comment} ${comment.author === 'Systeem' ? styles.system : ''}`}
            >
              <div className={styles.commentHeader}>
                <span className={styles.author}>{comment.author}</span>
                <span className={styles.time}>{formatTime(comment.created_at)}</span>
              </div>
              <p className={styles.body}>{comment.body}</p>
            </div>
          ))}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Je naam"
          maxLength={50}
          className={styles.nameInput}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Schrijf een reactie..."
          rows={3}
          maxLength={2000}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Versturen...' : 'Reageer'}
        </button>
      </form>
    </div>
  )
}
