import { useState, useEffect, useCallback, useRef } from 'react'
import type { Post, PostType, PostStatus } from '../types'
import { useApi } from '../hooks/useApi'
import { PostCard } from './PostCard'
import { FilterBar } from './FilterBar'
import { NewPostForm } from './NewPostForm'
import styles from './Board.module.css'

const LIMIT = 20

interface Props {
  onNavigate: (postId: number) => void
}

export function Board({ onNavigate }: Props) {
  const api = useApi()
  const [posts, setPosts] = useState<Post[]>([])
  const [typeFilter, setTypeFilter] = useState<PostType | ''>('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchPosts = useCallback(async (pageNum: number, append: boolean) => {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (search.trim()) params.set('search', search.trim())
    params.set('page', String(pageNum))
    params.set('limit', String(LIMIT))
    const query = params.toString()
    const data = await api.get<{ posts: Post[]; total: number }>(`/posts?${query}`)
    setPosts(prev => append ? [...prev, ...data.posts] : data.posts)
    setTotal(data.total)
    setPage(pageNum)
    setLoading(false)
    setLoadingMore(false)
  }, [typeFilter, statusFilter, search])

  useEffect(() => {
    setLoading(true)
    setPosts([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPosts(1, false)
    }, search ? 300 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchPosts])

  const handleLoadMore = () => {
    setLoadingMore(true)
    fetchPosts(page + 1, true)
  }

  const hasMore = posts.length < total

  return (
    <div className={styles.board}>
      <div className={styles.controls}>
        <FilterBar
          typeFilter={typeFilter}
          statusFilter={statusFilter}
          search={search}
          onTypeChange={setTypeFilter}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearch}
        />
      </div>
      <NewPostForm onCreated={() => fetchPosts(1, false)} />
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
          {hasMore && (
            <button
              className={styles.loadMore}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Laden...' : 'Meer laden'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
