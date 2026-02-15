import { useState, useEffect } from 'react'
import { Header } from './Header'
import { Board } from './Board'
import { PostDetail } from './PostDetail'
import { ApkDownload } from './ApkDownload'
import { Login } from './Login'
import { useApi } from '../hooks/useApi'
import styles from './App.module.css'

function parseHash(): { view: 'board' } | { view: 'post'; id: number } {
  const hash = window.location.hash
  const match = hash.match(/^#\/post\/(\d+)$/)
  if (match) return { view: 'post', id: Number(match[1]) }
  return { view: 'board' }
}

export function App() {
  const api = useApi()
  const [route, setRoute] = useState(parseHash)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    // Check if already authenticated
    api.get('/auth')
      .then((data) => {
        const authData = data as { authenticated: boolean }
        setIsAuthenticated(authData.authenticated)
      })
      .catch(() => {
        setIsAuthenticated(false)
      })
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const navigateToPost = (id: number) => {
    window.location.hash = `#/post/${id}`
  }

  const navigateHome = () => {
    window.location.hash = '#/'  
  }

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return <div className={styles.loading}>Laden...</div>
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className={styles.container}>
      <Header onNavigateHome={navigateHome} />
      <div className={styles.apkSection}>
        <ApkDownload />
      </div>
      {route.view === 'board' ? (
        <Board onNavigate={navigateToPost} />
      ) : (
        <PostDetail postId={route.id} onBack={navigateHome} />
      )}
    </div>
  )
}
