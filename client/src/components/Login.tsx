import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import styles from './Login.module.css'

interface Props {
  onLogin: () => void
}

export function Login({ onLogin }: Props) {
  const api = useApi()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already logged in
    api.get('/auth').then((data) => {
      const authData = data as { authenticated: boolean }
      if (authData.authenticated) {
        onLogin()
      }
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/login', { password })
      onLogin()
    } catch (err) {
      setError('Onjuist wachtwoord')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Bonaken Board</h1>
        <p className={styles.subtitle}>Bug tracker voor de Bonaken app</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Wachtwoord
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Voer wachtwoord in"
              className={styles.input}
              disabled={loading}
            />
          </label>
          
          {error && <p className={styles.error}>{error}</p>}
          
          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}