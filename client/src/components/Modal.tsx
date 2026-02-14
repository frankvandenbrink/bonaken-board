import { useEffect, useRef } from 'react'
import styles from './Modal.module.css'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'alert' | 'confirm' | 'danger'
  onConfirm: () => void
  onCancel?: () => void
}

export function Modal({ title, message, confirmLabel, cancelLabel, variant = 'alert', onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {onCancel && (
            <button type="button" className={styles.cancelBtn} onClick={onCancel}>
              {cancelLabel || 'Annuleer'}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.confirmBtn} ${variant === 'danger' ? styles.dangerBtn : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
