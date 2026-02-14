# Agent Bugs API Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a single endpoint that returns all open bugs with full detail for consumption by coding agents.

**Architecture:** New route file `server/src/routes/agent.ts` with one GET handler. Queries posts + comments, builds screenshot URLs, returns flat JSON. Mounted in `index.ts`.

**Tech Stack:** Express, better-sqlite3 (existing stack, no new dependencies)

---

### Task 1: Create agent route file

**Files:**
- Create: `server/src/routes/agent.ts`

**Step 1: Create the route file**

```typescript
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p server/tsconfig.json`
Expected: No errors

### Task 2: Mount the route in index.ts

**Files:**
- Modify: `server/src/index.ts`

**Step 1: Add the import (after line 6, the comments import)**

Add this line after `import commentsRouter from './routes/comments'`:

```typescript
import agentRouter from './routes/agent'
```

**Step 2: Add the route mount (after line 22, the comments mount)**

Add this line after `app.use('/api/posts', commentsRouter)`:

```typescript
app.use('/api/agent', agentRouter)
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p server/tsconfig.json`
Expected: No errors

### Task 3: Verify end-to-end

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Test with curl**

Run: `curl -s http://localhost:3002/api/agent/bugs | python3 -m json.tool`

Expected: JSON response with `bugs` array and `count` field. Any open bugs should include `title`, `description`, `author`, `screenshot` (full URL or null), `created_at`, and `comments` array.

**Step 3: Commit**

```bash
git add server/src/routes/agent.ts server/src/index.ts
git commit -m "Add /api/agent/bugs endpoint for coding agents"
```
