import { Router } from 'express'
import db from '../database'
import http from 'http'

const WEBHOOK_URL = process.env.NOTIFY_WEBHOOK_URL || 'http://localhost:3000/api/notify-frits'

// Notify Frits when user comments on any bug
function notifyFritsComment(postId: number, title: string, comment: string, commentAuthor: string, status: string) {
  const isResolved = status === 'opgelost'
  const payload = {
    postId,
    title,
    type: isResolved ? 'bug_reopened' : 'bug_comment',
    author: commentAuthor,
    contact: null,
    description: isResolved 
      ? `Gebruiker heeft gereageerd op een opgeloste bug:\n\n"${comment}"\n\nDe bug moet mogelijk opnieuw worden bekeken.`
      : `Nieuwe reactie op bug #${postId}:\n\n"${comment}"`
  }
  
  const data = JSON.stringify(payload)
  const url = new URL(WEBHOOK_URL)
  const req = http.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 5000,
    },
    (res) => {
      res.resume()
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[NOTIFY] Sent comment notification for bug #${postId}`)
      } else {
        console.error(`Webhook responded with status ${res.statusCode}`)
      }
    }
  )
  req.on('error', (err) => console.error('Webhook notification failed:', err.message))
  req.on('timeout', () => { req.destroy(); console.error('Webhook notification timed out') })
  req.write(data)
  req.end()
}

const router = Router()

// Add comment to post
router.post('/:postId/comments', (req, res) => {
  const { author, body } = req.body
  const { postId } = req.params

  const post = db.prepare('SELECT id, title, type, status FROM posts WHERE id = ?').get(postId) as { id: number; title: string; type: string; status: string } | undefined
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
  
  // Notify Frits if this is a comment on a bug (not from Frits himself)
  if (post.type === 'bug' && author.trim() !== 'Frits 🤖') {
    notifyFritsComment(Number(postId), post.title, body.trim(), author.trim(), post.status)
  }
  
  res.status(201).json(comment)
})

export default router
