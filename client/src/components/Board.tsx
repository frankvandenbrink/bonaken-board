import { useState, useEffect, useCallback } from 'react'
import type { Post, PostType, PostStatus } from '../types'
import { useApi } from '../hooks/useApi'
import { PostCard } from './PostCard'
import { FilterBar } from './FilterBar'
import { NewPostForm } from './NewPostForm'
import styles from './Board.module.css'

interface Props {
  onNavigate: (postId: number) => void
}

export function Board({ onNavigate }: Props) {
  const api = useApi()
  const [posts, setPosts] = useState<Post[]>([])
  const [typeFilter, setTypeFilter] = useState<PostType | ''>('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('')
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    const query = params.toString()
    const data = await api.get<Post[]>(`/posts${query ? `?${query}` : ''}`)
    setPosts(data)
    setLoading(false)
  }, [typeFilter, statusFilter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return (
    <div className={styles.board}>
      <div className={styles.controls}>
        <FilterBar
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
        />
      </div>
      <NewPostForm onCreated={fetchPosts} />
      {loading ? (
        <p className={styles.empty}>Laden...</p>
      ) : posts.length === 0 ? (
        <p className={styles.empty}>Geen posts gevonden.</p>
      ) : (
        <div className={styles.list}>
          {posts.map((post, i) => (
            <div key={post.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <PostCard post={post} onClick={() => onNavigate(post.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
