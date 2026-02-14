import { Router, Request } from 'express'
import db from '../database'

const router = Router()

interface PostRow {
  id: number
  title: string
  description: string
  author: string
  screenshot: string | null
  created_at: string
}

interface CommentRow {
  author: string
  body: string
  created_at: string
}

router.get('/bugs', (req: Request, res) => {
  const posts = db.prepare(
    `SELECT id, title, description, author, screenshot, created_at
     FROM posts
     WHERE type = 'bug' AND status = 'open'
     ORDER BY created_at ASC`
  ).all() as PostRow[]

  const getComments = db.prepare(
    'SELECT author, body, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC'
  )

  const baseUrl = `${req.protocol}://${req.get('host')}`

  const bugs = posts.map(post => ({
    id: post.id,
    title: post.title,
    description: post.description,
    author: post.author,
    screenshot: post.screenshot ? `${baseUrl}/uploads/${post.screenshot}` : null,
    created_at: post.created_at,
    comments: getComments.all(post.id) as CommentRow[],
  }))

  res.json({ bugs, count: bugs.length })
})

export default router
