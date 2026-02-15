import { useState, useRef } from 'react'
import type { PostType } from '../types'
import { useApi } from '../hooks/useApi'
import styles from './NewPostForm.module.css'

const NAME_KEY = 'bonaken-board-name'

interface Props {
  onCreated: () => void
}

export function NewPostForm({ onCreated }: Props) {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const [author, setAuthor] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [type, setType] = useState<PostType>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (file) {
      setScreenshot(file)
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setScreenshot(null)
      setPreviewUrl(null)
    }
  }

  const removeScreenshot = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setScreenshot(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!author.trim()) { setError('Vul je naam in'); return }
    if (!title.trim()) { setError('Vul een titel in'); return }
    if (!description.trim()) { setError('Vul een beschrijving in'); return }

    setSubmitting(true)
    try {
      localStorage.setItem(NAME_KEY, author.trim())

      const formData = new FormData()
      formData.append('type', type)
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('author', author.trim())
      if (screenshot) formData.append('screenshot', screenshot)

      await api.postForm('/posts', formData)
      setTitle('')
      setDescription('')
      removeScreenshot()
      setOpen(false)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.toggle}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {open ? '− Sluiten' : '+ Nieuw bericht'}
      </button>
      {open && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <label className={styles.label}>
              Naam
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Je naam"
                maxLength={50}
              />
            </label>
            <div className={styles.label}>
              Type
              <div className={styles.typeToggle}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${styles.typeBug} ${type === 'bug' ? styles.typeActive : ''}`}
                  onClick={() => setType('bug')}
                >
                  Bug
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${styles.typeVerzoek} ${type === 'verzoek' ? styles.typeActive : ''}`}
                  onClick={() => setType('verzoek')}
                >
                  Verzoek
                </button>
              </div>
            </div>
          </div>
          <label className={styles.label}>
            Titel
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Korte omschrijving"
              maxLength={200}
            />
          </label>
          <label className={styles.label}>
            Beschrijving
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschrijf zo gedetailleerd mogelijk wat er mis gaat of wat je wilt. Hoe meer details, hoe sneller we het kunnen oppakken. Denk aan: stappen om het te reproduceren, wat je verwacht, en wat er in plaats daarvan gebeurt."
              rows={4}
              maxLength={2000}
            />
          </label>
          <div className={styles.label}>
            Screenshot (optioneel)
            {previewUrl ? (
              <div className={styles.previewWrap}>
                <img src={previewUrl} alt="Preview" className={styles.preview} />
                <button type="button" className={styles.removeFile} onClick={removeScreenshot}>
                  Verwijder
                </button>
              </div>
            ) : (
              <label className={styles.filePicker}>
                <span className={styles.filePickerText}>Kies afbeelding...</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
              </label>
            )}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Versturen...' : 'Verstuur'}
          </button>
        </form>
      )}
    </div>
  )
}
