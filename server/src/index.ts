import express from 'express'
import path from 'path'
import multer from 'multer'
import db from './database'
import postsRouter from './routes/posts'
import commentsRouter from './routes/comments'
import agentRouter from './routes/agent'
import { UPLOADS_DIR } from './upload'

const app = express()
const PORT = process.env.PORT || 3002

app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api/posts', postsRouter)
app.use('/api/posts', commentsRouter)
app.use('/api/agent', agentRouter)

// APK Download endpoint
app.get('/api/apk', (_req, res) => {
  const apkPath = '/srv/docker/bonaken/apk/Bonaken-v1.0.1-bugfix-release.apk'
  const fs = require('fs')
  
  if (!fs.existsSync(apkPath)) {
    res.status(404).json({ error: 'APK niet gevonden' })
    return
  }
  
  const stats = fs.statSync(apkPath)
  res.json({
    version: '1.0.1',
    filename: 'Bonaken-v1.0.1-bugfix-release.apk',
    size: stats.size,
    sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
    downloadUrl: '/download/apk',
    uploadedAt: stats.mtime
  })
})

// APK Download
app.get('/download/apk', (_req, res) => {
  const apkPath = '/srv/docker/bonaken/apk/Bonaken-v1.0.1-bugfix-release.apk'
  const fs = require('fs')
  
  if (!fs.existsSync(apkPath)) {
    res.status(404).json({ error: 'APK niet gevonden' })
    return
  }
  
  res.setHeader('Content-Disposition', 'attachment; filename="Bonaken-v1.0.1-bugfix-release.apk"')
  res.setHeader('Content-Type', 'application/vnd.android.package-archive')
  res.sendFile(apkPath)
})

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

// Multer error handler
app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Bestand is te groot (max 10 MB)' })
      return
    }
    res.status(400).json({ error: 'Fout bij uploaden van bestand' })
    return
  }
  if (err.message === 'INVALID_TYPE') {
    res.status(400).json({ error: 'Alleen afbeeldingen zijn toegestaan (JPEG, PNG, GIF, WebP)' })
    return
  }
  next(err)
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
