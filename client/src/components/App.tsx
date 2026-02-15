import { useState, useEffect } from 'react'
import { Header } from './Header'
import { Board } from './Board'
import { PostDetail } from './PostDetail'
import { ApkDownload } from './ApkDownload'
import styles from './App.module.css'

function parseHash(): { view: 'board' } | { view: 'post'; id: number } {
  const hash = window.location.hash
  const match = hash.match(/^#\/post\/(\d+)$/)
  if (match) return { view: 'post', id: Number(match[1]) }
  return { view: 'board' }
}

export function App() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigateToPost = (id: number) => {
    window.location.hash = `#/post/${id}`
  }

  const navigateHome = () => {
    window.location.hash = '#/'  
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
