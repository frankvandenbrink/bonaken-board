import { Router } from 'express'
import db from '../database'

const router = Router()

// Add comment to post
router.post('/:postId/comments', (req, res) => {
  const { author, body } = req.body
  const { postId } = req.params

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId)
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }

  if (!author || typeof author !== 'string' || author.trim().length === 0) {
    res.status(400).json({ error: 'Naam is verplicht' })
    return
  }
  if (author.length > 50) {
    res.status(400).json({ error: 'Naam mag maximaal 50 tekens zijn' })
    return
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    res.status(400).json({ error: 'Reactie is verplicht' })
    return
  }
  if (body.length > 2000) {
    res.status(400).json({ error: 'Reactie mag maximaal 2000 tekens zijn' })
    return
  }

  // Update post's updated_at when a comment is added
  const insertComment = db.prepare(
    'INSERT INTO comments (post_id, author, body) VALUES (?, ?, ?)'
  )
  const updatePost = db.prepare(
    "UPDATE posts SET updated_at = datetime('now') WHERE id = ?"
  )

  const addComment = db.transaction(() => {
    const result = insertComment.run(postId, author.trim(), body.trim())
    updatePost.run(postId)
    return result
  })

  const result = addComment()
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(comment)
})

export default router
