import { useState, useEffect, useCallback, useRef } from 'react'
import type { PostDetail as PostDetailType, PostStatus } from '../types'
import { useApi } from '../hooks/useApi'
import { StatusBadge } from './StatusBadge'
import { TypeBadge } from './TypeBadge'
import { CommentSection } from './CommentSection'
import { Modal } from './Modal'
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

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editScreenshot, setEditScreenshot] = useState<File | null>(null)
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null)
  const [editRemoveScreenshot, setEditRemoveScreenshot] = useState(false)
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const editFileRef = useRef<HTMLInputElement>(null)

  // Lightbox state
  const [lightbox, setLightbox] = useState(false)

  // Modal state
  const [modal, setModal] = useState<{
    title: string
    message: string
    variant: 'alert' | 'confirm' | 'danger'
    confirmLabel?: string
    onConfirm: () => void
  } | null>(null)

  const fetchPost = useCallback(async () => {
    const data = await api.get<PostDetailType>(`/posts/${postId}`)
    setPost(data)
    setLoading(false)
  }, [postId])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  // Auto-refresh every 10 seconds to show new comments and Frits updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPost()
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchPost])

  const handleStatusChange = async () => {
    if (!post) return
    const next = NEXT_STATUS[post.status]
    if (!next) return

    const name = localStorage.getItem(NAME_KEY) || ''
    if (!name) {
      setModal({
        title: 'Naam vereist',
        message: 'Stel eerst je naam in door een bericht of reactie te plaatsen.',
        variant: 'alert',
        onConfirm: () => setModal(null),
      })
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

  const startEditing = () => {
    if (!post) return
    setEditTitle(post.title)
    setEditDescription(post.description)
    setEditScreenshot(null)
    setEditPreviewUrl(null)
    setEditRemoveScreenshot(false)
    setEditError('')
    setEditing(true)
  }

  const cancelEditing = () => {
    if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
    setEditScreenshot(null)
    setEditPreviewUrl(null)
    setEditRemoveScreenshot(false)
    setEditing(false)
    setEditError('')
  }

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
    if (file) {
      setEditScreenshot(file)
      setEditPreviewUrl(URL.createObjectURL(file))
      setEditRemoveScreenshot(false)
    } else {
      setEditScreenshot(null)
      setEditPreviewUrl(null)
    }
  }

  const saveEdit = async () => {
    if (!editTitle.trim()) { setEditError('Titel is verplicht'); return }
    if (!editDescription.trim()) { setEditError('Beschrijving is verplicht'); return }

    setSaving(true)
    setEditError('')
    try {
      const formData = new FormData()
      formData.append('title', editTitle.trim())
      formData.append('description', editDescription.trim())
      if (editScreenshot) {
        formData.append('screenshot', editScreenshot)
      } else if (editRemoveScreenshot) {
        formData.append('removeScreenshot', 'true')
      }

      await api.patchForm(`/posts/${postId}`, formData)
      if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
      await fetchPost()
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Er ging iets mis')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    setModal({
      title: 'Post verwijderen',
      message: 'Weet je zeker dat je deze post wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
      variant: 'danger',
      confirmLabel: 'Verwijder',
      onConfirm: async () => {
        setModal(null)
        try {
          await api.del(`/posts/${postId}`)
          onBack()
        } catch {
          setModal({
            title: 'Fout',
            message: 'Kon de post niet verwijderen. Probeer het opnieuw.',
            variant: 'alert',
            onConfirm: () => setModal(null),
          })
        }
      },
    })
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
        {editing ? (
          <input
            type="text"
            className={styles.editTitleInput}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={200}
          />
        ) : (
          <h2 className={styles.title}>{post.title}</h2>
        )}
        <div className={styles.meta}>
          <span>{post.author}</span>
          <span className={styles.dot}>·</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
      </div>

      <div className={styles.description}>
        {editing ? (
          <>
            <textarea
              className={styles.editDescInput}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={6}
              maxLength={2000}
            />

            <div className={styles.editScreenshotSection}>
              <span className={styles.editScreenshotLabel}>Screenshot</span>
              {editScreenshot ? (
                <div className={styles.editPreviewWrap}>
                  <img src={editPreviewUrl!} alt="Nieuwe screenshot" className={styles.screenshotImg} />
                  <button
                    type="button"
                    className={styles.screenshotRemoveBtn}
                    onClick={() => {
                      if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
                      setEditScreenshot(null)
                      setEditPreviewUrl(null)
                      if (editFileRef.current) editFileRef.current.value = ''
                    }}
                  >
                    Verwijder
                  </button>
                </div>
              ) : !editRemoveScreenshot && post.screenshot ? (
                <div className={styles.editPreviewWrap}>
                  <img src={`/uploads/${post.screenshot}`} alt="Huidige screenshot" className={styles.screenshotImg} />
                  <div className={styles.editPreviewActions}>
                    <label className={styles.screenshotReplaceBtn}>
                      Vervang
                      <input
                        ref={editFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleEditFileChange}
                        className={styles.hiddenInput}
                      />
                    </label>
                    <button
                      type="button"
                      className={styles.screenshotRemoveBtn}
                      onClick={() => setEditRemoveScreenshot(true)}
                    >
                      Verwijder
                    </button>
                  </div>
                </div>
              ) : (
                <label className={styles.editFilePicker}>
                  <span className={styles.editFilePickerText}>Kies afbeelding...</span>
                  <input
                    ref={editFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleEditFileChange}
                    className={styles.hiddenInput}
                  />
                </label>
              )}
            </div>

            {editError && <p className={styles.editError}>{editError}</p>}
            <div className={styles.editActions}>
              <button type="button" className={styles.editCancel} onClick={cancelEditing} disabled={saving}>
                Annuleer
              </button>
              <button type="button" className={styles.editSave} onClick={saveEdit} disabled={saving}>
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </>
        ) : (
          <p>{post.description}</p>
        )}
      </div>

      {!editing && post.screenshot && (
        <>
          <div className={styles.screenshotSection}>
            <img
              src={`/uploads/${post.screenshot}`}
              alt="Screenshot"
              className={styles.screenshotImg}
              onClick={() => setLightbox(true)}
            />
          </div>
          {lightbox && (
            <div className={styles.lightbox} onClick={() => setLightbox(false)}>
              <img src={`/uploads/${post.screenshot}`} alt="Screenshot volledig" className={styles.lightboxImg} />
            </div>
          )}
        </>
      )}

      <div className={styles.actionRow}>
        {nextAction && (
          <button
            className={`${styles.statusBtn} ${post.status === 'getest' ? styles.archiveBtn : ''} ${post.status === 'gearchiveerd' ? styles.restoreBtn : ''}`}
            onClick={handleStatusChange}
            disabled={updating}
          >
            {updating ? 'Bijwerken...' : nextAction.label}
          </button>
        )}
        {!editing && (
          <>
            <button type="button" className={styles.editBtn} onClick={startEditing}>
              Bewerk
            </button>
            <button type="button" className={styles.deleteBtn} onClick={handleDelete}>
              Verwijder
            </button>
          </>
        )}
      </div>

      <CommentSection
        postId={postId}
        comments={post.comments}
        onCommentAdded={fetchPost}
      />

      {modal && (
        <Modal
          title={modal.title}
          message={modal.message}
          variant={modal.variant}
          confirmLabel={modal.confirmLabel}
          onConfirm={modal.onConfirm}
          onCancel={modal.variant !== 'alert' ? () => setModal(null) : undefined}
        />
      )}
    </div>
  )
}
