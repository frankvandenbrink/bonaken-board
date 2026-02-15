import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import http from 'http'
import db from '../database'
import { upload, UPLOADS_DIR } from '../upload'

const WEBHOOK_URL = process.env.NOTIFY_WEBHOOK_URL || 'http://localhost:3000/api/notify-frits'

function notifyFrits(payload: {
  postId: number
  title: string
  type: string
  author: string
  contact: string | null
  description: string
}) {
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
        db.prepare('UPDATE posts SET notified_frits = 1 WHERE id = ?').run(payload.postId)
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

const VALID_TRANSITIONS: Record<string, string> = {
  open: 'opgelost',
  opgelost: 'getest',
  getest: 'gearchiveerd',
  gearchiveerd: 'getest',
}

const STATUS_LABELS: Record<string, string> = {
  opgelost: 'Opgelost',
  getest: 'Getest',
  gearchiveerd: 'Gearchiveerd',
}

// List posts
router.get('/', (req, res) => {
  let query = `
    SELECT p.*, COUNT(c.id) as comment_count
    FROM posts p
    LEFT JOIN comments c ON c.post_id = p.id
  `
  let countQuery = 'SELECT COUNT(*) as total FROM posts p'
  const conditions: string[] = []
  const params: string[] = []

  if (req.query.type && ['bug', 'verzoek'].includes(req.query.type as string)) {
    conditions.push('p.type = ?')
    params.push(req.query.type as string)
  }
  if (req.query.status && ['open', 'opgelost', 'getest', 'gearchiveerd'].includes(req.query.status as string)) {
    conditions.push('p.status = ?')
    params.push(req.query.status as string)
  } else {
    conditions.push("p.status != 'gearchiveerd'")
  }

  if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
    const term = `%${req.query.search.trim()}%`
    conditions.push('(p.title LIKE ? OR p.description LIKE ?)')
    params.push(term, term)
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ')
    query += where
    countQuery += where
  }

  const countParams = [...params]
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number }

  query += ' GROUP BY p.id ORDER BY p.updated_at DESC'

  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100)
  const page = Math.max(parseInt(req.query.page as string) || 1, 1)
  const offset = (page - 1) * limit

  query += ' LIMIT ? OFFSET ?'
  params.push(String(limit), String(offset))

  const posts = db.prepare(query).all(...params)
  res.json({ posts, total, page, limit })
})

// Get single post with comments and frits updates
router.get('/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id)
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }
  const comments = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC').all(req.params.id)
  const fritsUpdates = db.prepare('SELECT * FROM frits_updates WHERE post_id = ? ORDER BY created_at DESC').all(req.params.id)
  res.json({ ...post, comments, frits_updates: fritsUpdates })
})

// Create post
router.post('/', upload.single('screenshot'), (req, res) => {
  const { type, title, description, author, contact } = req.body

  if (!type || !['bug', 'verzoek'].includes(type)) {
    res.status(400).json({ error: 'Type moet "bug" of "verzoek" zijn' })
    return
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'Titel is verplicht' })
    return
  }
  if (title.length > 200) {
    res.status(400).json({ error: 'Titel mag maximaal 200 tekens zijn' })
    return
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    res.status(400).json({ error: 'Beschrijving is verplicht' })
    return
  }
  if (description.length > 2000) {
    res.status(400).json({ error: 'Beschrijving mag maximaal 2000 tekens zijn' })
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

  const screenshot = req.file ? req.file.filename : null
  const contactValue = contact && typeof contact === 'string' ? contact.trim() : null

  const result = db.prepare(
    'INSERT INTO posts (type, title, description, author, screenshot, contact) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(type, title.trim(), description.trim(), author.trim(), screenshot, contactValue)

  const postId = result.lastInsertRowid as number

  // Notify Frits for bug reports
  if (type === 'bug') {
    notifyFrits({
      postId,
      title: title.trim(),
      type,
      author: author.trim(),
      contact: contactValue,
      description: description.trim()
    })
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId)
  res.status(201).json(post)
})

