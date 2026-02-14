export type PostType = 'bug' | 'verzoek'
export type PostStatus = 'open' | 'opgelost' | 'getest'

export interface Post {
  id: number
  type: PostType
  status: PostStatus
  title: string
  description: string
  author: string
  created_at: string
  updated_at: string
  comment_count: number
}

export interface Comment {
  id: number
  post_id: number
  author: string
  body: string
  created_at: string
}

export interface PostDetail extends Omit<Post, 'comment_count'> {
  comments: Comment[]
}
