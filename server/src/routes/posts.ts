import { Router } from 'express'
import db from '../database'

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

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  query += ' GROUP BY p.id ORDER BY p.updated_at DESC'

  const posts = db.prepare(query).all(...params)
  res.json(posts)
})

// Get single post with comments
router.get('/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id)
  if (!post) {
    res.status(404).json({ error: 'Post niet gevonden' })
    return
  }
  const comments = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC').all(req.params.id)
  res.json({ ...post, comments })
})

// Create post
router.post('/', (req, res) => {
  const { type, title, description, author } = req.body

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

  const result = db.prepare(
    'INSERT INTO posts (type, title, description, author) VALUES (?, ?, ?, ?)'
  ).run(type, title.trim(), description.trim(), author.trim())

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid)
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

export default router
