import express from 'express'
import session from 'express-session'
import path from 'path'
import multer from 'multer'
import db from './database'
import postsRouter from './routes/posts'
import commentsRouter from './routes/comments'
import agentRouter from './routes/agent'
import { UPLOADS_DIR } from './upload'

// Extend session type
declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean
  }
}

const app = express()
const PORT = process.env.PORT || 3002
const PASSWORD = 'bonaken-delderveen'

// Session middleware
app.use(session({
  secret: 'bonaken-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}))

app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

// Auth middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.session?.authenticated) {
    return next()
  }
  res.status(401).json({ error: 'Niet geautoriseerd' })
}

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body
  if (password === PASSWORD) {
    req.session.authenticated = true
    res.json({ success: true })
  } else {
    res.status(401).json({ error: 'Onjuist wachtwoord' })
  }
})

// Check auth status
app.get('/api/auth', (req, res) => {
  res.json({ authenticated: req.session?.authenticated || false })
})

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {})
  res.json({ success: true })
})

// Health check (public)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// API routes (protected)
app.use('/api/posts', requireAuth, postsRouter)
app.use('/api/posts', requireAuth, commentsRouter)
app.use('/api/agent', requireAuth, agentRouter)

// APK endpoints (protected)
app.get('/api/apk', requireAuth, (_req, res) => {
  const apkPath = '/srv/docker/bonaken/apk/Bonaken-v1.1-bugfix-release.apk'
  const fs = require('fs')
  
  if (!fs.existsSync(apkPath)) {
    res.status(404).json({ error: 'APK niet gevonden' })
    return
  }
  
  const stats = fs.statSync(apkPath)
  res.json({
    version: '1.1',
    filename: 'Bonaken-v1.1-bugfix-release.apk',
    size: stats.size,
    sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(1)} MB`,
    downloadUrl: '/download/apk',
    uploadedAt: stats.mtime
  })
})

// APK Download (protected)
app.get('/download/apk', requireAuth, (_req, res) => {
  const apkPath = '/srv/docker/bonaken/apk/Bonaken-v1.1-bugfix-release.apk'
  const fs = require('fs')
  
  if (!fs.existsSync(apkPath)) {
    res.status(404).json({ error: 'APK niet gevonden' })
    return
  }
  
  res.setHeader('Content-Disposition', 'attachment; filename="Bonaken-v1.1-bugfix-release.apk"')
  res.setHeader('Content-Type', 'application/vnd.android.package-archive')
  res.sendFile(apkPath)
})

// Updates since (protected)
app.get('/api/updates-since', requireAuth, (req, res) => {
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
