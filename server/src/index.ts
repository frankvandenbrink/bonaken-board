import express from 'express'
import path from 'path'
import db from './database'
import postsRouter from './routes/posts'
import commentsRouter from './routes/comments'

const app = express()
const PORT = process.env.PORT || 3002

app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/posts', postsRouter)
app.use('/api/posts', commentsRouter)

// Updates since (separate from /api/posts/:id to avoid route conflict)
app.get('/api/updates-since', (req, res) => {
  const since = req.query.since as string
  if (!since) {
    res.status(400).json({ error: 'Parameter "since" is verplicht' })
    return
  }
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM posts WHERE updated_at > ?'
  ).get(since) as { count: number }
  res.json(result)
})

// Serve static client in production
const clientDist = path.join(__dirname, '../../client/dist')
app.use(express.static(clientDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