// Update status
router.patch('/:id/status', (req, res) => {
  const { status, author } = req.body

  if (!status || !['opgelost', 'getest', 'gearchiveerd'].includes(status)) {
    res.status(400).json({ error: 'Ongeldige status' })
    return
  }
  if (!author || typeof author !== 'string' || author.trim().length === 0) {
    res.status(400).json({ error: 'Naam is verplicht' })
    return
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id) as { status: string } | undefined
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }

  if (VALID_TRANSITIONS[post.status] !== status) {
    res.status(400).json({ error: `Kan status niet wijzigen van "${post.status}" naar "${status}"` })
    return
  }

  const updatePost = db.prepare(
    "UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id = ?"
  )
  const insertComment = db.prepare(
    'INSERT INTO comments (post_id, author, body) VALUES (?, ?, ?)'
  )

  const transition = db.transaction(() => {
    updatePost.run(status, req.params.id)
    insertComment.run(
      req.params.id,
      'Systeem',
      `Status gewijzigd naar ${STATUS_LABELS[status]} door ${author.trim()}`
    )
  })

  transition()

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// Edit post
router.patch('/:id', upload.single('screenshot'), (req, res) => {
  const id = req.params.id as string
  const { title, description, removeScreenshot } = req.body

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as { screenshot: string | null } | undefined
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Titel is verplicht' })
      return
    }
    if (title.length > 200) {
      res.status(400).json({ error: 'Titel mag maximaal 200 tekens zijn' })
      return
    }
  }
  if (description !== undefined) {
    if (typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({ error: 'Beschrijving is verplicht' })
      return
    }
    if (description.length > 2000) {
      res.status(400).json({ error: 'Beschrijving mag maximaal 2000 tekens zijn' })
      return
    }
  }

  const updates: string[] = []
  const updateParams: (string | null)[] = []

  if (title !== undefined) {
    updates.push('title = ?')
    updateParams.push(title.trim())
  }
  if (description !== undefined) {
    updates.push('description = ?')
    updateParams.push(description.trim())
  }

  // Handle screenshot: new file replaces old, removeScreenshot=true removes it
  if (req.file) {
    if (post.screenshot) {
      const oldPath = path.join(UPLOADS_DIR, post.screenshot)
      fs.unlink(oldPath, () => {})
    }
    updates.push('screenshot = ?')
    updateParams.push(req.file.filename)
  } else if (removeScreenshot === 'true') {
    if (post.screenshot) {
      const oldPath = path.join(UPLOADS_DIR, post.screenshot)
      fs.unlink(oldPath, () => {})
    }
    updates.push('screenshot = ?')
    updateParams.push(null)
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'Niets om bij te werken' })
    return
  }

  updates.push("updated_at = datetime('now')")
  updateParams.push(id)

  db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`).run(...updateParams)

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(id)
  res.json(updated)
})

// Delete post
router.delete('/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id) as { screenshot: string | null } | undefined
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }

  if (post.screenshot) {
    const filePath = path.join(UPLOADS_DIR, post.screenshot)
    fs.unlink(filePath, () => {})
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Frits: Add update message to a post
router.post('/:id/frits-update', (req, res) => {
  const { message } = req.body
  const postId = req.params.id

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Bericht is verplicht' })
    return
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId)
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }

  const result = db.prepare(
    'INSERT INTO frits_updates (post_id, message) VALUES (?, ?)'
  ).run(postId, message.trim())

  // Also add a comment so it shows in the regular comment stream
  db.prepare(
    'INSERT INTO comments (post_id, author, body) VALUES (?, ?, ?)'
  ).run(postId, 'Frits 🤖', message.trim())

  // Update post updated_at timestamp
  db.prepare("UPDATE posts SET updated_at = datetime('now') WHERE id = ?").run(postId)

  const update = db.prepare('SELECT * FROM frits_updates WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(update)
})

// Frits: Mark post as manually notified (fallback if webhook failed)
router.patch('/:id/notify-status', (req, res) => {
  const postId = req.params.id

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId)
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }

  db.prepare('UPDATE posts SET notified_frits = 1 WHERE id = ?').run(postId)
  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId)
  res.json(updated)
})

export default router
